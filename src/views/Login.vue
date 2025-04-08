<template>
    <div class="login">
      <h1>Iniciar sesión</h1>
      <input v-model="email" placeholder="Correo" />
      <input v-model="password" type="password" placeholder="Contraseña" />
      <button @click="login">Ingresar</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { signInWithEmailAndPassword } from 'firebase/auth'
  import { auth } from '../firebase/firebaseConfig'
  
  const router = useRouter()
  const email = ref('')
  const password = ref('')
  const error = ref('')
  
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value)
      router.push('/dashboard')
    } catch (e) {
      error.value = 'Credenciales inválidas'
    }
  }
  </script>
  
  