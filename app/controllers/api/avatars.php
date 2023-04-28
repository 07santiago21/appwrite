<?php

use Appwrite\Extend\Exception;
use Appwrite\Network\Validator\URL;
use Appwrite\URL\URL as URLParse;
use Appwrite\Utopia\Response;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Utopia\App;
use Utopia\Config\Config;
use Utopia\Database\Database;
use Utopia\Database\DateTime;
use Utopia\Database\Document;
use Utopia\Database\Validator\Authorization;
use Utopia\Database\Validator\UID;
use Utopia\Image\Image;
use Utopia\Validator\Boolean;
use Utopia\Validator\HexColor;
use Utopia\Validator\Range;
use Utopia\Validator\Text;
use Utopia\Validator\WhiteList;

$avatarCallback = function (string $type, string $code, int $width, int $height, int $quality, Response $response) {

    $code = \strtolower($code);
    $type = \strtolower($type);
    $set = Config::getParam('avatar-' . $type, []);

    if (empty($set)) {
        throw new Exception(Exception::AVATAR_SET_NOT_FOUND);
    }

    if (!\array_key_exists($code, $set)) {
        throw new Exception(Exception::AVATAR_NOT_FOUND);
    }

    if (!\extension_loaded('imagick')) {
        throw new Exception(Exception::GENERAL_SERVER_ERROR, 'Imagick extension is missing');
    }

    $output = 'png';
    $path = $set[$code];
    $type = 'png';

    if (!\is_readable($path)) {
        throw new Exception(Exception::GENERAL_SERVER_ERROR, 'File not readable in ' . $path);
    }

    $image = new Image(\file_get_contents($path));
    $image->crop((int) $width, (int) $height);
    $output = (empty($output)) ? $type : $output;
    $data = $image->output($output, $quality);
    $response
        ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + 60 * 60 * 24 * 30) . ' GMT')
        ->setContentType('image/png')
        ->file($data);
    unset($image);
};

$getUserGitHub = function (string $userId, Document $project, Database $dbForProject, Database $dbForConsole) {
    try {
        $user = Authorization::skip(fn () => $dbForConsole->getDocument('users', $userId));

        $sessions = $user->getAttribute('sessions', []);
        $session = $sessions[0] ?? new Document();

        $provider = $session->getAttribute('provider');
        $accessToken = $session->getAttribute('providerAccessToken');
        $accessTokenExpiry = $session->getAttribute('providerAccessTokenExpiry');
        $refreshToken = $session->getAttribute('providerRefreshToken');

        $appId = $project->getAttribute('authProviders', [])[$provider . 'Appid'] ?? '';
        $appSecret = $project->getAttribute('authProviders', [])[$provider . 'Secret'] ?? '{}';

        $className = 'Appwrite\\Auth\\OAuth2\\' . \ucfirst($provider);

        if (!\class_exists($className)) {
            throw new Exception(Exception::PROJECT_PROVIDER_UNSUPPORTED);
        }

        $oauth2 = new $className($appId, $appSecret, '', [], []);

        $isExpired = new \DateTime($accessTokenExpiry) < new \DateTime('now');
        $isExpired = true;
        if ($isExpired) {
            try {
                $oauth2->refreshTokens($refreshToken);

                $accessToken = $oauth2->getAccessToken('');
                $refreshToken = $oauth2->getRefreshToken('');

                $verificationId = $oauth2->getUserID($accessToken);

                if (empty($verificationId)) {
                    throw new \Exception("Locked tokens."); // Race codition, handeled in catch
                }

                $session
                    ->setAttribute('providerAccessToken', $accessToken)
                    ->setAttribute('providerRefreshToken', $refreshToken)
                    ->setAttribute('providerAccessTokenExpiry', DateTime::addSeconds(new \DateTime(), (int)$oauth2->getAccessTokenExpiry('')));

                Authorization::skip(fn () => $dbForProject->updateDocument('sessions', $session->getId(), $session));

                $dbForProject->deleteCachedDocument('users', $user->getId());
            } catch (Throwable $err) {
                $index = 0;
                do {
                    $previousAccessToken = $session->getAttribute('providerAccessToken');

                    $user = Authorization::skip(fn () => $dbForConsole->getDocument('users', $userId));
                    $sessions = $user->getAttribute('sessions', []);
                    $session = $sessions[0] ?? new Document();
                    $accessToken = $session->getAttribute('providerAccessToken');

                    if ($accessToken !== $previousAccessToken) {
                        break;
                    }

                    $index++;
                    \usleep(500000);
                } while ($index < 10);
            }
        }

        $oauth2 = new $className($appId, $appSecret, '', [], []);
        $githubUser = $oauth2->getUserSlug($accessToken);
        $githubId = $oauth2->getUserID($accessToken);

        return [
            'name' => $githubUser,
            'id' => $githubId
        ];
    } catch (Exception $err) {
        \var_dump($err->getMessage());
        \var_dump($err->getTraceAsString());
        \var_dump($err->getLine());
        \var_dump($err->getFile());
        return [];
    }
};

