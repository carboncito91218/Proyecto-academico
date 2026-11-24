# Verificación del paso 1

Entorno observado Fedora Linux 45, PHP 8.5.13, PDO y pdo_pgsql disponibles.

## Realizadas

- 29 archivos PHP sin errores de sintaxis, incluido bootstrap.php.
- 14 comprobaciones unitarias satisfactorias mediante php tests/Unit/run.php. Cubren identidades, matrícula, cursos, periodo, candidatos, datos inexistentes, archivo ausente, JSON roto, campos ausentes, sesión ausente, entorno de producción, CSRF y rol resuelto desde proveedor.
- Servidor PHP iniciado y probado fuera del sandbox tras la autorización. GET de raíz, CSS, adaptador y selector devuelve 200. POST con CSRF inválido devuelve 403. POST válido devuelve 200 y conserva t1 en sesión.
- Los comandos check-db, migrate, migrations-status e integración terminan con código 1 e indican el campo ausente sin imprimir secretos. Se repitió migrate con el mismo bloqueo.

## Bloqueadas

Falta database.password en config/local.php. No se abrió conexión a PostgreSQL, no se inspeccionó el esquema real ni se aplicaron migraciones. Quedan pendientes la autenticación con proyecto_app, idempotencia de migraciones aplicadas, comprobaciones SQL de FK, unicidad, misma rúbrica, estados, observaciones y rollback. La suite de integración está preparada para ejecutarlas tras configurar la contraseña y migrar.

Completar localmente el campo y ejecutar los comandos del README en orden. Si hay tablas existentes sin registro, el migrador requiere revisar y adaptar ese esquema antes de aplicar cambios. No se ha verificado interacción visual completa de las pantallas de demostración.

7z no pudo abrir el RAR v5. Se usaron los documentos y código existentes en la carpeta hermana extraída mvp academico. Los originales permanecen allí como referencia.

# Verificación del paso 2 — 23 de noviembre de 2026

## Realizadas

- Conexión real confirmada mediante `php bin/check-db.php`, con base proyecto_academico y usuario proyecto_app. La contraseña ya estaba configurada localmente. El primer intento dentro del sandbox falló. La misma conexión fuera del sandbox funcionó.
- `php bin/migrate.php` inspeccionó el esquema vacío y aplicó 001_base.sql. Después aplicó 002_rubrica_version.sql, conservando 001. La última repetición omitió ambas migraciones. `php bin/migrations-status.php` confirmó los dos registros.
- `php tests/Unit/run.php` pasó las 14 comprobaciones de proveedor e identidad del paso 1.
- `php tests/Integration/database.php` pasó las restricciones SQL del paso 1 y comprobó rollback sin residuos.
- `php tests/Integration/rubrics.php` pasó permisos de alumno/profesor ajeno, validaciones, fechas de catálogo, cobertura de cursos externos, persistencia de IDs, reordenamiento de competencias, conflictos de versión, borradores y archivo de sus vínculos/sustentos al eliminar, bloqueo por propuesta enviada, prórroga, eliminación y rollback de una edición parcial. Todos sus datos se revirtieron.
- `node tests/Integration/http-rubrics.mjs` pasó usando el ejecutable Node de Codex indicado en README. Importó el adaptador real, usó cookies PHP y comprobó selección de identidad, CSRF, errores 401/403/422, creación, detalle, nuevas lecturas con IDs estables, cambio a alumno, edición ajena rechazada, vencimiento, prórroga, eliminación y carga de raíz/demo/recursos. La prueba terminó con código 0 y limpió sus registros e historial.
- La primera ejecución HTTP se interrumpió por un fallo interno de Node/Undici al no consumir respuestas de recursos. Se corrigió el test para consumirlas. Una segunda ejecución detectó una expectativa incorrecta de 404 para una ruta privada que el servidor integrado resuelve al portal. Se comprobó que devuelve HTML público. Ambas incidencias quedaron corregidas y los datos de prueba fueron retirados.
- 37 archivos PHP pasaron la revisión de sintaxis, incluido bootstrap.php. Se validaron los seis módulos JavaScript modificados y la prueba HTTP como módulos ESM.

## Límite de verificación

El acceso CUA al navegador devolvió `The browser access host is unavailable`. Por ello no se ejecutó interacción visual ni recarga mediante la interfaz de un navegador. Las nuevas lecturas y la persistencia se comprobaron mediante HTTP con el mismo adaptador usado por la interfaz. La verificación visual queda pendiente.

El servidor PHP de prueba se ejecutó en 127.0.0.1:8000 y se detuvo al terminar. Para abrir el flujo local, ejecutar el comando del README. Los datos académicos siguen siendo fixtures JSON y la autenticación institucional sigue pendiente.

Los bloqueos por contraseña indicados en el informe anterior describen la ejecución del paso 1. La conexión y las comprobaciones SQL quedaron verificadas durante el paso 2.
