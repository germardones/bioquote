<template>
  <div class="container">
    <div class="header">
      <h2>Gastos Operacionales</h2>
      <div class="actions">
        <input type="month" v-model="selectedMonth" class="month-input" />
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="summary-grid">
      <div class="sum-card">
        <div class="sum-icon" style="background: rgba(249,115,22,0.12); color: #f97316;">
          <i class="fa-solid fa-coins"></i>
        </div>
        <div>
          <label>Total del mes</label>
          <span class="value">{{ formatCurrency(monthlyTotal) }}</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background: rgba(59,130,246,0.12); color: #3b82f6;">
          <i class="fa-solid fa-receipt"></i>
        </div>
        <div>
          <label>Registros</label>
          <span class="value">{{ monthExpenses.length }}</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background: rgba(139,92,246,0.12); color: #8b5cf6;">
          <i class="fa-solid fa-tags"></i>
        </div>
        <div>
          <label>Categorías activas</label>
          <span class="value">{{ Object.keys(categoryTotals).length }}</span>
        </div>
      </div>
    </div>

    <div class="two-col">
      <!-- ============ ADD FORM ============ -->
      <div class="panel">
        <h3 class="panel-title"><i class="fa-solid fa-plus"></i> Nuevo gasto</h3>
        <form @submit.prevent="submit" class="add-form">
          <div class="form-row">
            <label>Fecha</label>
            <input type="date" v-model="form.date" required />
          </div>
          <div class="form-row">
            <label>Monto (CLP)</label>
            <input type="number" v-model.number="form.amount" min="1" required placeholder="0" />
          </div>
          <div class="form-row">
            <label>Categoría</label>
            <select v-model="form.category" required>
              <option v-for="c in EXPENSE_CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>Descripción</label>
            <input type="text" v-model="form.description" placeholder="Ej: Suscripción Adobe Mayo" />
          </div>
          <div class="form-row">
            <label>Responsable</label>
            <input type="text" v-model="form.responsible" placeholder="Quién pagó" />
          </div>
          <div class="form-row">
            <label>Comprobante (opcional)</label>
            <input type="file" @change="onFile" accept="image/*,application/pdf" />
            <small v-if="selectedFile" class="file-hint">{{ selectedFile.name }}</small>
          </div>
          <button type="submit" :disabled="store.uploading">
            <i class="fa-solid fa-floppy-disk"></i>
            {{ store.uploading ? 'Subiendo...' : 'Guardar gasto' }}
          </button>
        </form>
      </div>

      <!-- ============ DONUT ============ -->
      <div class="panel">
        <h3 class="panel-title"><i class="fa-solid fa-chart-pie"></i> Distribución por categoría</h3>
        <CategoryDonut :segments="donutSegments" />
        <div class="cat-legend">
          <div v-for="c in EXPENSE_CATEGORIES" :key="c.id" class="cat-row">
            <span class="cat-dot" :style="{ background: c.color }"></span>
            <span class="cat-label">{{ c.label }}</span>
            <span class="cat-amount">{{ formatCurrency(categoryTotals[c.id] || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ TABLE ============ -->
    <div class="panel">
      <h3 class="panel-title"><i class="fa-solid fa-list"></i> Detalle de gastos — {{ selectedMonth }}</h3>
      <div v-if="store.loading" class="loading">Cargando...</div>
      <div v-else-if="monthExpenses.length === 0" class="empty">No hay gastos registrados en este mes.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Responsable</th>
              <th class="r">Monto</th>
              <th>Comprobante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in monthExpenses" :key="e.id">
              <td>{{ formatDate(e.date) }}</td>
              <td>
                <span class="cat-pill" :style="{ background: categoryColor(e.category) + '22', color: categoryColor(e.category) }">
                  {{ categoryLabel(e.category) }}
                </span>
              </td>
              <td>{{ e.description || '—' }}</td>
              <td>{{ e.responsible || '—' }}</td>
              <td class="r mono">{{ formatCurrency(e.amount) }}</td>
              <td>
                <a v-if="e.receiptUrl" :href="e.receiptUrl" target="_blank" class="receipt-link" title="Ver comprobante">
                  <i class="fa-solid fa-paperclip"></i>
                </a>
                <span v-else class="muted">—</span>
              </td>
              <td>
                <button class="btn-del" @click="onDelete(e)" title="Eliminar">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpensesStore } from '../../store/expenses'
import { EXPENSE_CATEGORIES, categoryLabel, categoryColor, CATEGORY_META } from '../../constants/expenseCategories'
import CategoryDonut from '../../components/dashboard/CategoryDonut.vue'

const router = useRouter()
const store = useExpensesStore()

const today = new Date()
const yyyymm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const selectedMonth = ref(yyyymm)

const form = ref({
  date: today.toISOString().slice(0, 10),
  amount: null,
  category: 'otros',
  description: '',
  responsible: ''
})
const selectedFile = ref(null)
const onFile = (e) => { selectedFile.value = e.target.files?.[0] || null }

onMounted(() => store.fetchExpenses())

const monthExpenses = computed(() => store.byMonth(selectedMonth.value))
const categoryTotals = computed(() => store.totalByCategory(selectedMonth.value))
const monthlyTotal = computed(() => store.monthlyTotal(selectedMonth.value))

const donutSegments = computed(() =>
  EXPENSE_CATEGORIES.map(c => ({
    label: c.label,
    value: categoryTotals.value[c.id] || 0,
    color: c.color
  }))
)

async function submit() {
  try {
    if (!form.value.amount || form.value.amount <= 0) return alert('Monto inválido.')
    await store.addExpense(form.value, selectedFile.value)
    // reset
    form.value.amount = null
    form.value.description = ''
    selectedFile.value = null
    // clear file input visually
    const fi = document.querySelector('input[type=file]')
    if (fi) fi.value = ''
  } catch (e) {
    console.error(e); alert('Error al guardar el gasto.')
  }
}

async function onDelete(e) {
  if (!confirm(`¿Eliminar gasto "${e.description || categoryLabel(e.category)}"?`)) return
  try { await store.deleteExpense(e) }
  catch (err) { console.error(err); alert('Error al eliminar.') }
}

const formatCurrency = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0)
const formatDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.75rem; align-items: center; }
.month-input { padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-main); }