App::get('/v1/avatars/credit-cards/:code')
    ->desc('Get Credit Card Icon')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('cache', true)
    ->label('cache.resource', 'avatar/credit-card')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getCreditCard')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-credit-card.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE_PNG)
    ->param('code', '', new WhiteList(\array_keys(Config::getParam('avatar-credit-cards'))), 'Credit Card Code. Possible values: ' . \implode(', ', \array_keys(Config::getParam('avatar-credit-cards'))) . '.')
    ->param('width', 100, new Range(0, 2000), 'Image width. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('height', 100, new Range(0, 2000), 'Image height. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('quality', 100, new Range(0, 100), 'Image quality. Pass an integer between 0 to 100. Defaults to 100.', true)
    ->inject('response')
    ->action(fn (string $code, int $width, int $height, int $quality, Response $response) =>  $avatarCallback('credit-cards', $code, $width, $height, $quality, $response));

App::get('/v1/avatars/browsers/:code')
    ->desc('Get Browser Icon')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('cache', true)
    ->label('cache.resource', 'avatar/browser')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getBrowser')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-browser.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE_PNG)
    ->param('code', '', new WhiteList(\array_keys(Config::getParam('avatar-browsers'))), 'Browser Code.')
    ->param('width', 100, new Range(0, 2000), 'Image width. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('height', 100, new Range(0, 2000), 'Image height. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('quality', 100, new Range(0, 100), 'Image quality. Pass an integer between 0 to 100. Defaults to 100.', true)
    ->inject('response')
    ->action(fn (string $code, int $width, int $height, int $quality, Response $response) => $avatarCallback('browsers', $code, $width, $height, $quality, $response));

App::get('/v1/avatars/flags/:code')
    ->desc('Get Country Flag')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('cache', true)
    ->label('cache.resource', 'avatar/flag')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getFlag')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-flag.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE_PNG)
    ->param('code', '', new WhiteList(\array_keys(Config::getParam('avatar-flags'))), 'Country Code. ISO Alpha-2 country code format.')
    ->param('width', 100, new Range(0, 2000), 'Image width. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('height', 100, new Range(0, 2000), 'Image height. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('quality', 100, new Range(0, 100), 'Image quality. Pass an integer between 0 to 100. Defaults to 100.', true)
    ->inject('response')
    ->action(fn (string $code, int $width, int $height, int $quality, Response $response) => $avatarCallback('flags', $code, $width, $height, $quality, $response));

App::get('/v1/avatars/image')
    ->desc('Get Image from URL')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('cache', true)
    ->label('cache.resource', 'avatar/image')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getImage')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-image.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE)
    ->param('url', '', new URL(['http', 'https']), 'Image URL which you want to crop.')
    ->param('width', 400, new Range(0, 2000), 'Resize preview image width, Pass an integer between 0 to 2000. Defaults to 400.', true)
    ->param('height', 400, new Range(0, 2000), 'Resize preview image height, Pass an integer between 0 to 2000. Defaults to 400.', true)
    ->inject('response')
    ->action(function (string $url, int $width, int $height, Response $response) {

        $quality = 80;
        $output = 'png';
        $type = 'png';

        if (!\extension_loaded('imagick')) {
            throw new Exception(Exception::GENERAL_SERVER_ERROR, 'Imagick extension is missing');
        }

        $fetch = @\file_get_contents($url, false);

        if (!$fetch) {
            throw new Exception(Exception::AVATAR_IMAGE_NOT_FOUND);
        }

        try {
            $image = new Image($fetch);
        } catch (\Exception $exception) {
            throw new Exception(Exception::GENERAL_SERVER_ERROR, 'Unable to parse image');
        }

        $image->crop((int) $width, (int) $height);
        $output = (empty($output)) ? $type : $output;
        $data = $image->output($output, $quality);

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + 60 * 60 * 24 * 30) . ' GMT')
            ->setContentType('image/png')
            ->file($data);
        unset($image);
    });

App::get('/v1/avatars/favicon')
    ->desc('Get Favicon')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('cache', true)
    ->label('cache.resource', 'avatar/favicon')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getFavicon')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-favicon.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE)
    ->param('url', '', new URL(['http', 'https']), 'Website URL which you want to fetch the favicon from.')
    ->inject('response')
    ->action(function (string $url, Response $response) {

        $width = 56;
        $height = 56;
        $quality = 80;
        $output = 'png';
        $type = 'png';

        if (!\extension_loaded('imagick')) {
            throw new Exception(Exception::GENERAL_SERVER_ERROR, 'Imagick extension is missing');
        }

        $curl = \curl_init();

        \curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_URL => $url,
            CURLOPT_USERAGENT => \sprintf(
                APP_USERAGENT,
                App::getEnv('_APP_VERSION', 'UNKNOWN'),
                App::getEnv('_APP_SYSTEM_SECURITY_EMAIL_ADDRESS', APP_EMAIL_SECURITY)
            ),
        ]);

        $html = \curl_exec($curl);

        \curl_close($curl);

        if (!$html) {
            throw new Exception(Exception::AVATAR_REMOTE_URL_FAILED);
        }

        $doc = new DOMDocument();
        $doc->strictErrorChecking = false;
        @$doc->loadHTML($html);

        $links = $doc->getElementsByTagName('link');
        $outputHref = '';
        $outputExt = '';
        $space = 0;

        foreach ($links as $link) { /* @var $link DOMElement */
            $href = $link->getAttribute('href');
            $rel = $link->getAttribute('rel');
            $sizes = $link->getAttribute('sizes');
            $absolute = URLParse::unparse(\array_merge(\parse_url($url), \parse_url($href)));

            switch (\strtolower($rel)) {
                case 'icon':
                case 'shortcut icon':
                    //case 'apple-touch-icon':
                    $ext = \pathinfo(\parse_url($absolute, PHP_URL_PATH), PATHINFO_EXTENSION);

                    switch ($ext) {
                        case 'ico':
                        case 'png':
                        case 'jpg':
                        case 'jpeg':
                            $size = \explode('x', \strtolower($sizes));

                            $sizeWidth = (int) $size[0] ?? 0;
                            $sizeHeight = (int) $size[1] ?? 0;

                            if (($sizeWidth * $sizeHeight) >= $space) {
                                $space = $sizeWidth * $sizeHeight;
                                $outputHref = $absolute;
                                $outputExt = $ext;
                            }

                            break;
                    }

                    break;
            }
        }

        if (empty($outputHref) || empty($outputExt)) {
            $default = \parse_url($url);

            $outputHref = $default['scheme'] . '://' . $default['host'] . '/favicon.ico';
            $outputExt = 'ico';
        }

        if ('ico' == $outputExt) { // Skip crop, Imagick isn\'t supporting icon files
            $data = @\file_get_contents($outputHref, false);

            if (empty($data) || (\mb_substr($data, 0, 5) === '<html') || \mb_substr($data, 0, 5) === '<!doc') {
                throw new Exception(Exception::AVATAR_ICON_NOT_FOUND, 'Favicon not found');
            }
            $response
                ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + 60 * 60 * 24 * 30) . ' GMT')
                ->setContentType('image/x-icon')
                ->file($data);
        }

        $fetch = @\file_get_contents($outputHref, false);

        if (!$fetch) {
            throw new Exception(Exception::AVATAR_ICON_NOT_FOUND);
        }

        $image = new Image($fetch);
        $image->crop((int) $width, (int) $height);
        $output = (empty($output)) ? $type : $output;
        $data = $image->output($output, $quality);

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + 60 * 60 * 24 * 30) . ' GMT')
            ->setContentType('image/png')
            ->file($data);
        unset($image);
    });

