<template>
  <div class="login-container">
    <div class="card">
      <h2>Iniciar sesión</h2>

      <label for="email">Correo electrónico</label>
      <input id="email" v-model="email" type="email" placeholder="Correo" />

      <label for="password">Contraseña</label>
      <input id="password" v-model="password" type="password" placeholder="Contraseña" />

      <button @click="loginConCorreo" :disabled="loading">
        {{ loading ? 'Cargando...' : 'Ingresar' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'

const router = useRouter()
const auth = getAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const redirigirPorRol = async (user) => {
  try {
    const docRef = doc(db, 'usuarios', user.uid)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      await auth.signOut()
      throw new Error('Usuario no registrado en la base de datos.')
    }

    const datos = docSnap.data()
    const rol = datos.rol

    if (!rol) {
      await auth.signOut()
      throw new Error('Usuario sin rol asignado. Contacte a soporte.')
    }

    if (!user.displayName) {
      router.push('/bienvenida')
      return
    }

    if (rol === 'admin' || rol === 'vendedor') {
      router.push('/dashboard')
    } else {
      await auth.signOut()
      throw new Error('Rol de usuario no válido.')
    }
  } catch (err) {
    throw err
  }
}

const loginConCorreo = async () => {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Debes ingresar correo y contraseña.'
    return
  }

  try {
    loading.value = true
    await setPersistence(auth, browserSessionPersistence)

    const credenciales = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    await redirigirPorRol(credenciales.user)
  } catch (err) {
    console.error('Error de login:', err)
    error.value = err.message.includes('auth') ? 'Correo o contraseña inválidos.' : err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-app);
  padding: 2rem;
  transition: background-color 0.3s;
}

.card {
  background-color: var(--bg-surface);
  padding: 2rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
  transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
}

h2 {
  color: var(--text-main);
  text-align: center;
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-muted);
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--input-bg);
  color: var(--text-main);
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s, background-color 0.3s, color 0.3s;
}

input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 131, 102, 0.2);
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 0.5rem;
  border: none;
  border-radius: var(--border-radius);
  font-weight: bold;
  background-color: var(--primary);
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

button[disabled] {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.error {
  color: #ef4444;
  margin-top: 1rem;
  font-weight: bold;
  text-align: center;
}
</style>
