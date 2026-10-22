(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', () => {
        const { auth } = window.Nexo;
        if (auth.redirectIfStaff()) return;

        const form = document.getElementById('login-form');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const submit = document.getElementById('login-submit');
        let busy = false;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (busy) return;
            auth.ui.clearErrors(form);

            const errors = [];
            const value = email.value.trim();
            if (!value) errors.push([email, 'Preencha o campo e-mail.']);
            else if (value.length > 190) errors.push([email, 'O campo e-mail pode ter até 190 caracteres.']);
            else if (!auth.EMAIL_RE.test(value)) errors.push([email, 'Informe um e-mail válido.']);
            if (!password.value) errors.push([password, 'Preencha o campo senha.']);
            else if (password.value.length > 200) errors.push([password, 'O campo senha pode ter até 200 caracteres.']);
            if (errors.length) {
                errors.forEach(([input, msg]) => auth.ui.showError(input, msg));
                errors[0][0].focus();
                return;
            }

            busy = true;
            auth.ui.setBusy(submit, true, 'Entrando…');
            try {
                const result = await auth.login(value, password.value);
                if (result.ok) { window.location.replace('/painel'); return; }
                password.value = '';
                auth.ui.showError(email, result.error);
                email.focus();
            } catch {
                auth.ui.showError(email, 'Não foi possível entrar agora. Verifique se a página está em HTTPS e se o navegador permite armazenamento local.');
            } finally {
                busy = false;
                auth.ui.setBusy(submit, false);
            }
        });
    });
})();
