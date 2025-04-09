import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import NewQuotation from '../views/NewQuotation.vue'
import { auth } from '../firebase/firebaseConfig' // si ya tienes auth configurado

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/cotizar', name: 'NewQuotation', component: NewQuotation }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Protección de rutas
router.beforeEach((to, from, next) => {
  const protectedRoutes = ['/dashboard', '/cotizar']
  const user = auth.currentUser

  if (protectedRoutes.includes(to.path) && !user) {
    next('/')
  } else {
    next()
  }
})

export default router
