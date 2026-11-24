<?php
$config = require dirname(__DIR__) . '/bootstrap.php';
if ($config['environment'] !== 'development') { http_response_code(404); exit; }
$demo = true;
require dirname(__DIR__) . '/app/Views/portal.php';
