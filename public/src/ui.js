const ICONS = {
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 20a2 2 0 0 0 4 0',
    comment: 'M3 4h18v13H9l-5 4v-4H3Z',
    cap: 'm2 9 10-5 10 5-10 5ZM6 12v5c4 3 8 3 12 0v-5M21 10v6',
    panel: 'M3 4h18v16H3ZM14 4v16',
    menu: 'M1 5h22M1 12h22M1 19h22',
    home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    rubric: 'M8 3H5a2 2 0 0 0-2 2v15a1 1 0 0 0 1 1h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3M9 2h6v4H9ZM7 11h10M7 16h7',
    proposal: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5',
    project: 'M3 7h7l2 2h9v11H3ZM3 7V4h7l2 3',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    back: 'M19 12H5m5-5-5 5 5 5',
    chevron: 'm9 5 7 7-7 7',
    plus: 'M12 5v14M5 12h14',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M6 18 18 6',
    clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    info: 'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    users: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    calendar: 'M8 2v4M16 2v4M3 10h18M4 4h16v17H4Z',
    help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    sliders: 'M4 7h16M4 17h16M8 4v6M16 14v6',
    edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
    lock: 'M5 11h14v10H5ZM8 11V7a4 4 0 0 1 8 0v4',
    logout: 'M9 3H4v18h5M10 12h11m-4-4 4 4-4 4'
};
const icon = (n) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n] || ICONS.info}"/></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));
function btn(text, action, id = '', cls = 'secondary', disabled = false, extra = '') {
    return `<button type="button" class="btn ${cls}" data-action="${action}" ${id ? `data-id="${esc(id)}"` : ''} ${disabled ? 'disabled' : ''} ${extra}>${esc(text)}</button>`;
}
function note(title, text, type = '') {
    return `<div class="notice ${type}">${icon(type === 'success' ? 'check' : 'info')}<div><strong>${esc(title)}</strong>${esc(text)}</div></div>`;
}
function head(title, subtitle, action = '') {
    return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
}
function empty(title, text) {
    return `<div class="empty">${icon('proposal')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}
export const $ = s => document.querySelector(s);
export { esc, icon, btn, note, head, empty };
export function screen(name, slots) {
    const template = document.getElementById('screen-' + name);
    return template.textContent.replace(/{{(\w+)}}/g, (_, key) => slots[key] ?? '');
}
