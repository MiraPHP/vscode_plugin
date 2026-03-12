# VS Code Extension Prompt: MiraPHP Goto Navigation Features

## Project Overview

This plugin is built for the MiraPHP framework, a custom PHP framework with a routing system similar to Laravel/Symfony. The codebase includes:

- **Controllers** organized in namespaces under `app/Controllers/`
- **Models** in `app/Models/`
- **Views** in `web/views/`
- **Routes** defined in `web/routes/`
- **Helpers** in `app/Helpers/`
- **Configuration** in `app/Config/`

and blade support for templating (.blade.php) in views.

## Goto Navigation Features Implementation

### 1. Route to Controller Navigation

The router defines routes using the following patterns:

#### Static Routes
```php
$router->get('/path', 'Controller@method');
$router->post('/path', 'Namespace/Controller@method');
$router->addRoute(['GET', 'POST'], '/path', 'Namespace/Controller@method');
```

#### Grouped Routes
```php
$router->group('/prefix', function ($router) {
    $router->get('/path', 'Controller@method');
});
```

#### Named Routes
```php
$router->get('/path', 'Controller@method')->name('route.name');
```

--
Rough dump:
<?php
// web\index.php

/** SYSTEM BOOTSTRAP
 ** Load essential helpers and configs
 ** DO NOT MODIFY THIS FILE
 **/

require_once __DIR__ . '/../app/Config/ConfigLoader.php';
require_once __DIR__ . '/../app/Helpers/Core/Logger.php';
require_once __DIR__ . '/../app/Helpers/Core/ErrorHandler.php';
require_once __DIR__ . '/../app/Config/Database.php';
require_once __DIR__ . '/../app/router.php';
$router->loadCache(__DIR__ . '/../storage/cache/routes.cache.php');

$priority = [
    'apis.php',
    'sub.php',
];

foreach ($priority as $file) {
    $path = __DIR__ . "/routes/$file";
    if (file_exists($path)) {
        require_once $path;
    }
}

// Load everything else
foreach (glob(__DIR__ . '/routes/*.php') as $routeFile) {
    if (!in_array(basename($routeFile), $priority)) {
        require_once $routeFile;
    }
}

/** REQUEST DISPATCHER
 ** Flow requests
 **/
