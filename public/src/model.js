export let db, periodo;
export function setSnapshot(snapshot) {
    db = snapshot;
    periodo = db.periodo;
}
function daysAfter(date, n) {
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
function terminal(rel) {
    return ['RECHAZADA', 'CADUCADA'].includes(rel?.decision);
}
function closedReview(p, rel) {
    return rel.cancelled || projectState(p) === 'CANCELADO' || terminal(rel) || started(p) || rel.decision === 'OBSERVADA' || db.date >= periodo.caducidad;
}
function hasObservation(p) {
    return active(p).some(r => r.decision === 'OBSERVADA');
}
function hasOpenReviews(p) {
    return active(p).some(r => ['PENDIENTE', 'OBSERVADA'].includes(r.decision));
}
function rubricOpen(r) {
    return !!r && r.deadline >= db.date && db.date < periodo.caducidad;
}
function editableProposal(p) {
    return own(p) && projectState(p) !== 'CANCELADO' && !started(p) && proposalState(p) !== 'RECHAZADA' && (p.draft || db.date < periodo.caducidad);
}
function eligibleMember(s, leader, ids) {
    const owner = student(leader);
    return !!owner && s?.program === owner.program && ids.some(id => s.courses.includes(rubric(id)?.course));
}
const student = id => db.students.find(s => s.id === id), teacher = id => db.teachers.find(s => s.id === id), course = id => db.courses.find(s => s.id === id), rubric = id => db.rubrics.find(s => s.id === id), proposal = id => db.proposals.find(s => s.id === id), isTeacher = () => !!teacher(db.profile), current = () => isTeacher() ? teacher(db.profile) : student(db.profile), own = p => p.leader === db.profile;
const active = p => p.relations.filter(r => !r.withdrawn), approved = p => active(p).filter(r => r.decision === 'APROBADA'), projectRubrics = p => approved(p).filter(r => !r.cancelled), responses = p => active(p).filter(r => r.decision !== 'PENDIENTE').length;
function proposalState(p) {
    if (p.status)
        return p.status;
    if (p.draft)
        return 'BORRADOR';
    const rs = active(p), a = rs.filter(r => r.decision === 'APROBADA').length, rejected = rs.filter(terminal).length;
    if (a >= 2)
        return 'APROBADA';
    if (rejected > rs.length - 2)
        return 'RECHAZADA';
    return responses(p) || rs.some(rel => rel.history?.length) ? 'EN_REVISION' : 'ENVIADA';
}
function dates(p) {
    const rs = projectRubrics(p).filter(r => r.start && r.end);
    return { start: rs.length ? rs.map(r => r.start).sort()[0] : '', end: rs.length ? rs.map(r => r.end).sort().at(-1) : '' };
}
function projectState(p) {
    if (p.projectStatus)
        return p.projectStatus;
    const rs = projectRubrics(p), d = dates(p);
    if (approved(p).some(r => r.cancelled) && rs.length < 2)
        return 'CANCELADO';
    if (!p.confirmed || rs.length < 2 || hasOpenReviews(p))
        return 'PENDIENTE_INICIO';
    if (db.date < d.start)
        return 'PENDIENTE_INICIO';
    if (db.date < d.end)
        return 'EN_EJECUCION';
    if (rs.length && rs.every(r => r.evaluated))
        return 'FINALIZADO';
    return 'EN_EVALUACION';
}
const started = p => p.confirmed && ['EN_EJECUCION', 'EN_EVALUACION', 'FINALIZADO', 'CANCELADO'].includes(projectState(p));
const visible = p => isTeacher() ? active(p).some(r => rubric(r.rubric)?.teacher === db.profile) && !p.draft : p.members.includes(db.profile);
const visibleProject = p => p.born && approved(p).length >= 2 && (isTeacher() ? approved(p).some(r => rubric(r.rubric)?.teacher === db.profile) : p.members.includes(db.profile));
const labels = {
    CADUCADA: 'Caducada',
    OBSERVADA: 'Observada',
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada',
    EN_REVISION: 'En revisión',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    PENDIENTE: 'Pendiente',
    PENDIENTE_INICIO: 'Pendiente de inicio',
    EN_EJECUCION: 'En ejecución',
    EN_EVALUACION: 'En evaluación',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado'
};
const pill = s => `<span class="pill ${s.toLowerCase()}">${esc(labels[s] || s)}</span>`;
const fmt = d => d ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z')) : 'Por definir';
const relFor = (p, rid) => p.relations.find(r => r.rubric === rid), cover = (members, r) => members.filter(id => student(id)?.courses.includes(r.course));
function receivedRubric(id) {
    if (db.demo === false) return !!rubric(id)?.received;
    return db.proposals.some(p => !p.draft && p.relations.some(r => r.rubric === id));
}
export { daysAfter, terminal, closedReview, hasObservation, hasOpenReviews, rubricOpen, editableProposal, eligibleMember, student, teacher, course, rubric, proposal, isTeacher, current, own, active, approved, projectRubrics, responses, proposalState, dates, projectState, started, visible, visibleProject, labels, pill, fmt, relFor, cover, receivedRubric };
import { esc } from './ui.js';
