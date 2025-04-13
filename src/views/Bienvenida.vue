<!-- views/Bienvenida.vue -->
<template>
    <div class="bienvenida-container" v-if="user && !user.displayName">
      <h2>¡Bienvenido!</h2>
      <p>Por favor ingresa tu nombre para completar tu perfil:</p>
  
      <input v-model="nombre" placeholder="Ej: Juan Pérez" />
      <button @click="guardarNombre" :disabled="!nombre">Guardar</button>
    </div>
  
    <div v-else>
      <p>Cargando...</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { auth } from '../firebase/firebaseConfig'
  import { updateProfile } from 'firebase/auth'
  
  const router = useRouter()
  const user = ref(null)
  const nombre = ref('')
  
  onMounted(() => {
    user.value = auth.currentUser
  })
  
  const guardarNombre = async () => {
    try {
      await updateProfile(auth.currentUser, {
        displayName: nombre.value
      })
  
      alert('¡Nombre guardado correctamente!')
      router.push('/dashboard') // o la ruta que corresponda
    } catch (err) {
      console.error('Error al guardar el nombre:', err)
      alert('Hubo un error. Intenta nuevamente.')
    }
  }
  </script>
  
  <style scoped>
  .bienvenida-container {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 12px;
    text-align: center;
  }
  
  input {
    width: 100%;
    padding: 12px;
    margin-top: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    border: 1px solid #ccc;
  }
  
  button {
    padding: 10px 16px;
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
  }
  </style>
  