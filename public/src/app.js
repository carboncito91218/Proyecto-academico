import { screen } from './ui.js';
import { execute, read } from './data/adapter.js';
import { setSnapshot } from './model.js';
let toastTimer, lastFocus;
import { visibleProject, db, periodo, daysAfter, terminal, rubricOpen, closedReview, editableProposal, eligibleMember, student, teacher, course, rubric, proposal, isTeacher, current, own, active, projectRubrics, proposalState, projectState, started, visible, fmt, relFor, receivedRubric } from "./model.js";
import { $, icon, esc, btn, note, head, empty } from "./ui.js";
import { portalLink, coverageHTML } from "./views/components.js";
import { rubricsView, proposalsView, formView, detailView, receivedView, reviewView } from "./views/propuestas.js";
import { projectsView, projectView } from "./views/proyectos.js";
import { agendaView, calendarEvents, calendarMarkup } from "./views/calendario.js";
import { academicHub, courseCards, coursesPage, coursePage, campusOverview, facultyHome } from "./views/inicio.js";
const conversations = new Map();
let assistantTeam = '';
function assistantView() {
    if (isTeacher())
        return empty('Asistente del equipo', 'Esta vista corresponde al perfil de alumno.');
    const teams = db.proposals.filter(p => p.members.includes(db.profile));
    const p = teams.find(p => p.id === assistantTeam) || teams[0];
    assistantTeam = p?.id || '';
    const key = db.profile + '/' + assistantTeam, chat = conversations.get(key) || [];
    return head('Asistente de proyectos', 'Simulación local de un chat de IA para tu equipo.') + screen('alumno/asistente', {
        teams: teams.map(t => `<option value="${esc(t.id)}" ${p === t ? 'selected' : ''}>${esc(t.title)}</option>`).join('') || '<option>Mis cursos</option>',
        messages: chat.map(m => `<div class="chat-bubble ${m.user ? 'user' : ''}"><strong>${m.user ? 'Tú' : 'Asistente académico'}</strong><p>${esc(m.text)}</p></div>`).join(''),
        prompts: ['Sugerir una idea', 'Proponer roles', 'Revisar competencias'].map(t => btn(t, 'chat-prompt', t, 'small secondary')).join('')
    });
}
function chatReply(question) {
    if (isTeacher() || !question.trim())
        return;
    const p = db.proposals.find(t => t.id === assistantTeam && t.members.includes(db.profile));
    const team = p ? p.members.map(student) : [current()];
    const candidates = p ? active(p).filter(x => !terminal(x) && !x.cancelled).map(x => rubric(x.rubric)) : db.rubrics.filter(rubricOpen);
    const rs = candidates.filter(r => team.some(s => s.courses.includes(r.course)));
    const q = question.toLocaleLowerCase('es');
    let answer = 'Puedo ayudarte con ideas de proyecto, roles de tu equipo y competencias de las rúbricas seleccionadas.';
    if (!/rol|tarea|distribu|integrante|competen|criterio|r[uú]brica|idea|proyecto|suger|propon/.test(q))
        answer = 'Solo puedo responder sobre proyectos, rúbricas y propuestas de tu equipo.';
    else if (!rs.length)
        answer = 'Primero selecciona rúbricas aplicables a tu equipo.';
    else if (/rol|tarea|distribu|integrante|idea|proyecto|suger|propon/.test(q) && !/competen|criterio|r[uú]brica/.test(q)) {
        const roles = team.map(s => {
            const cs = rs.filter(r => s.courses.includes(r.course));
            return s.name + ' puede ' + (cs.length ? 'preparar evidencias para ' + cs.map(r => r.title).join(' y ') : 'apoyar en la documentación compartida') + '.';
        }).join('\n');
        answer = /rol|tarea|distribu|integrante/.test(q) ? roles
            : 'Una idea para el equipo es crear un sistema de reservas de espacios de estudio. Un mismo recorrido permite registrar una solicitud, comprobar disponibilidad y mostrar la confirmación.\n'
                + rs.map(r => 'Para «' + r.title + '», preparen una evidencia de «' + (r.competencies[0] || r.criteria) + '».').join('\n')
                + '\n' + roles;
    }
    else if (/competen|criterio|rúbrica|rubrica/.test(q))
        answer = rs.map(r => r.title + ' — ' + r.competencies.join(' • ')).join('\n');
    const key = db.profile + '/' + assistantTeam;
    conversations.set(key, [...(conversations.get(key) || []), { user: true, text: question }, { text: answer }]);
    render();
    $('#chatText')?.focus();
}
let route = document.body.dataset.mode === 'demo' ? 'campus' : 'rubrics', selected = [], editing = null, courseFilter = '', decisionFilter = '', listRubric = '', formMembers = [];
function toast(msg, error = false) {
    clearTimeout(toastTimer);
    $('#toastRoot').innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'info' : 'check')}<span>${esc(msg)}</span></div>`;
    toastTimer = setTimeout(() => $('#toastRoot').innerHTML = '', 5000);
}
async function nav(dest) {
    if (db.demo === false && dest === 'rubrics') {
        try { setSnapshot(await read()); }
        catch (error) { toast(error.message, true); return; }
    }
    if (!railBreakpoint.matches)
        railOpen = false;
    closeModal();
    route = dest;
    document.body.classList.remove('mobile-open');
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#main').focus({ preventScroll: true });
}
function render() {
    document.body.classList.toggle('live-session', db.demo === false);
    document.body.classList.toggle('development-session', !!db.profileOptions?.length);
    if (db.demo === false) {
        for (const selector of ['#profile', '#academicProfile']) {
            $(selector).innerHTML = (db.profileOptions?.length ? db.profileOptions : [current()]).map(p => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.role || (isTeacher() ? 'profesor' : 'alumno'))}</option>`).join('');
        }
        selected = selected.filter(id => db.rubrics.some(r => r.id === id && rubricOpen(r)));
    }
    updateFacultyShell();
    document.body.classList.toggle('faculty', isTeacher() || route.startsWith('project/'));
    document.body.classList.toggle('shared-view', route.startsWith('project/'));
    $('#profile').value = db.profile;
    $('#profileAvatar').textContent = current().name.split(' ').map(w => w[0]).join('');
    $('#menuToggle').innerHTML = icon('menu');
    $('#courseIcon').innerHTML = icon('cap');
    $('#commentIcon').innerHTML = icon('comment');
    $('#railToggle').innerHTML = icon('panel');
    refreshBell();
    renderRail();
    $('#profileMenu').open = false;
    const view = route.split('/')[0];
    updateNavigation(view);
    let html = '';
    if (db.demo === false && ['proposals', 'form', 'detail', 'received', 'review', 'projects', 'project', 'agenda', 'assistant'].includes(view))
        html = empty('Disponible en los siguientes pasos', 'La selección de rúbricas se conserva mientras consultas el catálogo. La gestión de propuestas y proyectos se conectará después.') + btn('Volver a rúbricas', 'nav', 'rubrics', 'primary');
    else if (view === 'agenda')
        html = agendaView();
    else if (view === 'assistant')
        html = assistantView();
    else if (view === 'campus' || view === 'home')
        html = isTeacher() ? facultyHome() : academicHub();
    else if (view === 'courses')
        html = coursesPage();
    else if (view === 'course')
        html = coursePage(route.split('/')[1]);
    else if (view === 'personal')
        html = campusOverview();
    else if (view === 'rubrics')
        html = rubricsView();
    else if (view === 'proposals')
        html = proposalsView();
    else if (view === 'form')
        html = formView();
    else if (view === 'detail')
        html = detailView(route.split('/')[1]);
    else if (view === 'received')
        html = receivedView();
    else if (view === 'review')
        html = reviewView(route.split('/')[1], route.split('/')[2]);
    else if (view === 'projects')
        html = projectsView();
    else if (view === 'project')
        html = projectView(route.split('/')[1]);
    else
        html = academicHub();
    $('#main').innerHTML = `<div class="breadcrumb" ${view === 'home' || campusPages.has(view) ? 'style="display:none"' : ''}>${icon('home')}<button data-action="nav" data-id="home">Mis proyectos</button>${icon('chevron')}<span>${esc(viewName(view))}</span></div>${html}`;
}
function viewName(view) {
    return ({
        agenda: 'Calendario',
        assistant: 'Asistente de proyectos',
        home: 'Inicio',
        rubrics: isTeacher() ? 'Mis rúbricas' : 'Rúbricas disponibles',
        proposals: 'Mis propuestas',
        form: 'Preparar propuesta',
        detail: 'Detalle de propuesta',
        received: 'Propuestas recibidas',
        review: 'Revisión de propuesta',
        projects: isTeacher() ? 'Proyectos' : 'Mis proyectos',
        project: 'Seguimiento del proyecto'
    })[view] || 'Inicio';
}
const campusPages = new Set(['campus', 'personal', 'courses', 'course']);
const courseDisplay = { query: '', order: 'asc', layout: 'cards' };
function profileCourses() {
    const ids = isTeacher() ? db.rubrics.filter(r => r.teacher === db.profile).map(r => r.course) : current().courses;
    return db.courses.filter(c => ids.includes(c.id));
}
function moduleTabs() {
    return [['home', 'Vista general'], ['rubrics', isTeacher() ? 'Mis rúbricas' : 'Rúbricas'], [isTeacher() ? 'received' : 'proposals', isTeacher() ? 'Propuestas recibidas' : 'Mis propuestas'], ['projects', 'Seguimiento'], ['agenda', 'Calendario'], ...isTeacher() ? [] : [['assistant', 'Asistente']]];
}
function updateNavigation(view) {
    if (facultyLayout()) {
        renderSidebar();
        setDrawer(false);
        return;
    }
    const campus = campusPages.has(view);
    const parent = campus ? (view === 'course' ? 'courses' : view) : 'home';
    const section = ({ review: 'received', detail: 'proposals', form: 'proposals', project: 'projects' })[view] || view;
    for (const button of document.querySelectorAll('.moodle-nav button')) {
        if (button.dataset.id === parent)
            button.setAttribute('aria-current', 'page');
        else
            button.removeAttribute('aria-current');
    }
    const tabs = moduleTabs();
    $('#facultyIndex').innerHTML = isTeacher() ? `<strong>Ficha docente</strong>${tabs.map(([id, label]) => `<button data-action="nav" data-id="${id}" ${section === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}` : '';
    $('#moduleTabs').hidden = campus && !isTeacher();
    $('#moduleTabs').innerHTML = tabs.map(([id, label]) => `<button data-action="nav" data-id="${id}" ${id === section ? 'aria-current="page"' : ''}>${label}</button>`).join('');
    const shortcuts = campus && !isTeacher() ? [['courses', 'Mis cursos'], ['home', 'Mis proyectos']] : tabs;
    $('#sidebar').innerHTML = `<h2>${campus ? 'Campus virtual' : 'Índice de proyectos'}</h2><nav aria-label="Índice">${shortcuts.map(([id, label]) => btn(label, 'nav', id, 'drawer-link')).join('')}</nav>`;
    setDrawer(false);
}
function renderSidebar() {
    const pending = db.proposals.filter(p => !p.draft && active(p).some(r => rubric(r.rubric)?.teacher === db.profile && r.decision === 'PENDIENTE')).length;
    const items = isTeacher() ? [['home', 'home', 'Inicio'], ['rubrics', 'rubric', 'Mis rúbricas'], ['received', 'proposal', 'Propuestas recibidas', pending], ['projects', 'project', 'Proyectos'], ['agenda', 'calendar', 'Calendario']] : [['home', 'home', 'Inicio'], ['rubrics', 'rubric', 'Rúbricas disponibles'], ['proposals', 'proposal', 'Mis propuestas'], ['projects', 'project', 'Mis proyectos']];
    let v = route.split('/')[0];
    if (v === 'campus')
        v = 'home';
    if (['form', 'detail'].includes(v))
        v = 'proposals';
    if (v === 'review')
        v = 'received';
    if (v === 'project')
        v = 'projects';
    $('#sidebar').innerHTML = `<div class="portal-title">Académico</div><div class="side-box side-person"><span class="avatar" aria-hidden="true">${esc(db.profile.toUpperCase())}</span><div><b>${esc(current().name)}</b><small>${isTeacher() ? 'Profesor' : 'Alumno'} · Perfil de prueba</small></div></div><details class="side-box ficha" open><summary>${isTeacher() ? 'Cursos con rúbricas' : 'Ficha académica'}</summary><ul>${(isTeacher() ? [...new Set(db.rubrics.filter(r => r.teacher === db.profile).map(r => r.course))] : current().courses).map(id => `<li>${esc(course(id).name)}</li>`).join('') || '<li>Sin cursos registrados</li>'}</ul></details><div class="nav-label">Proyectos integradores</div><nav class="nav-list">${items.map(([id, ic, t, n]) => `<button class="nav-item ${v === id ? 'active' : ''}" data-action="nav" data-id="${id}" ${v === id ? 'aria-current="page"' : ''} title="${t}">${icon(ic)}<span class="nav-text">${t}</span>${n ? `<span class="nav-count">${n}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><button class="nav-item" data-action="scenarios" title="Escenarios de prueba">${icon('sliders')}<span class="nav-text">Escenarios de prueba</span></button></div>`;
}
function facultyLayout() {
    return isTeacher() || route.startsWith('project/');
}
function updateFacultyShell() {
    const on = facultyLayout();
    $('#academicTheme').media = on ? 'all' : 'not all';
    const mobile = matchMedia('(max-width:640px)').matches;
    document.body.classList.toggle('collapsed', on && !mobile && !!db.collapsed);
    if (!on)
        document.body.classList.remove('mobile-open');
    $('#facultyProduct').hidden = !on;
    $('#academicProfile').hidden = !on;
    $('#academicProfile').value = db.profile;
}
function setDrawer(open) {
    if (facultyLayout()) {
        const mobile = matchMedia('(max-width:640px)').matches;
        document.body.classList.toggle('mobile-open', mobile && open);
        $('#sidebar').hidden = mobile && !open;
        $('#mobileShade').hidden = true;
        $('#menuToggle').setAttribute('aria-expanded', String(mobile ? open : !db.collapsed));
        return;
    }
    $('#sidebar').hidden = !open;
    $('#mobileShade').hidden = !open;
    $('#menuToggle').setAttribute('aria-expanded', String(open));
}
const railBreakpoint = window.matchMedia('(min-width:1250px)');
let railOpen = railBreakpoint.matches;
let calendarDay = db.date;
let calendarMonth = db.date.slice(0, 7);
function toolButton(action, label, symbol, extra = '') {
    return `<button type="button" class="academic-icon" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(symbol)}</button>`;
}
function academicAlerts() {
    const alerts = [];
    for (const n of (db.activity || []).filter(n => n.to.includes(db.profile)).slice().reverse()) {
        alerts.push({ ...n, action: isTeacher() ? 'review-open' : 'detail-open', id: isTeacher() ? n.pid + '|' + n.rid : n.pid });
    }
    for (const e of calendarEvents()) {
        if ((e.day >= db.date && e.day <= daysAfter(db.date, 3)) || (e.day < db.date && e.title.startsWith('Plazo de revisión')))
            alerts.push({
                key: JSON.stringify([e.day, e.title, e.id]),
                title: e.day < db.date ? 'Revisión vencida' : 'Próximo vencimiento',
                detail: fmt(e.day) + ' · ' + e.title,
                action: e.action,
                id: e.id
            });
    }
    return alerts;
}
function refreshBell() {
    const count = academicAlerts().filter(a => !(db.readAlerts?.[db.profile] || []).includes(a.key)).length;
    const bell = $('#alertBell');
    bell.innerHTML = icon('bell') + (count ? `<span class="red-count">${count}</span>` : '');
    bell.setAttribute('aria-label', 'Notificaciones, ' + count + ' sin leer');
}
function openAlerts() {
    const alerts = academicAlerts(), read = db.readAlerts?.[db.profile] || [];
    showModal('Notificaciones', alerts.length ? alerts.map(a => `<div class="rail-row"><strong>${esc(a.title)}</strong> ${read.includes(a.key) ? '' : '<small class="unread">Sin leer</small>'}<p>${esc(a.detail)}</p>${portalLink('Abrir', a.action, a.id)}</div>`).join('') : '<p>No tienes avisos de propuestas o decisiones.</p>', alerts.some(a => !read.includes(a.key)) ? btn('Marcar todas como leídas', 'read-alerts', '', 'primary') : '');
}
function peopleContext() {
    const [view, id, rid] = route.split('/');
    const specific = ['detail', 'review', 'project'].includes(view);
    const proposals = db.proposals.filter(p => visible(p) && (!specific || p.id === id));
    const linked = proposals.flatMap(p => active(p).map(rel => ({ p, rel, r: rubric(rel.rubric) })))
        .filter(({ r }) => r && (view !== 'course' || r.course === id) && (view !== 'review' || r.id === rid));
    const staff = new Map();
    const ordered = linked.slice().sort((a, b) => Number(b.rel.decision === 'PENDIENTE') - Number(a.rel.decision === 'PENDIENTE'));
    for (const { r } of ordered)
        staff.set(r.teacher, teacher(r.teacher));
    if (view === 'course' && profileCourses().some(c => c.id === id)) {
        for (const r of db.rubrics.filter(r => r.course === id))
            staff.set(r.teacher, teacher(r.teacher));
    }
    const members = new Set((view === 'course' ? linked.map(x => x.p) : proposals).flatMap(p => p.members));
    return { staff: [...staff.values()].filter(Boolean), members: [...members].map(student).filter(Boolean), linked };
}
function peopleBlock() {
    const { staff } = peopleContext();
    function personRow(t) {
        const initials = t.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('');
        return `<div class="people-person"><span class="people-avatar" aria-hidden="true">${esc(initials)}</span><div><span class="people-name">${esc(t.name)}</span><button class="people-comment" data-action="teacher-comments" data-id="${esc(t.id)}" aria-label="Ver comentarios de ${esc(t.name)}" title="Ver comentarios de ${esc(t.name)}">${icon('comment')}</button></div></div>`;
    }
    return `<section class="people-box"><h2>Personas</h2><div class="people-label">Profesor</div>
    ${staff.length ? personRow(staff[0]) : '<p class="small muted">Sin profesor vinculado.</p>'}
    ${staff.length > 1 ? `<details class="people-more"><summary>Otros profesores (${staff.length - 1})</summary>${staff.slice(1).map(personRow).join('')}</details>` : ''}
    <div class="people-label">Participantes</div>
    <button class="people-link" data-action="participants">${icon('users')}Mostrar listado de participantes</button></section>`;
}
function renderRail() {
    const panel = $('#academicRail');
    panel.hidden = !railOpen;
    document.body.classList.toggle('rail-open', railOpen);
    $('#railToggle').setAttribute('aria-expanded', String(railOpen));
    if (!railOpen)
        return;
    const shortcut = (dest, label, symbol, color) => `<button class="rail-tile ${color}" data-action="nav" data-id="${dest}">${icon(symbol)}<strong>${label}</strong></button>`;
    panel.innerHTML = `<div class="rail-head"><strong>Panel académico</strong>${toolButton('rail-close', 'Cerrar panel', 'close')}</div>
    ${peopleBlock()}
    <section><h2>Gestión del proyecto</h2>${shortcut('rubrics', isTeacher() ? 'Mis rúbricas' : 'Rúbricas disponibles', 'rubric', 'orange')}${shortcut(isTeacher() ? 'received' : 'proposals', isTeacher() ? 'Propuestas recibidas' : 'Mis propuestas', 'proposal', 'gold')}${shortcut('projects', 'Seguimiento', 'project', 'purple')}</section>
    <section><h2>Calendario</h2><div id="railCalendar">${calendarMarkup()}</div></section>`;
}
function applyCalendar(action, id) {
    if (action === 'cal-day')
        calendarDay = id;
    else {
        const d = new Date(calendarMonth + '-01T12:00:00Z');
        d.setUTCMonth(d.getUTCMonth() + (action === 'cal-prev' ? -1 : 1));
        calendarMonth = d.toISOString().slice(0, 7);
        calendarDay = calendarMonth + '-01';
    }
    for (const id of ['#railCalendar', '#pageCalendar']) {
        const host = $(id);
        if (host)
            host.innerHTML = calendarMarkup();
    }
    if (route === 'agenda')
        render();
    const target = action === 'cal-day' ? '[aria-pressed="true"]' : '[data-action="' + action + '"]';
    ($('#pageCalendar') || $('#railCalendar'))?.querySelector(target)?.focus();
}
async function academicTool(action, id) {
    switch (action) {
        case 'alerts':
            openAlerts();
            break;
        case 'read-alerts':
            await change('readAlerts', academicAlerts().map(a => a.key));
            openAlerts();
            break;
        case 'participants': {
            const { staff, members } = peopleContext();
            const people = [...staff.map(t => [t.name, 'Profesor']), ...members.map(s => [s.name, 'Alumno'])];
            showModal('Participantes', people.map(([name, role]) => `<div class="rail-row">${icon('users')} <strong>${esc(name)}</strong> · ${role}</div>`).join('') || '<p>Aún no hay participantes vinculados.</p>');
            break;
        }
        case 'teacher-comments': {
            const { staff, linked } = peopleContext();
            const t = staff.find(person => person.id === id);
            if (!t)
                break;
            const rows = linked.filter(({ r, rel }) => r.teacher === id && rel.feedback && (!isTeacher() || db.profile === id || route.startsWith('project/')));
            showModal('Comentarios de ' + t.name, rows.map(({ p, r, rel }) => `<div class="rail-row"><strong>${esc(p.title)} · ${esc(r.title)}</strong><p>${esc(rel.feedback)}</p>${portalLink('Ver propuesta', isTeacher() ? 'review-open' : 'detail-open', isTeacher() ? p.id + '|' + r.id : p.id)}</div>`).join('') || '<p>No hay comentarios disponibles de este profesor para esta vista.</p>');
            break;
        }
        case 'comments': {
            const rows = [];
            for (const p of db.proposals.filter(visible))
                for (const rel of active(p)) {
                    const r = rubric(rel.rubric);
                    if (!rel.feedback || (isTeacher() && r.teacher !== db.profile))
                        continue;
                    rows.push(`<div class="rail-row"><strong>${esc(p.title)} · ${esc(r.title)}</strong><p>${esc(rel.feedback)}</p>${portalLink('Ver propuesta', isTeacher() ? 'review-open' : 'detail-open', isTeacher() ? p.id + '|' + r.id : p.id)}</div>`);
                }
            showModal('Comentarios de revisión', rows.join('') || '<p>Aún no hay comentarios de revisión para este perfil.</p>');
            break;
        }
        case 'rail-toggle':
        case 'rail-close':
            railOpen = action === 'rail-toggle' && !railOpen;
            renderRail();
            (railOpen ? $('#academicRail .academic-icon') : $('#railToggle')).focus();
            break;
        case 'cal-prev':
        case 'cal-next':
        case 'cal-day':
            applyCalendar(action, id);
            break;
        case 'profile-calendar':
            nav('agenda');
            break;
    }
}
function showModal(title, body, footer = '', wide = false) {
    lastFocus = document.activeElement;
    $('#modalRoot').innerHTML = `<div class="modal-shade" id="modalShade"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-header"><h2 id="modalTitle">${esc(title)}</h2><button class="icon-btn" data-action="close-modal" aria-label="Cerrar">${icon('close')}</button></div>${body}${footer ? `<div class="modal-footer">${footer}</div>` : ''}</section></div>`;
    setTimeout(() => $('#modalRoot').querySelector('input,textarea,select,button')?.focus(), 0);
}
function closeModal() {
    const open = !!$('#modalRoot').innerHTML;
    $('#modalRoot').innerHTML = '';
    if (open && lastFocus?.isConnected)
        lastFocus.focus();
}
function modalError(msg) {
    $('#modalError').innerHTML = icon('info') + '<span>' + esc(msg) + '</span>';
}
function openDecision(id, rid, decision) {
    const p = proposal(id), r = rubric(rid), rel = p && relFor(p, rid);
    if (!isTeacher() || !p || p.draft || !rel || r.teacher !== db.profile || rel.withdrawn || closedReview(p, rel) || (decision === 'OBSERVADA' && rel.observations >= 2) || started(p))
        return toast('No puedes cambiar esta decisión.', true);
    const approve = decision === 'APROBADA';
    showModal(approve ? 'Aprobar propuesta' : decision === 'OBSERVADA' ? 'Solicitar corrección' : 'Rechazo definitivo', `<p>${esc(p.title)} · ${esc(r.title)}</p><div id="modalError" class="error-box notice danger" role="alert"></div>${approve ? `<div class="form-grid"><div class="field"><label for="decisionStart">Fecha de inicio *</label><input type="date" id="decisionStart" value="${esc(rel.start)}" required></div><div class="field"><label for="decisionEnd">Fecha de fin *</label><input type="date" id="decisionEnd" value="${esc(rel.end)}" required></div></div><details><summary>Añadir un entregable</summary><div class="field"><label for="firstDelivery">Nombre</label><input id="firstDelivery" maxlength="120"></div><div class="field"><label for="firstDeliveryDate">Fecha de entrega</label><input id="firstDeliveryDate" type="date"></div></details>${note('Fechas por rúbrica', 'Estas fechas corresponden a tu rúbrica. Los otros profesores definen las suyas.')}` : `<div class="field"><label for="decisionFeedback">Feedback obligatorio *</label><textarea id="decisionFeedback" placeholder="Indica qué necesita corregir el equipo.">${esc(rel.feedback)}</textarea><small>${decision === 'OBSERVADA' ? 'El líder podrá corregir y reenviar esta revisión.' : 'El equipo no podrá reenviar esta propuesta a tu rúbrica.'}</small></div>`}`, btn('Volver', 'close-modal') + btn(approve ? 'Confirmar aprobación' : decision === 'OBSERVADA' ? 'Enviar observación' : 'Confirmar rechazo definitivo', 'save-decision', id + '|' + rid + '|' + decision, approve ? 'primary' : 'orange'));
}
function withdraw(id, rid) {
    const p = proposal(id), rel = p && relFor(p, rid);
    if (!p || !own(p) || started(p) || !rel || !terminal(rel) || active(p).length <= 2 || proposalState(p) === 'RECHAZADA')
        return toast('No puedes retirar esta rúbrica. Deben quedar al menos dos.', true);
    showModal('Retirar rúbrica', `<p>${esc(rubric(rid).title)} dejará de formar parte de esta propuesta. Se conservarán las otras ${active(p).length - 1} rúbricas.</p>`, btn('Volver', 'close-modal') + btn('Retirar rúbrica', 'withdraw-confirm', id + '|' + rid, 'orange'));
}
function projectAction(id, rid, action) {
    const p = proposal(id), rel = p && relFor(p, rid);
    if (!p || !isTeacher() || !rel || rubric(rid)?.teacher !== db.profile || rel.decision !== 'APROBADA' || rel.withdrawn || rel.cancelled || ['CANCELADO', 'FINALIZADO'].includes(projectState(p)))
        return toast('Esta acción no está disponible para tu perfil.', true);
    if (action === 'evaluate') {
        if (projectState(p) !== 'EN_EVALUACION')
            return toast('La rúbrica se marca como evaluada durante la evaluación.', true);
        return change('projectAction', { pid: id, rid, action }, 'Rúbrica marcada como evaluada.');
    }
    else {
        const remain = projectRubrics(p).length - 1;
        showModal('Cancelar mi rúbrica', `<p>${esc(rubric(rid).title)}</p>${note(remain < 2 ? 'El proyecto quedará CANCELADO' : 'El proyecto continuará', remain < 2 ? 'Quedarán menos de dos rúbricas activas.' : 'Se retirará tu rúbrica y se recalcularán las fechas con las restantes.', 'warning')}`, btn('Volver', 'close-modal') + btn('Confirmar cancelación', 'cancel-confirm', id + '|' + rid, 'danger'));
    }
}
function openRubric(id) {
    if (!isTeacher())
        return toast('Solo los profesores gestionan rúbricas.', true);
    const r = id ? rubric(id) : null;
    if (r && r.teacher !== db.profile)
        return;
    const locked = r && receivedRubric(id);
    showModal(r ? 'Editar rúbrica' : 'Crear rúbrica', `${locked ? note('Contenido bloqueado', 'La rúbrica ya recibió propuestas enviadas. Solo puedes extender su plazo.', 'warning') : ''}<div id="modalError" class="error-box notice danger" role="alert" style="margin-top:16px"></div><div class="field"><label for="rubricTitle">Título</label><input id="rubricTitle" value="${esc(r?.title || '')}" ${locked ? 'readonly' : ''}></div><div class="field"><label for="rubricCourse">Curso</label><select id="rubricCourse" ${locked ? 'disabled' : ''}>${db.courses.map(c => `<option value="${c.id}" ${r?.course === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="rubricCriteria">Criterios, niveles y pesos</label><textarea id="rubricCriteria" ${locked ? 'readonly' : ''} placeholder="Define la estructura de tu rúbrica libremente.">${esc(r?.criteria || '')}</textarea><small>Contenido libre. El prototipo no calcula ni registra notas.</small></div><div class="field"><label for="rubricComps">Competencias</label><textarea id="rubricComps" ${locked ? 'readonly' : ''} placeholder="Una competencia por línea">${esc((r?.competencies || []).join('\n'))}</textarea></div><div class="field"><label for="rubricDeadline">Plazo de recepción</label><input type="date" id="rubricDeadline" value="${esc(r?.deadline || '')}" ${locked ? `min="${r.deadline}"` : ''}></div>`, btn('Volver', 'close-modal') + (r && !locked ? btn('Eliminar rúbrica', 'rubric-delete', id, 'danger') : '') + btn(locked ? 'Extender plazo' : 'Guardar rúbrica', 'rubric-save', id || 'new', 'primary'));
}
function scenarios() {
    showModal('Escenarios de demostración', `<p>Usa datos de ejemplo para recorrer el prototipo. Elegir un escenario reemplaza los cambios guardados de esta demo.</p><div class="scenario-grid"><button class="scenario-btn" data-action="scenario-load" data-id="pending"><strong>01 · Falta una respuesta</strong><span>Dos aprobaciones y una rúbrica pendiente. El inicio está bloqueado.</span></button><button class="scenario-btn" data-action="scenario-load" data-id="ready"><strong>02 · Listo para iniciar</strong><span>Dos aprobaciones y un rechazo con feedback. El líder puede confirmar.</span></button><button class="scenario-btn" data-action="scenario-load" data-id="coverage"><strong>03 · Matrícula incompleta</strong><span>Falta cobertura de matrícula en una rúbrica aprobada.</span></button><button class="scenario-btn" data-action="scenario-load" data-id="evaluation"><strong>04 · En evaluación</strong><span>Proyecto confirmado. Los profesores pueden marcar su rúbrica como evaluada.</span></button></div><div class="divider"></div><div class="field"><label for="simulationDate">Fecha de simulación</label><input type="date" id="simulationDate" value="${db.date}"><small>Caducidad del periodo · ${fmt(periodo.caducidad)}. Al llegar esa fecha, las revisiones pendientes u observadas caducan y conservan el motivo.</small></div>${btn('Aplicar fecha', 'change-date', '', 'secondary')}<div class="divider"></div>${btn('Restablecer todos los datos', 'reset-demo', '', 'danger')}`, '', true);
}
document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled)
        return;
    if (db.demo === false && ['scenarios', 'scenario-load', 'change-date', 'reset-demo'].includes(el.dataset.action))
        return;
    const a = el.dataset.action, id = el.dataset.id || '', parts = id.split('|');
    if (el.closest('#profileMenu'))
        $('#profileMenu').open = false;
    if (a === 'chat-prompt')
        chatReply(id);
    else if (a === 'nav')
        nav(id);
    else if (a === 'course-rubrics') {
        courseFilter = id;
        nav('rubrics');
    }
    else if (a === 'close-modal')
        closeModal();
    else if (a === 'scenarios')
        scenarios();
    else if (a === 'select-rubric') {
        if (!selected.includes(id) && !rubricOpen(rubric(id)))
            return toast('El plazo de recepción de esta rúbrica está cerrado.', true);
        selected = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
        render();
        document.querySelector('[data-action="select-rubric"][data-id="' + CSS.escape(id) + '"]')?.focus();
    }
    else if (a === 'new-proposal') {
        if (isTeacher())
            return;
        if (db.demo === false) {
            showModal('Rúbricas seleccionadas', `<p>Conservamos tu selección en esta pantalla. La creación de propuestas se conectará en el paso 3.</p><ul>${selected.map(id => `<li>${esc(rubric(id).title)}</li>`).join('')}</ul>`, btn('Volver al catálogo', 'close-modal'));
            return;
        }
        if (!eligibleMember(current(), db.profile, selected))
            return toast('Elige al menos una rúbrica de un curso en el que estés matriculado.', true);
        editing = null;
        formMembers = [db.profile];
        nav('form');
    }
    else if (a === 'save-proposal')
        saveProposal(id);
    else if (a === 'detail-open')
        nav('detail/' + id);
    else if (a === 'project-open')
        nav('project/' + id);
    else if (a === 'review-open')
        nav('review/' + parts[0] + '/' + parts[1]);
    else if (a === 'edit-proposal') {
        const p = proposal(id);
        if (!p || !editableProposal(p))
            return toast('No puedes editar esta propuesta.', true);
        editing = id;
        selected = active(p).map(rel => rel.rubric);
        formMembers = [...p.members];
        nav('form');
    }
    else if (a === 'decide')
        openDecision(...parts);
    else if (a === 'save-decision')
        saveDecision(...parts);
    else if (a === 'confirm-start')
        confirmStart(id);
    else if (a === 'withdraw')
        withdraw(...parts);
    else if (a === 'withdraw-confirm') {
        const result = await change('projectAction', { pid: parts[0], rid: parts[1], action: 'withdraw' }, 'Rúbrica retirada.');
        if (result?.result?.length)
            toast('Integrantes retirados por matrícula: ' + result.result.join(', '));
    }
    else if (a === 'dates-edit') {
        const rel = relFor(proposal(parts[0]), parts[1]);
        showModal('Ajustar fechas de mi rúbrica',
            `<div id="modalError" class="error-box notice danger" role="alert"></div>
             <label class="field">Fecha de inicio<input id="adjustStart" type="date" value="${esc(rel.start)}"></label>
             <label class="field">Fecha de fin<input id="adjustEnd" type="date" value="${esc(rel.end)}"></label>`,
            btn('Volver', 'close-modal') + btn('Guardar fechas', 'dates-save', id, 'primary'));
    }
    else if (a === 'dates-save')
        await change('projectAction', {pid:parts[0], rid:parts[1], action:'dates',
            start:value('#adjustStart'), end:value('#adjustEnd')}, 'Fechas actualizadas en el calendario.');
    else if (a === 'evaluate')
        projectAction(...parts, 'evaluate');
    else if (a === 'cancel-rubric')
        projectAction(...parts, 'cancel');
    else if (a === 'cancel-confirm') {
        await change('projectAction', { pid: parts[0], rid: parts[1], action: 'cancel' }, 'Cancelación registrada.');
    }
    else if (a === 'rubric-create')
        openRubric();
    else if (a === 'rubric-edit')
        openRubric(id);
    else if (a === 'rubric-delete')
        showModal('Eliminar rúbrica', '<p>Se eliminarán la rúbrica y sus competencias. Los borradores conservarán su contenido y equipo. Sus vínculos y sustentos de esta rúbrica se archivarán en el historial antes de retirarlos. Si quedan sin rúbricas, continuarán como borradores incompletos. Una propuesta enviada impide la eliminación.</p><div id="modalError" class="error-box notice danger" role="alert"></div>', btn('Volver', 'close-modal') + btn('Eliminar rúbrica', 'delete-confirm', id, 'danger'));
    else if (a === 'delete-confirm') {
        if (await change('saveRubric', { id, remove: true, version: rubric(id)?.version }, 'Rúbrica eliminada. Los vínculos de borradores se conservaron en el historial.'))
            selected = selected.filter(x => x !== id);
    }
    else if (a === 'rubric-save')
        saveRubric(id);
    else if (a === 'scenario-load')
        loadScenario(id);
    else if (a === 'change-date') {
        const d = $('#simulationDate').value;
        if (!d)
            return toast('Selecciona una fecha.', true);
        if (await change('date', d, 'Fecha actualizada.')) {
            calendarMonth = d.slice(0, 7);
            calendarDay = d;
            render();
        }
    }
    else if (a === 'reset-demo')
        loadScenario('pending');
    else
        academicTool(a, id);
});
document.addEventListener('change', e => {
    if (e.target.dataset.draftRubric) {
        const title = $('#proposalTitle').value, description = $('#proposalDescription').value;
        const proof = [...document.querySelectorAll('[data-evidence]')].map(f => [f.dataset.evidence, f.dataset.index, f.value]);
        const chosen = e.target.dataset.draftRubric;
        selected = e.target.checked ? [...new Set([...selected, chosen])] : selected.filter(id => id !== chosen);
        const removed = formMembers.filter(id => id !== db.profile && !eligibleMember(student(id), db.profile, selected));
        formMembers = formMembers.filter(id => !removed.includes(id));
        render();
        $('#proposalTitle').value = title;
        $('#proposalDescription').value = description;
        for (const f of document.querySelectorAll('[data-evidence]')) {
            const old = proof.find(([r, i]) => r === f.dataset.evidence && i === f.dataset.index);
            if (old)
                f.value = old[2];
        }
        document.querySelector('[data-draft-rubric="' + CSS.escape(chosen) + '"]')?.focus();
        if (removed.length)
            toast('Ya no tienen un curso aplicable: ' + removed.map(id => student(id).name).join(', '));
        return;
    }
    if (e.target.id === 'assistantTeam') {
        assistantTeam = e.target.value;
        render();
        return;
    }
    if (e.target.dataset.checkRubric) {
        const p = proposal(e.target.dataset.checkProposal), r = rubric(e.target.dataset.checkRubric), rel = p && r && relFor(p, r.id);
        if (rel && !p.draft && isTeacher() && r.teacher === db.profile && !rel.withdrawn && !closedReview(p, rel)) {
            change('review', { pid: p.id, linkId: rel.id, competencyId: e.target.dataset.index, value: e.target.value }, '', false);
        }
        return;
    }
    if (e.target.id === 'profile' || e.target.id === 'academicProfile') {
        switchProfile(e.target.value);
    }
    else if (e.target.id === 'courseFilter') {
        courseFilter = e.target.value;
        render();
    }
    else if (e.target.id === 'rubricFilter') {
        listRubric = e.target.value;
        render();
    }
    else if (e.target.id === 'decisionFilter') {
        decisionFilter = e.target.value;
        render();
    }
    else if (e.target.name === 'member') {
        const p = editing ? proposal(editing) : null;
        formMembers = [...new Set([p?.leader || db.profile, ...[...document.querySelectorAll('input[name="member"]:checked')].map(n => n.value)])];
        $('#coverageList').innerHTML = coverageHTML(p && !p.draft ? active(p).map(r => r.rubric) : selected, formMembers);
    }
});
document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'proposalForm')
        saveProposal('send');
    else if (e.target.id === 'assistantForm')
        chatReply($('#chatText').value);
});
$('#menuToggle').addEventListener('click', () => {
    if (facultyLayout() && !matchMedia('(max-width:640px)').matches) {
        change('sidebar', !db.collapsed);
        return;
    }
    setDrawer($('#sidebar').hidden);
});
matchMedia('(max-width:640px)').addEventListener('change', () => {
    if (facultyLayout())
        render();
});
$('#mobileShade').addEventListener('click', () => setDrawer(false));
document.addEventListener('input', event => {
    if (event.target.id === 'memberSearch') {
        const q = event.target.value.trim().toLowerCase();
        document.querySelectorAll('[data-member-name]').forEach(el => el.hidden = !el.dataset.memberName.includes(q));
        return;
    }
    if (event.target.id === 'campusSearch') {
        courseDisplay.query = event.target.value;
        $('#campusResults').innerHTML = courseCards();
    }
});
document.addEventListener('change', event => {
    if (event.target.id === 'campusOrder')
        courseDisplay.order = event.target.value;
    else if (event.target.id === 'campusLayout')
        courseDisplay.layout = event.target.value;
    else
        return;
    $('#campusResults').innerHTML = courseCards();
});
document.addEventListener('keydown', e => {
    const modal = $('#modalRoot .modal');
    if (e.key === 'Escape') {
        if (modal)
            closeModal();
        else if (!$('#sidebar').hidden && (!facultyLayout() || matchMedia('(max-width:640px)').matches)) {
            setDrawer(false);
            $('#menuToggle').focus();
        }
    }
    if (e.key === 'Tab' && modal) {
        const focus = [...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')];
        const first = focus[0], last = focus.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
document.addEventListener('click', e => {
    if (e.target.id === 'modalShade')
        closeModal();
});
railBreakpoint.addEventListener('change', e => {
    railOpen = e.matches;
    renderRail();
});
document.addEventListener('click', e => {
    if (!e.target.closest('#profileMenu'))
        $('#profileMenu').open = false;
});
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape')
        return;
    if ($('#profileMenu').open) {
        $('#profileMenu').open = false;
        $('#profileMenu summary').focus();
    }
    else if (railOpen && !railBreakpoint.matches && !$('#modalRoot').innerHTML) {
        railOpen = false;
        renderRail();
        $('#railToggle').focus();
    }
});
export { assistantView, chatReply, toast, nav, render, viewName, profileCourses, moduleTabs, updateNavigation, renderSidebar, facultyLayout, updateFacultyShell, setDrawer, toolButton, academicAlerts, refreshBell, openAlerts, peopleContext, peopleBlock, renderRail, applyCalendar, academicTool, showModal, closeModal, modalError, openDecision, withdraw, projectAction, openRubric, scenarios, selected, editing, formMembers, courseFilter, decisionFilter, listRubric, calendarDay, calendarMonth, route, courseDisplay };
let busy = false;
async function change(operation, input, message = '', refresh = true) {
    if (busy)
        return;
    busy = true;
    document.body.inert = true;
    $('#main').setAttribute('aria-busy', 'true');
    try {
        const response = await execute(operation, input);
        setSnapshot(response.snapshot);
        if (refresh) {
            closeModal();
            render();
        }
        if (message)
            toast(message);
        return response;
    }
    catch (error) {
        const box = $('#modalError') || $('#formError');
        if (box) {
            box.textContent = error.message;
            box.scrollIntoView({ block: 'nearest' });
        }
        else
            toast(error.message, true);
        if (operation === 'review' && input.competencyId)
            render();
    }
    finally {
        busy = false;
        document.body.inert = false;
        $('#main').removeAttribute('aria-busy');
    }
}
function clearSelection() {
    editing = null;
    selected = [];
    formMembers = [];
    courseFilter = '';
    decisionFilter = '';
    listRubric = '';
}
async function switchProfile(id) {
    if (db.demo === false && !db.profileOptions?.length)
        return;
    if (await change('profile', id, '', false)) {
        clearSelection();
        nav(db.demo === false ? 'rubrics' : 'home');
    }
    else
        render();
}
async function loadScenario(kind) {
    if (await change('scenario', kind, 'Escenario cargado.', false)) {
        clearSelection();
        calendarDay = db.date;
        calendarMonth = db.date.slice(0, 7);
        nav('home');
    }
}
const value = selector => $(selector)?.value.trim() || '';
async function saveProposal(mode) {
    const evidence = {};
    for (const field of document.querySelectorAll('[data-evidence]')) {
        (evidence[field.dataset.evidence] ??= {})[field.dataset.index] = field.value.trim();
    }
    const response = await change('saveProposal', {
        id: editing,
        mode,
        title: value('#proposalTitle'),
        description: value('#proposalDescription'),
        rubrics: selected,
        members: formMembers,
        evidence
    }, mode === 'send' ? 'Propuesta enviada a los profesores.' : 'Borrador guardado.', false);
    if (response) {
        clearSelection();
        nav('detail/' + response.result);
    }
}
function saveDecision(pid, rid, decision) {
    return change('review', {
        pid,
        linkId: relFor(proposal(pid), rid).id,
        decision,
        start: value('#decisionStart'),
        end: value('#decisionEnd'),
        feedback: value('#decisionFeedback'),
        delivery: value('#firstDelivery'),
        deliveryDate: value('#firstDeliveryDate')
    }, 'Decisión registrada. El equipo recibió un aviso.');
}
function saveRubric(id) {
    return change('saveRubric', {
        id: id === 'new' ? null : id,
        version: rubric(id)?.version,
        title: value('#rubricTitle'),
        course: value('#rubricCourse'),
        criteria: value('#rubricCriteria'),
        deadline: value('#rubricDeadline'),
        competencies: value('#rubricComps').split('\n').map(c => c.trim()).filter(Boolean)
    }, 'Rúbrica guardada.');
}
function confirmStart(pid) {
    return change('projectAction', { pid, action: 'confirm' }, 'Inicio confirmado.');
}
