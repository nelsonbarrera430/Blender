export default class LoginScreen {
    constructor(onSuccess) {
        this.onSuccess = onSuccess
        this.backendUrl = import.meta.env.VITE_BACKEND_URL || null
        this._build()
    }

    _build() {
        // Si no hay backend configurado, entrar directo
        if (!this.backendUrl) {
            this.onSuccess()
            return
        }

        // Si ya hay token guardado, entrar directo
        if (localStorage.getItem('gameToken')) {
            this.onSuccess()
            return
        }

        this.container = document.createElement('div')
        this.container.style.cssText = `
            position: fixed; inset: 0; background: rgba(56, 92, 2, 0.92);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; font-family: monospace;
        `

        this.container.innerHTML = `
            <div style="background:#111; border:1px solid #5e0178; border-radius:12px; padding:40px; width:320px; text-align:center;">
                <h2 style="color:#00fff7; margin-bottom:24px;"> Iniciar Sesión</h2>
                <input id="login-user" type="text" placeholder="Usuario" style="width:100%; padding:10px; margin-bottom:12px; background:#222; color:white; border:1px solid #951111; border-radius:6px; box-sizing:border-box;"/>
                <input id="login-pass" type="password" placeholder="Contraseña" style="width:100%; padding:10px; margin-bottom:20px; background:#222; color:white; border:1px solid #fdf500; border-radius:6px; box-sizing:border-box;"/>
                <button id="btn-login" style="width:100%; padding:10px; background:#00fff7; color:#000; font-weight:bold; border:none; border-radius:6px; cursor:pointer; margin-bottom:10px;">Entrar</button>
                <button id="btn-register" style="width:100%; padding:10px; background:transparent; color:#00fff7; border:1px solid #ffb700; border-radius:6px; cursor:pointer;">Registrarse</button>
                <p id="login-error" style="color:#ff4444; margin-top:12px; font-size:13px;"></p>
            </div>
        `

        document.body.appendChild(this.container)

        document.getElementById('btn-login').onclick = () => this._submit('login')
        document.getElementById('btn-register').onclick = () => this._submit('register')
    }

    async _submit(action) {
        const username = document.getElementById('login-user').value.trim()
        const password = document.getElementById('login-pass').value.trim()
        const errorEl = document.getElementById('login-error')

        if (!username || !password) {
            errorEl.textContent = 'Completa todos los campos'
            return
        }

        try {
            const res = await fetch(`${this.backendUrl}/api/auth/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await res.json()

            if (!res.ok) {
                errorEl.textContent = data.message || 'Error al autenticar'
                return
            }

            localStorage.setItem('gameToken', data.token)
            this.container.remove()
            this.onSuccess()
        } catch (err) {
            errorEl.textContent = 'No se pudo conectar con el servidor'
        }
    }
}