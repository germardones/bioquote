<template>
  <div class="app-wrapper" :class="{ 'dark-mode': isDark }">
    <header class="header app-header">
      <div class="header-content">
        <div class="logo-group">
          <img src="../src/assets/img/logo.png" alt="BioQuote" class="logo" />
        </div>

        <div class="header-actions">
          <button @click="toggleTheme" class="btn-theme" :aria-label="isDark ? 'Activar modo claro' : 'Activar modo oscuro'" :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
            <i class="fa-solid" :class="isDark ? 'fa-sun' : 'fa-moon'"></i>
            <span class="theme-text">{{ isDark ? 'Claro' : 'Oscuro' }}</span>
          </button>

          <button
            v-if="userLogged"
            @click="cerrarSesion"
            class="btn-logout"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="footer app-footer">
      <p>© {{ new Date().getFullYear() }} BioBio Code - Todos los derechos reservados.</p>
      <p>Contacto: contacto@biobiocode.cl</p>
    </footer>

    <!-- Global Alert Modal -->
    <AlertModal
      :visible="visible"
      :title="title"
      :message="message"
      @close="closeAlert"
    />
  </div>
</template>

<script setup>
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import AlertModal from './components/AlertModal.vue'
import { useAlert } from './composables/useAlert'

const { visible, message, title, closeAlert } = useAlert()

const router = useRouter()
const auth = getAuth()
const userLogged = ref(false)
const isDark = ref(localStorage.getItem('theme') === 'dark')

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    userLogged.value = !!user
  })
  
  // Apply theme on load
  applyTheme()
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

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
  background-color: var(--bg-header);
  padding: 1rem;
  color: var(--text-on-header);
  transition: background-color 0.3s;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap; /* Allow wrapping */
}

/* Mobile Header Adjustments */
@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
    gap: 0.75rem;
  }

  .logo-group {
    width: 100%;
    justify-content: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  height: 44px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Theme Toggle */
.btn-theme {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-on-header);
  font-size: 1rem;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-theme i {
  font-size: 1.1rem;
}

.theme-text {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.btn-theme:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: rotate(15deg);
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
  transition: background-color 0.2s;
}

.btn-logout:hover {
  background-color: var(--primary-hover);
}

/* Footer */
.footer {
  background-color: var(--bg-footer);
  color: white;
  padding: 1rem;
  text-align: center;
  transition: background-color 0.3s;
}

/* Ocultar header y footer al imprimir */
@media print {
  .app-header,
  .app-footer {
    display: none !important;
  }
}
</style>
