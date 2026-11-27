# Proyectos académicos ISUR

Módulo local en PHP puro, PostgreSQL y JavaScript. Conserva el flujo de rúbricas y propuestas de los pasos 1–3, con datos académicos y acceso de demostración en PostgreSQL. La interfaz de login procede de la entrega del compañero.

## Preparar y ejecutar

Requiere PHP 8.1 o posterior con PDO PostgreSQL, PostgreSQL y `pg_dump` para respaldos. El navegador debe admitir módulos JavaScript.

En una instalación nueva, crea `config/local.php` a partir de `config/local.example.php`. Configura el entorno `development`, host, puerto, base, usuario y contraseña de PostgreSQL. Define también `demo_password`, una clave local de demostración de al menos 12 caracteres que usará la semilla al crear sus cuentas. La instancia preparada durante esta actualización ya tiene esa clave definida en su archivo local privado.

`config/local.php` está excluido de Git. El ejemplo contiene campos vacíos para las contraseñas. Las cuentas de demostración se admiten únicamente cuando el entorno es `development`.

Desde la raíz real del proyecto:

```bash
php bin/check-db.php
php bin/backup.php
php bin/migrate.php
php bin/seed.php
php -S 127.0.0.1:8000 -t public
```

El destino previsto es `127.0.0.1:5432`, base `proyecto_academico` y usuario `proyecto_app`. El respaldo es necesario antes de actualizar una base con datos. `bin/backup.php` usa `pg_dump` y, por defecto, crea un archivo privado en el directorio temporal del sistema. Se puede indicar una ruta de destino fuera del directorio público:

```bash
php bin/backup.php /ruta/privada/proyecto-academico.dump
```

El migrador inspecciona el esquema, registra cada SQL con SHA-256 y omite los ya aplicados. Las migraciones 001–004 conservan sus bytes originales. La 005 crea los catálogos, transforma los estados existentes mediante su código y añade las tablas académicas y de acceso. Los IDs, decisiones, avisos y datos históricos del módulo se conservan.

La semilla es un comando explícito. El arranque del servidor y las peticiones HTTP consultan los datos preparados. Repetir la semilla conserva nombres, matrículas, hashes, contenido y plazos existentes. Cambiar `demo_password` después de crear las cuentas conserva sus hashes anteriores; ese campo es la clave de creación de cuentas nuevas y una rotación posterior debe ser explícita.

Abre http://127.0.0.1:8000/. Una sesión anónima se dirige a `/login.html`. El formulario pide correo y después contraseña. El servidor verifica el hash, regenera la sesión y obtiene de ella la persona que realiza cada acción. «Cerrar sesión» envía POST con CSRF y vuelve al login.

En Windows, instala PHP con `pdo_pgsql` y el servicio PostgreSQL. Comprueba `php -v` y `php -r "print_r(PDO::getAvailableDrivers());"`. Crea la base y cuenta locales indicadas, configura `config/local.php` y ejecuta los mismos comandos desde PowerShell. Los datos de otra instalación se transfieren mediante respaldo/restauración explícitos.

## Cuentas y datos de demostración

Todas las personas siguientes son ficticias. La clave común de esta instalación se obtiene localmente del campo `demo_password` de `config/local.php`. Las contraseñas y sus hashes se mantienen fuera de `public/`.

| ID | Persona | Rol | Correo |
| --- | --- | --- | --- |
| s1 | Lucía Salazar Montes | Alumna | lucia.salazar@isur.edu.pe |
| s2 | Mateo Rivas León | Alumno | mateo.rivas@isur.edu.pe |
| s3 | Valeria Paredes Soto | Alumna | valeria.paredes@isur.edu.pe |
| s4 | Diego Cárdenas Ruiz | Alumno | diego.cardenas@isur.edu.pe |
| s5 | Camila Torres Vidal | Alumna | camila.torres@isur.edu.pe |
| s6 | Andrés Medina Flores | Alumno | andres.medina@isur.edu.pe |
| t1 | Elena Vargas Peña | Profesora | elena.vargas@isur.edu.pe |
| t2 | Javier Núñez Ramos | Profesor | javier.nunez@isur.edu.pe |
| t3 | Sofía Benavides Gil | Profesora | sofia.benavides@isur.edu.pe |