App::get('/v1/avatars/qr')
    ->desc('Get QR Code')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getQR')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-qr.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE_PNG)
    ->param('text', '', new Text(512), 'Plain text to be converted to QR code image.')
    ->param('size', 400, new Range(1, 1000), 'QR code size. Pass an integer between 1 to 1000. Defaults to 400.', true)
    ->param('margin', 1, new Range(0, 10), 'Margin from edge. Pass an integer between 0 to 10. Defaults to 1.', true)
    ->param('download', false, new Boolean(true), 'Return resulting image with \'Content-Disposition: attachment \' headers for the browser to start downloading it. Pass 0 for no header, or 1 for otherwise. Default value is set to 0.', true)
    ->inject('response')
    ->action(function (string $text, int $size, int $margin, bool $download, Response $response) {

        $download = ($download === '1' || $download === 'true' || $download === 1 || $download === true);
        $options = new QROptions([
            'addQuietzone' => true,
            'quietzoneSize' => $margin,
            'outputType' => QRCode::OUTPUT_IMAGICK,
        ]);

        $qrcode = new QRCode($options);

        if ($download) {
            $response->addHeader('Content-Disposition', 'attachment; filename="qr.png"');
        }

        $image = new Image($qrcode->render($text));
        $image->crop((int) $size, (int) $size);

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + (60 * 60 * 24 * 45)) . ' GMT') // 45 days cache
            ->setContentType('image/png')
            ->send($image->output('png', 9));
    });

App::get('/v1/avatars/initials')
    ->desc('Get User Initials')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    ->label('cache.resource', 'avatar/initials')
    ->label('sdk.auth', [APP_AUTH_TYPE_SESSION, APP_AUTH_TYPE_KEY, APP_AUTH_TYPE_JWT])
    ->label('sdk.namespace', 'avatars')
    ->label('sdk.method', 'getInitials')
    ->label('sdk.methodType', 'location')
    ->label('sdk.description', '/docs/references/avatars/get-initials.md')
    ->label('sdk.response.code', Response::STATUS_CODE_OK)
    ->label('sdk.response.type', Response::CONTENT_TYPE_IMAGE_PNG)
    ->param('name', '', new Text(128), 'Full Name. When empty, current user name or email will be used. Max length: 128 chars.', true)
    ->param('width', 500, new Range(0, 2000), 'Image width. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('height', 500, new Range(0, 2000), 'Image height. Pass an integer between 0 to 2000. Defaults to 100.', true)
    ->param('background', '', new HexColor(), 'Changes background color. By default a random color will be picked and stay will persistent to the given name.', true)
    ->inject('response')
    ->inject('user')
    ->action(function (string $name, int $width, int $height, string $background, Response $response, Document $user) {

        $themes = [
            ['background' => '#FFA1CE'], // Default (Pink)
            ['background' => '#FDC584'], // Orange
            ['background' => '#94DBD1'], // Green
            ['background' => '#A1C4FF'], // Blue
            ['background' => '#FFA1CE'], // Pink
            ['background' => '#CBB1FC'] // Purple
        ];

        $name = (!empty($name)) ? $name : $user->getAttribute('name', $user->getAttribute('email', ''));
        $words = \explode(' ', \strtoupper($name));
        // if there is no space, try to split by `_` underscore
        $words = (count($words) == 1) ? \explode('_', \strtoupper($name)) : $words;

        $initials = null;
        $code = 0;

        foreach ($words as $key => $w) {
            $initials .= $w[0] ?? '';
            $code += (isset($w[0])) ? \ord($w[0]) : 0;

            if ($key == 1) {
                break;
            }
        }

        $rand = \substr($code, -1);

        // Wrap rand value to avoid out of range
        $rand = ($rand > \count($themes) - 1) ? $rand % \count($themes) : $rand;

        $background = (!empty($background)) ? '#' . $background : $themes[$rand]['background'];

        $image = new \Imagick();
        $punch = new \Imagick();
        $draw = new \ImagickDraw();
        $fontSize = \min($width, $height) / 2;

        $punch->newImage($width, $height, 'transparent');

        $draw->setFont(__DIR__ . "/../../assets/fonts/poppins-v9-latin-500.ttf");
        $image->setFont(__DIR__ . "/../../assets/fonts/poppins-v9-latin-500.ttf");

        $draw->setFillColor(new ImagickPixel('black'));
        $draw->setFontSize($fontSize);

        $draw->setTextAlignment(\Imagick::ALIGN_CENTER);
        $draw->annotation($width / 1.97, ($height / 2) + ($fontSize / 3), $initials);

        $punch->drawImage($draw);
        $punch->negateImage(true, Imagick::CHANNEL_ALPHA);

        $image->newImage($width, $height, $background);
        $image->setImageFormat("png");
        $image->compositeImage($punch, Imagick::COMPOSITE_COPYOPACITY, 0, 0);

        //$image->setImageCompressionQuality(9 - round(($quality / 100) * 9));

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + (60 * 60 * 24 * 45)) . ' GMT') // 45 days cache
            ->setContentType('image/png')
            ->file($image->getImageBlob());
    });

