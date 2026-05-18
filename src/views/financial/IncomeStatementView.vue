<template>
  <div class="container">
    <div class="header no-print">
      <h2>Estado de Resultados</h2>
      <div class="actions">
        <button @click="exportPDF" class="btn-export"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        <button @click="exportExcel" class="btn-export"><i class="fa-solid fa-file-excel"></i> Excel</button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <div class="filter-row no-print">
      <div class="filter-group">
        <label>Modo:</label>
        <select v-model="mode">
          <option value="month">Mes</option>
          <option value="range">Rango personalizado</option>
        </select>
      </div>
      <div class="filter-group" v-if="mode === 'month'">
        <label>Mes:</label>
        <input type="month" v-model="month" />
      </div>
      <template v-else>
        <div class="filter-group">
          <label>Desde:</label>
          <input type="date" v-model="rangeFrom" />
        </div>
        <div class="filter-group">
          <label>Hasta:</label>
          <input type="date" v-model="rangeTo" />
        </div>
      </template>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else id="report-area" class="report-area">
      <div class="report-header">
        <h2 class="report-title">Estado de Resultados</h2>
        <p class="report-period">Período: {{ periodLabel }}</p>
      </div>

      <!-- INCOME -->
      <section class="report-section">
        <h3 class="section-title income">Ingresos</h3>
        <table class="report-table">
          <thead>
            <tr><th>Concepto</th><th class="r">Monto</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in incomeRows" :key="'i'+i">
              <td>{{ row.label }}</td>
              <td class="r mono">{{ formatCurrency(row.amount) }}</td>
            </tr>
            <tr v-if="incomeRows.length === 0">
              <td colspan="2" class="empty">Sin ingresos en el período.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td><strong>Total Ingresos</strong></td><td class="r mono total income">{{ formatCurrency(totalIncome) }}</td></tr>
          </tfoot>
        </table>
      </section>

      <!-- EXPENSES -->
      <section class="report-section">
        <h3 class="section-title expense">Egresos</h3>
        <table class="report-table">
          <thead>
            <tr><th>Categoría</th><th class="r">Monto</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in expenseRows" :key="'e'+i">
              <td>{{ row.label }}</td>
              <td class="r mono">{{ formatCurrency(row.amount) }}</td>
            </tr>
            <tr v-if="expenseRows.length === 0">
              <td colspan="2" class="empty">Sin egresos en el período.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td><strong>Total Egresos</strong></td><td class="r mono total expense">{{ formatCurrency(totalExpenses) }}</td></tr>
          </tfoot>
        </table>
      </section>

      <!-- RESULT -->
      <section class="result-section" :class="{ negative: grossProfit < 0 }">
        <div class="result-row">
          <span>Utilidad Bruta</span>
          <strong class="mono">{{ formatCurrency(grossProfit) }}</strong>
        </div>
        <div class="result-row">
          <span>Margen %</span>
          <strong>{{ marginPct }}%</strong>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useExpensesStore } from '../../store/expenses'
import { EXPENSE_CATEGORIES, categoryLabel } from '../../constants/expenseCategories'
import html2pdf from 'html2pdf.js'
import * as XLSX from 'xlsx'

const router = useRouter()
const expensesStore = useExpensesStore()

const loading = ref(true)
const mode = ref('month')

const today = new Date()
const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const month = ref(ym)
const rangeFrom = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)
const rangeTo = ref(today.toISOString().slice(0, 10))

const projects = ref([])

const inRange = (iso) => {
  if (!iso) return false
  const d = typeof iso === 'string' ? iso.slice(0, 10) : (iso?.toDate ? iso.toDate().toISOString().slice(0, 10) : new Date(iso).toISOString().slice(0, 10))
  if (mode.value === 'month') return d.startsWith(month.value)
  return d >= rangeFrom.value && d <= rangeTo.value
}

