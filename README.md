# ProyectoAcademicoDesarrollo

Módulo de proyectos académicos ISUR en PHP puro, PostgreSQL, HTML, CSS y JavaScript.

Esta entrega incluye la gestión de rúbricas y el catálogo con PostgreSQL, sobre la infraestructura del paso 1. La demo del equipo se abre explícitamente en demo.php.

## Abrir en Visual Studio Code

Extrae el ZIP y abre la carpeta ProyectoAcademicoDesarrollo mediante Archivo > Abrir carpeta. También puedes abrir ProyectoAcademicoDesarrollo.code-workspace.

## Responsabilidades

| Carpeta | Responsabilidad |
| --- | --- |
| app/Controllers | Recibir solicitudes HTTP, obtener la identidad del servidor y construir respuestas. |
| app/Services | Coordinar casos de uso y transacciones: enviar, revisar, confirmar, etc. |
| app/Domain | Entidades, reglas y estados del negocio, independientes de las vistas y del acceso concreto a datos. |
| app/Repositories | Consultas y persistencia PostgreSQL mediante PDO; sin HTML. |
| app/AcademicSystem | Lectura de datos académicos simulados; punto para una integración futura. |
| app/Views | Vistas PHP agrupadas como en la entrega del frontend. |
| public/assets | CSS, imágenes y fuentes; conserva la ruta del frontend recibido. |
| public/src | JavaScript del frontend, con subcarpetas data y views como en la entrega. |
| config | Configuración de aplicación y base de datos. |
| routes | Definición de rutas HTTP. |
| database/migrations | Cambios versionados del esquema SQL. |
| database/seeds | Datos iniciales de desarrollo del módulo. |
| data/academic | JSON del sistema externo simulado, consultados por PHP fuera de public. |
| storage/logs | Registros de ejecución. |
| tests/Unit | Pruebas de reglas y estados del negocio. |
| tests/Integration | Pruebas de persistencia, permisos y flujos completos. |

## Convenciones iniciales

- public será la raíz pública del servidor.
- Se conservan las rutas del frontend para facilitar su incorporación.
- Las reglas y permisos definitivos se comprueban en PHP.
- La fuente de verdad v2 rige los comportamientos; sus decisiones pendientes siguen siendo supuestos.
- El paso 1 prepara la infraestructura. Los servicios de negocio se conectan en pasos posteriores.

## Paso 1 implementado

Se incorporaron las vistas y recursos entregados en la carpeta hermana `mvp academico`. La demostración se conserva en demo.php con su adaptador simulado y localStorage. El backend cuenta con arranque común, proveedor académico privado, sesión de desarrollo, conexión PDO y migraciones. El paso 2 conecta el CRUD de rúbricas.

Requisitos PHP 8.1 o posterior con PDO PostgreSQL y PostgreSQL activo. Los comandos se ejecutan desde esta raíz, respetando espacios y paréntesis.

```bash
cd '/home/manuel/Documentos/Proyecto Academico/ProyectoAcademicoDesarrollo (2)'
php bin/check-db.php
php bin/migrate.php
php bin/migrate.php
php bin/migrations-status.php
php tests/Unit/run.php
php tests/Integration/database.php
find app config public bin tests -name '*.php' -exec php -l '{}' \;
php -l bootstrap.php
php -S 127.0.0.1:8000 -t public
```

Configura la contraseña en `config/local.php`, campo `database.password`. El archivo ya está creado con permisos 0600 y está excluido de Git. En una copia nueva, crea ese archivo a partir de `config/local.example.php`. Nunca compartas la contraseña por chat. Host previsto 127.0.0.1, puerto 5432, base proyecto_academico y cuenta proyecto_app. La ausencia del archivo local deja el entorno en producción y deshabilita el selector.

El diagnóstico muestra base y usuario reales. El migrador solo opera en development, comprueba el destino, inspecciona tablas existentes y falla sin borrar datos si requieren adaptación. El comando de integración usa transacciones revertidas para comprobar integridad y rollback. Requiere migraciones aplicadas.

Abre `/dev-identity.php` para seleccionar una identidad PHP de desarrollo mediante POST con CSRF. El rol siempre procede del proveedor. El portal real y este selector comparten sesión PHP. El selector de demo.php pertenece al simulador. Las migraciones y los diagnósticos funcionan sin cookies. La autenticación institucional sigue pendiente.

