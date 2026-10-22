(function () {
    'use strict';
    const { esc, icon, fmtDateTime, sha256Hex, randomBytes, config: CFG } = window.Nexo;
    const $ = (id) => document.getElementById(id);

    const MAX_PHOTOS = 3;
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    const FIELDS = ['category', 'description', 'address', 'reference', 'observedAt', 'email', 'phone', 'photos', 'privacyAcknowledged'];
    const ANCHORS = { category: 'field-category', photos: 'field-photos' };

    const state = { photos: [], latitude: '', longitude: '', submitting: false };

    const val = (id) => $(id).value.trim();

    // ---------- validação (mesmas regras do componente Livewire) ----------
    function validate() {
        const e = {};
        const category = (document.querySelector('input[name=category]:checked') || {}).value || '';
        if (!category) e.category = 'Escolha o tipo de problema observado.';
        else if (!(category in CFG.categories)) e.category = 'Escolha uma das categorias disponíveis.';

        const description = val('field-description');
        if (!description) e.description = 'Descreva o que você observou.';
        else if (description.length < 20) e.description = 'A descrição precisa ter pelo menos 20 caracteres.';
        else if (description.length > 1000) e.description = 'A descrição pode ter até 1.000 caracteres.';

        const address = val('field-address');
        if (!address) e.address = 'Informe o endereço ou o nome da via.';
        else if (address.length < 5) e.address = 'Informe um endereço com pelo menos 5 caracteres.';
        else if (address.length > 200) e.address = 'O endereço pode ter até 200 caracteres.';

        const reference = val('field-reference');
        if (!reference) e.reference = 'Informe um ponto de referência para localizar o trecho.';
        else if (reference.length < 3) e.reference = 'O ponto de referência precisa ter pelo menos 3 caracteres.';
        else if (reference.length > 200) e.reference = 'O ponto de referência pode ter até 200 caracteres.';

        const observed = $('field-observedAt').value;
        if (observed) {
            const when = observedDate(observed);
            if (Number.isNaN(when.getTime())) e.observedAt = 'Informe uma data e hora válidas ou deixe em branco.';
            else if (when.getTime() > Date.now()) e.observedAt = 'O momento da observação não pode estar no futuro.';
        }

        const email = val('field-email');
        if (email) {
            if (email.length > 254) e.email = 'O e-mail pode ter até 254 caracteres.';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Informe um e-mail válido ou deixe o campo vazio.';
        }

        const phone = val('field-phone');
        if (phone) {
            const digits = phone.replace(/\D/g, '');
            if (phone.length > 30) e.phone = 'O telefone pode ter até 30 caracteres.';
            else if (!/^[+()\d\s.-]+$/.test(phone) || digits.length < 10 || digits.length > 13) e.phone = 'Informe um telefone com DDD ou deixe o campo vazio.';
        }

        if (state.photos.length > MAX_PHOTOS) e.photos = 'Você pode enviar até 3 fotografias.';

        if (!$('field-privacyAcknowledged').checked) e.privacyAcknowledged = 'Confirme que leu o aviso de privacidade antes de enviar.';
        return e;
    }

    // datetime-local vem sem fuso: interpretar como horário de São Paulo (UTC-3, sem horário de verão).
    function observedDate(value) {
        return new Date(`${value.length === 16 ? value + ':00' : value}-03:00`);
    }

    function showErrors(errors, focusSummary) {
        FIELDS.forEach((f) => {
            const p = $('error-' + f);
            if (!p) return;
            const input = f === 'category' ? null : $('field-' + f);
            if (errors[f]) {
                p.textContent = errors[f]; p.hidden = false;
                if (input) { input.classList.add('is-invalid'); input.setAttribute('aria-invalid', 'true'); }
            } else {
                p.hidden = true; p.textContent = '';
                if (input) { input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); }
            }
        });
        const summary = $('error-summary');
        const keys = Object.keys(errors);
        if (!keys.length) { summary.hidden = true; $('error-list').innerHTML = ''; return; }
        $('error-list').innerHTML = keys.map((f) => `<li><a href="#${ANCHORS[f] || 'field-' + f}">${esc(errors[f])}</a></li>`).join('');
        summary.hidden = false;
        if (focusSummary) summary.focus();
    }

    // ---------- fotos (validadas, mas não enviadas nem guardadas) ----------
    function renderPhotos() {
        const ul = $('photo-list');
        ul.hidden = state.photos.length === 0;
        ul.innerHTML = state.photos.map((f, i) => `<li>${icon('file')}<span class="upload-file-name">${esc(f.name)}</span><button type="button" class="remove-upload" data-remove="${i}" aria-label="Remover fotografia ${i + 1}">${icon('trash')}</button></li>`).join('');
    }
    function onPhotos(ev) {
        const messages = [];
        for (const file of Array.from(ev.target.files)) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) { messages.push(`“${file.name}”: envie apenas fotografias JPEG ou PNG.`); continue; }
            if (file.size > MAX_PHOTO_BYTES) { messages.push(`“${file.name}”: cada fotografia pode ter até 5 MB.`); continue; }
            if (state.photos.length >= MAX_PHOTOS) { messages.push('Você pode enviar até 3 fotografias.'); break; }
            state.photos.push(file);
        }
        ev.target.value = '';
        const p = $('error-photos');
        p.textContent = messages.join(' '); p.hidden = messages.length === 0;
        renderPhotos();
    }

    // ---------- localização (opcional; não é guardada) ----------
    function gpsMessage(text) { const p = $('gps-message'); p.textContent = text; p.hidden = !text; }
    function renderCoordinates() {
        const has = state.latitude && state.longitude;
        $('coordinates').hidden = !has;
        $('lat-text').textContent = state.latitude;
        $('lon-text').textContent = state.longitude;
    }
    function locate() {
        if (!navigator.geolocation) {
            gpsMessage('Seu navegador não oferece localização. Informe o endereço e a referência abaixo para continuar.');
            return;
        }
        const btn = $('gps-btn');
        btn.disabled = true; $('gps-label').textContent = 'Localizando…';
        gpsMessage('Buscando sua localização. Você também pode preencher o endereço manualmente.');
        const done = () => { btn.disabled = false; $('gps-label').textContent = 'Usar localização'; };
        navigator.geolocation.getCurrentPosition((pos) => {
            state.latitude = pos.coords.latitude.toFixed(7);
            state.longitude = pos.coords.longitude.toFixed(7);
            renderCoordinates();
            gpsMessage('Coordenadas adicionadas. Complete também o endereço e a referência para identificar o trecho.');
            done();
        }, (err) => {
            gpsMessage(err.code === 1
                ? 'A permissão de localização não foi concedida. Tudo bem: informe o endereço e a referência abaixo.'
                : 'Não foi possível obter a localização agora. Informe o endereço e a referência abaixo para continuar.');
            done();
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    }

    // ---------- envio ----------
    const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : hex(randomBytes(16)));

    function setBusy(on) {
        state.submitting = on;
        const btn = $('submit-btn');
        btn.disabled = on;
        btn.querySelector('[data-idle]').hidden = on;
        btn.querySelector('[data-busy]').hidden = !on;
    }

    async function onSubmit(ev) {
        ev.preventDefault();
        if (state.submitting) return;

        if ($('field-website').value !== '') { // honeypot
            showErrors({ category: 'Não foi possível validar o envio. Atualize a página e tente novamente.' }, true);
            return;
        }
        const errors = validate();
        showErrors(errors, true);
        if (Object.keys(errors).length) return;

        setBusy(true);
        try {
            const credential = base64url(randomBytes(32));         // 256 bits, como no original
            const now = new Date();
            const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
            const protocol = `CED-${ymd}-${hex(randomBytes(6))}`;
            const observed = $('field-observedAt').value;
            const report = {
                id: uuid(),
                protocol,
                credential_hash: await sha256Hex(credential),      // a chave em si nunca é guardada
                category: (document.querySelector('input[name=category]:checked')).value,
                description: val('field-description'),
                address: val('field-address'),
                reference: val('field-reference'),
                observed_at: observed ? observedDate(observed).toISOString() : null,
                received_at: now.toISOString(),
                status: 'Recebido',
                timeline: [],
                photos_count: state.photos.length,                 // contato, coordenadas e imagens não são guardados
            };
            window.Nexo.reports.add(report);
            showReceipt(report, credential);
        } catch (err) {
            showErrors({ category: 'Não foi possível salvar agora. Seus campos foram mantidos. Verifique se o navegador permite armazenamento local e se a página está em HTTPS, e tente novamente.' }, true);
        } finally {
            setBusy(false);
        }
    }

    function showReceipt(report, credential) {
        $('r-protocol').textContent = report.protocol;
        $('r-received').textContent = fmtDateTime(report.received_at);
        $('r-status').textContent = report.status;
        $('r-credential').textContent = credential;
        $('copy-status').hidden = true;
        $('form-area').hidden = true;
        $('receipt').hidden = false;
        resetForm();
        $('receipt-heading').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetForm() {
        $('report-form').reset();
        state.photos = []; state.latitude = ''; state.longitude = '';
        renderPhotos(); renderCoordinates(); gpsMessage('');
        $('char-count').textContent = '0';
        $('error-photos').hidden = true;
        showErrors({}, false);
    }

    async function copyCredential() {
        const el = $('r-credential');
        const status = $('copy-status');
        status.hidden = false;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
            await navigator.clipboard.writeText(el.textContent.trim());
            status.textContent = 'Chave copiada. Guarde-a em um lugar seguro.';
        } catch {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges(); sel.addRange(range); el.focus();
            status.textContent = 'A cópia automática não está disponível. Selecione a chave e use Copiar no seu dispositivo.';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('report-form').addEventListener('submit', onSubmit);
        $('photos-upload').addEventListener('change', onPhotos);
        $('photo-list').addEventListener('click', (e) => {
            const b = e.target.closest('[data-remove]');
            if (!b) return;
            state.photos.splice(Number(b.dataset.remove), 1);
            $('error-photos').hidden = true;
            renderPhotos();
        });
        $('gps-btn').addEventListener('click', locate);
        $('gps-remove').addEventListener('click', () => {
            state.latitude = ''; state.longitude = '';
            renderCoordinates();
            gpsMessage('Localização removida. O endereço e a referência são suficientes para continuar.');
        });
        $('field-description').addEventListener('input', (e) => { $('char-count').textContent = String(e.target.value.length); });
        $('copy-btn').addEventListener('click', copyCredential);
        $('new-btn').addEventListener('click', () => {
            $('receipt').hidden = true;
            $('r-credential').textContent = '';
            $('form-area').hidden = false;
            $('report-heading').focus();
        });
        // Limpa o erro de um campo assim que a pessoa o corrige
        ['description', 'address', 'reference', 'observedAt', 'email', 'phone', 'privacyAcknowledged'].forEach((f) => {
            const input = $('field-' + f);
            const evt = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(evt, () => {
                const p = $('error-' + f);
                if (!p.hidden) { p.hidden = true; input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); }
            });
        });
        document.querySelectorAll('input[name=category]').forEach((r) => r.addEventListener('change', () => { $('error-category').hidden = true; }));
    });
})();