Se preparan dos carreras, seis alumnos, tres docentes, cinco cursos con ciclo, matrículas y docencia por periodo. Los IDs `s1`…`s5`, `t1`…`t3` y `c1`…`c3` se mantienen. Lucía cursa Programación web y Base de datos; Mateo cursa Base de datos y Diseño de interfaces. Ambos pueden formar un equipo que cubra las tres rúbricas de ejemplo. Diego y Andrés pertenecen a Administración y permiten comprobar el filtro por carrera.

Las tres rúbricas propias del módulo son Aplicación web para servicios del campus, Modelo de datos del proyecto y Experiencia de usuario del proyecto. Incluyen criterios y dos competencias cada una. Sus claves de semilla dependen del periodo. Las rúbricas anteriores siguen conservando sus IDs, contenido y plazo. Las asignaciones docente–curso se guardan como datos de demostración; la creación de rúbricas mantiene la regla vigente de validar un curso existente.

Para recorrer el flujo, entra como Lucía, selecciona las rúbricas web y datos, añade a Mateo y guarda un borrador o envíalo con sus sustentos. Cierra sesión y entra como Elena para verificar competencias y observar. Vuelve como Lucía para corregir y reenviar. Elena y Javier pueden aprobar sus respectivos vínculos indicando las fechas. La segunda aprobación crea un único proyecto pendiente.

## Fuente académica, periodos y estados

`PostgresAcademicProvider` implementa el contrato de lectura del sistema académico. Consulta `personas`, `alumnos`, `docentes`, `carreras`, `cursos`, `periodos_academicos`, `matriculas` y `docencia_curso`. Los accesos relacionan una persona con su hash y su habilitación para desarrollo. Los servicios mantienen las validaciones de rol, carrera, matrícula y cobertura.

La configuración `academic_period` selecciona de forma determinista el periodo. El preparado por defecto es `2026-2`, con inicio el 17 de agosto de 2026, caducidad el 4 de diciembre y límite de notas el 22 de diciembre. Las nuevas rúbricas de semilla reciben el 2 de diciembre como plazo. El plazo de cada rúbrica procede de PostgreSQL y es inclusivo. A las 00:00 del día de caducidad, en `America/Lima` configurable, se cierran nuevos envíos, correcciones y decisiones y se caducan los vínculos pendientes u observados con su motivo.

La semilla exige fechas explícitas para un periodo distinto del predeterminado. Si las fechas existentes difieren, se detiene para conservarlas. Si los plazos de las nuevas rúbricas ya vencieron, exige elegir otro plazo o periodo. Para preparar otro periodo, elige fechas coherentes y ejecuta, por ejemplo:

```bash
php bin/seed.php --period=2027-1 --start=2027-03-15 --expiry=2027-07-02 --grades=2027-07-16 --deadline=2027-06-30
```

Después selecciona ese ID en `academic_period` de la configuración local. Esta es una elección explícita para la simulación; las fechas y rúbricas del periodo anterior se conservan. El reloj del servidor sigue siendo real.

Los estados se relacionan por FK con tres catálogos independientes, `estados_propuesta`, `decisiones_rubrica` y `estados_proyecto`. Los repositorios consultan los códigos y entregan `status`, `decision` y `projectStatus` como textos estables a la interfaz. Las reglas usan los códigos. El historial mantiene sus códigos y contenido de auditoría originales.

El módulo conserva los IDs externos como referencias textuales. La semilla comprueba que existan las referencias académicas anteriores y revierte si encuentra alguna pendiente de importar. Las tablas académicas tienen sus propias PK y FK. Las peticiones ordinarias solo leen estos datos desde el código; como `proyecto_app` es propietario de la base, esta separación no constituye una prohibición de escritura a nivel PostgreSQL.

