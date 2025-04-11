<template>
  <div class="login-container">
    <div class="card">
      <h2>Iniciar sesión</h2>

      <label>Correo electrónico</label>
      <input v-model="email" type="email" placeholder="Correo" />

      <label>Contraseña</label>
      <input v-model="password" type="password" placeholder="Contraseña" />

      <button @click="loginConCorreo" :disabled="loading">
        {{ loading ? 'Cargando...' : 'Ingresar con correo' }}
      </button>

      <hr style="margin: 1rem 0;" />

      <button @click="loginConGoogle" :disabled="loading">
        {{ loading ? 'Cargando...' : 'Ingresar con Google' }}
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
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'

const router = useRouter()
const auth = getAuth()
const provider = new GoogleAuthProvider()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const redirigirPorRol = async (user) => {
  const docRef = doc(db, 'usuarios', user.uid)
  const docSnap = await getDoc(docRef)
  console.log('UID actual:', user.uid)


  if (!docSnap.exists()) {
    await auth.signOut() // 👈 cerrar sesión automáticamente
    throw new Error('Usuario no registrado. Contacte a soporte.')
  }

  const datos = docSnap.data()
  const rol = datos.rol

  if (rol === 'admin') {
    router.push('/admin')
  } else if (rol === 'vendedor') {
    router.push('/dashboard')
  } else {
    await auth.signOut() // 👈 cerrar sesión si el rol no es válido
    throw new Error('Rol de usuario no válido.')
  }
}


const loginConCorreo = async () => {
  if (!email.value || !password.value) {
    error.value = 'Debes ingresar correo y contraseña.'
    return
  }

  try {
    loading.value = true
    await setPersistence(auth, browserLocalPersistence)
    const credenciales = await signInWithEmailAndPassword(auth, email.value, password.value)
    await redirigirPorRol(credenciales.user)
  } catch (err) {
    error.value = 'Correo o contraseña inválidos.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const loginConGoogle = async () => {
  try {
    loading.value = true
    await setPersistence(auth, browserLocalPersistence)
    const resultado = await signInWithPopup(auth, provider)
    await redirigirPorRol(resultado.user)
  } catch (err) {
    error.value = 'No se pudo iniciar sesión con Google.'
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

button {
  width: 100%;
  padding: 10px;
  margin-top: 1rem;
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
