let csrf = '';
let snapshot;
async function request(operation, input) {
    const response = await fetch(new URL(`../../api.php?op=${encodeURIComponent(operation)}`, import.meta.url), {
        method: input === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: input === undefined ? undefined : JSON.stringify(input)
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || 'No se pudo completar la solicitud.');
        error.status = response.status;
        if (response.status === 401 && typeof window !== 'undefined') window.location.replace('./login.html');
        throw error;
    }
    if (data.csrf) csrf = data.csrf;
    return data;
}
export async function session() {
    return request('session');
}
export async function read() {
    snapshot = await request('read');
    return snapshot;
}
export async function execute(operation, input) {
    if (operation === 'logout') return request('logout', {});
    if (operation === 'sidebar') {
        snapshot = { ...snapshot, collapsed: input };
        return { snapshot };
    }
    if (['saveProposal', 'review', 'projectAction'].includes(operation)) {
        const proposal = snapshot.proposals.find(p => p.id === (input.pid || input.id));
        input = { ...input, version: input.version ?? proposal?.version };
    }
    if (operation === 'readAlerts') input = { keys: input };
    if (!['saveRubric', 'saveProposal', 'review', 'projectAction', 'readAlerts'].includes(operation)) throw new Error('Esta acción estará disponible al conectar el siguiente paso.');
    const response = await request(operation, input);
    snapshot = response.snapshot;
    csrf = snapshot.csrf;
    return response;
}

export async function candidates(rubrics, id) {
    return request('candidates', { rubrics, id });
}
