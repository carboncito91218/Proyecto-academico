import { screen } from '../ui.js';
import { db, periodo, rubric, isTeacher, active, projectRubrics, projectState, visible, visibleProject, fmt } from "../model.js";
import { esc, head } from "../ui.js";
import { profileCourses, toolButton, calendarDay, calendarMonth } from "../app.js";
import { portalLink } from "../views/components.js";
function extraEvents() {
    const events = [];
    for (const p of db.proposals.filter(visible)) {
        if (p.draft)
            continue;
        for (const rel of active(p)) {
            const r = rubric(rel.rubric);
            if (!['OBSERVADA', 'PENDIENTE'].includes(rel.decision) || (isTeacher() && r.teacher !== db.profile))
                continue;
            events.push({
                day: periodo.caducidad,
                level: 'Crítica',
                title: 'Caducidad · ' + r.title,
                context: p.title,
                action: isTeacher() ? 'review-open' : 'detail-open',
                id: isTeacher() ? p.id + '|' + r.id : p.id
            });
        }
    }
    for (const p of db.proposals.filter(visibleProject)) {
        if (projectState(p) === 'CANCELADO')
            continue;
        for (const d of (p.deliverables || []).filter(d => projectRubrics(p).some(r => r.rubric === d.rubric)))
            events.push({
                day: d.date,
                level: 'Importante',
                title: 'Entrega · ' + d.title,
                context: p.title,
                action: 'project-open',
                id: p.id
            });
    }
    if (isTeacher())
        events.push({
            day: periodo.limiteNotas,
            level: 'Crítica',
            title: 'Cierre de registro de notas',
            context: 'Calendario institucional',
            action: 'nav',
            id: 'agenda'
        });
    return events;
}
function importance(e) {
    const level = e.level;
    return `<span class="priority" data-level="${level}">${level}</span>`;
}
function eventsList(events) {
    return events.length ? events.map(e => `<div class="agenda-item"><time datetime="${e.day}"><strong>${e.day.slice(8)}</strong><small>${new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' }).format(new Date(e.day + 'T12:00:00Z'))}</small></time><div>${importance(e)}${portalLink(e.title, e.action, e.id)}<small>${esc(e.context || 'Calendario académico')}</small></div></div>`).join('') : '<p class="muted">Sin eventos este mes.</p>';
}
function agendaView() {
    const events = calendarEvents().filter(e => e.day.startsWith(calendarMonth)).sort((a, b) => a.day.localeCompare(b.day));
    return head('Calendario académico', isTeacher() ? 'Revisiones, entregables y cierre de notas.' : 'Plazos de envío, respuestas docentes y entregables.') + screen('calendario/agenda', {
        calendar: calendarMarkup(),
        events: eventsList(events)
    });
}
function calendarEvents() {
    const events = [];
    for (const p of db.proposals.filter(visibleProject)) {
        if (projectState(p) === 'CANCELADO')
            continue;
        for (const rel of projectRubrics(p)) {
            const d = rel;
            if (isTeacher() && rubric(rel.rubric).teacher !== db.profile)
                continue;
            for (const [day, title] of [[d.start, p.confirmed ? 'Inicio' : 'Inicio previsto'], [d.end, 'Fin previsto']]) {
                if (day)
                    events.push({
                        day,
                        level: 'Importante',
                        title: title + ' · ' + rubric(rel.rubric).title,
                        context: p.title,
                        action: 'project-open',
                        id: p.id
                    });
            }
        }
    }
    const courses = new Set(profileCourses().map(c => c.id));
    const teamRubrics = new Set(db.proposals.filter(visible).flatMap(p => active(p).map(rel => rel.rubric)));
    for (const r of db.rubrics) {
        if (isTeacher() ? r.teacher === db.profile : courses.has(r.course) || teamRubrics.has(r.id)) {
            events.push({ day: r.deadline, level: 'Crítica', title: 'Cierre · ' + r.title, action: 'course-rubrics', id: r.course });
            if (r.extendedOn)
                events.push({
                    day: r.extendedOn,
                    level: 'Informativa',
                    title: 'Prórroga · ' + r.title,
                    context: 'Nuevo cierre · ' + fmt(r.deadline),
                    action: 'course-rubrics',
                    id: r.course
                });
        }
    }
    events.push(
        { day: periodo.inicio, level: 'Informativa', title: 'Inicio del periodo académico', action: 'nav', id: 'agenda' },
        { day: periodo.caducidad, level: 'Crítica', title: 'Caducidad del periodo', action: 'nav', id: 'agenda' }
    );
    return events.concat(extraEvents());
}
function calendarMarkup() {
    const first = new Date(calendarMonth + '-01T12:00:00Z'), year = first.getUTCFullYear(), month = first.getUTCMonth();
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const events = calendarEvents(), activeDays = new Set(events.map(e => e.day));
    const heading = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    const cells = Array.from({ length: days }, (_, i) => {
        const day = calendarMonth + '-' + String(i + 1).padStart(2, '0');
        return `<button data-action="cal-day" data-id="${day}" aria-label="${fmt(day)}${activeDays.has(day) ? ', con eventos' : ''}" aria-pressed="${day === calendarDay}" class="${activeDays.has(day) ? 'event-day' : ''}">${i + 1}</button>`;
    }).join('');
    return `<div class="cal-heading">${toolButton('cal-prev', 'Mes anterior', 'back')}<strong>${esc(heading)}</strong>${toolButton('cal-next', 'Mes siguiente', 'arrow')}</div>
  <div class="cal-grid">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => '<b>' + d + '</b>').join('')}${'<span></span>'.repeat((first.getUTCDay() + 6) % 7)}${cells}</div>
  <div class="cal-agenda"><strong>${fmt(calendarDay)}</strong>${events.filter(e => e.day === calendarDay).map(e => importance(e) + portalLink(e.title, e.action, e.id)).join('') || '<small>Sin actividades programadas.</small>'}</div>`;
}
export { extraEvents, importance, eventsList, agendaView, calendarEvents, calendarMarkup };