App::get('/v1/cards/cloud')
    ->desc('Get Front Of Cloud Card')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    // ->label('cache', true)
    // ->label('cache.resourceType', 'cards/cloud')
    // ->label('cache.resource', 'card/{request.userId}')
    ->label('docs', false)
    ->label('origin', '*')
    ->param('userId', '', new UID(), 'User ID.', true)
    ->param('mock', '', new WhiteList(['employee', 'employee-2digit', 'hero', 'contributor', 'normal', 'platinum', 'normal-no-github', 'normal-long']), 'Mocking behaviour.', true)
    ->param('width', 0, new Range(0, 1024), 'Resize  image card width, Pass an integer between 0 to 1024.', true)
    ->param('height', 0, new Range(0, 1024), 'Resize image card height, Pass an integer between 0 to 1024.', true)
    ->inject('user')
    ->inject('project')
    ->inject('dbForProject')
    ->inject('dbForConsole')
    ->inject('response')
    ->inject('heroes')
    ->inject('contributors')
    ->inject('employees')
    ->action(function (string $userId, string $mock, int $width, int $height, Document $user, Document $project, Database $dbForProject, Database $dbForConsole, Response $response, array $heroes, array $contributors, array $employees) use ($getUserGitHub) {
        $user = Authorization::skip(fn () => $dbForConsole->getDocument('users', $userId));

        if ($user->isEmpty() && empty($mock)) {
            throw new Exception(Exception::USER_NOT_FOUND);
        }

        if (!$mock) {
            $name = $user->getAttribute('name', 'Anonymous');
            $email = $user->getAttribute('email', '');
            $createdAt = new \DateTime($user->getCreatedAt());

            $gitHub = $getUserGitHub($user->getId(), $project, $dbForProject, $dbForConsole);
            $githubName = $gitHub['name'] ?? '';
            $githubId = $gitHub['id'] ?? '';

            $isHero = \array_key_exists($email, $heroes);
            $isContributor = \in_array($githubId, $contributors);
            $isEmployee = \array_key_exists($email, $employees);
            $employeeNumber = $isEmployee ? $employees[$email]['spot'] : '';

            if ($isHero) {
                $createdAt = new \DateTime($heroes[$email]['memberSince'] ?? '');
            } else if ($isEmployee) {
                $createdAt = new \DateTime($employees[$email]['memberSince'] ?? '');
            }

            if (!$isEmployee && !empty($githubName)) {
                $employeeGitHub = \array_search(\strtolower($githubName), \array_map(fn ($employee) => \strtolower($employee['gitHub']) ?? '', $employees));
                if (!empty($employeeGitHub)) {
                    $isEmployee = true;
                    $employeeNumber = $isEmployee ? $employees[$employeeGitHub]['spot'] : '';
                    $createdAt = new \DateTime($employees[$employeeGitHub]['memberSince'] ?? '');
                }
            }

            $isPlatinum = $user->getInternalId() % 100 === 0;
        } else {
            $name = $mock === 'normal-long' ? 'Sir First Walter O\'Brian Junior' : 'Walter O\'Brian';
            $createdAt = new \DateTime('now');
            $githubName = $mock === 'normal-no-github' ? '' : ($mock === 'normal-long' ? 'sir-first-walterobrian-junior' : 'walterobrian');
            $isHero = $mock === 'hero';
            $isContributor = $mock === 'contributor';
            $isEmployee = \str_starts_with($mock, 'employee');
            $employeeNumber = match ($mock) {
                'employee' => '1',
                'employee-2digit' => '18',
                default => ''
            };

            $isPlatinum = $mock === 'platinum';
        }

        if ($isEmployee) {
            $isContributor = false;
            $isHero = false;
        }

        if ($isHero) {
            $isContributor = false;
            $isEmployee = false;
        }

        if ($isContributor) {
            $isHero = false;
            $isEmployee = false;
        }

        $isGolden = $isEmployee || $isHero || $isContributor;
        $isPlatinum = $isGolden ? false : $isPlatinum;
        $memberSince = \strtoupper('Member since ' . $createdAt->format('M') . ' ' . $createdAt->format('d') . ', ' . $createdAt->format('o'));

        $imagePath = $isGolden ? 'front-golden.png' : ($isPlatinum ? 'front-platinum.png' : 'front.png');

        $baseImage = new \Imagick("public/images/cards/cloud/" . $imagePath);

        if ($isEmployee) {
            $image = new Imagick('public/images/cards/cloud/employee.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 795, 35);

            $text = new \ImagickDraw();
            $text->setTextAlignment(Imagick::ALIGN_CENTER);
            $text->setFont("public/fonts/Inter-Bold.ttf");
            $text->setFillColor(new \ImagickPixel('#FFFADF'));
            $text->setFontSize(\strlen($employeeNumber) <= 2 ? 54 : 48);
            $text->setFontWeight(700);
            $metricsText = $baseImage->queryFontMetrics($text, $employeeNumber);

            $hashtag = new \ImagickDraw();
            $hashtag->setTextAlignment(Imagick::ALIGN_CENTER);
            $hashtag->setFont("public/fonts/Inter-Bold.ttf");
            $hashtag->setFillColor(new \ImagickPixel('#FFFADF'));
            $hashtag->setFontSize(28);
            $hashtag->setFontWeight(700);
            $metricsHashtag = $baseImage->queryFontMetrics($hashtag, '#');

            $startX = 900;
            $totalWidth = $metricsHashtag['textWidth'] + 12 + $metricsText['textWidth'];

            $hashtagX = ($metricsHashtag['textWidth'] / 2);
            $textX = $hashtagX + 12 + ($metricsText['textWidth'] / 2);

            $hashtagX -= $totalWidth / 2;
            $textX -= $totalWidth / 2;

            $hashtagX += $startX;
            $textX += $startX;

            $baseImage->annotateImage($hashtag, $hashtagX, 150, 0, '#');
            $baseImage->annotateImage($text, $textX, 150, 0, $employeeNumber);
        }

        if ($isContributor) {
            $image = new Imagick('public/images/cards/cloud/contributor.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 795, 35);
        }

        if ($isHero) {
            $image = new Imagick('public/images/cards/cloud/hero.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 795, 35);
        }

        setlocale(LC_ALL, "en_US.utf8");
        $name = \iconv("utf-8", "ascii//TRANSLIT", $name);
        $memberSince = \iconv("utf-8", "ascii//TRANSLIT", $memberSince);
        $githubName = \iconv("utf-8", "ascii//TRANSLIT", $githubName);

        $text = new \ImagickDraw();
        $text->setTextAlignment(Imagick::ALIGN_CENTER);
        $text->setFont("public/fonts/Poppins-Bold.ttf");
        $text->setFillColor(new \ImagickPixel('#FFFFFF'));

        if (\strlen($name) > 33) {
            $name = \substr($name, 0, 33);
        }

        if (\strlen($name) <= 23) {
            $text->setFontSize(80);
        } else {
            $text->setFontSize(54);
        }
        $text->setFontWeight(700);
        $baseImage->annotateImage($text, 512, 477, 0, $name);

        $text = new \ImagickDraw();
        $text->setTextAlignment(Imagick::ALIGN_CENTER);
        $text->setFont("public/fonts/Inter-SemiBold.ttf");
        $text->setFillColor(new \ImagickPixel($isGolden || $isPlatinum ? '#FFFFFF' : '#FFB9CC'));
        $text->setFontSize(27);
        $text->setFontWeight(600);
        $text->setTextKerning(1.08);
        $baseImage->annotateImage($text, 512, 541, 0, \strtoupper($memberSince));

        if (!empty($githubName)) {
            $text = new \ImagickDraw();
            $text->setTextAlignment(Imagick::ALIGN_CENTER);
            $text->setFont("public/fonts/Inter-Regular.ttf");
            $text->setFillColor(new \ImagickPixel('#FFFFFF'));
            $text->setFontSize(32);
            $text->setFontWeight(400);
            $metrics = $baseImage->queryFontMetrics($text, $githubName);

            $baseImage->annotateImage($text, 512 + 20 + 4, 373, 0, $githubName);

            $image = new Imagick('public/images/cards/cloud/github.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $precisionFix = 5;
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 512 - ($metrics['textWidth'] / 2) - 20 - 4, 373 - ($metrics['textHeight'] - $precisionFix));
        }

        if (!empty($width) || !empty($height)) {
            $baseImage->resizeImage($width, $height, Imagick::FILTER_LANCZOS, 1);
        }

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + (60 * 60 * 24 * 45)) . ' GMT') // 45 days cache
            ->setContentType('image/png')
            ->file($baseImage->getImageBlob());
    });

App::get('/v1/cards/cloud-back')
    ->desc('Get Back Of Cloud Card')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    // ->label('cache', true)
    // ->label('cache.resourceType', 'cards/cloud-back')
    // ->label('cache.resource', 'card/{request.userId}')
    ->label('docs', false)
    ->label('origin', '*')
    ->param('userId', '', new UID(), 'User ID.', true)
    ->param('mock', '', new WhiteList(['golden', 'normal', 'platinum']), 'Mocking behaviour.', true)
    ->param('width', 0, new Range(0, 1024), 'Resize  image card width, Pass an integer between 0 to 1024.', true)
    ->param('height', 0, new Range(0, 1024), 'Resize image card height, Pass an integer between 0 to 1024.', true)
    ->inject('user')
    ->inject('project')
    ->inject('dbForProject')
    ->inject('dbForConsole')
    ->inject('response')
    ->inject('heroes')
    ->inject('contributors')
    ->inject('employees')
    ->action(function (string $userId, string $mock, int $width, int $height, Document $user, Document $project, Database $dbForProject, Database $dbForConsole, Response $response, array $heroes, array $contributors, array $employees) use ($getUserGitHub) {
        $user = Authorization::skip(fn () => $dbForConsole->getDocument('users', $userId));

        if ($user->isEmpty() && empty($mock)) {
            throw new Exception(Exception::USER_NOT_FOUND);
        }

        if (!$mock) {
            $userId = $user->getId();
            $email = $user->getAttribute('email', '');

            $gitHub = $getUserGitHub($user->getId(), $project, $dbForProject, $dbForConsole);
            $githubId = $gitHub['id'] ?? '';

            $isHero = \array_key_exists($email, $heroes);
            $isContributor = \in_array($githubId, $contributors);
            $isEmployee = \array_key_exists($email, $employees);

            $isGolden = $isEmployee || $isHero || $isContributor;
            $isPlatinum = $user->getInternalId() % 100 === 0;
        } else {
            $userId = '63e0bcf3c3eb803ba530';

            $isGolden = $mock === 'golden';
            $isPlatinum = $mock === 'platinum';
        }

        $userId = 'UID ' . $userId;

        $isPlatinum = $isGolden ? false : $isPlatinum;

        $imagePath = $isGolden ? 'back-golden.png' : ($isPlatinum ? 'back-platinum.png' : 'back.png');

        $baseImage = new \Imagick("public/images/cards/cloud/" . $imagePath);

        setlocale(LC_ALL, "en_US.utf8");
        $userId = \iconv("utf-8", "ascii//TRANSLIT", $userId);

        $text = new \ImagickDraw();
        $text->setTextAlignment(Imagick::ALIGN_CENTER);
        $text->setFont("public/fonts/SourceCodePro-Regular.ttf");
        $text->setFillColor(new \ImagickPixel($isGolden ? '#664A1E' : ($isPlatinum ? '#555555' : '#E8E9F0')));
        $text->setFontSize(28);
        $text->setFontWeight(400);
        $baseImage->annotateImage($text, 512, 596, 0, $userId);

        if (!empty($width) || !empty($height)) {
            $baseImage->resizeImage($width, $height, Imagick::FILTER_LANCZOS, 1);
        }

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + (60 * 60 * 24 * 45)) . ' GMT') // 45 days cache
            ->setContentType('image/png')
            ->file($baseImage->getImageBlob());
    });

