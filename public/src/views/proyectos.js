import { screen } from '../ui.js';
import { eligibleMember, db, terminal, hasObservation, hasOpenReviews, student, teacher, course, rubric, proposal, isTeacher, own, active, projectRubrics, dates, projectState, visibleProject, pill, fmt, cover } from "../model.js";
import { icon, esc, btn, note, head, empty } from "../ui.js";
import { historyHTML, membersHTML, rubricParticipants, verificationSummary } from "../views/components.js";
import { eventsList } from "../views/calendario.js";
function deliverablesView(p) {
    const scheduled = (p.deliverables || []).filter(d => projectRubrics(p).some(r => r.rubric === d.rubric));
    return `<section class="card"><div class="card-title"><h2>Entregables</h2>${icon('calendar')}</div>${scheduled.length ? eventsList(scheduled.slice().sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
        day: d.date,
        level: 'Importante',
        title: d.title,
        context: rubric(d.rubric)?.title || p.title,
        action: 'nav',
        id: 'agenda'
    }))) : '<p class=muted>Todavía no hay entregables programados.</p>'}</section>`;
}
function projectsView() {
    const ps = db.proposals.filter(visibleProject);
    return screen('proyectos/lista', {
        heading: head(isTeacher() ? 'Proyectos' : 'Mis proyectos', 'Elige un proyecto para consultar sus rúbricas, fechas y entregables.'),
        projects: ps.length ? `<div class="stack">${ps.map(p => `<section class="card"><div class="row wrap"><div><h2>${esc(p.title)}</h2><p class="small muted" style="margin-top:5px">Equipo de ${esc(student(p.leader).name)} · ${projectRubrics(p).length} rúbricas activas</p></div>${pill(projectState(p))}</div><div class="divider"></div><div class="row wrap"><span class="small muted">Inicio · ${fmt(dates(p).start)} &nbsp; / &nbsp; Fin · ${fmt(dates(p).end)}</span>${btn('Abrir seguimiento', 'project-open', p.id, 'primary')}</div></section>`).join('')}</div>` : empty('Todavía no hay proyectos vinculados', 'El proyecto nace cuando una propuesta alcanza al menos dos aprobaciones.')
    });
}
function projectView(id) {
    const p = proposal(id);
    if (!p || !visibleProject(p))
        return empty('Proyecto no disponible', 'Accede desde los proyectos de tu equipo o de tus rúbricas aprobadas.');
    const state = projectState(p), d = dates(p), rs = projectRubrics(p), waiting = hasOpenReviews(p), bad = p.members.some(id => !eligibleMember(student(id), p.leader, rs.map(x => x.rubric))) || rs.some(r => !cover(p.members, rubric(r.rubric)).length), canConfirm = own(p) && !p.confirmed && !waiting && !bad && rs.length >= 2 && state !== 'CANCELADO';
    const idx = ['PENDIENTE_INICIO', 'EN_EJECUCION', 'EN_EVALUACION', 'FINALIZADO'].indexOf(state);
    return screen('proyectos/seguimiento', {
        back: icon('back'),
        heading: head(p.title, 'Seguimiento del proyecto', pill(state)),
        stages: idx >= 0 ? `<ol class="track-stages" aria-label="Etapas del proyecto">${['Preparación', 'En ejecución', 'En evaluación', 'Finalizado'].map((label, i) => `
    <li class="${i === idx ? 'current' : i < idx ? 'done' : ''}" ${i === idx ? 'aria-current="step"' : ''}>
      <span class="stage-marker" aria-hidden="true">${i < idx ? icon('check') : i + 1}</span>
      <span><strong>${label}</strong><small>${i === idx ? 'Etapa actual' : i < idx ? 'Completada' : 'Pendiente'}</small></span>
    </li>`).join('')}</ol>` : '',
        status: state === 'CANCELADO' ? note('Proyecto cancelado', 'Quedaron menos de dos rúbricas activas.', 'warning') : state === 'FINALIZADO' ? note('Evaluación completa', 'Los profesores evaluaron todas las rúbricas activas.', 'success') : state === 'EN_EVALUACION' ? note('Evaluación en curso', 'Cada profesor revisa su rúbrica y la marca como evaluada.') : waiting ? note(hasObservation(p) ? 'Observación pendiente' : 'Falta una respuesta', hasObservation(p) ? 'El líder debe corregir y reenviar la propuesta antes de iniciar.' : 'Aunque hay dos aprobaciones, todos los profesores deben responder antes de confirmar.', 'warning') : p.confirmed ? note('Inicio confirmado', state === 'PENDIENTE_INICIO' ? 'El proyecto comenzará en la fecha de inicio más temprana: ' + fmt(d.start) + '.' : 'El equipo está trabajando en los entregables del proyecto.', 'success') : note('Revisión completada', 'El líder puede confirmar con dos aprobaciones y las matrículas cubiertas.', 'success'),
        coverage: bad ? note('Revisa las matrículas', 'Cada integrante debe cursar una asignatura aplicable y cada rúbrica activa debe tener cobertura.', 'danger') : '',
        count: rs.length,
        rubrics: active(p).map(rel => {
            const r = rubric(rel.rubric);
            const rejected = terminal(rel);
            const mine = isTeacher() && r.teacher === db.profile;
            return `<article class="relation"><div class="row wrap"><div><h3>${esc(r.title)}</h3><p class="small muted">${esc(course(r.course).name)} · ${esc(teacher(r.teacher).name)}</p></div>${rel.cancelled ? pill('CANCELADO') : pill(rel.decision)}</div>${!rejected && !rel.cancelled ? rubricParticipants(p.members, r) : ''}${rel.expiryReason ? note('Motivo de caducidad', rel.expiryReason) : ''}${rel.decision === 'APROBADA' ? `<div class="dates"><span>Inicio · ${fmt(rel.start)}</span><span>Fin · ${fmt(rel.end)}</span></div><div style="margin-top:10px">${rel.cancelled ? '' : rel.evaluated ? '<span class="pill finalizado">Evaluada</span>' : '<span class="small muted">Evaluación pendiente</span>'}</div>` : ''}${rel.feedback ? `<div class="feedback"><strong>Comentario del profesor</strong>${esc(rel.feedback)}</div>` : ''}${rejected ? '<p class="small muted" style="margin-top:10px">Fuera del proyecto.</p>' : ''}${historyHTML(rel)}${verificationSummary(r, rel)}${mine && rel.decision === 'APROBADA' && !rel.cancelled && state !== 'CANCELADO' && state !== 'FINALIZADO' ? `<div class="actions" style="margin-top:15px">${state === 'PENDIENTE_INICIO' ? btn('Ajustar fechas','dates-edit',p.id+'|'+r.id,'small secondary') : ''}${btn('Marcar como evaluada', 'evaluate', p.id + '|' + r.id, 'small secondary', state !== 'EN_EVALUACION' || rel.evaluated)}${state !== 'EN_EVALUACION' ? '<small>Disponible al llegar la fecha de fin más tardía.</small>' : ''}${btn('Cancelar mi rúbrica', 'cancel-rubric', p.id + '|' + r.id, 'small danger')}</div>` : ''}</article>`;
        }).join(''),
        deliverables: deliverablesView(p),
        calendarIcon: icon('calendar'),
        start: fmt(d.start),
        end: fmt(d.end),
        team: membersHTML(p),
        confirm: own(p) && !p.confirmed && state !== 'CANCELADO' ? `<div class="stack">${btn('Confirmar inicio', 'confirm-start', p.id, 'block primary', !canConfirm)}<p class="small muted">${waiting ? 'Espera la respuesta de todos los profesores.' : bad ? 'Se necesita cobertura de matrícula en todas las rúbricas activas.' : 'Se volverán a validar las matrículas al confirmar.'}</p></div>` : '',
        proposal: !isTeacher() ? btn('Ver propuesta', 'detail-open', p.id, 'block secondary') : ''
    });
}
export { deliverablesView, projectsView, projectView };
