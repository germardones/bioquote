<template>
  <div class="container">
    <div class="header no-print">
      <h2>Reportes</h2>
      <div class="actions">
        <button class="btn-export" @click="exportPDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        <button class="btn-export" @click="exportExcel"><i class="fa-solid fa-file-excel"></i> Excel</button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-row no-print">
      <div class="filter-group">
        <label>Desde</label>
        <input type="date" v-model="rangeFrom" />
      </div>
      <div class="filter-group">
        <label>Hasta</label>
        <input type="date" v-model="rangeTo" />
      </div>
      <button class="btn-secondary" @click="quickRange('month')">Mes actual</button>
      <button class="btn-secondary" @click="quickRange('year')">Año actual</button>
      <button class="btn-secondary" @click="quickRange('all')">Todo</button>
    </div>

    <!-- Tabs -->
    <div class="tabs no-print">
      <button v-for="t in tabs" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id">
        <i :class="'fa-solid ' + t.icon"></i> {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else id="report-body" class="report-body">
      <div class="report-meta">
        <strong>Período:</strong> {{ periodLabel }} · <strong>Generado:</strong> {{ today }}
      </div>

      <!-- VENTAS -->
      <section v-show="tab === 'sales'">
        <h3 class="r-title">Reporte de Ventas</h3>
        <div class="kpi-row">
          <div class="kpi"><label>Cotizaciones</label><span>{{ salesReport.quotes }}</span></div>
          <div class="kpi"><label>Aprobadas</label><span>{{ salesReport.approved }}</span></div>
          <div class="kpi"><label>Tasa de cierre</label><span>{{ salesReport.closeRate }}%</span></div>
          <div class="kpi"><label>Ticket promedio</label><span>{{ currency(salesReport.avgTicket) }}</span></div>
          <div class="kpi highlight"><label>Total vendido</label><span>{{ currency(salesReport.totalSold) }}</span></div>
        </div>
        <h4>Distribución por estado</h4>
        <table class="r-table">
          <thead><tr><th>Estado</th><th class="r">Cantidad</th></tr></thead>
          <tbody>
            <tr v-for="[status, count] in Object.entries(salesReport.perStatus)" :key="status">
              <td>{{ statusLabel(status) }}</td>
              <td class="r">{{ count }}</td>
            </tr>
            <tr v-if="Object.keys(salesReport.perStatus).length === 0"><td colspan="2" class="empty">Sin datos en el período.</td></tr>
          </tbody>
        </table>
      </section>

      <!-- FINANCIERO -->
      <section v-show="tab === 'financial'">
        <h3 class="r-title">Reporte Financiero (por mes)</h3>
        <table class="r-table">
          <thead>
            <tr><th>Mes</th><th class="r">Ingresos</th><th class="r">Egresos</th><th class="r">Margen</th><th class="r">Margen %</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in financialReport.rows" :key="r.month">
              <td>{{ monthLabel(r.month) }}</td>
              <td class="r mono pos">{{ currency(r.income) }}</td>
              <td class="r mono neg">{{ currency(r.expense) }}</td>
              <td class="r mono" :class="r.margin >= 0 ? 'pos' : 'neg'">{{ currency(r.margin) }}</td>
              <td class="r">{{ r.marginPct }}%</td>
            </tr>
            <tr v-if="financialReport.rows.length === 0"><td colspan="5" class="empty">Sin movimientos en el período.</td></tr>
          </tbody>
          <tfoot v-if="financialReport.rows.length > 0">
            <tr>
              <td><strong>Total</strong></td>
              <td class="r mono pos"><strong>{{ currency(financialReport.totals.income) }}</strong></td>
              <td class="r mono neg"><strong>{{ currency(financialReport.totals.expense) }}</strong></td>
              <td class="r mono" :class="financialReport.totals.margin >= 0 ? 'pos' : 'neg'"><strong>{{ currency(financialReport.totals.margin) }}</strong></td>
              <td class="r"></td>
            </tr>
          </tfoot>
        </table>
      </section>

      <!-- PROYECTOS -->
      <section v-show="tab === 'projects'">
        <h3 class="r-title">Reporte de Proyectos</h3>
        <div class="kpi-row">
          <div class="kpi"><label>Proyectos en período</label><span>{{ projectsReport.count }}</span></div>
          <div class="kpi"><label>Completados</label><span>{{ projectsReport.completedCount }}</span></div>
          <div class="kpi highlight"><label>Entrega promedio</label><span>{{ projectsReport.avgDeliveryDays }} días</span></div>
        </div>
        <h4>Costo real vs. presupuesto (activos)</h4>
        <table class="r-table">
          <thead><tr><th>Proyecto</th><th>Cliente</th><th>Estado</th><th class="r">Presupuesto</th><th class="r">Costo real</th><th class="r">Diferencia</th></tr></thead>
          <tbody>
            <tr v-for="p in projectsReport.rows" :key="p.id" :class="{ 'over-row': p.overBudget }">
              <td>{{ p.name }}</td>
              <td>{{ p.client }}</td>
              <td>{{ statusLabel(p.status) }}</td>
              <td class="r mono">{{ currency(p.budget) }}</td>
              <td class="r mono">{{ currency(p.realCost) }}</td>
              <td class="r mono" :class="p.diff >= 0 ? 'pos' : 'neg'">{{ currency(p.diff) }}</td>
            </tr>
            <tr v-if="projectsReport.rows.length === 0"><td colspan="6" class="empty">Sin proyectos activos.</td></tr>
          </tbody>
        </table>
      </section>

      <!-- EQUIPO -->
      <section v-show="tab === 'team'">
        <h3 class="r-title">Reporte de Equipo</h3>
        <table class="r-table">
          <thead>
            <tr><th>Colaborador</th><th>Cargo</th><th class="r">Proyectos activos</th><th class="r">Total proyectos</th><th class="r">Tareas activas</th><th class="r">Tareas completas</th><th class="r">Horas registradas</th></tr>
          </thead>
          <tbody>
            <tr v-for="w in teamReport.rows" :key="w.id">
              <td>{{ w.name }}</td>
              <td>{{ w.role }}</td>
              <td class="r">{{ w.activeProjects }}</td>
              <td class="r">{{ w.totalProjects }}</td>
              <td class="r">{{ w.activeTasks }}</td>
              <td class="r">{{ w.completedTasks }}</td>
              <td class="r mono">{{ w.executionHours }}h</td>
            </tr>
            <tr v-if="teamReport.rows.length === 0"><td colspan="7" class="empty">Sin colaboradores registrados.</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReports } from '../../composables/useReports'
