<template>
  <div class="container fade-in">
    <div class="welcome">
      <h2>{{ welcomeTitle }}</h2>
      <p class="welcome-sub">{{ welcomeSub }}</p>
    </div>

    <!-- ============ KPI STRIP (filtered by role) ============ -->
    <div class="kpi-strip" v-if="visibleKpis.length > 0">
      <component
        v-for="kpi in visibleKpis" :key="kpi.id"
        :is="'div'"
        class="kpi-card"
        :class="['kpi-' + kpi.id, { negative: kpi.id === 'margin' && kpis.grossMargin < 0 }]"
      >
        <div class="kpi-icon"><i :class="'fa-solid ' + kpi.icon"></i></div>
        <div class="kpi-body">
          <span class="kpi-label">{{ kpi.label }}</span>
          <span class="kpi-value">{{ kpi.value }}</span>
          <span v-if="kpi.delta !== undefined" class="kpi-delta" :class="deltaClass(kpi.delta)">
            <i :class="deltaIcon(kpi.delta)"></i>
            {{ kpi.delta }}% vs mes anterior
          </span>
          <span v-else-if="kpi.sub" class="kpi-sub">{{ kpi.sub }}</span>
        </div>
      </component>
    </div>

    <!-- ============ ROW: chart + activity (admin/gerente/vendedor) ============ -->
    <div class="analytics-row" v-if="canSee('chart')">
      <div class="panel chart-panel">
        <h3 class="panel-title"><i class="fa-solid fa-chart-line"></i> Ingresos últimos 6 meses</h3>
        <RevenueChart :labels="revenueSeries.labels" :values="revenueSeries.values" />
      </div>

      <div class="panel activity-panel">
        <h3 class="panel-title"><i class="fa-solid fa-clock-rotate-left"></i> Actividad reciente</h3>
        <div v-if="recentActivity.length === 0" class="empty-mini">Sin actividad reciente.</div>
        <ul v-else class="activity-list">
          <li v-for="(ev, i) in recentActivity" :key="i" @click="ev.link && router.push(ev.link)" :class="{ clickable: !!ev.link }">
            <span class="act-icon" :class="`act-${ev.type}`"><i :class="activityIcon(ev.type)"></i></span>
            <div class="act-body">
              <div class="act-title">{{ ev.title }}</div>
              <div class="act-sub">{{ ev.detail }} · {{ ev.atLabel }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- ============ ROW: role-specific widgets ============ -->
    <div class="widgets-row">
      <PendingApprovalsWidget v-if="canSee('approvals')" />
      <QuotesPipelineWidget   v-if="canSee('pipeline')" />
      <MyTasksWidget          v-if="canSee('myTasks')" />
    </div>

    <p v-if="!hasAnyContent" class="empty-state">
      <i class="fa-regular fa-face-smile"></i>
      Tu dashboard se irá llenando a medida que registres actividad.
      Usa el menú lateral para navegar.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase/firebaseConfig'
import { useDashboardKpis } from '../composables/useDashboardKpis'
import { useRole } from '../composables/useRole'
import RevenueChart from '../components/dashboard/RevenueChart.vue'
import PendingApprovalsWidget from '../components/dashboard/PendingApprovalsWidget.vue'
import QuotesPipelineWidget from '../components/dashboard/QuotesPipelineWidget.vue'
import MyTasksWidget from '../components/dashboard/MyTasksWidget.vue'

const router = useRouter()
const { kpis, revenueSeries, recentActivity, fetchDashboardData, formatCurrency } = useDashboardKpis()
const { role, canSeeSalary } = useRole()

const userName = ref('')
onMounted(() => {
  fetchDashboardData()
  const u = auth.currentUser
  userName.value = u?.displayName || u?.email?.split('@')[0] || ''
})
// re-fetch if role loads after mount
watch(role, () => fetchDashboardData())

const welcomeTitle = computed(() => {
  const hello = `Hola${userName.value ? ', ' + userName.value : ''}`
  return hello
})
const welcomeSub = computed(() => {
  const r = role.value
  if (r === 'admin')         return 'Aquí tienes la vista ejecutiva completa.'
  if (r === 'gerente')       return 'Indicadores y aprobaciones del equipo.'
  if (r === 'vendedor')      return 'Tu pipeline de ventas en un vistazo.'
  if (r === 'desarrollador') return 'Tus tareas y proyectos asignados.'
  return 'Bienvenido.'
})

// ---- Visibility rules per role ----
// Define which sections each role sees on the dashboard.
const ROLE_DASHBOARD = {
  admin:         { kpis: ['revenue', 'projects', 'quotes', 'clients', 'expenses', 'margin'], sections: ['chart', 'approvals', 'pipeline', 'myTasks'] },
  gerente:       { kpis: ['revenue', 'projects', 'quotes', 'clients', 'expenses', 'margin'], sections: ['chart', 'approvals', 'pipeline'] },
  vendedor:      { kpis: ['quotes', 'clients'],                                              sections: ['pipeline'] },
  desarrollador: { kpis: ['projects'],                                                       sections: ['myTasks'] }
}
const conf = computed(() => ROLE_DASHBOARD[role.value] || ROLE_DASHBOARD.vendedor)
const canSee = (section) => conf.value.sections.includes(section)

// ---- KPI definitions ----
const allKpis = computed(() => ({
  revenue: {
    id: 'revenue', icon: 'fa-coins', label: 'Ingresos del mes',
    value: formatCurrency(kpis.value.revenueThisMonth),
    delta: kpis.value.revenueDelta
  },
  projects: {
    id: 'projects', icon: 'fa-rocket', label: 'Proyectos',
    value: kpis.value.activeProjects,
    sub: `${kpis.value.completedProjects} completados · ${kpis.value.pausedProjects} pausados`
  },
  quotes: {
    id: 'quotes', icon: 'fa-file-circle-plus', label: 'Cotizaciones',
    value: kpis.value.quotesThisMonth,
    sub: `${kpis.value.quotesPending} pendientes de respuesta`
  },
  clients: {
    id: 'clients', icon: 'fa-users', label: 'Clientes activos',
    value: kpis.value.activeClients,
    sub: 'en cartera'
  },
  expenses: {
    id: 'expenses', icon: 'fa-money-bill-trend-up', label: 'Gastos del mes',
    value: formatCurrency(kpis.value.expensesThisMonth),
    sub: canSeeSalary.value ? 'fijos + operacionales' : 'operacionales'
  },
  margin: {
    id: 'margin', icon: 'fa-chart-line', label: 'Margen bruto (mes)',
    value: formatCurrency(kpis.value.grossMargin),
    sub: 'ingresos − costos'
  }
}))

const visibleKpis = computed(() => conf.value.kpis.map(id => allKpis.value[id]).filter(Boolean))

const hasAnyContent = computed(() => visibleKpis.value.length > 0 || conf.value.sections.length > 0)

const deltaClass = (d) => d > 0 ? 'delta-up' : d < 0 ? 'delta-down' : 'delta-flat'
const deltaIcon = (d) => d > 0 ? 'fa-solid fa-arrow-trend-up' : d < 0 ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-minus'
const activityIcon = (type) => ({
  payment: 'fa-solid fa-sack-dollar',
  quote: 'fa-solid fa-file-invoice',
  status: 'fa-solid fa-arrow-right-arrow-left'
}[type] || 'fa-solid fa-circle-info')
</script>

<style scoped>
.container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 2rem; }

