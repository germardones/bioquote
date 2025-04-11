import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import NewQuotation from '../views/NewQuotation.vue'
import { auth } from '../firebase/firebaseConfig'

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/cotizar', name: 'NewQuotation', component: NewQuotation },
  {
    path: '/imprimir',
    name: 'PrintView',
    component: () => import('../views/PrintView.vue')
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: () => import('../views/ClientesView.vue')
  },
  {
    path: '/editar-cliente/:rut',
    name: 'editar-cliente',
    component: () => import('../views/EditClientView.vue')
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboard.vue')
  },
  {
    path: '/admin/cotizaciones',
    name: 'AdminCotizaciones',
    component: () => import('../components/admin/cotizaciones.vue')
  },
  {
    path: '/admin/clientes',
    name: 'AdminClientes',
    component: () => import('../components/admin/AdminClientesView.vue')
  },
  {
    path: '/admin/ventas-servicio',
    name: 'AdminVentasServicio',
    component: () => import('../components/admin/AdminVentasPorServicio.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Protección de rutas
router.beforeEach((to, from, next) => {
  const publicRoutes = ['/']
  const user = auth.currentUser

  if (!publicRoutes.includes(to.path) && !user) {
    next('/')
  } else {
    next()
  }
})

export default router