import { statusLabel } from '../../constants/projectStatus'
import html2pdf from 'html2pdf.js'
import * as XLSX from 'xlsx'

const router = useRouter()
const r = useReports()
const { loading, rangeFrom, rangeTo, fetchAll, salesReport, financialReport, projectsReport, teamReport } = r

const tab = ref('sales')
const tabs = [
  { id: 'sales',     label: 'Ventas',     icon: 'fa-handshake' },
  { id: 'financial', label: 'Financiero', icon: 'fa-coins' },
  { id: 'projects',  label: 'Proyectos',  icon: 'fa-rocket' },
  { id: 'team',      label: 'Equipo',     icon: 'fa-people-group' }
]

const today = new Intl.DateTimeFormat('es-CL').format(new Date())

const periodLabel = computed(() => {
  if (!rangeFrom.value && !rangeTo.value) return 'Todo el histórico'
  return `${rangeFrom.value || 'inicio'} → ${rangeTo.value || 'hoy'}`
})

const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${names[Number(m) - 1]} ${y}`
}

function quickRange(kind) {
  const now = new Date()
  if (kind === 'month') {
    rangeFrom.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    rangeTo.value = now.toISOString().slice(0, 10)
  } else if (kind === 'year') {
    rangeFrom.value = `${now.getFullYear()}-01-01`
    rangeTo.value = now.toISOString().slice(0, 10)
  } else {
    rangeFrom.value = ''
    rangeTo.value = ''
  }
}

onMounted(() => { quickRange('all'); fetchAll() })

const currency = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0)

function exportPDF() {
  const el = document.getElementById('report-body')
  html2pdf().from(el).set({
    margin: 8,
    filename: `reporte-${tab.value}-${today.replaceAll('/', '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  }).save()
}

function exportExcel() {
  const wb = XLSX.utils.book_new()

  // Sales
  const salesRows = [
    ['Cotizaciones', salesReport.value.quotes],
    ['Aprobadas', salesReport.value.approved],
    ['Tasa de cierre', salesReport.value.closeRate + '%'],
    ['Ticket promedio', salesReport.value.avgTicket],
    ['Total vendido', salesReport.value.totalSold],
    [],
    ['Estado', 'Cantidad'],
    ...Object.entries(salesReport.value.perStatus).map(([s, c]) => [statusLabel(s), c])
  ]
  const wsSales = XLSX.utils.aoa_to_sheet([['REPORTE DE VENTAS'], ['Período', periodLabel.value], [], ...salesRows])
  wsSales['!cols'] = [{ wch: 30 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas')

  // Financial
  const finRows = financialReport.value.rows.map(r => [monthLabel(r.month), r.income, r.expense, r.margin, r.marginPct + '%'])
  const wsFin = XLSX.utils.aoa_to_sheet([
    ['REPORTE FINANCIERO'], ['Período', periodLabel.value], [],
    ['Mes', 'Ingresos', 'Egresos', 'Margen', 'Margen %'],
    ...finRows,
    [],
    ['Total', financialReport.value.totals.income, financialReport.value.totals.expense, financialReport.value.totals.margin, '']
  ])
  wsFin['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsFin, 'Financiero')

  // Projects
  const projRows = projectsReport.value.rows.map(p => [p.name, p.client, statusLabel(p.status), p.budget, p.realCost, p.diff])
  const wsProj = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE PROYECTOS'], ['Período', periodLabel.value],
    ['Proyectos en período', projectsReport.value.count],
    ['Completados', projectsReport.value.completedCount],
    ['Entrega promedio (días)', projectsReport.value.avgDeliveryDays], [],
    ['Proyecto', 'Cliente', 'Estado', 'Presupuesto', 'Costo real', 'Diferencia'],
    ...projRows
  ])
  wsProj['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsProj, 'Proyectos')

  // Team
  const teamRows = teamReport.value.rows.map(w => [w.name, w.role, w.activeProjects, w.totalProjects, w.activeTasks, w.completedTasks, w.executionHours])
  const wsTeam = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE EQUIPO'], ['Período', periodLabel.value], [],
    ['Colaborador', 'Cargo', 'Proyectos activos', 'Total proyectos', 'Tareas activas', 'Tareas completas', 'Horas registradas'],
    ...teamRows
  ])
  wsTeam['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsTeam, 'Equipo')

  XLSX.writeFile(wb, `reportes-${today.replaceAll('/', '-')}.xlsx`)
}
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-export { background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-color); padding: 8px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-export:hover { border-color: var(--primary); color: var(--primary); }

.filter-row { display: flex; gap: 0.75rem; align-items: flex-end; margin-bottom: 1rem; flex-wrap: wrap; background: var(--bg-surface); padding: 1rem; border: 1px solid var(--border-color); border-radius: 10px; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.filter-group input { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.btn-secondary { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-color); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }

.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border-color); margin-bottom: 1.5rem; flex-wrap: wrap; }
.tabs button { background: transparent; border: none; padding: 10px 18px; color: var(--text-muted); cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent; margin-bottom: -2px; display: inline-flex; align-items: center; gap: 6px; }
.tabs button:hover { color: var(--text-main); }
.tabs button.active { color: var(--primary); border-bottom-color: var(--primary); }

.report-body { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); }
.report-meta { padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem; color: var(--text-muted); font-size: 0.88rem; }
.r-title { margin: 0 0 1rem 0; color: var(--primary); }
h4 { margin: 1.5rem 0 0.75rem 0; color: var(--text-main); }

