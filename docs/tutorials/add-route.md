# Adding Route 🛡

This document is part of the Appwrite contributors' guide. Before you continue reading this document make sure you have read the [Code of Conduct](https://github.com/appwrite/appwrite/blob/master/CODE_OF_CONDUCT.md) and the [Contributing Guide](https://github.com/appwrite/appwrite/blob/master/CONTRIBUTING.md).

### 1. Alias
Setting an alias allows the route to be also accessible from the alias URL.
The first parameter specifies the alias URL, the second parameter specifies default values for route parameters. 
```php
App::post('/v1/storage/buckets/:bucketId/files')
    ->alias('/v1/storage/files', ['bucketId' => 'default'])
```

### 2. Description
Used as an abstract description of the route. 
```php
App::post('/v1/storage/buckets/:bucketId/files')
->desc('Create File')
```

### 3. Groups
Groups array is used to group one or more routes with one or more hooks functionality.
```php
App::post('/v1/storage/buckets/:bucketId/files')
->groups(['api'])
```
In the above example groups() is used to define the current route as part of the routes that shares a common init middleware hook. 
```php
App::init()
->groups(['api'])
->action(
  some code.....
);
```


### 4. The Labels Mechanism
Labels are very strait forward and easy to use and understand, but in the same time very robust.
Labels are passed from the controllers route and used to pick up key-value pairs to be handled in a centralized place
along the road.
Labels can be used to pass a pattern in order to be replaced in the other end.
Appwrite uses different labels to achieve different things, for example:

#### Scope
* scope - Defines the route permissions scope.

```php
App::post('/v1/storage/buckets/:bucketId/files')
    ->label('scope', 'files.write')
```

### Audit
* audits.event - Identify the log in human-readable text.
* audits.userId - Signals the extraction of $userId in places that it's not available natively.
* audits.resource - Signals the extraction part of the resource.


```php
App::post('/v1/account/create')
->label('audits.event', 'account.create')
->label('audits.resource', 'user/{response.$id}')
->label('audits.userId', '{response.$id}')
```

### Sdk
* sdk.auth - Array of authentication types is passed in order to impose different authentication methods in different situations.
* sdk.namespace - Refers to the route namespace.
* sdk.method - Refers to the sdk method that needs to called.
* sdk.description - Description of the route, using md file format.
* sdk.sdk.response.code - Refers to the route http response status code expected.
* sdk.auth.response.model - Refers the route http response expected.

```php
App::post('/v1/account/jwt')
->label('sdk.auth', [APP_AUTH_TYPE_SESSION])
->label('sdk.namespace', 'account')
->label('sdk.method', 'createJWT')
->label('sdk.description', '/docs/references/account/create-jwt.md')
->label('sdk.response.code', Response::STATUS_CODE_CREATED)
->label('sdk.response.type', Response::CONTENT_TYPE_JSON)
->label('sdk.response.model', Response::MODEL_JWT)
```

### Cache
* cache - When set to ture, signal the use of file cache. 
* cache.resource - Identifies the cached resource.

```php
App::get('/v1/storage/buckets/:bucketId/files/:fileId/preview')
->label('cache', true)
->label('cache.resource', 'file/{request.fileId}')
```

### Abuse
* abuse-key - Specifies routes uniq abuse key.
* abuse-limit - Specifies the number of times the route can be requested in a time frame, per route.
* abuse-time - Specifies the time frame relevancy of the all other abuse definitions, per route.

```php
App::post('/v1/storage/buckets/:bucketId/files')
    ->label('abuse-key', 'ip:{ip},method:{method},url:{url},userId:{userId}')
    ->label('abuse-limit', APP_LIMIT_WRITE_RATE_DEFAULT)
    ->label('abuse-time', APP_LIMIT_WRITE_RATE_PERIOD_DEFAULT)
```

### Events
* event - A pattern that is associated with the route in behalf of realtime messaging.
  Placeholders marked as [] are parsed and replaced with their real values.

```php
App::post('/v1/storage/buckets/:bucketId/files')
    ->label('event', 'buckets.[bucketId].files.[fileId].create')
```

### Usage
* usage.metric - .
* usage.params - .
```php
App::post('/v1/storage/buckets/:bucketId/files')
    ->label('usage.metric', 'files.{scope}.requests.create')
    ->label('usage.params', ['bucketId:{request.bucketId}'])
```

### 5. Param
As the name implies, `param()` is used to define a request parameter.

param() aspects 7 parameters :
* A key (name) 
* A default value
* An instance of a relevant validator class
* Description of the parameter
* Is the route optional
* An array of injections
```php
App::get('/v1/account/logs')
   ->param('queries', [], new Queries(new Limit(), new Offset()), 'Array of query strings generated using the Query class provided by the SDK. [Learn more about queries](https://appwrite.io/docs/databases#querying-documents). Only supported methods are limit and offset', true)
```


### 6. inject
inject is used to inject dependencies pre-bounded to the app.

```php
App::post('/v1/storage/buckets/:bucketId/files')
->inject('user')
```

In the example above, the user object is injected into the route pre-bounded using `App::setResource()`.

```php
App::setResource('user', function() {
some code...
});
```

### 6. Action
Action populates the actual routes code and has to be very clear and understandable. 

```php
App::post('/v1/account/sessions/anonymous')
    ->action(function (Request $request) {
    some code...
});
```
