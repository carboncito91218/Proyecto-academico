<?php
// El controlador anfitrión puede proporcionar la URL pública del módulo.
$asset = htmlspecialchars(rtrim($assetBase ?? '.', '/'), ENT_QUOTES, 'UTF-8');
$screens = [
    'alumno/asistente',
    'alumno/inicio',
    'calendario/agenda',
    'docente/bandeja',
    'docente/inicio',
    'docente/revision',
    'propuestas/detalle',
    'propuestas/formulario',
    'propuestas/lista',
    'proyectos/lista',
    'proyectos/seguimiento',
    'rubricas/lista',
];
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f4f7f6">
<title>ISUR · Proyectos integradores</title>
<link rel="stylesheet" href="<?= $asset ?>/assets/base.css">

<link rel="stylesheet" href="<?= $asset ?>/assets/campus.css">
<link rel="stylesheet" href="<?= $asset ?>/assets/docente.css" id="academicTheme" media="not all">
<link rel="stylesheet" href="<?= $asset ?>/assets/seguimiento.css" id="trackingStyles">
<link rel="stylesheet" href="<?= $asset ?>/assets/modulos.css">
</head>
<body data-mode="<?= !empty($demo) ? 'demo' : 'live' ?>">
<a class="sr-only" href="#main">Ir al contenido</a>
<header class="topbar">
<div class="brand-side">
<button class="icon-btn drawer-toggle" id="menuToggle" aria-controls="sidebar" aria-label="Abrir o cerrar índice" aria-expanded="true">
</button>
<img class="institution-logo" src="<?= $asset ?>/assets/isur.png" width="140" height="49" alt="Instituto del Sur">
<span class="brand-product" id="facultyProduct" hidden>Proyectos integradores</span>
</div>
<nav class="moodle-nav" aria-label="Navegación principal de Moodle">
<button data-action="nav" data-id="campus">Página Principal</button>
<button data-action="nav" data-id="personal">Área personal</button>
<button data-action="nav" data-id="courses">Mis cursos</button>
<button data-action="nav" data-id="home">Mis proyectos</button>
</nav>
<div class="top-actions">
<span class="demo-tag"><?= !empty($demo) ? 'Demostración local' : 'Rúbricas · PostgreSQL' ?></span>
<button class="academic-icon" data-action="nav" data-id="courses" title="Mis cursos" aria-label="Mis cursos" id="courseIcon">
</button>
<select class="profile-select actor-select" id="academicProfile" hidden aria-label="Cambiar identidad de desarrollo">
<option value="s1">Alumno líder · Estudiante 01</option>
<option value="s2">Alumno integrante · Estudiante 02</option>
<option value="t1">Profesor A · Programación web</option>
<option value="t2">Profesor B · Base de datos</option>
<option value="t3">Profesor C · Interfaces</option>
</select>
<button class="academic-icon" id="alertBell" data-action="alerts" title="Notificaciones">
</button>
<button class="academic-icon" data-action="comments" title="Comentarios de revisión" aria-label="Comentarios de revisión" id="commentIcon">
</button>
<button class="academic-icon" data-action="rail-toggle" title="Panel académico" aria-label="Panel académico" aria-controls="academicRail" id="railToggle">
</button>
<details class="profile-drop" id="profileMenu">
<summary aria-label="Menú de perfil" title="Menú de perfil">
<span class="avatar" id="profileAvatar">
</span>
<span aria-hidden="true">⌄</span>
</summary>
<div class="profile-box">
<button data-action="nav" data-id="personal">Área personal</button>
<button data-action="profile-calendar">Calendario de proyectos</button>
<button data-action="comments">Comentarios de revisión</button>
<button data-action="scenarios">Escenarios de prueba</button>
<label for="profile">Identidad de desarrollo</label>
<select class="profile-select" id="profile">
<option value="s1">Alumno líder · Estudiante 01</option>
<option value="s2">Alumno integrante · Estudiante 02</option>
<option value="t1">Profesor A · Programación web</option>
<option value="t2">Profesor B · Base de datos</option>
<option value="t3">Profesor C · Interfaces</option>
</select>
</div>
</details>
</div>
</header>
<nav id="moduleTabs" class="module-tabs" aria-label="Secciones de Mis proyectos" hidden>
</nav>
<div hidden class="mobile-shade" id="mobileShade">
</div>
<aside hidden class="sidebar" id="sidebar" aria-label="Menú principal">
</aside>
<nav class="faculty-index" id="facultyIndex" aria-label="Menú del profesor">
</nav>
<div class="academic-frame">
<main class="workspace" id="main" tabindex="-1">
<p role="status">Cargando el portal académico…</p>
</main>
<aside class="rail-blocks" id="academicRail" aria-label="Panel académico" hidden>
</aside>
</div>
<footer class="academic-footer">
<span>Instituto del Sur · Gestión de proyectos académicos</span>
<button data-action="nav" data-id="home">Mis proyectos</button>
</footer>
<div id="modalRoot"></div>
<div id="toastRoot" role="status" aria-live="polite">
</div>
<?php foreach ($screens as $screen): ?>
<script type="text/x-isur-template" id="screen-<?= $screen ?>">
<?php require __DIR__ . '/' . $screen . '.php'; ?>
</script>
<?php endforeach; ?>
<script type="module" src="<?= $asset ?>/src/start.js">
</script>
</body>
</html>