.kpi-row { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 1.5rem; }
.kpi { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; }
.kpi.highlight { border-color: var(--primary); }
.kpi label { display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
.kpi span { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }
.kpi.highlight span { color: var(--primary); }

.r-table { width: 100%; border-collapse: collapse; }
.r-table th, .r-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
.r-table th { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; background: var(--bg-app); }
.r { text-align: right; }
.mono { font-family: monospace; }
.pos { color: #16a34a; }
.neg { color: #ef4444; }
.empty { color: var(--text-muted); font-style: italic; padding: 1.5rem; text-align: center; }
.over-row td { background: rgba(239,68,68,0.05); }

.loading { text-align: center; padding: 3rem; color: var(--text-muted); }

@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
  .actions { width: 100%; flex-wrap: wrap; }
  .actions button { flex: 1; min-width: 100px; }
  .filter-row { padding: 0.75rem; gap: 0.6rem; }
  .filter-group { flex: 1; min-width: 130px; }
  .tabs { gap: 0; }
  .tabs button { padding: 8px 12px; font-size: 0.85rem; flex: 1; min-width: 0; }
  .report-body { padding: 1rem; }
  .kpi-row { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .kpi { padding: 0.75rem; }
  .kpi span { font-size: 1.1rem; }
}
@media (max-width: 420px) {
  .kpi-row { grid-template-columns: 1fr; }
}
@media print {
  .no-print { display: none !important; }
}
</style>
