(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        const { auth } = window.Nexo;
        if (auth.redirectIfStaff()) return;

        const enabledBox = document.getElementById('cadastro-ativo');
        const disabledBox = document.getElementById('cadastro-desativado');
        if (!auth.registrationEnabled()) {
            enabledBox.hidden = true;
            disabledBox.hidden = false;
            return;
        }

        const form = document.getElementById('register-form');
        const f = {
            name: document.getElementById('name'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            confirm: document.getElementById('password_confirmation'),
            code: document.getElementById('accessCode'),
        };
        const submit = document.getElementById('register-submit');
        let busy = false;

        function validate() {
            const errors = [];
            const name = f.name.value.trim();
            if (!name) errors.push([f.name, 'Preencha o campo nome.']);
            else if (name.length < 3) errors.push([f.name, 'O nome precisa ter pelo menos 3 caracteres.']);
            else if (name.length > 80) errors.push([f.name, 'O campo nome pode ter até 80 caracteres.']);

            const email = f.email.value.trim();
            if (!email) errors.push([f.email, 'Preencha o campo e-mail.']);
            else if (email.length > 190) errors.push([f.email, 'O campo e-mail pode ter até 190 caracteres.']);
            else if (!auth.EMAIL_RE.test(email)) errors.push([f.email, 'Informe um e-mail válido.']);

            const pw = f.password.value;
            if (!pw) errors.push([f.password, 'Preencha o campo senha.']);
            else if (pw.length < 10) errors.push([f.password, 'A senha precisa ter pelo menos 10 caracteres.']);
            else if (pw.length > 200) errors.push([f.password, 'O campo senha pode ter até 200 caracteres.']);

            if (!f.confirm.value) errors.push([f.confirm, 'Repita a senha.']);
            else if (pw && f.confirm.value !== pw) errors.push([f.confirm, 'A confirmação não coincide com a senha.']);

            if (!f.code.value) errors.push([f.code, 'Preencha o campo código de acesso.']);
            else if (f.code.value.length > 200) errors.push([f.code, 'O campo código de acesso pode ter até 200 caracteres.']);
            return errors;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (busy) return;
            auth.ui.clearErrors(form);

            const errors = validate();
            if (errors.length) {
                errors.forEach(([input, msg]) => auth.ui.showError(input, msg));
                errors[0][0].focus();
                return;
            }

            busy = true;
            auth.ui.setBusy(submit, true, 'Criando acesso…');
            try {
                const result = await auth.register({
                    name: f.name.value, email: f.email.value, password: f.password.value, accessCode: f.code.value,
                });
                if (result.ok) { window.location.replace('/painel'); return; }
                const target = { email: f.email, accessCode: f.code }[result.field] || f.code;
                f.code.value = '';
                auth.ui.showError(target, result.error);
                target.focus();
            } catch {
                auth.ui.showError(f.code, 'Não foi possível criar o acesso agora. Verifique se a página está em HTTPS e se o navegador permite armazenamento local.');
            } finally {
                busy = false;
                auth.ui.setBusy(submit, false);
            }
        });
    });
})();