El backend lee `data/academic/academico.json`. La copia pública original se conserva para la demo. `ejemplos.json` permanece como ejemplo del frontend, sin importación automática en PostgreSQL. El servidor usa el reloj real y America/Lima configurable. La auditoría SQL usa UTC.

Consulta `docs/ESQUEMA_BD.md`, `docs/DECISIONES_PENDIENTES.md` y `docs/VERIFICACION.md` para restricciones, supuestos y resultados de comprobación.

## Paso 2 implementado

Inicia el servidor con el comando anterior y abre http://127.0.0.1:8000/. Selecciona Profesor A y pulsa «Entrar al módulo». En «Mis rúbricas», crea una rúbrica con curso, título, criterios, dos competencias y plazo. Recarga para verificar que conserva sus IDs y datos. Cambia a Estudiante 01 desde el selector del portal para consultar el catálogo. Puedes filtrar por cualquier curso, incluidos los que podrá cubrir otro integrante del equipo.

El catálogo se vuelve a consultar al entrar en Rúbricas y al recargar. La recepción está abierta hasta el día del plazo inclusive, siempre antes de la caducidad externa. El profesor ve también sus rúbricas vencidas. Las fechas externas proceden de `data/academic/academico.json` y el plazo individual procede de PostgreSQL.

Una rúbrica con propuestas enviadas solo permite ampliar el plazo. Al eliminar con borradores vinculados, sus vínculos y sustentos se archivan en el historial antes de retirarlos. El borrador conserva contenido y equipo, con su versión incrementada. Puede quedar incompleto si era su última rúbrica. La confirmación de eliminación explica ese efecto. Los servicios registran los cambios y eliminaciones de rúbricas en `historial`.

La entrada de demostración completa es http://127.0.0.1:8000/demo.php, disponible en development. Sus acciones se guardan en localStorage. El módulo real permite conservar la selección de catálogo en memoria, con aviso del paso pendiente al pulsar «Preparar propuesta». El envío y guardado de propuestas, sus revisiones, seguimiento y calendario completo corresponden a los pasos siguientes.

### Comprobaciones adicionales

Con las migraciones aplicadas y el servidor ejecutándose para la prueba HTTP:

```bash
php tests/Integration/rubrics.php
node tests/Integration/http-rubrics.mjs http://127.0.0.1:8000
```

La prueba PHP revierte su transacción completa. La prueba HTTP usa el adaptador real y crea registros temporales, que retira junto con su historial al finalizar. Ejecútala en development con los fixtures externos de demostración (`s1`, `t1`, `t2`, `c1`, `c2`, `c3`). Requiere Node.js con fetch, Headers y Response. En este equipo el ejecutable disponible es `/usr/lib/chatgpt/resources/cua_node/bin/node`, que puede sustituir a `node` en el comando.

### API del módulo

Todas las rutas se sirven desde `public/` y devuelven JSON sin caché.

| Método y ruta | Uso |
| --- | --- |
| GET api.php?op=session | Token CSRF y opciones de identidad de desarrollo. |
| POST api.php?op=profile | `{id}` selecciona identidad de desarrollo en sesión. |
| GET api.php?op=read | Snapshot autorizado para alumno o profesor. |
| GET api.php?op=detail&id=UUID | Detalle de rúbrica propia o abierta para alumno. |
| POST api.php?op=saveRubric | `{id?, title, criteria, course, competencies, deadline, version?}` crea o actualiza. `{id, remove:true, version?}` elimina. |

Los POST requieren `Content-Type: application/json` y cabecera `X-CSRF-Token` obtenida de sesión. `teacher`, autor y rol enviados por el cliente se ignoran. Los errores usan 400 para JSON inválido, 401 para sesión ausente, 403 para permisos/CSRF, 404 para detalle no disponible, 409 para vínculos, bloqueo o versión obsoleta y 422 para datos inválidos. Un servicio no disponible devuelve 503 sin SQL ni secretos. El adaptador conserva `read()` y `execute()` del frontend.

Este módulo local usa datos académicos externos simulados. La autenticación institucional continúa pendiente.
