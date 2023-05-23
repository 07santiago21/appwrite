<?php

require_once __DIR__ . '/../worker.php';

use Appwrite\Event\Mail;
use Appwrite\Network\Validator\CNAME;
use Utopia\App;
use Utopia\CLI\Console;
use Utopia\Database\Database;
use Utopia\Database\Document;
use Utopia\Database\DateTime;
use Utopia\Database\Helpers\ID;
use Utopia\Database\Query;
use Utopia\Domains\Domain;
use Utopia\Queue\Message;
use Utopia\Queue\Server;


Console::title('Certificates V1 Worker');
Console::success(APP_NAME . ' certificates worker v1 has started');

$database = null;

Server::setResource('execute', function (Database $dbForConsole, callable $notifyError, callable $applyCertificateFiles, callable $getRenewDate, callable $issueCertificate, callable $isRenewRequired, callable $validateDomain, callable $saveCertificateDocument, callable $getMainDomain) {
    return function (
        Document $document,
        Domain $domain,
        bool $skipRenewCheck = false
    ) use (
        $dbForConsole,
        $notifyError,
        $applyCertificateFiles,
        $getRenewDate,
        $issueCertificate,
        $isRenewRequired,
        $validateDomain,
        $saveCertificateDocument,
        $getMainDomain
) {
        /**
         * 1. Read arguments and validate domain
         * 2. Get main domain
         * 3. Validate CNAME DNS if parameter is not main domain (meaning it's custom domain)
         * 4. Validate security email. Cannot be empty, required by LetsEncrypt
         * 5. Validate renew date with certificate file, unless requested to skip by parameter
         * 6. Issue a certificate using certbot CLI
         * 7. Update 'log' attribute on certificate document with Certbot message
         * 8. Create storage folder for certificate, if not ready already
         * 9. Move certificates from Certbot location to our Storage
         * 10. Create/Update our Storage with new Traefik config with new certificate paths
         * 11. Read certificate file and update 'renewDate' on certificate document
         * 12. Update 'issueDate' and 'attempts' on certificate
         *
         * If at any point unexpected error occurs, program stops without applying changes to document, and error is thrown into worker
         *
         * If code stops with expected error:
         * 1. 'log' attribute on document is updated with error message
         * 2. 'attempts' amount is increased
         * 3. Console log is shown
         * 4. Email is sent to security email
         *
         * Unless unexpected error occurs, at the end, we:
         * 1. Update 'updated' attribute on document
         * 2. Save document to database
         * 3. Update all domains documents with current certificate ID
         *
         * Note: Renewals are checked and scheduled from maintenence worker
         */

        // Get current certificate
        $certificate = $dbForConsole->findOne('certificates', [Query::equal('domain', [$domain->get()])]);

        // If we don't have certificate for domain yet, let's create new document. At the end we save it
        if (!$certificate) {
            $certificate = new Document();
            $certificate->setAttribute('domain', $domain->get());
        }

        try {
            // Email for alerts is required by LetsEncrypt
            $email = App::getEnv('_APP_SYSTEM_SECURITY_EMAIL_ADDRESS');
            if (empty($email)) {
                throw new Exception('You must set a valid security email address (_APP_SYSTEM_SECURITY_EMAIL_ADDRESS) to issue an SSL certificate.');
            }

            // Validate domain and DNS records. Skip if job is forced
            if (!$skipRenewCheck) {
                $mainDomain = $getMainDomain($dbForConsole);
                $isMainDomain = !isset($mainDomain) || $domain->get() === $mainDomain;
                $validateDomain($domain, $isMainDomain);
            }

            // If certificate exists already, double-check expiry date. Skip if job is forced
            if (!$skipRenewCheck && !$isRenewRequired($domain->get())) {
                throw new Exception('Renew isn\'t required.');
            }

            // Prepare folder name for certbot. Using this helps prevent miss-match in LetsEncrypt configuration when renewing certificate
            $folder = ID::unique();

            // Generate certificate files using Let's Encrypt
            $letsEncryptData = $issueCertificate($folder, $domain->get(), $email);

            // Command succeeded, store all data into document
            // We store stderr too, because it may include warnings
            $certificate->setAttribute('log', \json_encode([
                'stdout' => $letsEncryptData['stdout'],
                'stderr' => $letsEncryptData['stderr'],
            ]));

            // Give certificates to Traefik
            $applyCertificateFiles($folder, $domain->get(), $letsEncryptData);

            // Update certificate info stored in database
            $certificate->setAttribute('renewDate', $getRenewDate($domain->get()));
            $certificate->setAttribute('attempts', 0);
            $certificate->setAttribute('issueDate', DateTime::now());
        } catch (Throwable $e) {
            // Set exception as log in certificate document
            $certificate->setAttribute('log', $e->getMessage());

            // Increase attempts count
            $attempts = $certificate->getAttribute('attempts', 0) + 1;
            $certificate->setAttribute('attempts', $attempts);

            // Store cuttent time as renew date to ensure another attempt in next maintenance cycle
            $certificate->setAttribute('renewDate', DateTime::now());

            // Send email to security email
            $notifyError($domain->get(), $e->getMessage(), $attempts);
        } finally {
            // All actions result in new updatedAt date
            $certificate->setAttribute('updated', DateTime::now());

            // Save all changes we made to certificate document into database
            $saveCertificateDocument($domain->get(), $certificate, $dbForConsole);
        }
    };
}, ['dbForConsole', 'notifyError', 'applyCertificateFiles', 'getRenewDate', 'issueCertificate', 'isRenewRequired', 'validateDomain', 'saveCertificateDocument', 'getMainDomain']);