$requestUri = strtolower(rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$router->dispatch($_SERVER['REQUEST_METHOD'], $requestUri);

---

Chat (chat.domain/...)
$router->domain('chat.' . PROJECT_BASE_URL_DIRECT, function ($router) {
    ### API
    $router->group('/api', function ($router) {
        $router->addRoute(['GET', 'POST'], '', 'Domains/Apis/MiragekChatMaster@index');
        $router->addRoute(['GET', 'POST'], '/send', 'Domains/Apis/MiragekChatMaster@chat');
        $router->addRoute(['GET', 'POST'], '/stream', 'Domains/Apis/MiragekChatMaster@streamChat');
        $router->addRoute(['GET', 'POST'], '/history/{page}', 'Domains/Apis/MiragekChatMaster@sidebarHistory')->name('chat.index');
        $router->addRoute(['GET', 'POST'], '/delete', 'Domains/Apis/MiragekChatMaster@deleteChat');
        $router->addRoute(['GET', 'POST'], '/feedback', 'Domains/Apis/MiragekChatMaster@feedback');
        $router->addRoute('GET', '/conversation/{reference}', 'Domains/Apis/MiragekChatMaster@getChat');

        // Artifact APIs
        $router->group('/artifacts', function ($router) {
            $router->addRoute(['GET', 'POST'], '', 'Apis/ArtifactController@index');
            $router->addRoute(['GET', 'POST'], '/get/{id}', 'Apis/ArtifactController@get');
            $router->addRoute(['GET', 'POST'], '/update/{id}', 'Apis/ArtifactController@update');
            $router->addRoute(['GET', 'POST'], '/create', 'Apis/ArtifactController@create');
            $router->addRoute(['GET', 'POST'], '/delete/{id}', 'Apis/ArtifactController@delete');
            $router->addRoute(['GET', 'POST'], '/user', 'Apis/ArtifactController@getUserArtifacts');
            $router->addRoute(['GET', 'POST'], '/search', 'Apis/ArtifactController@searchArtifacts');
            $router->addRoute(['GET', 'POST'], '/share/{id}', 'Apis/ArtifactController@share');
            $router->addRoute(['GET', 'POST'], '/shared/check/{id}', 'Apis/ArtifactController@checkShared');
            $router->addRoute(['GET', 'POST'], '/shared/{shareToken}', 'Apis/ArtifactController@shared');
            $router->addRoute(['GET', 'POST'], '/unshare/{shareToken}', 'Apis/ArtifactController@unshare');
            $router->addRoute(['GET', 'POST'], '/stopedshared/{id}', 'Apis/ArtifactController@stopSharing');
        });
    });
    ### WEB
    $router->group('', function ($router) {
        $router->addRoute('GET', '/', 'Domains/Web/GeneralController@chat')->name('domain.chat');
        $router->addRoute('GET', '/call/{ref}', 'Domains/Web/GeneralController@voiceCall')->name('domain.voiceCall');
        $router->addRoute('GET', '/{reference}', 'Domains/Web/GeneralController@chat')->name('domain.chat.ref');
    });
});

---

### 2. Navigation Capabilities Needed

#### From Route Definitions to Controllers
- Detect controller references in route definitions: `'Namespace/Controller@method'`
- Parse namespace to file path: `Controllers\Api\SomeController` → `app/Controllers/Api/SomeController.php`
- Navigate to the specific method: `someMethod` in the target file

#### From Controllers to Routes
- Detect controller@method references in routes
- Allow navigation from `Controller@method` to its route definition

#### From Views to Files
- Detect view calls like `\Helpers\Core\View::make('view.path')`
- Convert dot notation to file path: `'users.profile'` → `web/views/users/profile.php`

#### From Route Names to Definitions
- Navigate from route name calls like `$router->route('route.name', [...])` to its definition

### 3. Key Patterns to Support

#### Controller Pattern Recognition
- Pattern: `Namespace/Controller@methodName` 
- Conversion: Replace `/` with `\` to form namespace: `Controllers\Namespace\Controller`
- Method: Navigate to `methodName` within the controller class

#### View Pattern Recognition
- Pattern: `view('path.to.view')` or `View::make('path.to.view')`
- Conversion: `'users.profile'` → `web/views/users/profile.php`

#### Model Pattern Recognition
- Pattern: `Models\ModelName`
- Location: `app/Models/ModelName.php`

#### Helper Pattern Recognition
- Pattern: `Helpers\HelperName\functionName`
- Location: `app/Helpers/HelperName.php`

### 4. Route Definition Locations

#### Main Route Files
- `web/routes/apis.php`: API routes (prefixed with /api)
- `web/routes/pages.php`: Page routes (frontend views)
- `web/routes/sub.php`: Subdomain routes
- `web/routes/admins.php`: Admin routes
- `web/routes/demos.php`: Demo routes

#### Route Structure
Routes are defined with various HTTP methods:
- `$router->get(path, handler)`
- `$router->post(path, handler)`
- `$router->put(path, handler)`
- `$router->delete(path, handler)`
- `$router->patch(path, handler)`
- `$router->options(path, handler)`
- `$router->any(path, handler)`

### 5. Controller Organization

#### Namespace Structure
```
Controllers/
├── Agents/
├── Apis/
├── Auth/
├── Desk/
├── Domains/
│   ├── Apis/
│   └── Web/
├── Funds/
├── Landing/
├── Tools/
└── [Root Controllers]
```

#### Base Controller
- Controllers extend `Controllers\Controller`
- Base controller provides [view()](file:///c:/laragon/www/MiragekAI/app/Controllers/Controller.php#L22-L32) and [json()](file:///c:/laragon/www/MiragekAI/app/Controllers/Controller.php#L34-L41) helper methods

### 6. Specific Implementation Requirements

#### 1. Route to Controller Goto
- Parse route handler strings: `'Namespace/Controller@method'`
- Convert to file path: `app/Controllers/Namespace/Controller.php`
- Navigate to method within file: `[method]()`

#### 2. Controller to Route Goto
- Find usages of controller in route files
- Implement search for `'Namespace/Controller@method'` patterns

#### 3. Named Route Navigation
- Identify named routes: `->name('route.identifier')`
- Find usages of route function: `$router->route('route.identifier', ...)`

#### 4. View Navigation
- Identify view calls: `view('path.to.view')`, `\Helpers\Core\View::make('path.to.view')`
- Convert dots to directory separators: `path/to/view.php` in `web/views/`

#### 5. Model Navigation
- Identify model instantiations: `new Models\User()`, `Models\User::find()`
- Navigate to corresponding file: `app/Models/User.php`

### 7. File Path Conversions

#### Controller Paths
- Route reference: `'Apis/TasksController@listTasks'`
- PHP namespace: `Controllers\Apis\TasksController`
- File path: `app/Controllers/Apis/TasksController.php`
- Method: `listTasks()`

#### View Paths
- View call: `view('users.profile.settings')`
- File path: `web/views/users/profile/settings.php`

#### Model Paths
- Reference: `Models\User`
- File path: `app/Models/User.php`

### 8. Special Considerations

#### Route Parameters
- Parameterized routes: `/users/{id}`, `/posts/{postId}/comments/{commentId}`
- Support navigation to appropriate controller methods

#### Route Groups
- Nested routes in groups: `/api/books/{id}/chapters/{chapterId}`
- Handle prefixed paths correctly

#### Subdomain Routes
- Special handling for subdomain routes in `web/routes/sub.php`
- Domain-specific route definitions

#### Middleware References
- Route middleware: `$router->middleware('MiddlewareName')`
- Navigate to middleware files: `app/Middlewares/MiddlewareName.php`

This extension should provide comprehensive navigation capabilities for the MiraPHP framework project, allowing developers to quickly jump between routes, controllers, views, models, and other related components.