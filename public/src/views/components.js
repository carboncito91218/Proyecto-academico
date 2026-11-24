import { terminal, closedReview, student, teacher, course, rubric, own, active, proposalState, started, pill, fmt, relFor, cover } from "../model.js";
import { icon, esc, btn, note } from "../ui.js";
function evidenceFields(p, ids) {
    return ids.map(id => {
        const r = rubric(id), rel = p && relFor(p, id);
        if (rel && terminal(rel))
            return '';
        return `<section class="card"><h2>${esc(r.title)}</h2><p>Explica cómo abordará el equipo cada competencia.</p>${r.competencies.map((c, i) => `<label class="field">${esc(c)}<textarea data-evidence="${esc(id)}" data-index="${esc(r.competencyIds[i])}" maxlength="2000">${esc(rel?.evidence?.[r.competencyIds[i]] || '')}</textarea></label>`).join('')}</section>`;
    }).join('');
}
function competencyList(p, r, rel) {
    return `<fieldset class="comp-list"><legend>Verificación de competencias</legend>${r.competencies.map((c, i) => `
    <div class="verification"><strong>${esc(c)}</strong><p>Sustento del equipo · ${esc(rel.evidence?.[r.competencyIds[i]] || 'Sin sustento registrado')}</p>
    <label>Verificación <select data-check-proposal="${esc(p.id)}" data-check-rubric="${esc(r.id)}" data-index="${esc(r.competencyIds[i])}" ${closedReview(p, rel) ? 'disabled' : ''}>
    ${[['', 'Por verificar'], ['CUMPLE', 'Cumple'], ['NO_CUMPLE', 'No cumple']].map(([v, t]) => `<option value="${v}" ${rel.verification?.[r.competencyIds[i]] === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>`).join('')}</fieldset>`;
}
function historyHTML(rel) {
    return rel.history?.length ? `<details class="history"><summary>Historial de revisión (${rel.history.length})</summary>${rel.history.slice().reverse().map(h => `<p><strong>${esc(h.label)}</strong> · ${fmt(h.date)}<br>${esc(h.note || '')}</p>`).join('')}</details>` : '';
}
function membersHTML(p) {
    return p.members.map(id => `<div class="member"><div class="avatar">${esc(id.slice(1).padStart(2, '0'))}</div><div class="member-info"><strong>${esc(student(id)?.name)} ${p.leader === id ? '<span class="pill">Líder</span>' : ''}</strong><small>${esc(student(id)?.courses.map(c => course(c).name).join(' · '))}</small></div></div>`).join('');
}
function portalLink(label, action, id) {
    return `<button type="button" class="btn-text portal-link" data-action="${action}" data-id="${esc(id)}">${esc(label)} ${icon('arrow')}</button>`;
}
function rubricParticipants(members, r) {
    const names = cover(members, r).map(id => student(id).name);
    return '<p class="small muted"><strong>Participantes por matrícula</strong> · ' + (names.length ? esc(names.join(', ')) : 'Sin integrantes matriculados') + '</p>';
}
function coverageHTML(ids, members) {
    return ids.map(id => {
        const r = rubric(id), cs = cover(members, r);
        return `<div class="coverage"><h3>${esc(r.title)}</h3><small>${esc(course(r.course).name)}</small><div class="coverage-status ${cs.length ? '' : 'bad'}">${icon(cs.length ? 'check' : 'info')}${cs.length ? cs.length + ' integrante(s) con matrícula' : 'Falta un integrante matriculado'}</div>${cs.length ? rubricParticipants(members, r) : ''}</div>`;
    }).join('') || '<p class="muted">Selecciona al menos una rúbrica para guardar un borrador.</p>';
}
function verificationSummary(r, rel) {
    return `<details class="history"><summary>Sustento y verificación de competencias</summary>${r.competencies.map((c, i) => `<p><strong>${esc(c)}</strong><br>${esc(rel.evidence?.[r.competencyIds[i]] || 'Sin sustento registrado')}<br>${({ CUMPLE: 'Cumple', NO_CUMPLE: 'No cumple' })[rel.verification?.[r.competencyIds[i]]] || 'Por verificar'}</p>`).join('')}</details>`;
}
function relationHTML(p, rel, withdraw = false) {
    const r = rubric(rel.rubric);
    return `<article class="relation"><div class="row wrap"><div><h3>${esc(r.title)}</h3><p class="small muted">${esc(course(r.course).name)} · ${esc(teacher(r.teacher).name)}</p></div>${pill(rel.decision)}</div>${rel.expiryReason ? note('Motivo de caducidad', rel.expiryReason) : ''}${rel.decision === 'APROBADA' ? `<div class="dates"><span>Inicio: ${fmt(rel.start)}</span><span>Fin: ${fmt(rel.end)}</span></div>` : ''}${rel.feedback ? `<div class="feedback"><strong>Feedback del profesor</strong><br>${esc(rel.feedback)}</div>` : ''}${withdraw && terminal(rel) && own(p) && !started(p) && proposalState(p) !== 'RECHAZADA' ? `<div style="margin-top:14px">${btn('Retirar esta rúbrica', 'withdraw', p.id + '|' + r.id, 'small orange', active(p).length <= 2)}${active(p).length <= 2 ? '<small>Deben quedar al menos dos rúbricas.</small>' : ''}</div>` : ''}${verificationSummary(r, rel)}${historyHTML(rel)}</article>`;
}
export { evidenceFields, competencyList, historyHTML, membersHTML, portalLink, coverageHTML, rubricParticipants, verificationSummary, relationHTML };