.summary-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 1.5rem; }
.sum-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.2rem; display: flex; gap: 1rem; align-items: center; box-shadow: var(--shadow); }
.sum-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.sum-card label { display: block; font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
.sum-card .value { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); margin-bottom: 1.5rem; }
.panel:last-child { margin-bottom: 0; }
.panel-title { margin: 0 0 1rem 0; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main); }

.add-form { display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.add-form input, .add-form select { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.add-form button { background: var(--primary); color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 0.5rem; }
.add-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.file-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

.cat-legend { margin-top: 1rem; display: flex; flex-direction: column; gap: 6px; }
.cat-row { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; }
.cat-dot { width: 10px; height: 10px; border-radius: 50%; }
.cat-label { flex: 1; color: var(--text-main); }
.cat-amount { font-weight: 700; color: var(--text-muted); }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 700px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-size: 0.9rem; }
th { background: var(--bg-app); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.03em; }
.r { text-align: right; }
.mono { font-family: monospace; font-weight: 700; color: var(--primary); }
.cat-pill { padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.receipt-link { color: var(--primary); font-size: 1.1rem; }
.muted { color: var(--text-muted); }
.btn-del { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-del:hover { background: rgba(239,68,68,0.2); }
.empty, .loading { padding: 2rem; text-align: center; color: var(--text-muted); }

@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
  .actions { width: 100%; flex-wrap: wrap; }
  .month-input { flex: 1; min-width: 0; }
  .panel { padding: 1rem; }
  .summary-grid { grid-template-columns: 1fr; gap: 0.6rem; }
  .sum-card { padding: 0.85rem; }
  .sum-card .value { font-size: 1.15rem; }
}
</style>