/**
 * Save certificate data into database.
 *
 * @param string $domain Domain name that certificate is for
 * @param Document $certificate Certificate document that we need to save
 * @param Database $dbForConsole Database connection for console
 *
 * @return void
 */
Server::setResource('saveCertificateDocument', function (Database $dbForConsole, callable $updateDomainDocuments) {
    return function (
        string $domain,
        Document $certificate,
    ) use (
        $dbForConsole,
        $updateDomainDocuments
) {
        // Check if update or insert required
        $certificateDocument = $dbForConsole->findOne('certificates', [Query::equal('domain', [$domain])]);
        if (!empty($certificateDocument) && !$certificateDocument->isEmpty()) {
            // Merge new data with current data
            $certificate = new Document(\array_merge($certificateDocument->getArrayCopy(), $certificate->getArrayCopy()));
            $certificate = $dbForConsole->updateDocument('certificates', $certificate->getId(), $certificate);
        } else {
            $certificate = $dbForConsole->createDocument('certificates', $certificate);
        }

        $certificateId = $certificate->getId();
        $updateDomainDocuments($certificateId, $domain);
    };
}, ['dbForConsole', 'updateDomainDocuments']);


/**
 * Get main domain. Needed as we do different checks for main and non-main domains.
 *
 * @return null|string Returns main domain. If null, there is no main domain yet.
 */
Server::setResource('getMainDomain', function (Database $dbForConsole) {
    return function () use ($dbForConsole) {
        $envDomain = App::getEnv('_APP_DOMAIN', '');
        if (!empty($envDomain) && $envDomain !== 'localhost') {
            return $envDomain;
        } else {
            $domainDocument = $dbForConsole->findOne('domains', [Query::orderAsc('_id')]);
            if ($domainDocument) {
                return $domainDocument->getAttribute('domain');
            }
        }

        return null;
    };
}, ['dbForConsole']);

/**
 * Internal domain validation functionality to prevent unnecessary attempts failed from Let's Encrypt side. We check:
 * - Domain needs to be public and valid (prevents NFT domains that are not supported by Let's Encrypt)
 * - Domain must have proper DNS record
 *
 * @param Domain $domain Domain which we validate
 * @param bool $isMainDomain In case of master domain, we look for different DNS configurations
 *
 * @return void
 */
Server::setResource('validateDomain', function () {
    return function (
        Domain $domain,
        bool $isMainDomain,
    ) {
        if (empty($domain->get())) {
            throw new Exception('Missing certificate domain.');
        }

        if (!$domain->isKnown() || $domain->isTest()) {
            throw new Exception('Unknown public suffix for domain.');
        }

        if (!$isMainDomain) {
            // TODO: Would be awesome to also support A/AAAA records here. Maybe dry run?
            // Validate if domain target is properly configured
            $target = new Domain(App::getEnv('_APP_DOMAIN_TARGET', ''));

            if (!$target->isKnown() || $target->isTest()) {
                throw new Exception('Unreachable CNAME target (' . $target->get() . '), please use a domain with a public suffix.');
            }

            // Verify domain with DNS records
            $validator = new CNAME($target->get());
            if (!$validator->isValid($domain->get())) {
                throw new Exception('Failed to verify domain DNS records.');
            }
        } else {
            // Main domain validation
            // TODO: Would be awesome to check A/AAAA record here. Maybe dry run?
        }
    };
});