App::get('/v1/cards/cloud-og')
    ->desc('Get OG Image From Cloud Card')
    ->groups(['api', 'avatars'])
    ->label('scope', 'avatars.read')
    // ->label('cache', true)
    // ->label('cache.resourceType', 'cards/cloud-og')
    // ->label('cache.resource', 'card/{request.userId}')
    ->label('docs', false)
    ->label('origin', '*')
    ->param('userId', '', new UID(), 'User ID.', true)
    ->param('mock', '', new WhiteList(['employee', 'employee-2digit', 'hero', 'contributor', 'normal', 'platinum', 'normal-no-github', 'normal-long', 'normal-long-right', 'normal-bg2', 'normal-bg3', 'normal-right', 'platinum-right', 'hero-right', 'contributor-right', 'employee-right', 'employee-2digit-right']), 'Mocking behaviour.', true)
    ->param('width', 0, new Range(0, 1024), 'Resize  image card width, Pass an integer between 0 to 1024.', true)
    ->param('height', 0, new Range(0, 1024), 'Resize image card height, Pass an integer between 0 to 1024.', true)
    ->inject('user')
    ->inject('project')
    ->inject('dbForProject')
    ->inject('dbForConsole')
    ->inject('response')
    ->inject('heroes')
    ->inject('contributors')
    ->inject('employees')
    ->action(function (string $userId, string $mock, int $width, int $height, Document $user, Document $project, Database $dbForProject, Database $dbForConsole, Response $response, array $heroes, array $contributors, array $employees) use ($getUserGitHub) {
        $user = Authorization::skip(fn () => $dbForConsole->getDocument('users', $userId));

        if ($user->isEmpty() && empty($mock)) {
            throw new Exception(Exception::USER_NOT_FOUND);
        }

        if (!$mock) {
            $internalId = $user->getInternalId();
            $bgVariation = $internalId % 3 === 0 ? '1' : ($internalId % 3 === 1 ? '2' : '3');
            $cardVariation = $internalId % 2 === 0 ? '1' : '2';

            $name = $user->getAttribute('name', 'Anonymous');
            $email = $user->getAttribute('email', '');
            $createdAt = new \DateTime($user->getCreatedAt());

            $gitHub = $getUserGitHub($user->getId(), $project, $dbForProject, $dbForConsole);
            $githubName = $gitHub['name'] ?? '';
            $githubId = $gitHub['id'] ?? '';

            $isHero = \array_key_exists($email, $heroes);
            $isContributor = \in_array($githubId, $contributors);
            $isEmployee = \array_key_exists($email, $employees);
            $employeeNumber = $isEmployee ? $employees[$email]['spot'] : '';

            if ($isHero) {
                $createdAt = new \DateTime($heroes[$email]['memberSince'] ?? '');
            } else if ($isEmployee) {
                $createdAt = new \DateTime($employees[$email]['memberSince'] ?? '');
            }

            if (!$isEmployee && !empty($githubName)) {
                $employeeGitHub = \array_search(\strtolower($githubName), \array_map(fn ($employee) => \strtolower($employee['gitHub']) ?? '', $employees));
                if (!empty($employeeGitHub)) {
                    $isEmployee = true;
                    $employeeNumber = $isEmployee ? $employees[$employeeGitHub]['spot'] : '';
                    $createdAt = new \DateTime($employees[$employeeGitHub]['memberSince'] ?? '');
                }
            }

            $isPlatinum = $user->getInternalId() % 100 === 0;
        } else {
            $bgVariation = \str_ends_with($mock, '-bg2') ? '2' : (\str_ends_with($mock, '-bg3') ? '3' : '1');
            $cardVariation = \str_ends_with($mock, '-right') ? '2' : '1';
            $name = \str_starts_with($mock, 'normal-long') ? 'Sir First Walter O\'Brian Junior' : 'Walter O\'Brian';
            $createdAt = new \DateTime('now');
            $githubName = $mock === 'normal-no-github' ? '' : (\str_starts_with($mock, 'normal-long') ? 'sir-first-walterobrian-junior' : 'walterobrian');
            $isHero = \str_starts_with($mock, 'hero');
            $isContributor = \str_starts_with($mock, 'contributor');
            $isEmployee = \str_starts_with($mock, 'employee');
            $employeeNumber = match ($mock) {
                'employee' => '1',
                'employee-right' => '1',
                'employee-2digit' => '18',
                'employee-2digit-right' => '18',
                default => ''
            };

            $isPlatinum = \str_starts_with($mock, 'platinum');
        }

        if ($isEmployee) {
            $isContributor = false;
            $isHero = false;
        }

        if ($isHero) {
            $isContributor = false;
            $isEmployee = false;
        }

        if ($isContributor) {
            $isHero = false;
            $isEmployee = false;
        }

        $isGolden = $isEmployee || $isHero || $isContributor;
        $isPlatinum = $isGolden ? false : $isPlatinum;
        $memberSince = \strtoupper('Member since ' . $createdAt->format('M') . ' ' . $createdAt->format('d') . ', ' . $createdAt->format('o'));

        $baseImage = new \Imagick("public/images/cards/cloud/og-background{$bgVariation}.png");

        $cardType = $isGolden ? '-golden' : ($isPlatinum ? '-platinum' : '');

        $image = new Imagick("public/images/cards/cloud/og-card{$cardType}{$cardVariation}.png");
        $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 1008 / 2 - $image->getImageWidth() / 2, 1008 / 2 - $image->getImageHeight() / 2);

        $image = new Imagick("public/images/cards/cloud/og-background-logo.png");
        if ($cardVariation === '1') {
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 32, 1008 - $image->getImageHeight() - 32);
        } else {
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, 1008 - $image->getImageWidth() - 32, 1008 - $image->getImageHeight() - 32);
        }

        $image = new Imagick("public/images/cards/cloud/og-shadow{$cardType}.png");
        if ($cardVariation === '1') {
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, -450, 700);
        } else {
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, -20, 710);
        }

        if ($isEmployee) {
            $image = new Imagick('public/images/cards/cloud/employee.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $image->resizeImage(120, 120, Imagick::FILTER_LANCZOS, 1);
            $image->rotateImage(new ImagickPixel('#00000000'), $cardVariation === '1' ? -20 : 30);
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, $cardVariation === '1' ? 612 : 715, $cardVariation === '1' ? 203 : 425);

            $hashtag = new \ImagickDraw();
            $hashtag->setTextAlignment(Imagick::ALIGN_LEFT);
            $hashtag->setFont("public/fonts/Inter-Bold.ttf");
            $hashtag->setFillColor(new \ImagickPixel('#FFFADF'));
            $hashtag->setFontSize(20);
            $hashtag->setFontWeight(700);
            $metricsHashtag = $baseImage->queryFontMetrics($hashtag, '#');

            $text = new \ImagickDraw();
            $text->setTextAlignment(Imagick::ALIGN_LEFT);
            $text->setFont("public/fonts/Inter-Bold.ttf");
            $text->setFillColor(new \ImagickPixel('#FFFADF'));
            $text->setFontSize(\strlen($employeeNumber) <= 1 ? 36 : 28);
            $text->setFontWeight(700);
            $metricsText = $baseImage->queryFontMetrics($text, $employeeNumber);

            $group = new Imagick();
            $groupWidth = $metricsHashtag['textWidth'] + 6 + $metricsText['textWidth'];
            $group->newImage($groupWidth, $metricsText['textHeight'], '#00000000');

            $group->annotateImage($hashtag, 0, $metricsText['textHeight'], 0, '#');
            $group->annotateImage($text, $metricsHashtag['textWidth'] + 6, $metricsText['textHeight'], 0, $employeeNumber);

            if ($cardVariation === '1') {
                $group->rotateImage(new ImagickPixel('#00000000'), -22);

                if (\strlen($employeeNumber) <= 1) {
                    $baseImage->compositeImage($group, Imagick::COMPOSITE_OVER, 660, 245);
                } else {
                    $baseImage->compositeImage($group, Imagick::COMPOSITE_OVER, 655, 247);
                }
            } else {
                $group->rotateImage(new ImagickPixel('#00000000'), 32);

                if (\strlen($employeeNumber) <= 1) {
                    $baseImage->compositeImage($group, Imagick::COMPOSITE_OVER, 775, 465);
                } else {
                    $baseImage->compositeImage($group, Imagick::COMPOSITE_OVER, 767, 470);
                }
            }
        }


        if ($isContributor) {
            $image = new Imagick('public/images/cards/cloud/contributor.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $image->resizeImage(120, 120, Imagick::FILTER_LANCZOS, 1);
            $image->rotateImage(new ImagickPixel('#00000000'), $cardVariation === '1' ? -20 : 30);
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, $cardVariation === '1' ? 612 : 715, $cardVariation === '1' ? 203 : 425);
        }

        if ($isHero) {
            $image = new Imagick('public/images/cards/cloud/hero.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $image->resizeImage(120, 120, Imagick::FILTER_LANCZOS, 1);
            $image->rotateImage(new ImagickPixel('#00000000'), $cardVariation === '1' ? -20 : 30);
            $baseImage->compositeImage($image, Imagick::COMPOSITE_OVER, $cardVariation === '1' ? 612 : 715, $cardVariation === '1' ? 185 : 425);
        }

        setlocale(LC_ALL, "en_US.utf8");
        $name = \iconv("utf-8", "ascii//TRANSLIT", $name);
        $memberSince = \iconv("utf-8", "ascii//TRANSLIT", $memberSince);
        $githubName = \iconv("utf-8", "ascii//TRANSLIT", $githubName);

        $text = new \ImagickDraw();
        $text->setTextAlignment(Imagick::ALIGN_CENTER);
        $text->setFont("public/fonts/Poppins-Bold.ttf");
        $text->setFillColor(new \ImagickPixel('#FFFFFF'));

        if (\strlen($name) > 33) {
            $name = \substr($name, 0, 33);
        }

        if ($cardVariation === '1') {
            if (\strlen($name) <= 23) {
                $text->setFontSize(54);
            } else {
                $text->setFontSize(32);
            }
        } else {
            if (\strlen($name) <= 23) {
                $text->setFontSize(48);
            } else {
                $text->setFontSize(28);
            }
        }

        $text->setFontWeight(700);

        if ($cardVariation === '1') {
            $baseImage->annotateImage($text, 555, 605,  -22, $name);
        } else {
            $baseImage->annotateImage($text, 435, 590, 31.37, $name);
        }

        $text = new \ImagickDraw();
        $text->setTextAlignment(Imagick::ALIGN_CENTER);
        $text->setFont("public/fonts/Inter-SemiBold.ttf");
        $text->setFillColor(new \ImagickPixel($isGolden || $isPlatinum ? '#FFFFFF' : '#FFB9CC'));
        $text->setFontSize(21);
        $text->setFontWeight(600);
        $text->setTextKerning(1.12);

        if ($cardVariation === '1') {
            $baseImage->annotateImage($text, 585, 635,  -22, $memberSince);
        } else {
            $text->setFontSize(20);
            $baseImage->annotateImage($text, 412, 628, 31.37, $memberSince);
        }

        if (!empty($githubName)) {
            $text = new \ImagickDraw();
            $text->setTextAlignment(Imagick::ALIGN_LEFT);
            $text->setFont("public/fonts/Inter-Regular.ttf");
            $text->setFillColor(new \ImagickPixel('#FFFFFF'));
            $text->setFontSize(26);
            $text->setFontWeight(400);
            $metrics = $baseImage->queryFontMetrics($text, $githubName);

            $image = new Imagick('public/images/cards/cloud/github.png');
            $image->setGravity(Imagick::GRAVITY_CENTER);
            $image->resizeImage(32, 32, Imagick::FILTER_LANCZOS, 1);
            $precisionFix = 5;

            $group = new Imagick();
            $groupWidth = $metrics['textWidth'] + 32 + 4;
            $group->newImage($groupWidth, $metrics['textHeight'], '#00000000');

            $group->compositeImage($image, Imagick::COMPOSITE_OVER, 0, 0);
            $group->annotateImage($text, 32 + 4, $metrics['textHeight'] - $precisionFix, 0, $githubName);

            if ($cardVariation === '1') {
                $group->rotateImage(new ImagickPixel('#00000000'), -22);
                $x = 510 - $group->getImageWidth() / 2;
                $y = 530 - $group->getImageHeight() / 2;
                $baseImage->compositeImage($group, Imagick::COMPOSITE_OVER, $x, $y);
            } else {
                $group->rotateImage(new ImagickPixel('#00000000'), 31.11);
                $x = 485 - $group->getImageWidth() / 2;
                $y = 530 - $group->getImageHeight() / 2;
                $baseImage->compositeImage($group, Imagick::COMPOSITE_OVER, $x, $y);
            }
        }

        if (!empty($width) || !empty($height)) {
            $baseImage->resizeImage($width, $height, Imagick::FILTER_LANCZOS, 1);
        }

        $response
            ->addHeader('Expires', \date('D, d M Y H:i:s', \time() + (60 * 60 * 24 * 45)) . ' GMT') // 45 days cache
            ->setContentType('image/png')
            ->file($baseImage->getImageBlob());
    });

// TODO: 3D:
// $baseImage = new \Imagick("public/images/cards/cloud/front.png");
// $text = new \ImagickDraw();
// $text->setTextAlignment(Imagick::ALIGN_CENTER);
// $text->setFont("public/fonts/Poppins-Bold.ttf");
// $text->setFillColor(new ImagickPixel('#FFFFFF'));
// $text->setFontSize(58);
// $text->setFontWeight(700);
// $text->skewY(20);
// $text->skewX(20);
// $text->setGravity(Imagick::GRAVITY_CENTER);
// $text->annotation(350, 635, $name);
// $baseImage->drawImage($text);