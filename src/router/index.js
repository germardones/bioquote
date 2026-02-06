import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import NewQuotation from '../views/NewQuotation.vue'
import { auth } from '../firebase/firebaseConfig'

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  {
    path: '/cotizar',
    component: NewQuotation,
    children: [
      {
        path: '',
        name: 'Paso1Specs',
        component: () => import('../components/steps/Step1TechnicalSpecs.vue')
      },
      {
        path: 'cliente',
        name: 'Paso2Cliente',
        component: () => import('../components/steps/Step4ClientData.vue')
      },
      {
        path: 'Resumen',
        name: 'Paso3Resumen',
        component: () => import('../components/steps/Step5Summary.vue')
      }
    ]
  },
  {
    path: '/imprimir/:id',
    name: 'PrintView',
    component: () => import('../views/PrintView.vue')
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: () => import('../views/ClientesView.vue')
  },
  {
    path: '/crm/followup',
    name: 'CRMFollowUp',
    component: () => import('../views/crm/CRMFollowUpView.vue')
  },
  {
    path: '/crm/cliente/:rut',
    name: 'CRMClientDetail',
    component: () => import('../views/crm/CRMClientDetailView.vue')
  },
  {
    path: '/editar-cliente/:rut',
    name: 'editar-cliente',
    // Redirect legacy route or keep for backward compat but point to same component?
    // Let's redirect to keep it clean, or just use the new component.
    // Using new component to migrate fully effectively.
    component: () => import('../views/crm/CRMClientDetailView.vue')
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboard.vue')
  },
  {
    path: '/admin/config',
    name: 'AdminConfig',
    component: () => import('../views/admin/SystemConfigurationView.vue')
  },
  {
    path: '/admin/cotizaciones',
    name: 'AdminCotizaciones',
    component: () => import('../components/admin/AdminCotizaciones.vue')
  },
  {
    path: '/admin/clientes',
    name: 'AdminClientes',
    component: () => import('../components/admin/AdminClientesView.vue')
  },
  {
    path: '/usuarios',
    name: 'Users',
    component: () => import('../views/WorkersView.vue')
  },
  {
    path: '/admin/ventas-servicio',
    name: 'AdminVentasServicio',
    component: () => import('../components/admin/AdminVentasPorServicio.vue')
  },
  {
    path: '/cotizaciones',
    name: 'Cotizaciones',
    component: () => import('../views/QuotationsView.vue')
  },
  {
    path: '/proyectos-en-curso',
    name: 'ActiveProjects',
    component: () => import('../views/ActiveProjectsView.vue')
  },
  {
    path: '/proyectos-en-curso/:id/gestion',
    name: 'ProjectExecution',
    component: () => import('../views/ProjectExecutionView.vue')
  },
  {
    path: '/proyectos-en-curso/:id/kanban/:itemId',
    name: 'ItemKanban',
    component: () => import('../views/ItemKanbanView.vue')
  },
  {
    path: '/proyectos/:id',
    name: 'ProjectDetail',
    component: () => import('../views/ProjectDetailView.vue')
  },
  {
    path: '/bienvenida',
    name: 'Bienvenida',
    component: () => import('../views/Bienvenida.vue')
  },
  {
    path: '/pagos',
    name: 'ProjectPayments',
    component: () => import('../views/ProjectPaymentsView.vue')
  },
  {
    path: '/finanzas/ventas',
    name: 'FinancialSales',
    component: () => import('../views/financial/SalesAnalyticsView.vue')
  },
  {
    path: '/finanzas/recaudacion',
    name: 'FinancialCollection',
    component: () => import('../views/financial/CollectionManagementView.vue')
  },
  {
    path: '/finanzas/flujo-caja',
    name: 'FinancialCashFlow',
    component: () => import('../views/financial/CashFlowView.vue')
  },
  {
    path: '/finanzas/proyeccion',
    name: 'FinancialProjection',
    component: () => import('../views/financial/SalesProjectionView.vue')
  },
  {
    path: '/finanzas/costos',
    name: 'FinancialCosts',
    component: () => import('../views/financial/OperationalCostsView.vue')
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
