/* Funções compartilhadas entre as páginas. Sem dependências. */
(function () {
    'use strict';
    const CFG = window.NEXO_CONFIG;

    // Menu do celular
    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('menu-toggle');
        const nav = document.getElementById('mobile-navigation');
        if (!toggle || !nav) return;
        const set = (open) => {
            nav.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            toggle.querySelector('[data-open]').hidden = open;
            toggle.querySelector('[data-close]').hidden = !open;
        };
        toggle.addEventListener('click', () => set(nav.hidden));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    });

    // Cabeçalho com sombra ao rolar + revelação suave dos cartões
    document.addEventListener('DOMContentLoaded', () => {
        const header = document.querySelector('.site-header');
        if (header) {
            const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }
        const targets = document.querySelectorAll('.how-card, .participation-banner, .help-band, .sidebar-card, .report-card, .scope-note, .channel-item, .chip-stat');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!('IntersectionObserver' in window) || reduce) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        targets.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) return;           // já visível: não anima
            el.classList.add('reveal');
            el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
            io.observe(el);
        });
    });

    const tz = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    const parts = (iso) => Object.fromEntries(tz.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));

    const Nexo = {
        config: CFG,

        esc(value) {
            return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        },

        icon(name, cls = '') {
            const paths = CFG.icons[name] || CFG.icons.water;
            return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
        },

        slug(text) {
            return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        },

        fmtDay(iso) { const p = parts(iso); return `${p.day}/${p.month}/${p.year}`; },
        fmtDateTime(iso) { const p = parts(iso); return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`; },

        async sha256Hex(text) {
            if (!window.crypto?.subtle) throw new Error('WebCrypto indisponível (use HTTPS).');
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
            return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
        },

        randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); },

        /* "Banco" da demonstração: relatos criados neste navegador (localStorage).
           Só o hash da chave é guardado; a chave aparece apenas no recibo.
           O relato de exemplo (seed) vive no config.js; alterações feitas pelo painel
           municipal sobre ele ficam em ADJ_KEY e são mescladas na leitura. */
        reports: {
            KEY: 'nexo.relatos.v1',
            ADJ_KEY: 'nexo.relatos.ajustes.v1',
            _read(key, fallback) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
                    return parsed && typeof parsed === 'object' ? parsed : fallback;
                } catch { return fallback; /* JSON inválido: ignora */ }
            },
            _saved() { const v = this._read(this.KEY, []); return Array.isArray(v) ? v : []; },
            _adjust() { const v = this._read(this.ADJ_KEY, {}); return Array.isArray(v) ? {} : v; },
            all() {
                const adj = this._adjust();
                return [{ ...CFG.seed, ...(adj[CFG.seed.id] || {}) }, ...this._saved()];
            },
            add(report) {
                const saved = this._saved();
                saved.unshift(report);
                localStorage.setItem(this.KEY, JSON.stringify(saved.slice(0, 50)));
            },
            /* Atualiza campos de um relato (usado pelo painel municipal). Retorna true se achou. */
            update(id, patch) {
                if (id === CFG.seed.id) {
                    const adj = this._adjust();
                    adj[id] = { ...(adj[id] || {}), ...patch };
                    localStorage.setItem(this.ADJ_KEY, JSON.stringify(adj));
                    return true;
                }
                const saved = this._saved();
                const i = saved.findIndex((r) => r && r.id === id);
                if (i < 0) return false;
                saved[i] = { ...saved[i], ...patch };
                localStorage.setItem(this.KEY, JSON.stringify(saved));
                return true;
            },
        },
    };

    window.Nexo = Nexo;
})();