/**
 * Reads expiry date of certificate from file and decides if renewal is required or not.
 *
 * @param string $domain Domain for which we check certificate file
 * @return bool True, if certificate needs to be renewed
 */
Server::setResource('isRenewRequired', function () {
    return function (
        string $domain
    ) {
        $certPath = APP_STORAGE_CERTIFICATES . '/' . $domain . '/cert.pem';
        if (\file_exists($certPath)) {
            $validTo = null;

            $certData = openssl_x509_parse(file_get_contents($certPath));
            $validTo = $certData['validTo_time_t'] ?? 0;

            if (empty($validTo)) {
                throw new Exception('Unable to read certificate file (cert.pem).');
            }

            // LetsEncrypt allows renewal 30 days before expiry
            $expiryInAdvance = (60 * 60 * 24 * 30);
            if ($validTo - $expiryInAdvance > \time()) {
                return false;
            }
        }

        return true;
    };
});

/**
 * LetsEncrypt communication to issue certificate (using certbot CLI)
 *
 * @param string $folder Folder into which certificates should be generated
 * @param string $domain Domain to generate certificate for
 * @return array Named array with keys 'stdout' and 'stderr', both string
 */
Server::setResource('issueCertificate', function () {
    return function (
        string $folder,
        string $domain,
        string $email,
    ) {

        $stdout = '';
        $stderr = '';

        $staging = (App::isProduction()) ? '' : ' --dry-run';
        $exit = Console::execute("certbot certonly --webroot --noninteractive --agree-tos{$staging}"
        . " --email " . $email
        . " --cert-name " . $folder
        . " -w " . APP_STORAGE_CERTIFICATES
        . " -d {$domain}", '', $stdout, $stderr);

        // Unexpected error, usually 5XX, API limits, ...
        if ($exit !== 0) {
            throw new Exception('Failed to issue a certificate with message: ' . $stderr);
        }

        return [
            'stdout' => $stdout,
            'stderr' => $stderr
        ];
    };
});

/**
 * Read new renew date from certificate file generated by Let's Encrypt
 *
 * @param string $domain Domain which certificate was generated for
 * @return string
 */
Server::setResource('getRenewDate', function () {
    return function (
        string $domain,
    ) {
        $certPath = APP_STORAGE_CERTIFICATES . '/' . $domain . '/cert.pem';
        $certData = openssl_x509_parse(file_get_contents($certPath));
        $validTo = $certData['validTo_time_t'] ?? null;
        $dt = (new \DateTime())->setTimestamp($validTo);
        return DateTime::addSeconds($dt, -60 * 60 * 24 * 30); // -30 days
    };
});

/**
 * Method to take files from Let's Encrypt, and put it into Traefik.
 *
 * @param string $domain Domain which certificate was generated for
 * @param string $folder Folder in which certificates were generated
 * @param array $letsEncryptData Let's Encrypt logs to use for additional info when throwing error
 * @return void
 */
