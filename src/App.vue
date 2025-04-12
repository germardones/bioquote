<template>
  <div class="app-wrapper">
    <header class="header app-header">
      <div class="header-content">
        <img src="../src/assets/img/logo.png" alt="BioQuote" class="logo" />
        <h1>BioQuote</h1>

        <button
          v-if="userLogged"
          @click="cerrarSesion"
          class="btn-logout"
        >
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="footer app-footer">
      <p>© {{ new Date().getFullYear() }} BioBio Code - Todos los derechos reservados.</p>
      <p>Contacto: contacto@biobiocode.cl</p>
    </footer>
  </div>
</template>

<script setup>
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const router = useRouter()
const auth = getAuth()
const userLogged = ref(false)

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    userLogged.value = !!user
  })
})

const cerrarSesion = async () => {
  await signOut(auth)
  router.push('/')
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background-color: var(--dark);
  padding: 1rem;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo {
  margin-left: 200px;
  height: 40px;
}

/* Botón cerrar sesión */
.btn-logout {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-logout:hover {
  background-color: #006e53;
}

/* Footer */
.footer {
  background-color: var(--primary);
  color: white;
  padding: 1rem;
  text-align: center;
}

/* Ocultar header y footer al imprimir */
@media print {
  .app-header,
  .app-footer {
    display: none !important;
  }
}
</style>
