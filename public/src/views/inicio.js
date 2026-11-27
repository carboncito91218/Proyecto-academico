import { screen } from '../ui.js';
import { db, student, teacher, course, rubric, isTeacher, current, active, responses, proposalState, dates, projectState, visible, visibleProject, pill, fmt } from "../model.js";
import { icon, esc, btn, empty } from "../ui.js";
import { profileCourses, courseDisplay } from "../app.js";
import { portalLink } from "../views/components.js";
import { eventsList, calendarEvents } from "../views/calendario.js";
function academicHub() {
    const faculty = isTeacher(), ps = db.proposals.filter(visible), projects = db.proposals.filter(visibleProject);
    const reviews = ps.flatMap(p => active(p).filter(rel => !p.draft && (faculty ? rubric(rel.rubric)?.teacher === db.profile && rel.decision === 'PENDIENTE' : rel.decision === 'OBSERVADA')).map(rel => ({ p, rel })));
    const first = reviews[0];
    const action = first ? (faculty ? 'review-open' : 'detail-open') : 'nav', id = first ? (faculty ? first.p.id + '|' + first.rel.rubric : first.p.id) : (faculty ? 'received' : 'rubrics');
    const dates = (db.demo === false ? [] : calendarEvents()).filter(e => e.day >= db.date).sort((a, b) => a.day.localeCompare(b.day)).slice(0, 3);
    const linkTile = (title, desc, dest, sym) => `<button class="hub-link" data-action="nav" data-id="${dest}"><span class="hub-icon">${icon(sym)}</span><span><strong>${title}</strong><small>${desc}</small></span>${icon('chevron')}</button>`;
    return screen('alumno/inicio', {
        campus: faculty ? 'Académico' : 'Campus virtual',
        title: faculty ? 'Panel docente' : 'Mis proyectos',
        calendarIcon: icon('calendar'),
        year: esc(db.date.slice(0, 4)),
        featureLabel: faculty ? 'Revisión de propuestas' : 'Mesa de trabajo',
        featureTitle: first ? esc(first.p.title) : faculty ? 'Tus rúbricas' : 'Prepara tu propuesta',
        featureDescription: first ? esc(faculty ? 'Revisa los criterios de «' + rubric(first.rel.rubric).title + '» antes de decidir.' : first.rel.feedback) : faculty ? 'Consulta las propuestas dirigidas a tus cursos.' : 'Elige rúbricas para reunir tus cursos en un proyecto integrador.',
        featureAction: btn(first ? (faculty ? 'Revisar propuesta' : 'Ver observación') : (faculty ? 'Abrir bandeja' : 'Explorar rúbricas'), action, id, 'hero-cta'),
        metrics: [[ps.length, 'Propuestas', faculty ? 'received' : 'proposals', 'proposal'], [reviews.length, faculty ? 'Por revisar' : 'Observaciones', faculty ? 'received' : 'proposals', 'comment'], [projects.length, 'Proyectos vinculados', 'projects', 'project']].map(([n, t, d, i]) => `<button data-action="nav" data-id="${d}">${icon(i)}<span><b>${n}</b><small>${t}</small></span></button>`).join(''),
        calendarLink: portalLink('Calendario', 'nav', 'agenda'),
        events: eventsList(dates),
        toolsLabel: faculty ? 'Herramientas docentes' : 'Herramientas del equipo',
        rubrics: linkTile(faculty ? 'Mis rúbricas' : 'Rúbricas disponibles', faculty ? 'Competencias y plazos' : 'Criterios de cada curso', 'rubrics', 'rubric'),
        assistant: faculty ? linkTile('Bandeja de propuestas', 'Revisar por rúbrica', 'received', 'proposal') : linkTile('Asistente de proyectos', 'Ideas y roles para el equipo', 'assistant', 'comment'),
        tracking: linkTile('Seguimiento', 'Entregables y fechas del proyecto', 'projects', 'project')
    });
}
function courseCards() {
    const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const courses = profileCourses().filter(c => fold(c.name).includes(fold(courseDisplay.query.trim()))).sort((a, b) => a.name.localeCompare(b.name, 'es') * (courseDisplay.order === 'asc' ? 1 : -1));
    if (!courses.length)
        return empty('Sin cursos para mostrar', 'Revisa tu búsqueda o selecciona otro perfil.');
    return `<div class="course-cards ${courseDisplay.layout === 'list' ? 'course-list' : ''}">${courses.map(c => `<button type="button" class="m-course" data-action="nav" data-id="course/${esc(c.id)}"><span aria-hidden="true" class="cover cover-${esc(c.id)}"></span><span class="m-course-copy"><strong>${esc(c.name)}</strong><small>Académico ${esc(db.periodo.id || '2026-2')}</small></span></button>`).join('')}</div>`;
}
function coursesPage() {
    return `<h1>Mis cursos</h1><section class="m-panel"><h2>Vista general de curso</h2><div class="m-tools"><label class="sr-only" for="campusSearch">Buscar curso</label><input id="campusSearch" type="search" placeholder="Buscar curso" value="${esc(courseDisplay.query)}"><select id="campusOrder" aria-label="Orden de los cursos"><option value="asc">Nombre de A a Z</option><option value="desc" ${courseDisplay.order === 'desc' ? 'selected' : ''}>Nombre de Z a A</option></select><select id="campusLayout" aria-label="Presentación de cursos"><option value="cards">Tarjeta</option><option value="list" ${courseDisplay.layout === 'list' ? 'selected' : ''}>Lista</option></select></div><div id="campusResults">${courseCards()}</div></section>`;
}
function coursePage(id) {
    const c = profileCourses().find(c => c.id === id);
    if (!c)
        return coursesPage();
    return `${portalLink('Mis cursos', 'nav', 'courses')}<h1>${esc(c.name)}</h1><section class="m-panel"><details class="m-section" open><summary>General</summary><p>Periodo académico ${esc(db.periodo.id || '2026-2')}</p></details><details class="m-section" open><summary>Proyectos integradores</summary><p>Consulta los criterios y plazos de las rúbricas de este curso.</p><button class="btn secondary" data-action="course-rubrics" data-id="${esc(c.id)}">Ver rúbricas del curso</button></details></section>`;
}
function campusOverview() {
    return `<h1>Área personal</h1><section class="m-panel"><h2>${esc(current().name)}</h2><div class="campus-shortcuts">${btn('Mis cursos', 'nav', 'courses', 'secondary')}${btn('Mis proyectos', 'nav', 'home', 'primary')}</div></section>`;
}
function mini(p, forTeacher = false) {
    let r = forTeacher ? active(p).find(r => rubric(r.rubric)?.teacher === db.profile) : null;
    const state = r ? r.decision : proposalState(p);
    return `<div class="proposal-mini"><div class="row"><span class="eyebrow">${esc(forTeacher ? course(rubric(r.rubric).course).name : 'Propuesta integradora')}</span>${pill(state)}</div><h3>${esc(p.title)}</h3><p class="small muted">Equipo de ${esc(student(p.leader)?.name)} · ${p.sent ? fmt(p.sent) : 'Borrador'}</p><div class="progress-track"><span style="width:${active(p).length ? responses(p) / active(p).length * 100 : 0}%"></span></div><div class="row"><span class="small muted">${responses(p)} de ${active(p).length} respuestas</span>${btn(forTeacher ? 'Revisar propuesta' : 'Ver detalle', forTeacher ? 'review-open' : 'detail-open', forTeacher ? p.id + '|' + r.rubric : p.id, 'small secondary')}</div></div>`;
}
function facultyHome() {
    const professor = isTeacher();
    const proposals = db.proposals.filter(visible);
    const projects = db.proposals.filter(visibleProject);
    const pending = proposals.reduce((n, p) => n + active(p).filter(r => !p.draft && r.decision === 'PENDIENTE' && (!professor || rubric(r.rubric)?.teacher === db.profile)).length, 0);
    const tile = (title, description, label, dest, symbol, highlight) => `
    <section class="portal-tile ${highlight ? 'highlight' : ''}">
      <span class="tile-icon ${highlight ? 'blue' : ''}">${icon(symbol)}</span>
      <div><h2>${title}</h2><p>${description}</p>${portalLink(label, 'nav', dest)}</div>
    </section>`;
    return screen('docente/inicio', {
        name: esc(current().name),
        inbox: professor ? tile('Propuestas recibidas', 'Consulta las propuestas asociadas a tus rúbricas.', 'Revisar propuestas', 'received', 'proposal', true) : tile('Rúbricas disponibles', 'Consulta los criterios de tus cursos y prepara tu propuesta.', 'Explorar rúbricas', 'rubrics', 'rubric', true),
        rubrics: professor ? tile('Mis rúbricas', 'Gestiona los criterios y el plazo de recepción de propuestas.', 'Consultar rúbricas', 'rubrics', 'rubric', false) : tile('Mis propuestas', 'Revisa las decisiones y los comentarios de cada profesor.', 'Consultar propuestas', 'proposals', 'proposal', false),
        proposalIcon: icon('proposal'),
        recent: proposals.length ? proposals.slice(-3).reverse().map(p => mini(p, professor)).join('') : empty('Todavía no hay propuestas', 'Aquí aparecerán las propuestas de tu perfil.'),
        rubricIcon: icon('rubric'),
        proposalLabel: professor ? 'recibidas' : 'del equipo',
        count: proposals.length,
        reviewLabel: professor ? 'Decisiones pendientes' : 'Respuestas pendientes',
        pending: pending,
        projects: projects.length,
        trackingLink: portalLink('Ver proyectos', 'nav', 'projects'),
        tracking: projects.length ? projects.slice(-3).reverse().map(p => `<div class="project-line"><strong>${esc(p.title)}</strong>${pill(projectState(p))}${portalLink('Ver seguimiento', 'project-open', p.id)}</div>`).join('') : '<p class="small muted">Aquí aparecerán los proyectos vinculados a tus propuestas aprobadas.</p>'
    });
}
export { academicHub, courseCards, coursesPage, coursePage, campusOverview, mini, facultyHome };
