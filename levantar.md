# Ejecutar ProyectoAcadémicoDesarrollo en Windows

El archivo `requirements.txt` sirve como lista de requisitos; `pip` es para Python y no instala PHP ni PostgreSQL.

1. Instala PHP para Windows desde https://www.php.net/downloads.php?os=windows y PostgreSQL desde https://www.postgresql.org/download/windows/. En PHP habilita `pdo_pgsql` en el `php.ini` que usa la terminal. Comprueba en PowerShell:

   ```powershell
   php -v
   php -r "print_r(PDO::getAvailableDrivers());"
   ```

   Debe aparecer `pgsql`. Si el proyecto real tiene `composer.json`, instala Composer y ejecuta `composer install` desde su raíz.

2. Inicia PostgreSQL desde **Servicios** (`services.msc`). Crea en esa instalación de Windows la base `proyecto_academico` y el usuario `proyecto_app` con contraseña, tal como en Fedora. La base de Fedora no se copia automáticamente a Windows. Configura las credenciales en el archivo local de ejemplo que generó Codex (`config/local.php` o `.env`). No copies contraseñas al repositorio.

3. Abre PowerShell en la **raíz real del proyecto** y ejecuta los comandos que figuren en su README para comprobar PDO y aplicar migraciones. Si coinciden con la estructura propuesta para el paso 1:

   ```powershell
   php bin/check-db.php
   php bin/migrate.php
   ```

   Ejecuta `migrate.php` solo sobre una base destinada a este proyecto. Si ya hay datos importantes, revisa primero qué migraciones aplicará.

4. Levanta el servidor local desde esa misma raíz:

   ```powershell
   php -S 127.0.0.1:8000 -t public
   ```

   Deja esa terminal abierta y entra en http://127.0.0.1:8000. Si el README del proyecto usa un `router.php`, usa su comando exacto en vez del de arriba. PostgreSQL funciona como servicio; no necesita una terminal `psql` abierta.

**Nota:** antes de compartir esto como instrucciones definitivas del código implementado en Fedora, comprueba el README y los archivos reales que generó Codex. Estos comandos corresponden a la estructura acordada; los nombres finales pueden diferir.
