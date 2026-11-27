import { read } from './data/adapter.js';
import { setSnapshot } from './model.js';
async function start() {
    const main = document.querySelector('#main');
    main.textContent = 'Cargando el portal académico…';
    try {
        if (document.body.dataset.mode !== 'demo') {
            const api = await import('./data/http-adapter.js');
            await api.session();
        }
        setSnapshot(await read());
        const { render } = await import('./app.js');
        render();
    }
    catch (error) {
        if (error.status === 401) { window.location.replace('./login.html'); return; }
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
