import { read } from './data/adapter.js';
import { setSnapshot } from './model.js';
async function start() {
    const main = document.querySelector('#main');
    main.textContent = 'Cargando el portal académico…';
    try {
        if (document.body.dataset.mode !== 'demo') {
            const api = await import('./data/http-adapter.js');
            const info = await api.session();
            if (!info.profile) {
                const label = document.createElement('label');
                label.textContent = 'Identidad de desarrollo';
                const select = document.createElement('select');
                for (const person of info.profileOptions) {
                    select.add(new Option(`${person.name} · ${person.role}`, person.id));
                }
                label.append(select);
                const button = document.createElement('button');
                button.className = 'btn primary';
                button.textContent = 'Entrar al módulo';
                button.disabled = !info.profileOptions.length;
                const errorBox = document.createElement('p');
                errorBox.setAttribute('role', 'alert');
                if (!info.profileOptions.length) errorBox.textContent = 'Se requiere una sesión del sistema académico.';
                button.onclick = async () => {
                    button.disabled = true;
                    try { await api.selectProfile(select.value); await start(); }
                    catch (error) { errorBox.textContent = error.message; button.disabled = false; }
                };
                main.replaceChildren(label, button, errorBox);
                return;
            }
        }
        setSnapshot(await read());
        const { render } = await import('./app.js');
        render();
    }
    catch (error) {
        const message = document.createElement('p');
        message.setAttribute('role', 'alert');
        message.textContent = error.message;
        const retry = document.createElement('button');
        retry.textContent = 'Volver a intentar';
        retry.onclick = start;
        main.replaceChildren(message, retry);
    }
}
start();
