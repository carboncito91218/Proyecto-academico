# Inventario del proyecto

Inventario actualizado el 26 de noviembre de 2026 para revisar qué se conserva y qué se retira. Incluye los archivos implementados, las vistas y recursos incorporados de la entrega del equipo y los archivos previos del proyecto. La configuración privada se enumera únicamente por nombre.

## Criterio de conservación

Se conservan las dependencias de ejecución y los archivos necesarios para instalar y mantener la base de datos. También se conserva la demo entregada, cuyas plantillas y módulos comparte la interfaz. Sus archivos opcionales están identificados para una decisión posterior si se desea retirar esa funcionalidad completa.

README.md e INVENTARIO_PROYECTO.md son documentación de apoyo. El inventario fue solicitado expresamente por el usuario y el README concentra el arranque y las instrucciones de Windows.

Un segundo agente revisó las dependencias del código de forma independiente y coincidió en que docs, tests, routes, storage y database/seeds pueden retirarse. También confirmó la utilidad de conservar migraciones, herramientas CLI, recursos visuales y la licencia de las fuentes.

## Carpetas conservadas

| Carpeta | Función | Motivo para conservar |
| --- | --- | --- |
| `app/` | Código PHP organizado en MVC y servicios. | Dependencia de la aplicación y de sus pantallas. |
| `app/Controllers/` | Capa de entrada y respuesta HTTP. | Dependencia de la aplicación y de sus pantallas. |
| `app/Models/` | Datos, consultas PostgreSQL, proveedor académico y utilidades compartidas. | Dependencia de la aplicación y de sus pantallas. |
| `app/Services/` | Casos de uso, permisos y reglas de negocio. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/` | Plantillas visuales PHP. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/alumno/` | Pantallas específicas del alumno. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/calendario/` | Plantilla de calendario compartida con la demo. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/docente/` | Pantallas específicas del profesor. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/propuestas/` | Pantallas del ciclo de propuestas. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/proyectos/` | Pantallas de proyectos y seguimiento. | Dependencia de la aplicación y de sus pantallas. |
| `app/Views/rubricas/` | Pantalla de rúbricas. | Dependencia de la aplicación y de sus pantallas. |
| `bin/` | Herramientas PHP de instalación y mantenimiento de la base. | Permite instalar, reproducir y mantener el esquema. |
| `config/` | Configuración de ejemplo y configuración local privada. | Dependencia de la aplicación y de sus pantallas. |
| `data/` | Datos externos simulados del backend. | Dependencia de la aplicación y de sus pantallas. |
| `data/academic/` | Archivos académicos privados que lee PHP. | Dependencia de la aplicación y de sus pantallas. |
| `database/` | Evolución del esquema PostgreSQL. | Permite instalar, reproducir y mantener el esquema. |
| `database/migrations/` | Migraciones SQL ordenadas y registradas por checksum. | Permite instalar, reproducir y mantener el esquema. |
| `public/` | Raíz pública del servidor web. | Dependencia de la aplicación y de sus pantallas. |
| `public/assets/` | Imágenes, estilos y fuentes utilizados por las pantallas. | Dependencia de la aplicación y de sus pantallas. |
| `public/src/` | Módulos JavaScript del navegador. | Dependencia de la aplicación y de sus pantallas. |
| `public/src/data/` | Adaptadores de datos y fuentes de ejemplo de la demo. | Dependencia de la aplicación y de sus pantallas. |
| `public/src/views/` | Generación de contenido visual desde los snapshots. | Dependencia de la aplicación y de sus pantallas. |

## Archivos conservados

Los archivos de demo, herramientas de desarrollo y documentación se marcan como tales. Su conservación mantiene las funciones disponibles y la capacidad de instalar el módulo en otro equipo.

