<?php
declare(strict_types=1);
spl_autoload_register(function (string $class): void {
    if (str_starts_with($class, 'App\\')) {
        $path = __DIR__ . '/app/' . str_replace('\\', '/', substr($class, 4)) . '.php';
        if (is_file($path)) require $path;
    }
});
$config = require __DIR__ . '/config/local.example.php';
$config['environment'] = 'production';
if (is_file(__DIR__ . '/config/local.php')) {
    $config = array_replace_recursive($config, require __DIR__ . '/config/local.php');
}
date_default_timezone_set($config['timezone']);
return $config;