.welcome { margin-bottom: 1.5rem; }
.welcome h2 { margin: 0; font-size: 1.7rem; color: var(--text-main); }
.welcome-sub { margin: 4px 0 0; color: var(--text-muted); font-size: 0.95rem; }

/* KPI strip */
.kpi-strip {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-bottom: 2rem;
}
.kpi-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: var(--shadow);
  display: flex; gap: 1rem; align-items: flex-start;
  border-left: 4px solid var(--border-color);
  transition: transform 0.2s;
}
.kpi-card:hover { transform: translateY(-2px); }
.kpi-card.kpi-revenue   { border-left-color: #008366; }
.kpi-card.kpi-projects  { border-left-color: #3b82f6; }
.kpi-card.kpi-quotes    { border-left-color: #22c55e; }
.kpi-card.kpi-clients   { border-left-color: #8b5cf6; }
.kpi-card.kpi-expenses  { border-left-color: #f97316; }
.kpi-card.kpi-margin    { border-left-color: #10b981; }
.kpi-card.kpi-margin.negative { border-left-color: #ef4444; }

.kpi-icon { width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; background: rgba(0,131,102,0.1); color: var(--primary); }
.kpi-revenue  .kpi-icon { background: rgba(0,131,102,0.12);  color: #008366; }
.kpi-projects .kpi-icon { background: rgba(59,130,246,0.12); color: #3b82f6; }
.kpi-quotes   .kpi-icon { background: rgba(34,197,94,0.12);  color: #22c55e; }
.kpi-clients  .kpi-icon { background: rgba(139,92,246,0.12); color: #8b5cf6; }
.kpi-expenses .kpi-icon { background: rgba(249,115,22,0.12); color: #f97316; }
.kpi-margin   .kpi-icon { background: rgba(16,185,129,0.12); color: #10b981; }
.kpi-margin.negative .kpi-icon { background: rgba(239,68,68,0.12); color: #ef4444; }

.kpi-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.kpi-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
.kpi-value { font-size: 1.5rem; font-weight: 800; color: var(--text-main); line-height: 1.15; }
.kpi-sub { font-size: 0.78rem; color: var(--text-muted); }
.kpi-delta { font-size: 0.78rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; }
.delta-up   { color: #16a34a; }
.delta-down { color: #ef4444; }
.delta-flat { color: var(--text-muted); }

/* Chart + activity */
.analytics-row { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); }
.panel-title { font-size: 1rem; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 8px; color: var(--text-main); }

.activity-list { list-style: none; padding: 0; margin: 0; max-height: 280px; overflow-y: auto; }
.activity-list li { display: flex; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); align-items: flex-start; }
.activity-list li:last-child { border-bottom: none; }
.activity-list li.clickable { cursor: pointer; }
.activity-list li.clickable:hover { background: var(--bg-app); }
.act-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem; }
.act-icon.act-payment { background: rgba(34,197,94,0.12);  color: #22c55e; }
.act-icon.act-quote   { background: rgba(59,130,246,0.12); color: #3b82f6; }
.act-icon.act-status  { background: rgba(139,92,246,0.12); color: #8b5cf6; }
.act-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.act-title { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
.act-sub { font-size: 0.78rem; color: var(--text-muted); }
.empty-mini { color: var(--text-muted); font-style: italic; padding: 1rem 0; }

/* Widgets row */
.widgets-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--bg-surface);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  color: var(--text-muted);
}
.empty-state i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }

@media (max-width: 900px) {
  .analytics-row { grid-template-columns: 1fr; }
  .widgets-row { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .kpi-strip {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  .kpi-card { padding: 0.85rem; gap: 0.6rem; }
  .kpi-icon { width: 34px; height: 34px; font-size: 0.95rem; border-radius: 8px; }
  .kpi-label { font-size: 0.68rem; }
  .kpi-value { font-size: 1.15rem; }
  .kpi-sub, .kpi-delta { font-size: 0.72rem; }
  .panel { padding: 1rem; }
  .panel-title { font-size: 0.9rem; }
}
@media (max-width: 480px) {
  .container { padding: 0.75rem; }
  .kpi-strip { gap: 0.5rem; }
  .kpi-card { padding: 0.7rem; }
  .welcome h2 { font-size: 1.25rem; }
  .welcome-sub { font-size: 0.85rem; }
}
@media (max-width: 360px) {
  .kpi-strip { grid-template-columns: 1fr; }
}
</style>
