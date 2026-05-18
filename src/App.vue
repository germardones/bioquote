<template>
  <div class="app-wrapper" :class="{ 'dark-mode': isDark }">
    <header class="header app-header">
      <div class="header-content">
        <div class="logo-group">
          <button v-if="userLogged" class="mobile-burger" @click="toggleMobile" title="Menú">
            <i class="fa-solid fa-bars"></i>
          </button>
          <img src="../src/assets/img/logo.png" alt="BioQuote" class="logo" />
        </div>

        <div class="header-actions">
          <NotificationBell v-if="userLogged" />

          <button @click="toggleTheme" class="btn-theme" :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
            <i class="fa-solid" :class="isDark ? 'fa-sun' : 'fa-moon'"></i>
            <span class="theme-text">{{ isDark ? 'Claro' : 'Oscuro' }}</span>
          </button>

          <button v-if="showLogout" @click="cerrarSesion" class="btn-logout">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>

    <div class="body-layout" :class="{ 'no-sidebar': !userLogged || route.path === '/' }">
      <Sidebar v-if="userLogged && route.path !== '/'" />
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <footer class="footer app-footer">
      <p>© {{ new Date().getFullYear() }} BioBio Code - Todos los derechos reservados.</p>
      <p>Contacto: contacto@biobiocode.cl</p>
    </footer>

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
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import AlertModal from './components/AlertModal.vue'
import NotificationBell from './components/NotificationBell.vue'
import Sidebar from './components/Sidebar.vue'
import { useAlert } from './composables/useAlert'
import { useSidebar } from './composables/useSidebar'

const { visible, message, title, closeAlert } = useAlert()
const { toggleMobile } = useSidebar()

const router = useRouter()
const route = useRoute()
const auth = getAuth()
const userLogged = ref(false)
const showLogout = computed(() => userLogged.value && route.path !== '/')
const isDark = ref(localStorage.getItem('theme') === 'dark')

onMounted(() => {
  onAuthStateChanged(auth, (user) => { userLogged.value = !!user })
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

/* Header */
.header {
  background-color: var(--bg-header);
  padding: 1rem;
  color: var(--text-on-header);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
.header-content { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.logo-group { display: flex; align-items: center; gap: 1rem; }
.logo { height: 44px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }

.mobile-burger {
  display: none;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--text-on-header);
  width: 38px; height: 38px;
  border-radius: 8px;
  cursor: pointer;
}

.header-actions { display: flex; align-items: center; gap: 1rem; }

.btn-theme {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--text-on-header);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  display: flex; align-items: center; gap: 8px;
}
.btn-theme i { font-size: 1.1rem; }
.theme-text { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; }
.btn-theme:hover { background: rgba(255,255,255,0.18); }

.btn-logout {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.btn-logout:hover { background: var(--primary-hover); }

/* Body layout with sidebar */
.body-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}
.body-layout.no-sidebar { display: block; }

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Footer */
.footer {
  background: var(--bg-footer);
  color: white;
  padding: 1rem;
  text-align: center;
}

/* Mobile */
@media (max-width: 900px) {
  .mobile-burger { display: inline-flex; align-items: center; justify-content: center; }
}
@media (max-width: 640px) {
  .header { padding: 0.6rem 0.75rem; }
  .header-content { gap: 0.5rem; flex-wrap: nowrap; }
  .logo { height: 32px; }
  .header-actions { gap: 0.4rem; }
  .theme-text { display: none; }
  .btn-theme { padding: 6px 8px; border-radius: 8px; }
  .btn-logout { padding: 6px 10px; font-size: 0.78rem; }
}
@media (max-width: 420px) {
  .logo { height: 26px; }
  .btn-logout { padding: 6px 8px; font-size: 0.72rem; }
  .footer { font-size: 0.78rem; padding: 0.75rem; }
  .footer p { margin: 4px 0; }
}

@media print {
  .app-header, .app-footer { display: none !important; }
  .body-layout { display: block; }
  .sidebar { display: none !important; }
}
</style>
