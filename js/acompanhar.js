(function () {
    'use strict';
    const { esc, icon, slug, fmtDay, fmtDateTime, sha256Hex, config: CFG } = window.Nexo;

    const SESSION_KEY = 'nexo.acompanhar.sessao';
    const FAIL_KEY = 'nexo.acompanhar.falhas';
    const SESSION_MS = 30 * 60 * 1000;
    const MAX_REMEMBERED = 10;
    const IP_LIMIT = [8, 10 * 60 * 1000];      // 8 falhas em 10 min (por navegador)
    const PROTOCOL_LIMIT = [6, 15 * 60 * 1000]; // 6 falhas em 15 min (por protocolo)

    const PROTOCOL_RE = /^CED-\d{8}-[A-F0-9]{12}$/;
    const CREDENTIAL_RE = /^[A-Za-z0-9_-]+$/;

    let selectedId = null;
    let busy = false;

    // ---------- sessão (apenas ids, expira com 30 min de inatividade) ----------
    function readSession() {
        try {
            const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
            if (s && Array.isArray(s.ids) && s.exp > Date.now()) return s.ids.filter((i) => typeof i === 'string');
        } catch { /* ignora */ }
        sessionStorage.removeItem(SESSION_KEY);
        return [];
    }
    function writeSession(ids) {
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ids, exp: Date.now() + SESSION_MS })); } catch { /* ignora */ }
    }
    function remember(id) {
        const ids = readSession().filter((i) => i !== id);
        ids.unshift(id);
        writeSession(ids.slice(0, MAX_REMEMBERED));
    }

    // ---------- limite de tentativas ----------
    function readFails() {
        try {
            const f = JSON.parse(localStorage.getItem(FAIL_KEY) || 'null');
            if (f && Array.isArray(f.ip) && f.proto && typeof f.proto === 'object') return f;
        } catch { /* ignora */ }
        return { ip: [], proto: {} };
    }
    function pruneFails(f, now) {
        f.ip = f.ip.filter((t) => now - t < IP_LIMIT[1]);
        Object.keys(f.proto).forEach((k) => {
            f.proto[k] = f.proto[k].filter((t) => now - t < PROTOCOL_LIMIT[1]);
            if (!f.proto[k].length) delete f.proto[k];
        });
        return f;
    }
    function saveFails(f) { try { localStorage.setItem(FAIL_KEY, JSON.stringify(f)); } catch { /* ignora */ } }
    function waitMinutes(f, protocol, now) {
        const waits = [];
        if (f.ip.length >= IP_LIMIT[0]) waits.push(f.ip[0] + IP_LIMIT[1] - now);
        const p = f.proto[protocol] || [];
        if (p.length >= PROTOCOL_LIMIT[0]) waits.push(p[0] + PROTOCOL_LIMIT[1] - now);
        return waits.length ? Math.max(1, Math.ceil(Math.max(...waits) / 60000)) : 0;
    }

    // ---------- visão do morador (nunca expõe contato, hash ou notas internas) ----------
    function residentView(r) {
        return {
            id: r.id, protocol: r.protocol, category: r.category, description: r.description,
            address: r.address, reference: r.reference, observed_at: r.observed_at || null,
            received_at: r.received_at, status: r.status,
            timeline: Array.isArray(r.timeline) ? r.timeline : [], photos_count: r.photos_count || 0,
        };
    }
    async function findForResident(protocol, credential) {
        const hash = await sha256Hex(credential);
        let found = null;
        for (const r of window.Nexo.reports.all()) { // percorre todos, sem interromper
            const ok = r.protocol === protocol && typeof r.credential_hash === 'string' && r.credential_hash === hash;
            if (ok) found = r;
        }
        return found ? residentView(found) : null;
    }
    function sessionItems() {
        const ids = readSession();
        const byId = new Map(window.Nexo.reports.all().map((r) => [r.id, r]));
        return ids.map((id) => byId.get(id)).filter(Boolean).map(residentView);
    }

    // ---------- renderização ----------
    const $ = (id) => document.getElementById(id);
    const lastAt = (it) => (it.timeline.length ? it.timeline[it.timeline.length - 1].at : null) || it.received_at;

    function renderItem(it) {
        const sel = it.id === selectedId;
        return `<li><button type="button" class="protocol-card${sel ? ' is-selected' : ''}" data-select="${esc(it.id)}" aria-pressed="${sel}">
            <span class="tile" aria-hidden="true">${icon(CFG.categoryIcons[it.category] || 'info')}</span>
            <span class="protocol-main"><code>${esc(it.protocol)}</code><strong>${esc(CFG.categories[it.category] || it.category)}</strong><small>${esc(it.address)}</small></span>
            <span class="protocol-side"><span class="status-pill status-${slug(it.status)}">${esc(it.status)}</span><small>Atualizado em ${fmtDay(lastAt(it))}</small></span>
            ${icon('chevron', 'protocol-chevron')}
        </button></li>`;
    }

    function renderDetail(s) {
        const cat = CFG.categories[s.category] || s.category;
        const steps = s.timeline.map((st, i) => `<li class="${i === s.timeline.length - 1 ? 'is-current' : ''}"><strong>Situação: ${esc(st.status)}</strong><span>${fmtDateTime(st.at)}</span></li>`).join('');
        const photos = s.photos_count > 0
            ? `<div><dt>Fotografias</dt><dd>${s.photos_count} ${s.photos_count === 1 ? 'selecionada (não enviada nesta versão estática)' : 'selecionadas (não enviadas nesta versão estática)'}</dd></div>` : '';
        return `<section class="track-detail" aria-labelledby="detail-heading">
            <div class="track-detail-top">
                <div><h2 id="detail-heading" tabindex="-1">${esc(cat)}</h2><code>${esc(s.protocol)}</code></div>
                <button type="button" class="detail-close" data-close aria-label="Fechar detalhes do protocolo">${icon('close')}</button>
            </div>
            <div class="status-box" role="status">
                <span class="status-pill status-${slug(s.status)}">${esc(s.status)}</span>
                <p>${esc(CFG.statusHints[s.status] || '')}</p>
            </div>
            <h3 class="detail-sub">Andamento</h3>
            <ol class="timeline" aria-label="Linha do tempo do relato">
                <li class="${s.timeline.length === 0 ? 'is-current' : ''}"><strong>Relato registrado</strong><span>${fmtDateTime(s.received_at)}</span></li>
                ${steps}
            </ol>
            <h3 class="detail-sub">Dados do relato</h3>
            <dl class="detail-list">
                <div><dt>Descrição</dt><dd>${esc(s.description)}</dd></div>
                <div><dt>Endereço</dt><dd>${esc(s.address)}</dd></div>
                <div><dt>Referência</dt><dd>${esc(s.reference)}</dd></div>
                <div><dt>Observado em</dt><dd>${s.observed_at ? fmtDateTime(s.observed_at) : 'Não informado'}</dd></div>
                <div><dt>Registrado em</dt><dd>${fmtDateTime(s.received_at)}</dd></div>
                ${photos}
            </dl>
            <p class="detail-note">${icon('info')}<span>Dados de contato e observações internas da equipe não aparecem aqui. A situação do relato não é garantia contra alagamentos e não substitui a Defesa Civil: em emergência, use os canais oficiais.</span></p>
            <p class="detail-note">${icon('clock')}<span>Acrescentar informações e pedir revisão da solução <span class="pending-pill">Em breve</span></span></p>
        </section>`;
    }

    function render() {
        const items = sessionItems();
        const selected = items.find((i) => i.id === selectedId) || null;
        if (!selected) selectedId = null;

        const layout = $('track-layout');
        layout.classList.toggle('has-detail', Boolean(selected));
        $('forget-btn').hidden = items.length === 0;

        const left = document.createElement('div');
        if (items.length) {
            left.innerHTML = `<ul class="track-list" aria-label="Protocolos consultados nesta sessão">${items.map(renderItem).join('')}</ul>`;
        } else {
            left.appendChild($('tpl-empty').content.cloneNode(true));
        }
        layout.replaceChildren(left);

        if (selected) {
            layout.insertAdjacentHTML('beforeend', renderDetail(selected));
        } else {
            layout.appendChild($('tpl-sidebar').content.cloneNode(true));
        }
    }

    function focusDetail() {
        const h = $('detail-heading');
        if (h) { h.focus(); h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }

    // ---------- formulário ----------
    function setError(field, message) {
        const input = $('field-' + field);
        const p = $('error-' + field);
        if (message) {
            p.textContent = message; p.hidden = false;
            input.classList.add('is-invalid'); input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', `${field}-help error-${field}`);
        } else {
            p.hidden = true; p.textContent = '';
            input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid');
            input.setAttribute('aria-describedby', `${field}-help`);
        }
    }
    function setBusy(on) {
        busy = on;
        const btn = $('lookup-submit');
        btn.disabled = on;
        btn.querySelector('[data-idle]').hidden = on;
        btn.querySelector('[data-busy]').hidden = !on;
    }

    async function consult(e) {
        e.preventDefault();
        if (busy) return;
        const protocolInput = $('field-protocol');
        const credentialInput = $('field-credential');
        const protocol = protocolInput.value.trim().toUpperCase();
        const credential = credentialInput.value.trim();
        protocolInput.value = protocol;
        credentialInput.value = credential;
        setError('protocol', ''); setError('credential', '');

        let invalid = false;
        if (!protocol) { setError('protocol', 'Informe o protocolo do seu relato.'); invalid = true; }
        else if (!PROTOCOL_RE.test(protocol)) { setError('protocol', 'O protocolo tem o formato CED-AAAAMMDD-XXXXXXXXXXXX. Confira o recibo.'); invalid = true; }
        if (!credential) { setError('credential', 'Informe a chave de acesso que apareceu no recibo.'); invalid = true; }
        else if (credential.length < 20) { setError('credential', 'A chave de acesso parece incompleta. Copie-a inteira do recibo.'); invalid = true; }
        else if (credential.length > 128) { setError('credential', 'A chave de acesso parece longa demais. Copie-a do recibo.'); invalid = true; }
        else if (!CREDENTIAL_RE.test(credential)) { setError('credential', 'A chave usa apenas letras, números, hífen e sublinhado. Confira o recibo.'); invalid = true; }
        if (invalid) { (document.querySelector('.lookup-card [aria-invalid=true]') || protocolInput).focus(); return; }

        const now = Date.now();
        const fails = pruneFails(readFails(), now);
        const wait = waitMinutes(fails, protocol, now);
        if (wait) {
            credentialInput.value = '';
            setError('credential', `Muitas tentativas. Aguarde cerca de ${wait} minuto(s) e tente novamente.`);
            credentialInput.focus();
            return;
        }

        setBusy(true);
        let report = null;
        try {
            report = await findForResident(protocol, credential);
        } catch {
            setError('credential', 'Não foi possível consultar agora. Tente novamente em instantes (a consulta exige HTTPS).');
            credentialInput.focus();
            setBusy(false);
            return;
        }
        setBusy(false);

        if (!report) {
            // Falhas contam só quando o par não confere; sucesso não zera o limite.
            fails.ip.push(now);
            (fails.proto[protocol] = fails.proto[protocol] || []).push(now);
            saveFails(fails);
            credentialInput.value = '';
            // Mesma mensagem para protocolo inexistente e chave errada.
            setError('credential', 'Não encontramos um relato com esse protocolo e essa chave. Confira os dados do recibo.');
            credentialInput.focus();
            return;
        }

        remember(report.id);
        selectedId = report.id;
        protocolInput.value = ''; credentialInput.value = '';
        render();
        focusDetail();
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('lookup-form').addEventListener('submit', consult);

        const toggle = $('toggle-key');
        toggle.addEventListener('click', () => {
            const show = toggle.getAttribute('aria-pressed') !== 'true';
            toggle.setAttribute('aria-pressed', String(show));
            toggle.setAttribute('aria-label', show ? 'Ocultar a chave de acesso' : 'Mostrar a chave de acesso');
            $('field-credential').type = show ? 'text' : 'password';
            toggle.querySelector('[data-show]').hidden = show;
            toggle.querySelector('[data-hide]').hidden = !show;
        });

        $('forget-btn').addEventListener('click', () => {
            sessionStorage.removeItem(SESSION_KEY);
            selectedId = null;
            $('field-protocol').value = ''; $('field-credential').value = '';
            setError('protocol', ''); setError('credential', '');
            render();
            $('field-protocol').focus();
        });

        // Delegação de eventos para a área renderizada dinamicamente
        $('track-layout').addEventListener('click', (e) => {
            const sel = e.target.closest('[data-select]');
            if (sel) {
                if (readSession().includes(sel.dataset.select)) {
                    selectedId = sel.dataset.select;
                    writeSession(readSession());
                    render();
                    focusDetail();
                }
                return;
            }
            if (e.target.closest('[data-close]')) { selectedId = null; render(); return; }
            if (e.target.closest('#fill-demo')) {
                $('field-protocol').value = 'CED-20261015-0A1B2C3D4E5F';
                $('field-credential').value = 'DEMO-chave-fictica-0123456789-abcdef';
                $('field-protocol').focus();
            }
        });

        const offline = $('offline-notice');
        const syncOnline = () => { offline.hidden = navigator.onLine; };
        window.addEventListener('online', syncOnline);
        window.addEventListener('offline', syncOnline);
        syncOnline();

        render();
    });
})();
