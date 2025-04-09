<template>
  <div class="login-container">
    <div class="card">
      <h2>Iniciar sesión</h2>

      <label>Correo electrónico</label>
      <input v-model="email" type="email" placeholder="Correo" />

      <label>Contraseña</label>
      <input v-model="password" type="password" placeholder="Contraseña" />

      <button @click="loginConCorreo">Ingresar con correo</button>

      <hr style="margin: 1rem 0;" />

      <button @click="loginConGoogle">Ingresar con Google</button>

      <p v-if="error" style="color: red; margin-top: 1rem;">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { useRouter } from 'vue-router'

const auth = getAuth()
const provider = new GoogleAuthProvider()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const loginConGoogle = async () => {
  try {
    loading.value = true
    await setPersistence(auth, browserLocalPersistence)
    await signInWithPopup(auth, provider)
    router.push('/dashboard')
  } catch (err) {
    error.value = 'No se pudo iniciar sesión con Google.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const loginConCorreo = async () => {
  try {
    loading.value = true
    await setPersistence(auth, browserLocalPersistence)
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    error.value = 'Correo o contraseña inválidos.'
    console.error(err)
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
</style>
