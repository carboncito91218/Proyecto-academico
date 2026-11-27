const loginForm = document.getElementById('loginForm');
const account = document.getElementById('account');
const accountError = document.getElementById('accountError');
const passwordForm = document.getElementById('passwordForm');
const password = document.getElementById('password');
const passwordError = document.getElementById('passwordError');
const accountOptions = document.getElementById('accountOptions');

function accountProblem(value) {
    if (!value) return 'Ingresa tu correo institucional.';
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@isur\.edu\.pe$/i.test(value)) {
        return 'Escribe un correo válido con el dominio @isur.edu.pe.';
    }
    return '';
}

loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const error = accountProblem(account.value.trim());
    accountError.textContent = error;
    if (error) {
        account.setAttribute('aria-invalid', 'true');
        account.focus();
        return;
    }
    document.getElementById('selectedAccount').textContent = account.value.trim().toLowerCase();
    loginForm.hidden = true;
    accountOptions.hidden = true;
    passwordForm.hidden = false;
    password.focus();
});

account.addEventListener('input', () => {
    account.removeAttribute('aria-invalid');
    accountError.textContent = '';
});

function clearPasswordFeedback() {
    password.removeAttribute('aria-invalid');
    passwordError.textContent = '';
}

document.getElementById('changeAccount').addEventListener('click', () => {
    password.value = '';
    clearPasswordFeedback();
    passwordForm.hidden = true;
    accountOptions.hidden = false;
    loginForm.hidden = false;
    account.focus();
});

password.addEventListener('input', clearPasswordFeedback);

passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!password.value) {
        passwordError.textContent = 'Escribe tu contraseña.';
        password.focus();
        return;
    }
    const button = passwordForm.querySelector('button[type="submit"]');
    button.disabled = true;
    document.getElementById('changeAccount').disabled = true;
    passwordError.textContent = '';
    try {
        const tokenResponse = await fetch('./api.php?op=loginToken', { credentials: 'same-origin', cache: 'no-store' });
        if (!tokenResponse.ok) throw new Error('No se pudo preparar el acceso. Vuelve a intentar.');
        const token = await tokenResponse.json();
        const response = await fetch('./api.php?op=login', {
            method: 'POST', credentials: 'same-origin', cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token.csrf },
            body: JSON.stringify({ email: account.value.trim().toLowerCase(), password: password.value })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesión.');
        window.location.replace('./');
    } catch (error) {
        passwordError.textContent = error.message || 'No se pudo conectar con el servidor.';
        password.value = '';
        password.setAttribute('aria-invalid', 'true');
        password.focus();
    } finally {
        button.disabled = false;
        document.getElementById('changeAccount').disabled = false;
    }
});
