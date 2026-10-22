/* Área municipal (login, cadastro, sessão). Sem dependências e sem servidor.
 *
 * ATENÇÃO — limite desta versão estática: tudo acontece no navegador. Os servidores
 * cadastrados ficam em localStorage deste aparelho e a sessão em sessionStorage.
 * Isso reproduz o fluxo do protótipo Laravel, mas NÃO é uma barreira de segurança:
 * quem controla o navegador pode ler ou alterar esses dados. Não use dados reais. */
(function () {
    'use strict';
    const { sha256Hex, randomBytes, config: CFG } = window.Nexo;

    const USERS_KEY = 'nexo.usuarios.v1';
    const SESSION_KEY = 'nexo.sessao.v1';
    const FAIL_KEY = 'nexo.auth.falhas.v1';
    const ITERATIONS = 600000;                                   // PBKDF2-SHA256 (OWASP)
    const SESSION_MS = (CFG.staff.sessionMinutes || 30) * 60 * 1000;
    const LIMITS = { login: [5, 5 * 60 * 1000], cadastro: [5, 10 * 60 * 1000] };
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ---------- utilidades de codificação ----------
    const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
    const unb64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
    const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from(randomBytes(16), (b) => b.toString(16).padStart(2, '0')).join(''));

    async function pbkdf2(password, salt, iterations) {
        if (!window.crypto?.subtle) throw new Error('WebCrypto indisponível (use HTTPS).');
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
    }

    async function hashPassword(password) {
        const salt = randomBytes(16);
        return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
    }

    function sameBytes(a, b) {                                   // comparação sem saída antecipada
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
        return diff === 0;
    }

    async function verifyPassword(password, stored) {
        const [scheme, iter, salt, hash] = String(stored || '').split('$');
        if (scheme !== 'pbkdf2' || !iter || !salt || !hash) return false;
        try { return sameBytes(await pbkdf2(password, unb64(salt), Number(iter)), unb64(hash)); } catch { return false; }
    }

    // Executa o mesmo custo de uma verificação quando o e-mail não existe (evita revelar contas pelo tempo).
    const DUMMY_SALT = new Uint8Array(16);
    const burnTime = (password) => pbkdf2(password, DUMMY_SALT, ITERATIONS).catch(() => null);

    // ---------- armazenamento ----------
    function readJson(storage, key, fallback) {
        try {
            const parsed = JSON.parse(storage.getItem(key) || 'null');
            return parsed ?? fallback;
        } catch { return fallback; }
    }

    const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

    function readUsers() {
        const list = readJson(localStorage, USERS_KEY, []);
        return Array.isArray(list) ? list.filter((u) => u && typeof u.id === 'string' && typeof u.email === 'string') : [];
    }

    // ---------- limite de tentativas (por navegador) ----------
    function attempts(key) {
        const [, windowMs] = LIMITS[key.split(':')[0]];
        const all = readJson(localStorage, FAIL_KEY, {});
        const now = Date.now();
        return (Array.isArray(all[key]) ? all[key] : []).filter((t) => typeof t === 'number' && now - t < windowMs);
    }
    function saveAttempts(key, list) {
        const all = readJson(localStorage, FAIL_KEY, {});
        if (list.length) all[key] = list; else delete all[key];
        try { localStorage.setItem(FAIL_KEY, JSON.stringify(all)); } catch { /* ignora */ }
    }
    /** Segundos até poder tentar de novo (0 = liberado). */
    function lockedFor(key) {
        const [max, windowMs] = LIMITS[key.split(':')[0]];
        const list = attempts(key);
        if (list.length < max) return 0;
        return Math.max(1, Math.ceil((list[0] + windowMs - Date.now()) / 1000));
    }
    const hit = (key) => saveAttempts(key, [...attempts(key), Date.now()]);
    const clearAttempts = (key) => saveAttempts(key, []);
    const waitText = (s) => (s >= 90 ? `${Math.ceil(s / 60)} minutos` : `${s} segundos`);

    // ---------- sessão ----------
    function current() {
        const s = readJson(sessionStorage, SESSION_KEY, null);
        if (!s || typeof s.id !== 'string' || typeof s.exp !== 'number' || s.exp <= Date.now()) {
            if (s) sessionStorage.removeItem(SESSION_KEY);
            return null;
        }
        if (!readUsers().some((u) => u.id === s.id)) { sessionStorage.removeItem(SESSION_KEY); return null; }
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, exp: Date.now() + SESSION_MS })); } catch { /* ignora */ }
        return { id: s.id, name: s.name, email: s.email };
    }
    function start(user) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email, exp: Date.now() + SESSION_MS }));
    }
    function end() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignora */ } }

    // ---------- operações ----------
    async function login(emailRaw, password) {
        const email = normalizeEmail(emailRaw);
        const key = `login:${email}`;
        const wait = lockedFor(key);
        if (wait) return { ok: false, field: 'email', error: `Muitas tentativas. Tente novamente em ${waitText(wait)}.` };

        const user = readUsers().find((u) => u.email === email);
        const valid = user ? await verifyPassword(password, user.password) : (await burnTime(password), false);
        if (!valid) {
            hit(key);
            return { ok: false, field: 'email', error: 'E-mail ou senha incorretos.' };
        }
        clearAttempts(key);
        start(user);
        return { ok: true };
    }

    async function register({ name, email: emailRaw, password, accessCode }) {
        const key = 'cadastro:navegador';
        const wait = lockedFor(key);
        if (wait) return { ok: false, field: 'accessCode', error: `Muitas tentativas. Tente novamente em ${waitText(wait)}.` };

        const given = await sha256Hex(`nexo-cadastro|${accessCode}`);
        const expected = String(CFG.staff.registrationCodeHash || '');
        if (!expected || !sameBytes(new TextEncoder().encode(given), new TextEncoder().encode(expected))) {
            hit(key);
            return { ok: false, field: 'accessCode', error: 'Código de acesso inválido.' };
        }

        const email = normalizeEmail(emailRaw);
        const users = readUsers();
        if (users.some((u) => u.email === email)) {
            return { ok: false, field: 'email', error: 'Este e-mail já está cadastrado. Use a opção Entrar.' };
        }
        const user = {
            id: uuid(), name: String(name).trim(), email,
            password: await hashPassword(password),
            created_at: new Date().toISOString(),
        };
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
        } catch {
            return { ok: false, field: 'accessCode', error: 'Não foi possível salvar o cadastro. Verifique se o navegador permite armazenamento local.' };
        }
        clearAttempts(key);
        start(user);
        return { ok: true };
    }

    /** Cadastro só existe se houver código configurado (equivale a CANAL_CODIGO_CADASTRO vazio = desativado). */
    const registrationEnabled = () => Boolean(CFG.staff.registrationCodeHash);

    // ---------- ajudas de formulário (erros por campo, estado de envio) ----------
    const ui = {
        showError(input, message) {
            const p = document.getElementById(`error-${input.id}`);
            input.setAttribute('aria-invalid', 'true');
            if (p) { input.setAttribute('aria-describedby', p.id); p.textContent = message; p.hidden = false; }
        },
        clearErrors(form) {
            form.querySelectorAll('[aria-invalid]').forEach((i) => { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
            form.querySelectorAll('.field-error').forEach((p) => { p.hidden = true; p.textContent = ''; });
        },
        setBusy(button, busy, label) {
            if (busy) {
                button.dataset.label = button.innerHTML;
                button.innerHTML = `<span class="loading-spinner" aria-hidden="true"></span>${label}`;
            } else if (button.dataset.label) {
                button.innerHTML = button.dataset.label;
            }
            button.disabled = busy;
            button.setAttribute('aria-busy', String(busy));
        },
    };

    // ---------- guardas de página ----------
    function requireStaff() {
        const user = current();
        if (!user) { window.location.replace('/entrar'); return null; }
        return user;
    }
    function redirectIfStaff() {
        if (current()) { window.location.replace('/painel'); return true; }
        return false;
    }

    // ---------- navegação (cabeçalho, menu do celular e rodapé) ----------
    function renderNav() {
        const logged = Boolean(current());
        const path = window.location.pathname.replace(/\/$/, '');
        const on = (href) => (path === href ? ' active' : '');
        const guestOn = path === '/entrar' || path === '/cadastro' ? ' active' : '';
        const html = (kind) => {
            const cls = kind === 'footer' ? '' : 'nav-item';
            if (!logged) return `<a class="${cls}${kind === 'footer' ? '' : guestOn}" href="/entrar">Área municipal</a>`;
            return `<a class="${cls}${kind === 'footer' ? '' : on('/painel')}" href="/painel"${path === '/painel' ? ' aria-current="page"' : ''}>Painel</a>`
                 + `<button type="button" class="${cls} nav-logout" data-logout>Sair</button>`;
        };
        document.querySelectorAll('[data-staff-nav]').forEach((el) => { el.innerHTML = html('header'); });
        document.querySelectorAll('[data-staff-nav-mobile]').forEach((el) => { el.innerHTML = html('mobile'); });
        document.querySelectorAll('[data-staff-nav-footer]').forEach((el) => { el.innerHTML = html('footer'); });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-logout]')) return;
        end();
        window.location.assign('/');
    });
    document.addEventListener('DOMContentLoaded', renderNav);

    window.Nexo.auth = { login, register, current, end, requireStaff, redirectIfStaff, registrationEnabled, EMAIL_RE, ui };
})();
