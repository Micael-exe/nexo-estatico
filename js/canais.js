(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('canais-form');
        const search = document.getElementById('canais-busca');
        const status = document.getElementById('canais-status');
        const list = document.getElementById('canais-lista');
        const empty = document.getElementById('canais-vazio');
        const count = document.getElementById('canais-count');
        const clearWrap = document.getElementById('canais-clear-wrap');
        const items = Array.from(list.querySelectorAll('.channel-item'));
        const total = Number(count.dataset.total);

        const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        function apply() {
            const needle = normalize(search.value.slice(0, 100));
            const st = status.value;
            let visible = 0;
            items.forEach((li) => {
                const ok = (!st || li.dataset.status === st) && (!needle || li.dataset.search.includes(needle));
                li.hidden = !ok;
                if (ok) visible++;
            });
            const filtered = Boolean(st || needle);
            const noun = total === 1 ? 'canal' : 'canais';
            count.firstChild.textContent = `${visible} de ${total} ${noun}`;
            clearWrap.hidden = !filtered;
            list.hidden = visible === 0;
            empty.hidden = visible !== 0;
        }

        function clearFilters() {
            search.value = '';
            status.value = '';
            apply();
        }

        form.addEventListener('submit', (e) => e.preventDefault());
        search.addEventListener('input', apply);
        status.addEventListener('change', apply);
        document.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', clearFilters));

        items.forEach((li) => {
            const btn = li.querySelector('.channel-row');
            const detail = li.querySelector('.channel-detail');
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') !== 'true';
                btn.setAttribute('aria-expanded', String(open));
                detail.hidden = !open;
            });
        });

        apply();
    });
})();
