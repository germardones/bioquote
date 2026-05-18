<template>
  <div class="container">
    <div class="header">
      <h2>Retiros de Socios</h2>
      <div class="actions">
        <input type="month" v-model="selectedMonth" class="month-input" />
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <!-- Accounting note -->
    <div class="info-note">
      <i class="fa-solid fa-circle-info"></i>
      <div>
        <strong>Los retiros no son gastos operacionales.</strong>
        Son distribución de utilidades o capital. <b>No</b> aparecen en el Estado de Resultados y <b>no</b>
        afectan el margen — pero <b>sí</b> se descuentan del flujo de caja porque salen de la cuenta bancaria.
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-grid">
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(14,165,233,0.12);color:#0ea5e9;"><i class="fa-solid fa-coins"></i></div>
        <div>
          <label>Total del mes</label>
          <span class="value">{{ formatCurrency(monthlyTotal) }}</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6;"><i class="fa-solid fa-receipt"></i></div>
        <div>
          <label>Registros</label>
          <span class="value">{{ monthItems.length }}</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b;"><i class="fa-solid fa-users"></i></div>
        <div>
          <label>Socios con retiros</label>
          <span class="value">{{ Object.keys(perPartner).length }}</span>
        </div>
      </div>
    </div>

    <div v-if="partners.length === 0 && !store.loading" class="empty-partners">
      <i class="fa-solid fa-user-tag"></i>
      <p>No tienes ningún colaborador marcado como socio.</p>
      <button class="btn-primary" @click="router.push('/usuarios')">
        Marcar socios en Colaboradores
      </button>
    </div>

    <div v-else class="two-col">
      <!-- Form -->
      <div class="panel">
        <h3 class="panel-title"><i class="fa-solid fa-plus"></i> Registrar retiro</h3>
        <form @submit.prevent="submit" class="add-form">
          <div class="form-row">
            <label>Fecha</label>
            <input type="date" v-model="form.date" required />
          </div>
          <div class="form-row">
            <label>Socio</label>
            <select v-model="form.partnerId" required>
              <option value="">Selecciona...</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>Tipo</label>
            <select v-model="form.type" required>
              <option v-for="t in WITHDRAWAL_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
            <small class="hint">{{ typeMeta(form.type).description }}</small>
          </div>
          <div class="form-row">
            <label>Monto (CLP)</label>
            <input type="number" v-model.number="form.amount" min="1" required placeholder="Ej: 500000" />
            <small v-if="formError" class="error-hint">{{ formError }}</small>
          </div>
          <div class="form-row">
            <label>Descripción / referencia</label>
            <input type="text" v-model="form.description" placeholder="Ej: Retiro mensual mayo / transferencia 123456" />
          </div>
          <div class="form-row">
            <label>Comprobante (opcional)</label>
            <input type="file" @change="onFile" accept="image/*,application/pdf" />
            <small v-if="selectedFile" class="hint">{{ selectedFile.name }}</small>
          </div>
          <button type="submit" :disabled="store.uploading">
            <i class="fa-solid fa-floppy-disk"></i>
            {{ store.uploading ? 'Subiendo...' : 'Registrar retiro' }}
          </button>
          <div v-if="successMsg" class="success-msg">
            <i class="fa-solid fa-circle-check"></i> {{ successMsg }}
          </div>
        </form>
      </div>

      <!-- Per partner / per type breakdown -->
      <div class="panel">
        <h3 class="panel-title"><i class="fa-solid fa-chart-pie"></i> Resumen del mes</h3>
        <h4 class="subt">Por socio</h4>
        <div v-if="Object.keys(perPartner).length === 0" class="empty-mini">Sin retiros este mes.</div>
        <div v-else class="bd-list">
          <div v-for="(d, id) in perPartner" :key="id" class="bd-row">
            <span>{{ d.name }}</span>
            <span class="amount">{{ formatCurrency(d.amount) }} <small>({{ d.count }})</small></span>
          </div>
        </div>

        <h4 class="subt">Por tipo</h4>
        <div v-if="Object.keys(perType).length === 0" class="empty-mini">—</div>
        <div v-else class="bd-list">
          <div v-for="t in WITHDRAWAL_TYPES" :key="t.id" v-show="perType[t.id]" class="bd-row">
            <span>
              <span class="dot" :style="{ background: t.color }"></span>
              {{ t.label }}
            </span>
            <span class="amount">{{ formatCurrency(perType[t.id] || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-if="partners.length > 0" class="panel">
      <h3 class="panel-title"><i class="fa-solid fa-list"></i> Detalle — {{ selectedMonth }}</h3>
      <div v-if="store.loading" class="loading">Cargando...</div>
      <div v-else-if="monthItems.length === 0" class="empty">No hay retiros en este mes.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Socio</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th class="r">Monto</th>
              <th>Comprobante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in monthItems" :key="w.id">
              <td>{{ formatDate(w.date) }}</td>
              <td>{{ w.partnerName }}</td>
              <td>
                <span class="type-pill" :style="{ background: typeMeta(w.type).color + '22', color: typeMeta(w.type).color }">
                  <i :class="'fa-solid ' + typeMeta(w.type).icon"></i>
                  {{ typeMeta(w.type).label }}
                </span>
              </td>
              <td>{{ w.description || '—' }}</td>
              <td class="r mono">{{ formatCurrency(w.amount) }}</td>
              <td>
                <a v-if="w.receiptUrl" :href="w.receiptUrl" target="_blank" class="receipt-link">
                  <i class="fa-solid fa-paperclip"></i>
                </a>
                <span v-else class="muted">—</span>
              </td>
              <td>
                <button class="btn-del" @click="onDelete(w)" title="Eliminar">
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
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useWithdrawalsStore } from '../../store/withdrawals'
import { WITHDRAWAL_TYPES, withdrawalTypeMeta as typeMeta } from '../../constants/withdrawals'

const router = useRouter()
const store = useWithdrawalsStore()
const partners = ref([])

const today = new Date()
const yyyymm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const selectedMonth = ref(yyyymm)

const form = ref({
  date: today.toISOString().slice(0, 10),
  partnerId: '',
  type: 'utilidades',
  amount: null,
  description: ''
})
const selectedFile = ref(null)
const formError = ref('')
const successMsg = ref('')
const onFile = (e) => { selectedFile.value = e.target.files?.[0] || null }

onMounted(async () => {
  await Promise.all([store.fetchAll(), fetchPartners()])
})

async function fetchPartners() {
  const snap = await getDocs(collection(db, 'workers'))
  partners.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(w => w.esSocio === true)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

const monthItems = computed(() => store.byMonth(selectedMonth.value))
const monthlyTotal = computed(() => store.monthlyTotal(selectedMonth.value))
const perPartner = computed(() => store.totalByPartner(selectedMonth.value))
const perType = computed(() => store.totalByType(selectedMonth.value))

async function submit() {
  formError.value = ''
  if (!form.value.amount || form.value.amount <= 0) {
    formError.value = 'Ingresa un monto mayor a 0.'
    return
  }
  const partner = partners.value.find(p => p.id === form.value.partnerId)
  if (!partner) {
    formError.value = 'Selecciona un socio válido.'
    return
  }
  try {
    await store.addWithdrawal({
      ...form.value,
      partnerName: partner.name
    }, selectedFile.value)
    // Auto-jump month filter to the month of the saved record so the user actually sees it
    const savedMonth = (form.value.date || '').slice(0, 7)
    if (savedMonth && savedMonth !== selectedMonth.value) {
      selectedMonth.value = savedMonth
    }
    successMsg.value = `Retiro de ${formatCurrency(form.value.amount)} registrado para ${partner.name}.`
    setTimeout(() => { successMsg.value = '' }, 4000)
    form.value.amount = null
    form.value.description = ''
    selectedFile.value = null
    const fi = document.querySelector('input[type=file]')
    if (fi) fi.value = ''
  } catch (e) {
    console.error('Error registrando retiro:', e)
    formError.value = `Error al registrar: ${e.message || e}`
  }
}

async function onDelete(w) {
  if (!confirm(`¿Eliminar retiro de ${w.partnerName} por ${formatCurrency(w.amount)}?`)) return
  try { await store.deleteWithdrawal(w) }
  catch (e) { console.error(e); alert('Error al eliminar.') }
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
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.75rem; align-items: center; }
.month-input { padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-main); }

.info-note { display: flex; gap: 0.75rem; align-items: flex-start; padding: 1rem 1.25rem; background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.3); border-radius: 10px; color: var(--text-main); margin-bottom: 1.5rem; font-size: 0.88rem; }
.info-note i { color: #0ea5e9; font-size: 1.2rem; margin-top: 2px; }

.empty-partners { background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: 12px; padding: 3rem; text-align: center; color: var(--text-muted); }
.empty-partners i { font-size: 2.5rem; margin-bottom: 1rem; display: block; color: var(--primary); opacity: 0.4; }
.btn-primary { background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 1rem; }

.summary-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 1.5rem; }
.sum-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.2rem; display: flex; gap: 1rem; align-items: center; box-shadow: var(--shadow); }
.sum-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.sum-card label { display: block; font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
.sum-card .value { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); margin-bottom: 1.5rem; }
.panel:last-child { margin-bottom: 0; }
.panel-title { margin: 0 0 1rem 0; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main); }
.subt { margin: 1rem 0 0.5rem 0; color: var(--text-muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; }

.add-form { display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.add-form input, .add-form select { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.add-form button { background: var(--primary); color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 0.5rem; }
.add-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
.error-hint { font-size: 0.78rem; color: #ef4444; margin-top: 4px; font-weight: 600; }
.success-msg { margin-top: 0.75rem; padding: 10px 12px; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); border-radius: 8px; color: #16a34a; font-size: 0.88rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }

.bd-list { display: flex; flex-direction: column; gap: 8px; }
.bd-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app); border-radius: 6px; }
.bd-row .amount { font-weight: 700; color: var(--text-main); }
.bd-row .amount small { color: var(--text-muted); font-weight: 400; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.empty-mini { color: var(--text-muted); font-style: italic; padding: 8px; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 700px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-size: 0.9rem; }
th { background: var(--bg-app); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; }
.r { text-align: right; }
.mono { font-family: monospace; font-weight: 700; color: #0ea5e9; }
.type-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; }
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
  .info-note { font-size: 0.82rem; padding: 0.75rem; gap: 0.5rem; }
}
</style>
