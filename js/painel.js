(function () {
    'use strict';
    const { esc, icon, slug, fmtDateTime, config: CFG } = window.Nexo;
    const PER_PAGE = 10;
    const STATUSES = CFG.statuses;
    const CATEGORIES = CFG.categories;

    const state = { status: '', category: '', search: '', page: 1, selectedId: null, saved: null };
    let user = null;

    const $ = (id) => document.getElementById(id);
    const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const plural = (n, one, many) => (n === 1 ? one : many);
    const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Histórico interno. Relatos sem histórico gravado (ex.: o de exemplo) derivam dele a partir da linha do tempo.
    function historyOf(r) {
        if (Array.isArray(r.history) && r.history.length) return r.history;
        let prev = 'Recebido';
        return (Array.isArray(r.timeline) ? r.timeline : []).map((t) => {
            const item = { from: prev, to: t.status, at: t.at, by: null, note: null };
            prev = t.status;
            return item;
        });
    }

    const loadAll = () => window.Nexo.reports.all()
        .filter((r) => r && typeof r.id === 'string')
        .sort((a, b) => String(b.received_at).localeCompare(String(a.received_at)));

    // ---------- resumo por situação ----------
    function renderStats(all) {
        const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
        all.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
        $('dash-stats').innerHTML = STATUSES.map((s) => {
            const active = state.status === s;
            return `<button type="button" class="stat-card stat-${slug(s)}${active ? ' is-active' : ''}" data-status="${esc(s)}" aria-pressed="${active}">
                <strong>${counts[s] || 0}</strong><span>${esc(s)}</span></button>`;
        }).join('');
    }

    // ---------- lista, filtros e paginação ----------
    function filtered(all) {
        const needle = norm(state.search.trim());
        return all.filter((r) => {
            if (state.status && r.status !== state.status) return false;
            if (state.category && r.category !== state.category) return false;
            return !needle || norm(`${r.protocol} ${r.address} ${r.reference} ${r.description}`).includes(needle);
        });
    }

    function renderList(all) {
        const list = filtered(all);
        const lastPage = Math.max(1, Math.ceil(list.length / PER_PAGE));
        state.page = Math.min(Math.max(1, state.page), lastPage);
        const rows = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

        $('report-list').innerHTML = rows.length ? rows.map((r) => {
            const photos = r.photos_count > 0 ? ` · ${r.photos_count} foto(s)` : '';
            return `<button type="button" class="report-row${state.selectedId === r.id ? ' is-selected' : ''}" data-id="${esc(r.id)}" aria-pressed="${state.selectedId === r.id}">
                <span class="report-row-main">
                    <strong>${esc(CATEGORIES[r.category] || r.category)}</strong>
                    <span>${esc(r.address)}</span>
                    <small>${esc(r.protocol)} · ${fmtDateTime(r.received_at)}${photos}</small>
                </span>
                <span class="status-pill status-${slug(r.status)}">${esc(r.status)}</span>
            </button>`;
        }).join('') : `<p class="dash-empty">${all.length === 0 ? 'Nenhum relato recebido ainda.' : 'Nenhum relato corresponde aos filtros.'}</p>`;

        $('pager').innerHTML = lastPage > 1 ? `<div class="dash-pager">
            <button type="button" class="button button-outline button-small" data-page="prev"${state.page <= 1 ? ' disabled' : ''}>Anterior</button>
            <span>Página ${state.page} de ${lastPage} (${list.length})</span>
            <button type="button" class="button button-outline button-small" data-page="next"${state.page >= lastPage ? ' disabled' : ''}>Próxima</button>
        </div>` : '';

        $('fstatus').value = state.status;
        $('fcat').value = state.category;
    }

    // ---------- coluna lateral: resumo por tipo ou detalhe do relato ----------
    function categorySummary(all) {
        const by = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, 0]));
        all.forEach((r) => { by[r.category] = (by[r.category] || 0) + 1; });
        return `<section class="dash-card" aria-labelledby="cat-heading">
            <h2 id="cat-heading" class="dash-sub">Por tipo de problema</h2>
            <ul class="cat-list">${Object.entries(CATEGORIES).map(([k, label]) => `<li><span>${esc(label)}</span><strong>${by[k] || 0}</strong></li>`).join('')}</ul>
        </section>`;
    }

    function detail(r) {
        const history = historyOf(r).slice().reverse();
        const photos = r.photos_count > 0
            ? `<div><dt>Fotografias</dt><dd>${r.photos_count} ${plural(r.photos_count, 'selecionada', 'selecionadas')} (não enviadas nesta versão estática)</dd></div>` : '';
        return `<section class="dash-card detail" aria-labelledby="detail-heading" tabindex="-1" id="detail">
            <div class="detail-top">
                <div><h2 id="detail-heading" tabindex="-1">${esc(CATEGORIES[r.category] || r.category)}</h2><code>${esc(r.protocol)}</code></div>
                <button type="button" class="detail-close" id="detail-close" aria-label="Fechar detalhes">${icon('close')}</button>
            </div>
            <dl class="detail-list">
                <div><dt>Descrição</dt><dd>${esc(r.description)}</dd></div>
                <div><dt>Endereço</dt><dd>${esc(r.address)}</dd></div>
                <div><dt>Referência</dt><dd>${esc(r.reference)}</dd></div>
                <div><dt>Observado em</dt><dd>${r.observed_at ? fmtDateTime(r.observed_at) : '—'}</dd></div>
                <div><dt>Recebido em</dt><dd>${fmtDateTime(r.received_at)}</dd></div>
                <div><dt>Situação atual</dt><dd><span class="status-pill status-${slug(r.status)}">${esc(r.status)}</span></dd></div>
                ${photos}
            </dl>
            <form id="status-form" class="detail-form" novalidate>
                <div class="field">
                    <label for="newStatus" class="form-label">Situação</label>
                    <select id="newStatus" class="form-select">${STATUSES.map((s) => `<option${s === r.status ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>
                    <p class="field-error" id="error-newStatus" role="alert" hidden></p>
                </div>
                <div class="field">
                    <label for="note" class="form-label">Observação interna (opcional)</label>
                    <textarea id="note" class="form-control" rows="2" maxlength="500"></textarea>
                    <p class="field-error" id="error-note" role="alert" hidden></p>
                </div>
                <button type="submit" class="button button-forest" id="status-submit">Salvar situação</button>
                <p class="copy-status" role="status" id="status-saved" tabindex="-1"${state.saved ? '' : ' hidden'}>${esc(state.saved || '')}</p>
            </form>
            ${history.length ? `<h3 class="detail-sub">Histórico</h3><ul class="history">${history.map((h) => `<li><strong>${esc(h.from)} → ${esc(h.to)}</strong> <small>${fmtDateTime(h.at)}${h.by ? ' · ' + esc(h.by) : ''}</small>${h.note ? '<br>' + esc(h.note) : ''}</li>`).join('')}</ul>` : ''}
        </section>`;
    }

    function renderSide(all) {
        const selected = state.selectedId ? all.find((r) => r.id === state.selectedId) : null;
        if (state.selectedId && !selected) state.selectedId = null;
        $('dash-layout').classList.toggle('has-detail', Boolean(selected));
        $('side').innerHTML = selected ? detail(selected) : categorySummary(all);
    }

    function renderAll() {
        const all = loadAll();
        $('dash-hello').textContent = `Olá, ${user.name}. ${all.length} ${plural(all.length, 'relato', 'relatos')} no total. Dados de demonstração.`;
        renderStats(all);
        renderList(all);
        renderSide(all);
    }

    function refresh() {                       // atualiza lista e resumo sem refazer o detalhe (preserva o que se digita)
        const all = loadAll();
        renderStats(all);
        renderList(all);
    }

    // ---------- ações ----------
    function select(id) {
        state.selectedId = id;
        state.saved = null;
        const all = loadAll();
        renderList(all);
        renderSide(all);
        const panel = $('detail');
        if (!panel) return;
        panel.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        $('detail-heading').focus({ preventScroll: true });
    }

    function close() {
        const id = state.selectedId;
        state.selectedId = null;
        state.saved = null;
        const all = loadAll();
        renderList(all);
        renderSide(all);
        const row = id && document.querySelector(`.report-row[data-id="${CSS.escape(id)}"]`);
        if (row) row.focus({ preventScroll: true });
    }

    function saveStatus(form) {
        window.Nexo.auth.ui.clearErrors(form);
        const status = $('newStatus').value;
        const note = $('note').value.trim();
        let invalid = false;
        if (!STATUSES.includes(status)) { window.Nexo.auth.ui.showError($('newStatus'), 'Escolha uma situação válida.'); invalid = true; }
        if (note.length > 500) { window.Nexo.auth.ui.showError($('note'), 'O campo observação pode ter até 500 caracteres.'); invalid = true; }
        if (invalid) return;

        const current = user && window.Nexo.auth.current();   // renova a sessão e confirma que ainda vale
        if (!current) { window.location.replace('/entrar'); return; }

        const r = loadAll().find((x) => x.id === state.selectedId);
        if (!r) return;
        const at = new Date().toISOString();
        const patch = {
            status,
            history: [...historyOf(r), { at, from: r.status, to: status, note: note || null, by: current.name }],
        };
        if (status !== r.status) patch.timeline = [...(Array.isArray(r.timeline) ? r.timeline : []), { status, at }];

        let ok = false;
        try { ok = window.Nexo.reports.update(r.id, patch); } catch { ok = false; }
        if (!ok) {
            window.Nexo.auth.ui.showError($('newStatus'), 'Não foi possível salvar agora. Verifique se o navegador permite armazenamento local.');
            return;
        }
        state.saved = 'Situação atualizada.';
        const all = loadAll();
        renderStats(all);
        renderList(all);
        renderSide(all);
        $('status-saved')?.focus({ preventScroll: true });   // o formulário foi redesenhado: devolve o foco à confirmação
    }

    document.addEventListener('DOMContentLoaded', () => {
        user = window.Nexo.auth.requireStaff();
        if (!user) return;

        $('dash-stats').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-status]');
            if (!btn) return;
            state.status = state.status === btn.dataset.status ? '' : btn.dataset.status;
            state.page = 1;
            refresh();
        });
        $('report-list').addEventListener('click', (e) => {
            const row = e.target.closest('[data-id]');
            if (row) select(row.dataset.id);
        });
        $('pager').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-page]');
            if (!btn || btn.disabled) return;
            state.page += btn.dataset.page === 'next' ? 1 : -1;
            refresh();
        });
        $('fcat').addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; refresh(); });
        $('fstatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; refresh(); });

        let timer;
        $('search').addEventListener('input', (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => { state.search = e.target.value.slice(0, 100); state.page = 1; refresh(); }, 300);
        });

        $('side').addEventListener('click', (e) => { if (e.target.closest('#detail-close')) close(); });
        $('side').addEventListener('submit', (e) => {
            if (e.target.id !== 'status-form') return;
            e.preventDefault();
            saveStatus(e.target);
        });

        // Preenche o seletor de tipo e mostra tudo
        $('fcat').insertAdjacentHTML('beforeend', Object.entries(CATEGORIES).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join(''));
        $('fstatus').insertAdjacentHTML('beforeend', STATUSES.map((s) => `<option>${esc(s)}</option>`).join(''));
        renderAll();
    });
})();