const periodLabel = computed(() => {
  if (mode.value === 'month') {
    const [y, m] = month.value.split('-')
    const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${names[Number(m) - 1]} ${y}`
  }
  return `${rangeFrom.value} a ${rangeTo.value}`
})

async function loadAll() {
  loading.value = true
  try {
    const user = auth.currentUser
    if (!user) return
    // Projects (for income from payments)
    const pSnap = await getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid)))
    projects.value = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    // Expenses
    await expensesStore.fetchExpenses()
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// ----- INCOME (from project payments[]) -----
const incomeRows = computed(() => {
  const perClient = {}
  for (const p of projects.value) {
    for (const pay of (p.payments || [])) {
      if (!inRange(pay.date)) continue
      const key = p.client_name || 'Sin cliente'
      perClient[key] = (perClient[key] || 0) + Number(pay.amount || 0)
    }
  }
  return Object.entries(perClient).map(([label, amount]) => ({ label, amount }))
})
const totalIncome = computed(() => incomeRows.value.reduce((s, r) => s + r.amount, 0))

// ----- EXPENSES (operational + fixed if you want; here just operational `expenses`) -----
const expenseRows = computed(() => {
  const perCat = {}
  for (const e of expensesStore.items) {
    if (!inRange(e.date)) continue
    perCat[e.category] = (perCat[e.category] || 0) + Number(e.amount || 0)
  }
  return EXPENSE_CATEGORIES
    .filter(c => perCat[c.id])
    .map(c => ({ label: c.label, amount: perCat[c.id] }))
})
const totalExpenses = computed(() => expenseRows.value.reduce((s, r) => s + r.amount, 0))

const grossProfit = computed(() => totalIncome.value - totalExpenses.value)
const marginPct = computed(() => totalIncome.value > 0 ? Math.round((grossProfit.value / totalIncome.value) * 100) : 0)

const formatCurrency = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0)

function exportPDF() {
  const el = document.getElementById('report-area')
  html2pdf().from(el).set({
    margin: 10,
    filename: `estado-resultados-${mode.value === 'month' ? month.value : rangeFrom.value + '_to_' + rangeTo.value}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save()
}

function exportExcel() {
  const rows = []
  rows.push(['Estado de Resultados'])
  rows.push(['Período', periodLabel.value])
  rows.push([])
  rows.push(['INGRESOS'])
  rows.push(['Cliente', 'Monto'])
  incomeRows.value.forEach(r => rows.push([r.label, r.amount]))
  rows.push(['Total Ingresos', totalIncome.value])
  rows.push([])
  rows.push(['EGRESOS'])
  rows.push(['Categoría', 'Monto'])
  expenseRows.value.forEach(r => rows.push([r.label, r.amount]))
  rows.push(['Total Egresos', totalExpenses.value])
  rows.push([])
  rows.push(['Utilidad Bruta', grossProfit.value])
  rows.push(['Margen %', marginPct.value])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 36 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Estado de Resultados')
  XLSX.writeFile(wb, `estado-resultados-${mode.value === 'month' ? month.value : rangeFrom.value + '_to_' + rangeTo.value}.xlsx`)
}

// reactive reload on period change is not needed (computed already filters), but ensure expenses loaded
watch(mode, () => {})
</script>

<style scoped>
.container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.btn-export {
  background: var(--bg-surface); color: var(--text-main);
  border: 1px solid var(--border-color); padding: 8px 14px; border-radius: 8px;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
}
.btn-export:hover { border-color: var(--primary); color: var(--primary); }

.filter-row { display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; background: var(--bg-surface); padding: 1rem; border: 1px solid var(--border-color); border-radius: 10px; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.filter-group input, .filter-group select { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }

.report-area { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 2rem; box-shadow: var(--shadow); }
.report-header { text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-color); }
.report-title { margin: 0; color: var(--primary); }
.report-period { margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem; }

.report-section { margin-bottom: 1.5rem; }
.section-title { font-size: 1rem; padding: 6px 12px; border-radius: 6px; display: inline-block; margin: 0 0 0.75rem 0; }
.section-title.income { background: rgba(34,197,94,0.12); color: #16a34a; }
.section-title.expense { background: rgba(239,68,68,0.12); color: #ef4444; }

.report-table { width: 100%; border-collapse: collapse; }
.report-table th, .report-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
.report-table th { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; }
.r { text-align: right; }
.mono { font-family: monospace; }
.total.income { color: #16a34a; font-weight: 800; }
.total.expense { color: #ef4444; font-weight: 800; }
.empty { color: var(--text-muted); font-style: italic; padding: 1rem; text-align: center; }

.result-section { background: rgba(0,131,102,0.08); border: 1px solid rgba(0,131,102,0.3); border-radius: 10px; padding: 1.25rem; margin-top: 1rem; }
.result-section.negative { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); }
.result-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 1.1rem; }
.result-row strong { color: var(--primary); font-size: 1.3rem; }
.result-section.negative .result-row strong { color: #ef4444; }

.loading { text-align: center; padding: 3rem; color: var(--text-muted); }

@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
  .actions { width: 100%; flex-wrap: wrap; }
  .actions button { flex: 1; min-width: 90px; }
  .filter-row { padding: 0.75rem; gap: 0.6rem; }
  .filter-group { flex: 1; min-width: 130px; }
  .report-area { padding: 1rem; }
  .report-table th, .report-table td { padding: 6px 8px; font-size: 0.85rem; }
  .result-row { font-size: 0.95rem; }
  .result-row strong { font-size: 1.1rem; }
}
@media print {
  .no-print { display: none !important; }
}
</style>
