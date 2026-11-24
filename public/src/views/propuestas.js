import { screen } from '../ui.js';
import { db, rubricOpen, closedReview, hasObservation, editableProposal, eligibleMember, student, teacher, course, rubric, proposal, isTeacher, own, active, responses, proposalState, visible, labels, pill, fmt, relFor, receivedRubric } from "../model.js";
import { icon, esc, btn, note, head, empty } from "../ui.js";
import { selected, editing, formMembers, courseFilter, decisionFilter, listRubric } from "../app.js";
import { evidenceFields, competencyList, historyHTML, membersHTML, coverageHTML, rubricParticipants, relationHTML } from "../views/components.js";
function rubricsView() {
    const mine = isTeacher();
    const rs = db.rubrics.filter(r => mine ? r.teacher === db.profile : rubricOpen(r)).filter(r => !courseFilter || r.course === courseFilter);
    return screen('rubricas/lista', {
        heading: head(mine ? 'Mis rúbricas' : 'Rúbricas disponibles', mine ? 'Define tus criterios y el plazo para recibir propuestas.' : 'Consulta los criterios y selecciona al menos dos rúbricas.', mine ? btn('Crear rúbrica', 'rubric-create', '', 'primary') : ''),
        courses: db.courses.map(c => `<option value="${c.id}" ${courseFilter === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join(''),
        count: rs.length,
        filterLabel: mine ? 'en tu espacio' : 'con plazo vigente',
        rubrics: rs.length ? `<div class="rubric-grid">${rs.map(r => `<article class="rubric-card ${selected.includes(r.id) ? 'selected' : ''}"><div class="row"><span class="course-tag">${esc(course(r.course).name)}</span>${mine ? pill(rubricOpen(r) ? 'ENVIADA' : 'BORRADOR').replace('Enviada', 'Abierta').replace('Borrador', 'Vencida') : icon('rubric')}</div><h3>${esc(r.title)}</h3><div class="rubric-meta"><span>${icon('users')} ${esc(teacher(r.teacher).name)}</span><span>${icon('calendar')} Hasta el ${fmt(r.deadline)}</span></div><div><div class="label" style="margin-bottom:7px">Criterios de la rúbrica</div><div class="criteria">${esc(r.criteria)}</div></div><details><summary>Competencias</summary><ul>${r.competencies.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details><div style="margin-top:auto">${mine ? btn(receivedRubric(r.id) ? 'Consultar / extender plazo' : 'Editar rúbrica', 'rubric-edit', r.id, 'block secondary') : btn(selected.includes(r.id) ? 'Seleccionada' : 'Seleccionar rúbrica', 'select-rubric', r.id, selected.includes(r.id) ? 'block primary' : 'block secondary')}</div></article>`).join('')}</div>` : empty('No hay rúbricas disponibles', 'Prueba otro curso o revisa los plazos de recepción.'),
        selection: !mine ? `<div class="selection-bar"><div><strong>${selected.length} rúbricas seleccionadas</strong><p>El equipo debe cubrir la matrícula de cada curso.</p></div>${btn('Preparar propuesta', 'new-proposal', '', 'primary', selected.length < 2)}${selected.length < 2 ? '<small>Selecciona al menos dos rúbricas para continuar.</small>' : ''}</div>` : ''
    });
}
function proposalsView() {
    if (isTeacher())
        return empty('Vista de alumnos', 'Selecciona un perfil de alumno para consultar esta pantalla.');
    const ps = db.proposals.filter(visible);
    return screen('propuestas/lista', {
        heading: head('Mis propuestas', 'Consulta las decisiones y el feedback de cada profesor.', btn('Nueva propuesta', 'nav', 'rubrics', 'primary')),
        tableHidden: ps.length ? '' : 'hidden',
        rows: ps.slice().reverse().map(p => `<tr><td><strong>${esc(p.title)}</strong><small>${p.members.length} integrantes · ${active(p).length} rúbricas</small></td><td>${p.sent ? fmt(p.sent) : 'Sin enviar'}</td><td>${pill(proposalState(p))}</td><td>${responses(p)} / ${active(p).length}</td><td>${btn('Ver detalle', 'detail-open', p.id, 'small secondary')}</td></tr>`).join(''),
        emptyState: ps.length ? '' : empty('Aún no tienes propuestas', 'Empieza seleccionando las rúbricas de tu proyecto.')
    });
}
function formView() {
    if (isTeacher())
        return empty('Acción del líder', 'La creación de propuestas corresponde a los alumnos.');
    const p = editing ? proposal(editing) : null;
    if (p && !editableProposal(p))
        return empty('Edición no disponible', 'Solo el líder puede editar antes del inicio.');
    if (p && proposalState(p) === 'RECHAZADA')
        return empty('Propuesta rechazada', 'En este prototipo se crea una nueva propuesta.');
    let ids = p && !p.draft ? active(p).map(r => r.rubric) : selected;
    return screen('propuestas/formulario', {
        back: icon('back'),
        heading: head(p ? (p.draft ? 'Editar borrador' : 'Corregir propuesta') : 'Preparar propuesta', 'Solo el líder puede editar y enviar la propuesta.'),
        proposalIcon: icon('proposal'),
        title: esc(p?.title || ''),
        description: esc(p?.description || ''),
        evidence: evidenceFields(p, ids),
        teamIcon: icon('users'),
        members: db.students.filter(s => s.id === (p?.leader || db.profile) || eligibleMember(s, p?.leader || db.profile, ids)).map(s => `<div class="check-row" data-member-name="${esc(s.name.toLowerCase())}"><input type="checkbox" id="member-${s.id}" name="member" value="${s.id}" ${formMembers.includes(s.id) ? 'checked' : ''} ${s.id === (p?.leader || db.profile) ? 'disabled' : ''}><label for="member-${s.id}"><strong>${esc(s.name)}</strong> ${s.id === (p?.leader || db.profile) ? '<span class="pill">Líder</span>' : ''}<br><small class="muted">${esc(s.courses.map(c => course(c).name).join(' · ')) || 'Sin matrícula en los cursos seleccionados'}</small></label></div>`).join(''),
        count: ids.length,
        coverage: coverageHTML(ids, formMembers),
        rubricPicker: !p || p.draft ? `<details><summary>Cambiar rúbricas</summary>${db.rubrics.filter(r => rubricOpen(r) || ids.includes(r.id)).map(r => `<label class="check-row"><input type="checkbox" data-draft-rubric="${esc(r.id)}" ${ids.includes(r.id) ? 'checked' : ''}>${esc(r.title)}${rubricOpen(r) ? '' : ' (recepción cerrada)'}</label>`).join('')}</details>` : '',
        save: p && !p.draft ? '' : btn('Guardar borrador', 'save-proposal', 'draft', 'secondary', !!p && !p.draft),
        send: btn(p && !p.draft ? 'Reenviar propuesta' : 'Enviar propuesta', 'save-proposal', 'send', 'primary')
    });
}
function detailView(id) {
    const p = proposal(id);
    if (!p || !visible(p) || isTeacher())
        return empty('Propuesta no disponible', 'Accede desde tu listado de propuestas.');
    const ps = proposalState(p);
    const canEdit = editableProposal(p);
    return screen('propuestas/detalle', {
        back: icon('back'),
        heading: head(p.title, 'Una propuesta compartida; una decisión independiente por rúbrica.', pill(ps)),
        proposalIcon: icon('proposal'),
        description: esc(p.description) || 'Todavía no hay descripción.',
        responses: responses(p),
        total: active(p).length,
        decisions: active(p).map(r => relationHTML(p, r, true)).join(''),
        teamIcon: icon('users'),
        members: membersHTML(p),
        status: ps === 'APROBADA' ? note('Propuesta aprobada', hasObservation(p) ? 'Hay una observación por subsanar antes de confirmar.' : responses(p) < active(p).length ? 'Ya hay dos aprobaciones, pero falta la respuesta de todos los profesores.' : 'Todas las respuestas están registradas. El líder puede revisar y confirmar el inicio.', 'success') : ps === 'RECHAZADA' ? note('No se alcanzarán dos aprobaciones', 'En este prototipo, el equipo debe presentar una nueva propuesta.', 'warning') : note('Propuesta en revisión', 'Consulta las decisiones y corrige según el feedback antes de iniciar.'),
        edit: canEdit ? btn(p.draft ? 'Editar borrador' : 'Editar y reenviar', 'edit-proposal', p.id, 'block secondary') : '',
        tracking: p.born ? btn('Ver seguimiento', 'project-open', p.id, 'block primary') : '',
        create: ps === 'RECHAZADA' ? btn('Nueva propuesta', 'nav', 'rubrics', 'block primary') : '',
        permissions: !own(p) ? note('Vista de integrante', 'Puedes consultar el equipo, el feedback y el seguimiento. Las acciones de envío e inicio corresponden al líder.') : ''
    });
}
function receivedView() {
    if (!isTeacher())
        return empty('Vista de profesor', 'Selecciona un perfil de profesor para revisar propuestas.');
    const mine = db.rubrics.filter(r => r.teacher === db.profile);
    const rows = db.proposals.filter(p => !p.draft).flatMap(p => active(p).filter(r => rubric(r.rubric).teacher === db.profile && (!listRubric || r.rubric === listRubric) && (!decisionFilter || r.decision === decisionFilter)).map(r => ({ p, r })));
    return screen('docente/bandeja', {
        heading: head('Propuestas recibidas', 'Revisa únicamente las propuestas dirigidas a tus rúbricas.'),
        rubrics: mine.map(r => `<option value="${r.id}" ${listRubric === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join(''),
        statuses: ['PENDIENTE', 'OBSERVADA', 'APROBADA', 'RECHAZADA', 'CADUCADA'].map(s => `<option value="${s}" ${decisionFilter === s ? 'selected' : ''}>${labels[s]}</option>`).join(''),
        count: rows.length,
        tableHidden: rows.length ? '' : 'hidden',
        rows: rows.map(({ p, r }) => `<tr><td><strong>${esc(p.title)}</strong><small>Equipo de ${esc(student(p.leader).name)}</small></td><td><strong>${esc(rubric(r.rubric).title)}</strong><small>${esc(course(rubric(r.rubric).course).name)}</small></td><td>${fmt(p.sent)}</td><td>${pill(r.decision)}</td><td>${btn('Revisar', 'review-open', p.id + '|' + r.rubric, 'small secondary')}</td></tr>`).join(''),
        emptyState: rows.length ? '' : empty('No hay propuestas con esos filtros', 'Prueba con otra rúbrica o con todas las decisiones.')
    });
}
function reviewView(id, rid) {
    const p = proposal(id), r = rubric(rid), rel = p && relFor(p, rid);
    if (!isTeacher() || !p || !rel || r.teacher !== db.profile || p.draft || rel.withdrawn)
        return empty('Revisión no disponible', 'Solo el profesor responsable puede decidir sobre esta rúbrica.');
    const locked = closedReview(p, rel);
    return screen('docente/revision', {
        back: icon('back'),
        heading: head('Revisión de propuesta', p.title + ' · Enviada el ' + fmt(p.sent), pill(rel.decision)),
        title: esc(p.title),
        proposalIcon: icon('proposal'),
        description: esc(p.description),
        members: membersHTML(p),
        count: active(p).length,
        rubrics: active(p).map(x => `<div class="member"><div class="card-header-icon">${icon('rubric')}</div><div><strong class="small">${esc(rubric(x.rubric).title)}</strong><div class="small muted">${esc(course(rubric(x.rubric).course).name)} · ${esc(teacher(rubric(x.rubric).teacher).name)}</div></div></div>`).join(''),
        rubricTitle: esc(r.title),
        course: esc(course(r.course).name),
        participants: rubricParticipants(p.members, r),
        competencies: competencyList(p, r, rel),
        criteria: esc(r.criteria),
        feedback: rel.feedback ? `<div class="feedback">${esc(rel.feedback)}</div><div class="divider"></div>` : '',
        approve: btn(rel.decision === 'APROBADA' ? 'Revisar aprobación' : 'Aprobar propuesta', 'decide', p.id + '|' + rid + '|APROBADA', 'block primary', locked),
        observe: btn('Observar y pedir corrección', 'decide', p.id + '|' + rid + '|OBSERVADA', 'block secondary', locked || rel.observations >= 2),
        reject: btn('Rechazo definitivo', 'decide', p.id + '|' + rid + '|RECHAZADA', 'block orange', locked),
        observations: rel.observations || 0,
        history: historyHTML(rel),
        guidance: rel.decision === 'RECHAZADA' ? note('Rechazo definitivo', 'Esta propuesta queda cerrada para tu rúbrica.') : locked ? note(labels[rel.decision], rel.expiryReason || (rel.decision === 'OBSERVADA' ? 'A la espera de la corrección del equipo.' : 'La revisión está cerrada.')) : note('Orientar al equipo', 'El rechazo necesita feedback. La aprobación necesita fecha de inicio y fin.')
    });
}
export { rubricsView, proposalsView, formView, detailView, receivedView, reviewView };
