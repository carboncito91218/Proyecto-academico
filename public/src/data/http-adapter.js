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
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
    if (data.csrf) csrf = data.csrf;
    return data;
}
export async function session() {
    return request('session');
}
export async function selectProfile(id) {
    await request('profile', { id });
}
export async function read() {
    snapshot = await request('read');
    return snapshot;
}
export async function execute(operation, input) {
    if (operation === 'profile') {
        await selectProfile(input);
        return { snapshot: await read(), result: input };
    }
    if (operation === 'sidebar') {
        snapshot = { ...snapshot, collapsed: input };
        return { snapshot };
    }
    if (operation !== 'saveRubric') throw new Error('Esta acción estará disponible al conectar el siguiente paso.');
    const response = await request(operation, input);
    snapshot = response.snapshot;
    csrf = snapshot.csrf;
    return response;
}
