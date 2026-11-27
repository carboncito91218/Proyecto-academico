<?php
return [
    'environment' => 'development',
    'timezone' => 'America/Lima',
    'academic_period' => '2026-2',
    'demo_password' => '', // Solo se usa al ejecutar bin/seed.php en development.
    'database' => [
        'host' => '127.0.0.1', 'port' => 5432,
        'name' => 'proyecto_academico', 'user' => 'proyecto_app',
        'password' => '',
    ],
];
