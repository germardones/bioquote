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
  browserLocalPersistence
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

    if (rol === 'admin') {
      router.push('/admin')
    } else if (rol === 'vendedor') {
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
    await setPersistence(auth, browserLocalPersistence)

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
  background-color: #f1f1f1;
  padding: 2rem;
}

.card {
  background-color: white;
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

input {
  width: 100%;
  padding: 10px;
  margin-top: 0.25rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 0.5rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  background-color: var(--primary);
  color: white;
  cursor: pointer;
}

button[disabled] {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: red;
  margin-top: 1rem;
  font-weight: bold;
}
</style>