Server::setResource('applyCertificateFiles', function () {
    return function (
        string $folder,
        string $domain,
        array $letsEncryptData,
    ) {
        // Prepare folder in storage for domain
        $path = APP_STORAGE_CERTIFICATES . '/' . $domain;
        if (!\is_readable($path)) {
            if (!\mkdir($path, 0755, true)) {
                throw new Exception('Failed to create path for certificate.');
            }
        }

        // Move generated files
        if (!@\rename('/etc/letsencrypt/live/' . $folder . '/cert.pem', APP_STORAGE_CERTIFICATES . '/' . $domain . '/cert.pem')) {
            throw new Exception('Failed to rename certificate cert.pem. Let\'s Encrypt log: ' . $letsEncryptData['stderr'] . ' ; ' . $letsEncryptData['stdout']);
        }

        if (!@\rename('/etc/letsencrypt/live/' . $folder . '/chain.pem', APP_STORAGE_CERTIFICATES . '/' . $domain . '/chain.pem')) {
            throw new Exception('Failed to rename certificate chain.pem. Let\'s Encrypt log: ' . $letsEncryptData['stderr'] . ' ; ' . $letsEncryptData['stdout']);
        }

        if (!@\rename('/etc/letsencrypt/live/' . $folder . '/fullchain.pem', APP_STORAGE_CERTIFICATES . '/' . $domain . '/fullchain.pem')) {
            throw new Exception('Failed to rename certificate fullchain.pem. Let\'s Encrypt log: ' . $letsEncryptData['stderr'] . ' ; ' . $letsEncryptData['stdout']);
        }

        if (!@\rename('/etc/letsencrypt/live/' . $folder . '/privkey.pem', APP_STORAGE_CERTIFICATES . '/' . $domain . '/privkey.pem')) {
            throw new Exception('Failed to rename certificate privkey.pem. Let\'s Encrypt log: ' . $letsEncryptData['stderr'] . ' ; ' . $letsEncryptData['stdout']);
        }

        $config = \implode(PHP_EOL, [
            "tls:",
            "  certificates:",
            "    - certFile: /storage/certificates/{$domain}/fullchain.pem",
            "      keyFile: /storage/certificates/{$domain}/privkey.pem"
        ]);

        // Save configuration into Traefik using our new cert files
        if (!\file_put_contents(APP_STORAGE_CONFIG . '/' . $domain . '.yml', $config)) {
            throw new Exception('Failed to save Traefik configuration.');
        }
    };
});

/**
 * Method to make sure information about error is delivered to admnistrator.
 *
 * @param string $domain Domain that caused the error
 * @param string $errorMessage Verbose error message
 * @param int $attempt How many times it failed already
 * @return void
 */
Server::setResource('notifyError', function (Mail $queueForMail) {
    return function (
        string $domain,
        string $errorMessage,
        int $attempt,
    ) use ($queueForMail) {
        // Log error into console
        Console::warning('Cannot renew domain (' . $domain . ') on attempt no. ' . $attempt . ' certificate: ' . $errorMessage);

        // Send mail to administratore mail
        $queueForMail
            ->setType(MAIL_TYPE_CERTIFICATE)
            ->setRecipient(App::getEnv('_APP_SYSTEM_SECURITY_EMAIL_ADDRESS'))
            ->setUrl('https://' . $domain)
            ->setLocale(App::getEnv('_APP_LOCALE', 'en'))
            ->setName('Appwrite Administrator')
            ->setPayload([
                'domain' => $domain,
                'error' => $errorMessage,
                'attempt' => $attempt
            ])
            ->trigger();
    };
}, ['queueForMail']);

/**
 * Update all existing domain documents so they have relation to correct certificate document.
 * This solved issues:
 * - when adding a domain for which there is already a certificate
 * - when renew creates new document? It might?
 * - overall makes it more reliable
 *
 * @param string $certificateId ID of a new or updated certificate document
 * @param string $domain Domain that is affected by new certificate
 * @param Database $dbForConsole Database instance for console
 * @return void
 */
Server::setResource('updateDomainDocuments', function () {
    return function (
        string $certificateId,
        string $domain,
        Database $dbForConsole,
    ) {
        $domains = $dbForConsole->find('domains', [
            Query::equal('domain', [$domain]),
            Query::limit(1000),
        ]);

        foreach ($domains as $domainDocument) {
            $domainDocument->setAttribute('updated', DateTime::now());
            $domainDocument->setAttribute('certificateId', $certificateId);
            $dbForConsole->updateDocument('domains', $domainDocument->getId(), $domainDocument);

            if ($domainDocument->getAttribute('projectId')) {
                $dbForConsole->deleteCachedDocument('projects', $domainDocument->getAttribute('projectId'));
            }
        }
    };
});

$server->job()
    ->inject('message')
    ->inject('dbForConsole')
    ->inject('execute')
    ->action(function ($message, $dbForConsole, $execute) use ($server) {
        $payload = $message->getPayload() ?? [];

        if (empty($payload)) {
            throw new Exception('Missing payload');
        }

        $document = new Document($payload['domain'] ?? []);
        $domain   = new Domain($document->getAttribute('domain', ''));
        $skipRenewCheck = $payload['skipRenewCheck'] ?? false;

        $execute($document, $domain, $skipRenewCheck);
    });

$server->workerStart();
$server->start();