La copia privada `data/academic/academico.json` se conserva como fixture histórico. El módulo real utiliza PostgreSQL. La demo independiente conserva sus JSON públicos y localStorage en `/demo.php`, disponible solo con sesión y en development.

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `app/Controllers` | Operaciones HTTP y snapshots autorizados. |
| `app/Models` | Conexión, consultas, catálogos, proveedor PostgreSQL y utilidades compartidas. |
| `app/Services` | Autenticación, reglas de rúbricas, propuestas y transacciones. |
| `app/Views` | Plantillas visuales PHP de la entrega del equipo. |
| `public` | Entradas web, login y recursos CSS/JavaScript/imágenes. |
| `config` y `bootstrap.php` | Configuración privada y carga de clases. |
| `database/migrations` | Evolución incremental del esquema. |
| `bin` | Diagnóstico, respaldo, migración y semilla explícita. |

## API e identidad

Las peticiones ordinarias requieren sesión. Los POST usan un objeto JSON y la cabecera `X-CSRF-Token`. Los códigos de error distinguen sesión ausente o credenciales inválidas (401), permisos/CSRF (403), recurso no disponible (404), conflicto de versión/regla (409), validación (422) y servicio no disponible (503).

| Método y operación | Finalidad |
| --- | --- |
| GET `api.php?op=loginToken` | Token CSRF público para el formulario de acceso. |
| POST `api.php?op=login` | Autentica `{email,password}` y establece sesión. |
| GET `api.php?op=session` | Perfil y CSRF de una sesión autenticada. |
| POST `api.php?op=logout` | Cierra la sesión autenticada. |
| GET `api.php?op=read` | Snapshot autorizado de rúbricas, propuestas y avisos. |
| GET `api.php?op=detail&id=UUID` | Detalle autorizado de rúbrica. |
| POST `api.php?op=saveRubric` | Crea, edita, extiende o elimina una rúbrica elegible. |
| POST `api.php?op=candidates` | Busca integrantes elegibles por rúbricas seleccionadas. |
| POST `api.php?op=saveProposal` | Guarda borrador, envía o corrige con versión de concurrencia. |
| POST `api.php?op=review` | Verifica competencias o decide sobre el vínculo propio del profesor. |
| POST `api.php?op=projectAction` | Retira un vínculo terminal con `action:'withdraw'`. |
| POST `api.php?op=readAlerts` | Marca avisos del destinatario actual como leídos. |

El autor y el rol proceden de la sesión y el proveedor. El antiguo endpoint `profile` y `dev-identity.php` quedan deshabilitados. Las sesiones del selector anterior se invalidan. Las cookies usan HttpOnly y SameSite Strict y activan Secure cuando PHP recibe HTTPS. Las cuentas sembradas tienen `solo_desarrollo` y son rechazadas en producción, incluso con una sesión anterior de desarrollo.

## Reglas conservadas y siguiente paso

Solo el líder edita y envía su propuesta. Se exige al menos una rúbrica para guardar borrador y dos para enviar, con equipo elegible, cobertura y sustentos. Cada profesor decide sobre su vínculo. Hay hasta dos observaciones; el reenvío conserva contador e historial y devuelve a pendiente los vínculos observados. Las aprobaciones anteriores conservan su versión revisada visible y los rechazos/caducidades permanecen terminales.

La segunda aprobación crea un proyecto pendiente. La reconsideración que lo dejaría con menos de dos aprobaciones sigue bloqueada por acuerdo del usuario. Se mantienen avisos de interacción y caducidad idempotente. El proyecto permanece pendiente hasta su confirmación. En el paso 4, las transiciones por fechas deberán actualizar el estado persistido y entregar un snapshot coherente.

Quedan para el paso 4 la confirmación, ejecución, evaluación, cancelación y seguimiento completo. El calendario completo, el asistente y la integración institucional continúan pendientes.