| Archivo | Qué es y qué hace | Uso |
| --- | --- | --- |
| `.gitignore` | Reglas que excluyen credenciales, configuración privada, claves y respaldos de Git. | Protección de archivos privados |
| `INVENTARIO_PROYECTO.md` | Este inventario explica los directorios y cada archivo conservado, así como los elementos eliminados. | Apoyo solicitado |
| `README.md` | Requisitos, arranque en Fedora y Windows, configuración, funciones disponibles y contrato de la API. | Apoyo solicitado |
| `app/Controllers/AcademicController.php` | Recibe operaciones HTTP, resuelve identidad y CSRF, llama a los servicios y construye el snapshot autorizado. | Aplicación |
| `app/Models/AcademicProvider.php` | Contrato de lectura del sistema académico, para poder sustituir el JSON por otro conector. | Aplicación |
| `app/Models/Connection.php` | Construye la conexión PDO PostgreSQL con consultas preparadas y errores sin credenciales. | Aplicación |
| `app/Models/Id.php` | Genera y valida los UUID internos estables. | Aplicación |
| `app/Models/JsonAcademicProvider.php` | Lee y valida el JSON privado y normaliza identidades, carreras, matrículas, cursos y periodo. | Aplicación |
| `app/Models/Migrator.php` | Inspecciona el esquema, aplica archivos SQL en transacción y registra nombre, fecha y checksum. | Aplicación |
| `app/Models/ProposalRepository.php` | Persiste propuestas, equipos, evidencias y decisiones; calcula estados, crea proyectos pendientes y gestiona avisos e historial. | Aplicación |
| `app/Models/RubricRepository.php` | Ejecuta las consultas de rúbricas y competencias y conserva el historial al modificarlas o desvincular borradores. | Aplicación |
| `app/Models/RuleViolation.php` | Representa un rechazo funcional con mensaje y código HTTP interpretable. | Aplicación |
| `app/Models/Transaction.php` | Coordina transacciones, savepoints y el bloqueo compartido de escrituras del módulo. | Aplicación |
| `app/Services/CurrentUser.php` | Resuelve el usuario y rol desde la sesión y permite cambiar identidad de desarrollo con CSRF. | Aplicación |
| `app/Services/ProposalService.php` | Aplica las reglas de equipo, borrador, envío, revisión, corrección, retirada y caducidad en transacciones. | Aplicación |
| `app/Services/RubricService.php` | Valida creación, edición, extensión y eliminación de rúbricas, propiedad e historial. | Aplicación |
| `app/Views/alumno/asistente.php` | Plantilla del asistente del simulador; la función real está pendiente. | Demo o plantilla compartida; opcional para el flujo real |
| `app/Views/alumno/inicio.php` | Plantilla del panel inicial del alumno. | Aplicación |
| `app/Views/calendario/agenda.php` | Plantilla del calendario del simulador; la integración completa real está pendiente. | Demo o plantilla compartida; opcional para el flujo real |
| `app/Views/docente/bandeja.php` | Plantilla de propuestas recibidas por el profesor y sus filtros. | Aplicación |
| `app/Views/docente/inicio.php` | Plantilla del panel inicial del profesor. | Aplicación |
| `app/Views/docente/revision.php` | Plantilla para verificar competencias, consultar sustentos y decidir sobre el vínculo propio. | Aplicación |
| `app/Views/portal.php` | Estructura visual común. Carga las plantillas de pantallas, estilos y JavaScript. | Aplicación |
| `app/Views/propuestas/detalle.php` | Plantilla de decisiones por rúbrica, feedback, equipo e historial. | Aplicación |
| `app/Views/propuestas/formulario.php` | Plantilla del borrador y envío, con integrantes, evidencias y cobertura de cursos. | Aplicación |
| `app/Views/propuestas/lista.php` | Plantilla del listado de propuestas del equipo. | Aplicación |
| `app/Views/proyectos/lista.php` | Plantilla de proyectos. El módulo real muestra proyectos pendientes mediante su módulo JavaScript. | Aplicación |
| `app/Views/proyectos/seguimiento.php` | Plantilla de seguimiento usada por la demo y preparada para la siguiente etapa real. | Demo o plantilla compartida; opcional para el flujo real |
| `app/Views/rubricas/lista.php` | Plantilla del catálogo de alumno y gestión de rúbricas del profesor. | Aplicación |
| `bin/check-db.php` | Diagnóstico CLI que abre la conexión y comprueba la base y la cuenta efectivas. | Instalación y mantenimiento |
| `bin/database.php` | Implementación común de los comandos anteriores, con comprobación de destino y manejo de errores. | Instalación y mantenimiento |
| `bin/migrate.php` | Entrada CLI para aplicar las migraciones incrementales pendientes. | Instalación y mantenimiento |
| `bin/migrations-status.php` | Entrada CLI para consultar las migraciones registradas. | Instalación y mantenimiento |
| `bootstrap.php` | Carga las clases PHP, combina la configuración de ejemplo con la local y establece la zona horaria. | Aplicación |
| `config/local.example.php` | Plantilla de configuración sin contraseña para preparar otra instalación. También aporta los valores predeterminados al arranque. | Aplicación |
| `config/local.php` | Configuración privada de esta instalación, incluida la contraseña. Se conserva localmente y está excluida de Git. Su contenido se omite del inventario. | Aplicación |
| `data/academic/academico.json` | Fuente privada simulada de alumnos, carrera, matrículas, profesores, cursos y fechas externas. El backend la lee. | Aplicación |
| `database/migrations/001_base.sql` | Crea las tablas normalizadas y restricciones iniciales del módulo. | Instalación y mantenimiento |
| `database/migrations/002_rubrica_version.sql` | Añade la versión de rúbrica para detectar formularios obsoletos. | Instalación y mantenimiento |
| `database/migrations/003_propuestas.sql` | Añade versión de contenido, entregable previo al proyecto e índices para propuestas e historial. | Instalación y mantenimiento |
| `database/migrations/004_integridad_entregable.sql` | Exige que nombre y fecha del entregable estén completos conjuntamente. | Instalación y mantenimiento |
| `public/api.php` | Entrada JSON. Inicia sesión, valida el cuerpo, coordina el controlador y devuelve errores HTTP sin secretos. | Aplicación |
| `public/assets/Open-Sans-LICENSE.txt` | Licencia que acompaña las fuentes Open Sans distribuidas con las pantallas. | Licencia de recursos distribuidos |
| `public/assets/base.css` | Estilos comunes, formularios, tarjetas y modales de las pantallas entregadas. | Aplicación |
| `public/assets/campus.css` | Estilos de la presentación del alumno y del campus. | Aplicación |
| `public/assets/docente.css` | Estilos y distribución de las pantallas del profesor. | Aplicación |
| `public/assets/isur.png` | Imagen institucional utilizada por el encabezado. | Aplicación |
| `public/assets/modulos.css` | Ajustes comunes de los módulos y visibilidad de controles según modo real o demo. | Aplicación |
| `public/assets/open-sans-28624.woff` | Archivo de fuente Open Sans cargado por los estilos. | Aplicación |
| `public/assets/open-sans-29704.woff` | Archivo de fuente Open Sans cargado por los estilos. | Aplicación |
| `public/assets/open-sans-29736.woff` | Archivo de fuente Open Sans cargado por los estilos. | Aplicación |
| `public/assets/seguimiento.css` | Estilos del seguimiento compartido de proyectos. | Aplicación |
| `public/demo.php` | Entrada opcional al simulador anterior. Solo está disponible en development. | Demo o plantilla compartida; opcional para el flujo real |
| `public/dev-identity.php` | Selector de identidad del servidor para desarrollo, protegido mediante POST y CSRF. En producción responde 404. | Herramienta local de desarrollo |
| `public/index.php` | Entrada del módulo real. Ejecuta el arranque y renderiza el portal. | Aplicación |
| `public/src/app.js` | Coordina navegación, formularios, selección, modales y operaciones de las pantallas existentes. | Aplicación |
| `public/src/data/academico.json` | Datos académicos públicos de ejemplo usados por la demo. El backend real utiliza la copia privada. | Demo o plantilla compartida; opcional para el flujo real |
| `public/src/data/adapter.js` | Selecciona explícitamente el adaptador HTTP del módulo real o el adaptador simulado de la demo. | Aplicación |
| `public/src/data/ejemplos.json` | Rúbricas, propuestas y avisos de ejemplo del simulador. No se importan automáticamente en PostgreSQL. | Demo o plantilla compartida; opcional para el flujo real |
| `public/src/data/http-adapter.js` | Consulta la API con sesión y CSRF, entrega snapshots y adjunta versiones de concurrencia. | Aplicación |
| `public/src/data/mock-adapter.js` | Motor opcional de la demo con operaciones simuladas y almacenamiento en localStorage. | Demo o plantilla compartida; opcional para el flujo real |
| `public/src/model.js` | Estado recibido del servidor y funciones auxiliares de presentación. La demo también calcula estados locales. | Aplicación |
| `public/src/start.js` | Arranca la interfaz, solicita identidad cuando falta sesión y carga el primer snapshot. | Aplicación |
| `public/src/ui.js` | Utilidades de interfaz, iconos, escape HTML, botones y composición de plantillas. | Aplicación |
| `public/src/views/calendario.js` | Genera el calendario y eventos del simulador. Se importa desde la interfaz compartida. | Demo o plantilla compartida; opcional para el flujo real |
| `public/src/views/components.js` | Componentes visuales reutilizados para competencias, integrantes, cobertura, decisiones e historial. | Aplicación |
| `public/src/views/inicio.js` | Genera los paneles de inicio y las pantallas de cursos desde las plantillas. | Aplicación |
| `public/src/views/propuestas.js` | Genera catálogo, formulario, listado, detalle, bandeja docente y revisión. | Aplicación |
| `public/src/views/proyectos.js` | Genera el listado de proyectos pendientes y las vistas del simulador de seguimiento. | Aplicación |

