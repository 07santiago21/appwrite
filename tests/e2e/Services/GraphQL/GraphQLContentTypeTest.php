<?php

namespace Tests\E2E\Services\GraphQL;

use CURLFile;
use Tests\E2E\Client;
use Tests\E2E\Scopes\ProjectCustom;
use Tests\E2E\Scopes\Scope;
use Tests\E2E\Scopes\SideServer;

class GraphQLContentTypeTest extends Scope
{
    use ProjectCustom;
    use SideServer;
    use GraphQLBase;

    public function testGraphQLContentType()
    {
        $projectId = $this->getProject()['$id'];
        $query = 'query { localeGetCountries { total countries { code } } }';
        $graphQLPayload = [$query]; // Needs to be an array because the test client expects it
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/graphql',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), $graphQLPayload);

        $this->assertIsArray($response['body']['data']);
        $this->assertArrayNotHasKey('errors', $response['body']);
        $response = $response['body']['data']['localeGetCountries'];
        $this->assertEquals(194, $response['total']);
    }

    public function testSingleQueryJSONContentType()
    {
        $projectId = $this->getProject()['$id'];
        $query = 'query { localeGetCountries { total countries { code } } }';
        $graphQLPayload = ['query' => $query];
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), $graphQLPayload);

        $this->assertIsArray($response['body']['data']);
        $this->assertArrayNotHasKey('errors', $response['body']);
        $response = $response['body']['data']['localeGetCountries'];
        $this->assertEquals(194, $response['total']);
    }

    public function testArrayBatchedJSONContentType()
    {
        $projectId = $this->getProject()['$id'];
        $query1 = 'query { localeGetCountries { total countries { code } } }';
        $query2 = 'query { localeGetContinents { total continents { code } } }';
        $graphQLPayload = [
            ['query' => $query1],
            ['query' => $query2],
        ];
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), $graphQLPayload);

        $this->assertIsArray($response['body']['data']);
        $this->assertArrayNotHasKey('errors', $response['body']);
        $this->assertArrayHasKey('localeGetCountries', $response['body']['data']);
        $this->assertArrayHasKey('localeGetContinents', $response['body']['data']);
        $this->assertEquals(194, $response['body']['data']['localeGetCountries']['total']);
        $this->assertEquals(7, $response['body']['data']['localeGetContinents']['total']);
    }

    public function testQueryBatchedJSONContentType()
    {
        $projectId = $this->getProject()['$id'];
        $query = '
            query {
                localeGetCountries { total countries { code } }
                localeGetContinents { total continents { code } }
            }
        ';
        $graphQLPayload = [
            ['query' => $query],
        ];
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), $graphQLPayload);

        $this->assertIsArray($response['body']['data']);
        $this->assertArrayNotHasKey('errors', $response['body']);
        $this->assertArrayHasKey('localeGetCountries', $response['body']['data']);
        $this->assertArrayHasKey('localeGetContinents', $response['body']['data']);
        $this->assertEquals(194, $response['body']['data']['localeGetCountries']['total']);
        $this->assertEquals(7, $response['body']['data']['localeGetContinents']['total']);
    }

    public function testMultipartFormDataContentType()
    {
        $projectId = $this->getProject()['$id'];

        $query = $this->getQuery(self::$CREATE_BUCKET);
        $gqlPayload = [
            'query' => $query,
            'variables' => [
                'bucketId' => 'unique()',
                'name' => 'Test Bucket',
                'permission' => 'bucket',
                'read' => ['role:all'],
                'write' => ['role:all'],
            ]
        ];
        $bucket = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), $gqlPayload);

        $bucket = $bucket['body']['data']['storageCreateBucket'];

        $query = $this->getQuery(self::$CREATE_FILE);
        $gqlPayload = [
            'operations' => \json_encode([
                'query' => $query,
                'variables' => [
                    'bucketId' => $bucket['_id'],
                    'fileId' => 'unique()',
                    'file' => null,
                    'permissions' => 'file',
                    'read' => ['role:all'],
                    'write' => ['role:all'],
                ]
            ]),
            'map' => \json_encode([
                'file' => ["variables.file"]
            ]),
            'file' => new CURLFile(realpath(__DIR__ . '/../../../resources/logo.png'), 'image/png', 'logo.png'),
        ];

        $file = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'multipart/form-data',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), $gqlPayload);

        $this->assertIsArray($file['body']['data']);
        $this->assertArrayNotHasKey('errors', $file['body']);
        $this->assertIsArray($file['body']['data']['storageCreateFile']);
    }

    public function testPostNoBody()
    {
        $projectId = $this->getProject()['$id'];
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()));

        $this->assertEquals('No query supplied.', $response['body']['message']);
    }

    public function testPostEmptyBody()
    {
        $projectId = $this->getProject()['$id'];
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), []);

        $this->assertEquals('No query supplied.', $response['body']['message']);
    }

    public function testPostRandomBody()
    {
        $projectId = $this->getProject()['$id'];
        $response = $this->client->call(Client::METHOD_POST, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()), ['foo' => 'bar']);

        $this->assertEquals('Invalid query.', $response['body']['message']);
    }

    public function testGetNoQuery()
    {
        $projectId = $this->getProject()['$id'];
        $response = $this->client->call(Client::METHOD_GET, '/graphql', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()));

        $this->assertEquals('No query supplied.', $response['body']['message']);
    }

    public function testGetEmptyQuery()
    {
        $projectId = $this->getProject()['$id'];
        $response = $this->client->call(Client::METHOD_GET, '/graphql?query=', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()));

        $this->assertEquals('Invalid query.', $response['body']['message']);
    }

    public function testGetRandomParameters()
    {
        $projectId = $this->getProject()['$id'];
        $response = $this->client->call(Client::METHOD_POST, '/graphql?random=random', \array_merge([
            'content-type' => 'application/json',
            'x-appwrite-project' => $projectId,
        ], $this->getHeaders()));

        $this->assertEquals('No query supplied.', $response['body']['message']);
    }
}
