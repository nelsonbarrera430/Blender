export default class LoginScreen {
    constructor(onSuccess) {
        this.onSuccess = onSuccess
        this.backendUrl = import.meta.env.VITE_BACKEND_URL || null
        this._build()
    }

    _build() {
        if (!this.backendUrl) {
            this.onSuccess()
            return
        }

        if (localStorage.getItem('gameToken')) {
            this.onSuccess()
            return
        }

        // Inyectar estilos en <head>
        const style = document.createElement('style')
        style.id = 'login-screen-styles'
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap');

            #login-overlay {
                position: fixed; inset: 0;
                background: #000;
                display: flex; align-items: center; justify-content: center;
                z-index: 99999;
                font-family: 'Space Mono', monospace;
                overflow: hidden;
            }

            /* Grid de fondo animado */
            #login-overlay::before {
                content: '';
                position: absolute; inset: 0;
                background-image:
                    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
                background-size: 40px 40px;
                animation: gridMove 20s linear infinite;
            }

            /* Líneas decorativas en las esquinas */
            #login-overlay::after {
                content: '';
                position: absolute; inset: 0;
                background:
                    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 40%),
                    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 0%, transparent 40%);
                pointer-events: none;
            }

            @keyframes gridMove {
                0% { transform: translate(0, 0); }
                100% { transform: translate(40px, 40px); }
            }

            .login-card {
                position: relative;
                background: #0a0a0a;
                border: 2px solid #fff;
                padding: 48px 40px;
                width: 380px;
                z-index: 2;
                box-shadow:
                    8px 8px 0 #fff,
                    0 0 60px rgba(255,255,255,0.15);
                animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes cardIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Esquinas decorativas en el card */
            .login-card::before,
            .login-card::after {
                content: '';
                position: absolute;
                width: 20px; height: 20px;
                border: 2px solid #fff;
            }
            .login-card::before {
                top: -8px; left: -8px;
                border-right: none; border-bottom: none;
            }
            .login-card::after {
                bottom: -8px; right: -8px;
                border-left: none; border-top: none;
            }

            .login-tag {
                font-size: 11px;
                letter-spacing: 4px;
                color: #888;
                margin-bottom: 8px;
                text-transform: uppercase;
            }

            .login-title {
                font-family: 'Bebas Neue', sans-serif;
                font-size: 48px;
                color: #fff;
                margin: 0 0 4px 0;
                letter-spacing: 2px;
                line-height: 1;
                position: relative;
            }

            .login-title::after {
                content: 'LOGIN';
                position: absolute;
                left: 0; top: 0;
                color: #fff;
                animation: glitch 4s infinite;
                opacity: 0;
            }

            @keyframes glitch {
                0%, 95%, 100% { opacity: 0; transform: translate(0); }
                95.5% { opacity: 0.8; transform: translate(-2px, 1px); clip-path: inset(20% 0 60% 0); }
                96% { opacity: 0.8; transform: translate(2px, -1px); clip-path: inset(60% 0 20% 0); }
                96.5% { opacity: 0; }
            }

            .login-subtitle {
                font-size: 12px;
                color: #555;
                margin-bottom: 32px;
                letter-spacing: 1px;
            }

            .input-group {
                position: relative;
                margin-bottom: 18px;
            }

            .input-label {
                display: block;
                font-size: 10px;
                letter-spacing: 2px;
                color: #888;
                margin-bottom: 6px;
                text-transform: uppercase;
            }

            .login-input {
                width: 100%;
                padding: 12px 14px;
                background: #000;
                color: #fff;
                border: 1px solid #333;
                border-radius: 0;
                font-family: 'Space Mono', monospace;
                font-size: 14px;
                box-sizing: border-box;
                transition: all 0.2s ease;
                outline: none;
            }

            .login-input:focus {
                border-color: #fff;
                background: #111;
                box-shadow: 4px 4px 0 #fff;
                transform: translate(-2px, -2px);
            }

            .login-input::placeholder {
                color: #444;
            }

            .btn-row {
                display: flex;
                gap: 10px;
                margin-top: 24px;
            }

            .login-btn {
                flex: 1;
                padding: 14px 16px;
                font-family: 'Space Mono', monospace;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
                cursor: pointer;
                border: 2px solid #fff;
                transition: all 0.15s ease;
                position: relative;
                overflow: hidden;
            }

            .btn-primary {
                background: #fff;
                color: #000;
            }

            .btn-primary:hover {
                background: #000;
                color: #fff;
                transform: translate(-3px, -3px);
                box-shadow: 5px 5px 0 #fff;
            }

            .btn-secondary {
                background: transparent;
                color: #fff;
            }

            .btn-secondary:hover {
                background: #fff;
                color: #000;
                transform: translate(-3px, -3px);
                box-shadow: 5px 5px 0 #fff;
            }

            .login-btn:active {
                transform: translate(0, 0);
                box-shadow: none;
            }

            .login-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .login-error {
                color: #fff;
                background: #000;
                border: 1px solid #fff;
                padding: 8px 12px;
                margin-top: 16px;
                font-size: 12px;
                min-height: 16px;
                letter-spacing: 1px;
                display: none;
            }

            .login-error.visible {
                display: block;
                animation: shake 0.3s ease;
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-4px); }
                75% { transform: translateX(4px); }
            }

            .login-footer {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #222;
                font-size: 10px;
                color: #444;
                letter-spacing: 2px;
                text-transform: uppercase;
                display: flex;
                justify-content: space-between;
            }

            .blink {
                animation: blink 1s steps(2) infinite;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                50.01%, 100% { opacity: 0; }
            }

            /* Spinner */
            .spinner {
                display: inline-block;
                width: 12px; height: 12px;
                border: 2px solid #000;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
                vertical-align: middle;
                margin-right: 6px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `
        document.head.appendChild(style)

        this.container = document.createElement('div')
        this.container.id = 'login-overlay'

        this.container.innerHTML = `
            <div class="login-card">
                <div class="login-tag">// ACCESS_TERMINAL</div>
                <h2 class="login-title">LOGIN<span class="blink">_</span></h2>
                <div class="login-subtitle">Identifícate para continuar</div>

                <div class="input-group">
                    <label class="input-label">→ Usuario</label>
                    <input id="login-user" class="login-input" type="text" placeholder="tu_usuario" autocomplete="username" />
                </div>

                <div class="input-group">
                    <label class="input-label">→ Contraseña</label>
                    <input id="login-pass" class="login-input" type="password" placeholder="••••••••" autocomplete="current-password" />
                </div>

                <div class="btn-row">
                    <button id="btn-login" class="login-btn btn-primary">Entrar</button>
                    <button id="btn-register" class="login-btn btn-secondary">Registro</button>
                </div>

                <p id="login-error" class="login-error"></p>

                <div class="login-footer">
                    <span>v1.0.0</span>
                    <span>SYS:READY</span>
                </div>
            </div>
        `

        document.body.appendChild(this.container)

        const btnLogin = document.getElementById('btn-login')
        const btnRegister = document.getElementById('btn-register')
        const inputUser = document.getElementById('login-user')
        const inputPass = document.getElementById('login-pass')

        btnLogin.onclick = () => this._submit('login')
        btnRegister.onclick = () => this._submit('register')

        // Permitir Enter para enviar
        const onEnter = (e) => { if (e.key === 'Enter') this._submit('login') }
        inputUser.addEventListener('keydown', onEnter)
        inputPass.addEventListener('keydown', onEnter)

        // Focus automático
        setTimeout(() => inputUser.focus(), 100)
    }

    async _submit(action) {
        const username = document.getElementById('login-user').value.trim()
        const password = document.getElementById('login-pass').value.trim()
        const errorEl = document.getElementById('login-error')
        const btnLogin = document.getElementById('btn-login')
        const btnRegister = document.getElementById('btn-register')

        errorEl.classList.remove('visible')

        if (!username || !password) {
            errorEl.textContent = '⚠ Completa todos los campos'
            errorEl.classList.add('visible')
            return
        }

        // Estado de carga
        const activeBtn = action === 'login' ? btnLogin : btnRegister
        const originalText = activeBtn.textContent
        activeBtn.innerHTML = '<span class="spinner"></span>Conectando'
        btnLogin.disabled = true
        btnRegister.disabled = true

        try {
            const res = await fetch(`${this.backendUrl}/api/auth/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await res.json()

            if (!res.ok) {
                errorEl.textContent = '✗ ' + (data.message || 'Error al autenticar')
                errorEl.classList.add('visible')
                activeBtn.textContent = originalText
                btnLogin.disabled = false
                btnRegister.disabled = false
                return
            }

            localStorage.setItem('gameToken', data.token)
            activeBtn.textContent = '✓ OK'

            // Quitar estilos al cerrar
            setTimeout(() => {
                this.container.remove()
                const styleTag = document.getElementById('login-screen-styles')
                if (styleTag) styleTag.remove()
                this.onSuccess()
            }, 300)
        } catch (err) {
            errorEl.textContent = '✗ No se pudo conectar con el servidor'
            errorEl.classList.add('visible')
            activeBtn.textContent = originalText
            btnLogin.disabled = false
            btnRegister.disabled = false
        }
    }
}