## Elementos retirados

| Elemento | Contenido o finalidad anterior | Motivo de eliminación |
| --- | --- | --- |
| `docs/` | Esquema, decisiones pendientes y el informe de verificación anterior. | Documentación auxiliar sin carga desde la aplicación. La regla de revocación bloqueada y las convenciones vigentes permanecen en README y en el código. |
| `tests/` | Comprobaciones unitarias e integraciones de pasos anteriores. | Eran herramientas de desarrollo independientes del arranque HTTP y CLI. Se retiran por indicación del usuario. |
| `routes/` | Reserva vacía para futuras rutas. | Las operaciones actuales se resuelven en public/api.php y AcademicController. |
| `storage/` | Directorio vacío reservado para logs. | El código utiliza error_log y la sesión configurada por PHP. Ningún componente escribe en esa carpeta. |
| `database/seeds/` | Reserva vacía para semillas. | El arranque y las migraciones funcionan sin semillas automáticas. |
| `requirements.txt` | Lista comentada de programas para Windows. | Su información útil se consolidó en README. El proyecto no usa Python ni pip. |
| `levantar.md` | Instrucciones de arranque en Windows. | Se consolidaron en README para mantener una sola guía de inicio. |
| `ProyectoAcademicoDesarrollo.code-workspace` | Archivo opcional de VS Code que apuntaba a la carpeta actual. | Se puede abrir directamente la raíz del proyecto en el editor. |
| Todos los `.gitkeep` | Marcadores para conservar carpetas vacías en Git. | Se eliminaron por indicación del usuario. |

### Archivos retirados en esta limpieza

- `docs/DECISIONES_PENDIENTES.md`
- `docs/ESQUEMA_BD.md`
- `docs/VERIFICACION.md`
- `tests/Integration/database.php`
- `tests/Integration/rubrics.php`
- `tests/Integration/http-rubrics.mjs`
- `tests/Unit/run.php`
- `routes/.gitkeep`
- `storage/logs/.gitkeep`
- `database/seeds/.gitkeep`
- `requirements.txt`
- `levantar.md`
- `ProyectoAcademicoDesarrollo.code-workspace`

## Alcance de esta limpieza

Se conservaron la configuración local privada y los datos PostgreSQL existentes. Las carpetas internas de herramientas de la sesión, como .git, .codex, .agents y .aws, están fuera del código del módulo y de este inventario; no se inspeccionan sus credenciales ni se alteran sus metadatos.
