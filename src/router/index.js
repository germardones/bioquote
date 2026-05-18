import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import NewQuotation from '../views/NewQuotation.vue'
import { auth, db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { sectionForPath, canAccess, ROLES } from '../constants/roles'

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
    // Edit flow: same wizard but pre-loaded with project data
    path: '/cotizar/edit/:id',
    component: NewQuotation,
    children: [
      { path: '',         name: 'EditPaso1', component: () => import('../components/steps/Step1TechnicalSpecs.vue') },
      { path: 'cliente',  name: 'EditPaso2', component: () => import('../components/steps/Step4ClientData.vue') },
      { path: 'resumen',  name: 'EditPaso3', component: () => import('../components/steps/Step5Summary.vue') }
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
    path: '/leads',
    name: 'Leads',
    component: () => import('../views/LeadsView.vue')
  },
  {
    path: '/prospectos',
    name: 'Prospectos',
    component: () => import('../views/ProspectosView.vue')
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
    path: '/cotizaciones',
    name: 'Cotizaciones',
    component: () => import('../views/QuotationsView.vue')
  },
  {
    path: '/admin/config',
    name: 'AdminConfig',
    component: () => import('../views/admin/SystemConfigurationView.vue')
  },
  {
    path: '/admin/calendar',
    name: 'CalendarView',
    component: () => import('../views/admin/CalendarView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/usuarios',
    name: 'Users',
    component: () => import('../views/WorkersView.vue')
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
  },
  {
    path: '/finanzas/gastos',
    name: 'FinancialExpenses',
    component: () => import('../views/financial/ExpensesView.vue')
  },
  {
    path: '/finanzas/estado-resultados',
    name: 'FinancialIncomeStatement',
    component: () => import('../views/financial/IncomeStatementView.vue')
  },
  {
    path: '/equipo/ausencias',
    name: 'TeamAbsences',
    component: () => import('../views/team/TeamAbsencesView.vue')
  },
  {
    path: '/tareas',
    name: 'Tasks',
    component: () => import('../views/tasks/TasksView.vue')
  },
  {
    path: '/reportes',
    name: 'Reports',
    component: () => import('../views/reports/ReportsView.vue')
  },
  {
    path: '/finanzas/retiros',
    name: 'PartnerWithdrawals',
    component: () => import('../views/financial/WithdrawalsView.vue')
  },
  {
    path: '/admin/plantillas',
    name: 'QuoteTemplates',
    component: () => import('../views/admin/QuoteTemplatesView.vue')
  },
  {
    path: '/calculadora',
    name: 'QuoteCalculator',
    component: () => import('../views/QuoteCalculatorView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Wait for Firebase to restore auth state (avoids null on page refresh)
const authReady = new Promise(resolve => {
  const unsub = auth.onAuthStateChanged(user => {
    unsub()
    resolve(user)
  })
})

// Cache role to avoid a Firestore read on every navigation
let cachedUid = null
let cachedRole = null

async function getUserRole(uid) {
  if (uid === cachedUid && cachedRole !== null) return cachedRole
  const snap = await getDoc(doc(db, 'usuarios', uid))
  cachedRole = snap.exists() ? (snap.data().rol || ROLES.VENDEDOR) : ROLES.VENDEDOR
  cachedUid = uid
  return cachedRole
}

// Reset cache on sign-out
auth.onAuthStateChanged(user => {
  if (!user) { cachedUid = null; cachedRole = null }
})

// Protección de rutas + control de acceso por rol (Fase 5.2)
router.beforeEach(async (to, from, next) => {
  const publicRoutes = ['/']
  await authReady
  const user = auth.currentUser

  if (!publicRoutes.includes(to.path) && !user) return next('/')

  // /dashboard, /bienvenida, /imprimir always allowed once authenticated
  const alwaysAllowed = ['/dashboard', '/bienvenida']
  if (alwaysAllowed.includes(to.path) || to.path.startsWith('/imprimir')) return next()

  if (user) {
    const role = await getUserRole(user.uid)
    const section = sectionForPath(to.path)
    if (section && !canAccess(role, section)) {
      console.warn(`Acceso denegado a ${to.path} para rol "${role}" (requiere sección "${section}")`)
      return next('/dashboard')
    }
  }

  next()
})

export default router
