import { db, setSnapshot, periodo, active, approved, projectRubrics, terminal, hasOpenReviews, rubricOpen, editableProposal, eligibleMember, student, teacher, rubric, proposal, isTeacher, own, cover, relFor, closedReview, projectState, started, receivedRubric, labels } from '../model.js';
const key = 'isur.frontend.v2';
let fixtures;
const demand = (condition, message) => {
    if (!condition)
        throw new Error(message);
};
const uid = () => crypto.randomUUID();
const day = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
const fresh = () => ({ ...structuredClone(fixtures), revision: 0, readAlerts: {} });
function notice(p, rel, title, recipients) {
    db.activity.push({
        key: uid(),
        pid: p.id,
        rid: rel.rubric,
        title,
        detail: p.title + ' · ' + rubric(rel.rubric).title,
        to: [...new Set(recipients)]
    });
}
function advance() {
    for (const p of db.proposals.filter(p => !p.draft)) {
        for (const rel of active(p)) {
            if (db.date < periodo.caducidad || !['OBSERVADA', 'PENDIENTE'].includes(rel.decision))
                continue;
            rel.expiryReason = rel.decision === 'OBSERVADA' ? 'El equipo no reenvió la corrección a tiempo.' : 'El profesor no respondió a tiempo.';
            rel.history.push({ label: 'Caducada', date: periodo.caducidad, note: rel.expiryReason });
            rel.decision = 'CADUCADA';
            notice(p, rel, 'Revisión caducada', [...p.members, rubric(rel.rubric).teacher]);
        }
        if (approved(p).length >= 2)
            p.born = true;
    }
}
async function json(name) {
    const response = await fetch(new URL(name, import.meta.url));
    demand(response.ok, 'No se pudieron cargar los datos académicos. Vuelve a intentar.');
    return response.json();
}
function load() {
    const raw = localStorage.getItem(key);
    const snapshot = raw ? JSON.parse(raw) : fresh();
    setSnapshot(snapshot);
    advance();
    return snapshot;
}
export async function read() {
    if (!fixtures) {
        const [academic, examples] = await Promise.all([json('academico.json'), json('ejemplos.json')]);
        fixtures = { ...academic, ...examples };
    }
    return load();
}
function link(rid) {
    return {
        id: uid(),
        rubric: rid,
        decision: 'PENDIENTE',
        observations: 0,
        history: [],
        evidence: {},
        verification: {},
        feedback: '',
        start: '',
        end: ''
    };
}
function saveProposal(input) {
    let p = input.id ? proposal(input.id) : null;
    demand(!isTeacher() && (!input.id || (p && editableProposal(p))), 'Solo el líder puede editar su propuesta antes del inicio.');
    const existing = p && !p.draft;
    const send = input.mode === 'send';
    demand(send || !existing, 'Una propuesta enviada ya no puede guardarse como borrador.');
    const ids = existing ? active(p).map(rel => rel.rubric) : [...new Set(input.rubrics)];
    demand(ids.length && ids.every(id => rubric(id)), 'Elige al menos una rúbrica vigente.');
    if (!existing)
        demand(ids.every(id => rubricOpen(rubric(id)) || (p && relFor(p, id))), 'Solo puedes añadir rúbricas con recepción vigente.');
    const members = [...new Set([db.profile, ...input.members])];
    demand(members.every(id => eligibleMember(student(id), db.profile, ids)), 'Cada integrante, incluido el líder, necesita un curso aplicable y la misma carrera.');
    if (send) {
        demand(db.date < periodo.caducidad, 'El periodo de revisión ya caducó.');
        demand(input.title.trim() && input.description.trim(), 'Completa el título y la descripción.');
        demand(ids.length >= 2, 'Elige al menos dos rúbricas.');
        for (const id of ids) {
            const r = rubric(id);
            demand(existing || r.deadline >= db.date, 'Plazo de recepción cerrado para ' + r.title + '.');
            demand(cover(members, r).length, 'Falta matrícula para ' + r.title + '.');
            if (!terminal(p && relFor(p, id)))
                demand(r.competencyIds.every(c => input.evidence[id]?.[c]?.trim()), 'Completa el sustento de cada competencia de ' + r.title + '.');
        }
    }
    if (!p) {
        p = {
            id: uid(),
            leader: db.profile,
            born: false,
            confirmed: null,
            relations: [],
            deliverables: []
        };
        db.proposals.push(p);
    }
    Object.assign(p, { title: input.title.trim() || 'Propuesta sin título', description: input.description.trim(), members, draft: !send });
    if (!existing)
        p.relations = ids.map(id => relFor(p, id) || link(id));
    if (send) {
        p.sent ||= db.date;
        p.confirmed = null;
    }
    for (const rel of active(p)) {
        if (terminal(rel))
            continue;
        rel.evidence = input.evidence[rel.rubric] || {};
        if (send && (!existing || rel.decision === 'OBSERVADA' || rel.decision === 'APROBADA')) {
            const corrected = rel.decision === 'OBSERVADA';
            if (corrected) {
                rel.history.push({ label: 'Corrección enviada', date: db.date, note: p.description });
                rel.decision = 'PENDIENTE';
                rel.verification = {};
                rel.feedback = '';
            }
            notice(p, rel, corrected ? 'Corrección reenviada' : existing ? 'Propuesta actualizada' : 'Propuesta enviada', [rubric(rel.rubric).teacher]);
        }
    }
    return p.id;
}
function review(input) {
    const p = proposal(input.pid), rel = p?.relations.find(x => x.id === input.linkId), r = rel && rubric(rel.rubric);
    demand(p && !p.draft && r?.teacher === db.profile && !rel.withdrawn && !closedReview(p, rel), 'Revisión cerrada o ajena a este profesor.');
    if (input.competencyId) {
        demand(r.competencyIds.includes(input.competencyId) && ['', 'CUMPLE', 'NO_CUMPLE'].includes(input.value), 'Verificación inválida.');
        rel.verification[input.competencyId] = input.value;
        return;
    }
    demand(r.competencyIds.every(c => rel.verification[c]), 'Verifica cada competencia antes de decidir.');
    const { decision, start, end, delivery, deliveryDate, feedback } = input;
    demand(['APROBADA', 'OBSERVADA', 'RECHAZADA'].includes(decision), 'Decisión inválida.');
    if (decision === 'APROBADA') {
        demand(day(start) && day(end) && start <= end, 'Define un inicio y un fin válidos para tu rúbrica.');
        demand(p.deliverables.filter(x => x.rubric === r.id).every(x => x.date >= start && x.date <= end), 'Las fechas deben incluir los entregables ya registrados.');
        if (delivery || deliveryDate) {
            demand(delivery && day(deliveryDate) && deliveryDate >= start && deliveryDate <= end, 'Completa el entregable dentro del periodo de la rúbrica.');
            p.deliverables.push({ title: delivery, date: deliveryDate, rubric: r.id });
        }
        Object.assign(rel, { start, end, feedback: '' });
    }
    else {
        demand(feedback, 'Escribe un comentario para el equipo.');
        if (decision === 'OBSERVADA') {
            demand(rel.observations < 2, 'Ya se registraron dos observaciones.');
            rel.observations++;
        }
        Object.assign(rel, { feedback, start: '', end: '' });
        p.deliverables = p.deliverables.filter(x => x.rubric !== r.id);
    }
    const previouslyApproved = rel.decision === 'APROBADA';
    rel.decision = decision;
    if (!(previouslyApproved && decision === 'APROBADA'))
        p.confirmed = null;
    rel.history.push({ label: labels[decision], date: db.date, note: feedback || start + ' – ' + end });
    notice(p, rel, 'Rúbrica ' + labels[decision].toLowerCase(), p.members);
}
function projectAction({ pid, rid, action, start, end }) {
    const p = proposal(pid), rel = p && relFor(p, rid);
    demand(p, 'Propuesta no disponible.');
    if (action === 'withdraw') {
        demand(own(p) && !started(p) && terminal(rel) && !rel.withdrawn && active(p).length > 2, 'Solo el líder puede retirar una rúbrica terminal dejando al menos dos.');
        const remaining = active(p).filter(x => x !== rel).map(x => x.rubric);
        demand(eligibleMember(student(p.leader), p.leader, remaining), 'El líder quedaría sin un curso aplicable.');
        rel.withdrawn = true;
        const removed = p.members.filter(id => !eligibleMember(student(id), p.leader, remaining));
        p.members = p.members.filter(id => !removed.includes(id));
        p.confirmed = null;
        return removed.map(id => student(id).name);
    }
    demand(p.born && !['FINALIZADO', 'CANCELADO'].includes(projectState(p)), 'El proyecto no admite cambios.');
    const links = projectRubrics(p);
    if (action === 'confirm') {
        demand(own(p) && !p.confirmed && links.length >= 2, 'Solo el líder puede confirmar con dos rúbricas aprobadas.');
        demand(!hasOpenReviews(p), 'Hay revisiones pendientes u observadas.');
        demand(links.every(x => cover(p.members, rubric(x.rubric)).length) && p.members.every(id => eligibleMember(student(id), p.leader, links.map(x => x.rubric))), 'Revisa la matrícula de cada integrante y la cobertura de las rúbricas activas.');
        p.confirmed = db.date;
        return;
    }
    demand(links.includes(rel) && rubric(rid).teacher === db.profile, 'Esta rúbrica corresponde a otro profesor.');
    if (action === 'dates') {
        demand(projectState(p) === 'PENDIENTE_INICIO', 'Solo puedes ajustar fechas antes de la ejecución.');
        demand(day(start) && day(end) && start <= end, 'Revisa las fechas de inicio y fin.');
        demand(p.deliverables.filter(item => item.rubric === rid).every(item => item.date >= start && item.date <= end),
            'Las fechas deben incluir los entregables ya registrados.');
        Object.assign(rel, {start, end});
        rel.history.push({label:'Fechas ajustadas', date:db.date, note:start+' – '+end});
        return;
    }
    if (action === 'evaluate') {
        demand(projectState(p) === 'EN_EVALUACION', 'El proyecto debe estar en evaluación.');
        rel.evaluated = true;
    }
    else if (action === 'cancel')
        rel.cancelled = true;
    else
        throw new Error('Acción de proyecto desconocida.');
}
function saveRubric({ id, title, criteria, course, competencies, deadline, remove }) {
    const r = rubric(id);
    demand(isTeacher() && (!id || r?.teacher === db.profile), 'Solo el profesor responsable puede gestionar la rúbrica.');
    if (remove) {
        demand(r && !receivedRubric(id), 'La rúbrica ya recibió propuestas.');
        for (const p of db.proposals.filter(p => p.draft)) {
            p.relations = p.relations.filter(x => x.rubric !== id);
            p.members = p.members.filter(s => s === p.leader || eligibleMember(student(s), p.leader, p.relations.map(x => x.rubric)));
        }
        db.proposals = db.proposals.filter(p => p.relations.length);
        db.rubrics = db.rubrics.filter(x => x !== r);
        return;
    }
    demand(day(deadline), 'Indica el plazo de recepción.');
    if (r && receivedRubric(id)) {
        demand(deadline > r.deadline, 'El nuevo plazo debe ser posterior al vigente.');
        r.extendedOn = db.date;
        r.deadline = deadline;
        return;
    }
    demand(title && criteria && competencies.length && db.courses.some(c => c.id === course), 'Completa curso, título, criterios y al menos una competencia.');
    const unchanged = new Map();
    r?.competencies.forEach((c, i) => unchanged.set(c, [...(unchanged.get(c) || []), r.competencyIds[i]]));
    const values = {
        title,
        criteria,
        course,
        competencies,
        competencyIds: competencies.map(c => unchanged.get(c)?.shift() || uid()),
        deadline
    };
    if (r) {
        if (deadline > r.deadline)
            r.extendedOn = db.date;
        Object.assign(r, values);
    }
    else
        db.rubrics.push({ ...values, id: uid(), teacher: db.profile });
}
function scenario(kind) {
    const profile = db.profile;
    setSnapshot({ ...fresh(), profile, revision: db.revision });
    const p = db.proposals[0];
    if (kind !== 'pending')
        Object.assign(p.relations[2], { decision: 'RECHAZADA', feedback: 'Precisar el recorrido de interfaces.' });
    if (kind === 'coverage') {
        student('s1').courses = ['c1'];
        student('s2').courses = ['c3'];
    }
    if (kind === 'evaluation') {
        p.confirmed = '2026-11-12';
        db.date = '2026-12-21';
    }
}
const operations = {
    saveProposal,
    review,
    projectAction,
    saveRubric,
    scenario,
    profile(id) {
        demand(student(id) || teacher(id), 'Perfil desconocido.');
        db.profile = id;
    },
    date(value) {
        demand(day(value), 'Fecha inválida.');
        db.date = value;
    },
    readAlerts(keys) {
        db.readAlerts[db.profile] = [...new Set([...(db.readAlerts[db.profile] || []), ...keys])];
    },
    sidebar(value) {
        db.collapsed = value;
    }
};
export async function execute(operation, input) {
    const expected = db.revision;
    const transact = () => {
        const previous = load();
        demand(previous.revision === expected, 'Los datos cambiaron en otra pestaña. Revisa la información actualizada y vuelve a intentar.');
        setSnapshot(structuredClone(previous));
        try {
            const result = operations[operation](input);
            advance();
            db.revision++;
            localStorage.setItem(key, JSON.stringify(db));
            return { snapshot: db, result };
        }
        catch (error) {
            setSnapshot(previous);
            throw error;
        }
    };
    return navigator.locks ? navigator.locks.request(key, transact) : transact();
}
