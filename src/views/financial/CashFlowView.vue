<template>
  <div class="container">
    <div class="header">
      <h2>Flujo de Caja y Gastos Fijos</h2>
      <button @click="router.push('/dashboard')" class="btn-volver">
        Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else>
       <!-- Health traffic light -->
       <div class="health-banner" :class="healthLevel">
         <div class="health-icon"><i :class="healthIcon"></i></div>
         <div class="health-body">
           <strong>{{ healthTitle }}</strong>
           <small>{{ healthDetail }}</small>
         </div>
       </div>

       <div class="cash-flow-summary">
           <div class="cf-card income">
               <div class="cf-icon"><i class="fa-solid fa-money-bill-trend-up"></i></div>
               <div>
                   <label>Ingresos Operativos</label>
                   <span class="value">{{ formatCurrency(kpis.totalCollected) }}</span>
               </div>
           </div>
           <div class="cf-card expense">
               <div class="cf-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
               <div>
                   <label>Egresos Operativos</label>
                   <span class="value">- {{ formatCurrency(kpis.realCost) }}</span>
               </div>
           </div>
           <div class="cf-card expense-fixed">
               <div class="cf-icon"><i class="fa-solid fa-receipt"></i></div>
               <div>
                   <label>Gastos Fijos</label>
                   <span class="value">- {{ formatCurrency(kpis.fixedCost) }}</span>
               </div>
           </div>
           <div class="cf-card withdrawal">
               <div class="cf-icon"><i class="fa-solid fa-piggy-bank"></i></div>
               <div>
                   <label>Retiros de socios</label>
                   <span class="value">- {{ formatCurrency(withdrawalsTotal) }}</span>
               </div>
           </div>
           <div class="cf-card net" :class="{ negative: cashOnHand < 0 }">
               <div class="cf-icon"><i class="fa-solid fa-vault"></i></div>
               <div>
                   <label>Monto en Caja</label>
                   <span class="value">{{ formatCurrency(cashOnHand) }}</span>
               </div>
           </div>
       </div>

       <!-- 30/60/90 day projections -->
       <div class="projection-section">
         <h4>Proyección a 30 / 60 / 90 días</h4>
         <p class="projection-hint">
           Basado en proyectos En Curso (entradas) y gastos fijos mensuales recurrentes (salidas).
           Cotizaciones en negociación se ponderan al 50%.
         </p>
         <div class="projection-grid">
           <div v-for="p in projections" :key="p.days" class="proj-card" :class="{ negative: p.net < 0 }">
             <div class="proj-header">
               <i class="fa-solid fa-calendar-week"></i>
               <span>{{ p.days }} días</span>
             </div>
             <div class="proj-row"><span>+ Ingresos esperados</span><strong class="pos">{{ formatCurrency(p.income) }}</strong></div>
             <div class="proj-row"><span>− Egresos esperados</span><strong class="neg">{{ formatCurrency(p.outflow) }}</strong></div>
             <div class="proj-net">
               <span>Caja proyectada</span>
               <strong>{{ formatCurrency(p.net) }}</strong>
             </div>
           </div>
         </div>
       </div>

       <div class="fixed-expenses-section">
           <h4>Gestión de Gastos Fijos</h4>
           
           <div class="add-expense-form detail-layout">
               <div class="form-row full">
                   <input v-model="newExpense.name" placeholder="Nombre (ej. Arriendo)" class="input-name" />
               </div>
               <div class="form-row">
                   <input v-model.number="newExpense.amount" type="number" placeholder="Monto" class="input-amount" />
                   <select v-model="newExpense.frequency" class="input-freq">
                       <option value="Mensual">Mensual</option>
                       <option value="Anual">Anual</option>
                       <option value="Unico">Único</option>
                   </select>
                   <input v-if="newExpense.frequency === 'Unico'" v-model="newExpense.date" type="date" class="input-date" />
                   <button @click="addFixedExpense" :disabled="!newExpense.name || newExpense.amount <= 0">
                       + Agregar
                   </button>
               </div>
           </div>

           <table class="details-table">
               <thead>
                   <tr>
                       <th>Concepto</th>
                       <th>Frecuencia</th>
                       <th class="text-right">Monto</th>
                       <th>Accion</th>
                   </tr>
               </thead>
               <tbody>
                   <tr v-if="fixedExpensesList.length === 0">
                       <td colspan="4" class="text-center">No hay gastos fijos registrados.</td>
                   </tr>
                   <tr v-for="exp in fixedExpensesList" :key="exp.id">
                       <td>{{ exp.name }}</td>
                       <td data-label="Frecuencia">
                           <span class="badge">{{ exp.frequency }}</span>
                           <small v-if="exp.frequency === 'Unico' && exp.date" class="date-badge">{{ formatDate(exp.date) }}</small>
                       </td>
                       <td class="text-right" data-label="Monto">{{ formatCurrency(exp.amount) }}</td>
                       <td class="text-right" data-label="Acción">
                           <button @click="deleteFixedExpense(exp.id)" class="btn-delete">🗑️</button>
                       </td>
                   </tr>
               </tbody>
           </table>
       </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFinancials } from '../../composables/useFinancials'
import { db, auth } from '../../firebase/firebaseConfig'
import { collection, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore'
import { STATUS } from '../../constants/projectStatus'
import { useWithdrawalsStore } from '../../store/withdrawals'

const router = useRouter()
const { loading, kpis, fixedExpensesList, fetchFinancialData, formatCurrency, formatDate } = useFinancials()
const projectsList = ref([])
const withdrawalsStore = useWithdrawalsStore()
const withdrawalsTotal = computed(() => withdrawalsStore.items.reduce((s, w) => s + Number(w.amount || 0), 0))

async function fetchProjects() {
  const user = auth.currentUser
  if (!user) return
  const snap = await getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid)))
  projectsList.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

const cashOnHand = computed(() => (kpis.value.totalCollected || 0) - (kpis.value.realCost || 0) - (kpis.value.fixedCost || 0) - withdrawalsTotal.value)

const projectTotal = (p) => Number(p?.financials?.quoted_price || 0)
const paidAmount = (p) => (p.payments || []).reduce((s, pay) => s + Number(pay.amount || 0), 0)
const pendingAmount = (p) => Math.max(0, projectTotal(p) - paidAmount(p))

// Income expected per horizon: split pending of active projects evenly across the next 90 days.
// In-negotiation quotes are weighted at 50% likelihood.
const projections = computed(() => {
  const horizons = [30, 60, 90]
  const enCurso = projectsList.value.filter(p => p.status === STATUS.EN_CURSO)
  const inNeg = projectsList.value.filter(p => p.status === STATUS.IN_NEGOTIATION)

  // Pending across the 90-day window
  const enCursoPending90 = enCurso.reduce((s, p) => s + pendingAmount(p), 0)
  const inNegExpected90 = inNeg.reduce((s, p) => s + projectTotal(p), 0) * 0.5

  // Fixed monthly expense flow + assume realCost continues at same monthly burn
  const monthlyFixed = kpis.value.fixedCost || 0
  const monthlyOps = (kpis.value.realCost || 0) // current month-to-date — used as a rough proxy

  return horizons.map(days => {
    const factor = days / 90
    const income = (enCursoPending90 + inNegExpected90) * factor
    const months = days / 30
    const outflow = monthlyFixed * months + monthlyOps * months
    const net = cashOnHand.value + income - outflow
    return { days, income, outflow, net }
  })
})

// Traffic light — considers actual cash and projected outflow buffer
const healthLevel = computed(() => {
  const cash = cashOnHand.value
  const proj90 = projections.value[2]?.net ?? cash
  const monthlyOutflow = (kpis.value.fixedCost || 0) + (kpis.value.realCost || 0)

  // No data yet (no income, no expenses, no projects) → neutral
  const noActivity = (kpis.value.totalCollected || 0) === 0
    && (kpis.value.totalSold || 0) === 0
    && monthlyOutflow === 0
  if (noActivity) return 'neutral'

  // Empty cash today is already risky
  if (cash <= 0) return 'red'
  // Projection turns negative within 90 days
  if (proj90 < 0) return 'red'
  // Cash doesn't cover 1 month of outflows
  if (monthlyOutflow > 0 && cash < monthlyOutflow) return 'yellow'
  // Projection doesn't cover 2 months of outflows
  if (monthlyOutflow > 0 && proj90 < monthlyOutflow * 2) return 'yellow'

  return 'green'
})
const healthIcon = computed(() => ({
  green: 'fa-solid fa-circle-check',
  yellow: 'fa-solid fa-triangle-exclamation',
  red: 'fa-solid fa-circle-exclamation',
  neutral: 'fa-solid fa-circle-info'
}[healthLevel.value]))
const healthTitle = computed(() => ({
  green: 'Salud financiera: saludable',
  yellow: 'Salud financiera: atención',
  red: 'Salud financiera: en riesgo',
  neutral: 'Salud financiera: sin datos suficientes'
}[healthLevel.value]))
const healthDetail = computed(() => ({
  green: 'Tu caja actual cubre tus gastos mensuales y la proyección a 90 días es positiva.',
  yellow: 'Tu caja no cubre todos tus gastos mensuales. Vigila los cobros pendientes.',
  red: cashOnHand.value <= 0
    ? 'Tu caja está en cero o negativa. Acelera recaudación urgente.'
    : 'Tu caja proyectada a 90 días entra en zona negativa. Prioriza recaudación.',
  neutral: 'Aún no registras movimientos. Empieza cargando proyectos, pagos y gastos.'
}[healthLevel.value]))

const newExpense = ref({
    name: '',
    amount: '',
    frequency: 'Mensual',
    date: new Date().toISOString().substr(0, 10)
})

onMounted(() => {
    fetchFinancialData()
    fetchProjects()
    withdrawalsStore.fetchAll()
})

const addFixedExpense = async () => {
    if (!newExpense.value.name || !newExpense.value.amount) return
    try {
        const expenseData = {
            name: newExpense.value.name,
            amount: Number(newExpense.value.amount),
            frequency: newExpense.value.frequency,
            createdAt: new Date().toISOString()
        }
        
        if (newExpense.value.frequency === 'Unico') {
            expenseData.date = newExpense.value.date
        }

        const docRef = await addDoc(collection(db, 'fixed_expenses'), expenseData)
        
        // Optimistic Update
        const expense = { id: docRef.id, ...expenseData }
        fixedExpensesList.value.push(expense)
        kpis.value.fixedCost += expense.amount
        
        newExpense.value = { 
            name: '', 
            amount: '', 
            frequency: 'Mensual',
            date: new Date().toISOString().substr(0, 10)
        }
        alert('Gasto agregado')
    } catch (e) {
        console.error("Error adding expense", e)
    }
}

const deleteFixedExpense = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return
    try {
        await deleteDoc(doc(db, 'fixed_expenses', id))
        
        const expense = fixedExpensesList.value.find(e => e.id === id)
        if (expense) {
            kpis.value.fixedCost -= expense.amount
        }
        
        // Modifying the value from composable ref works because it's a ref
        const index = fixedExpensesList.value.findIndex(e => e.id === id)
        if (index > -1) fixedExpensesList.value.splice(index, 1)
        
    } catch (e) {
        console.error("Error deleting expense", e)
        alert('Error al eliminar gasto')
    }
}
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.cash-flow-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.cf-card { padding: 1.2rem; border-radius: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem; text-align: left; box-shadow: var(--shadow); }
.cf-icon { font-size: 1.2rem; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-app); color: var(--text-muted); transition: all 0.3s; }
.cf-card label { display: block; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
.cf-card .value { font-size: 1.1rem; font-weight: bold; color: var(--text-main); }
.cf-card.income .value { color: #16a34a; }
.cf-card.income .cf-icon { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
.cf-card.expense .value, .cf-card.expense-fixed .value { color: #dc2626; }
.cf-card.expense .cf-icon { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
.cf-card.expense-fixed .cf-icon { background: rgba(249, 115, 22, 0.1); color: #f97316; }
.cf-card.withdrawal .value { color: #0ea5e9; }
.cf-card.withdrawal .cf-icon { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }
.cf-card.net { background: var(--bg-surface); border-color: rgba(124, 58, 237, 0.3); }
.cf-card.net .cf-icon { background: rgba(124, 58, 237, 0.1); color: #7c3aed; }
.cf-card.net .value { color: #7c3aed; }
.cf-card.net.negative { border-color: rgba(225, 29, 72, 0.3); }
.cf-card.net.negative .cf-icon { background: rgba(225, 29, 72, 0.1); color: #e11d48; }
.cf-card.net.negative .value { color: #e11d48; }
.fixed-expenses-section { border-top: 1px solid var(--border-color); padding-top: 1.5rem; background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); }
.add-expense-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1rem; background: var(--bg-app); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); }
.form-row { display: flex; gap: 10px; width: 100%; align-items: center; }
.input-name { width: 100%; }
.input-amount { flex: 1; text-align: right; }
.input-freq { flex: 1; }
.input-date { flex: 1; }
input, select, button { height: 42px; box-sizing: border-box; font-size: 0.95rem; padding: 0 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
button { background: var(--primary); color: white; border: none; padding: 0 1.5rem; cursor: pointer; font-weight: 500; transition: background-color 0.2s; }
button:hover { background: var(--primary-hover); }
button:disabled { background: var(--text-muted); opacity: 0.5; }
.details-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
.text-right { text-align: right; }
.btn-delete { background: none; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer; }
.badge { background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }

/* Health banner */
.health-banner { display: flex; gap: 1rem; align-items: center; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid var(--border-color); }
.health-banner.green   { background: rgba(22,163,74,0.08);  border-color: rgba(22,163,74,0.3);  }
.health-banner.yellow  { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.3); }
.health-banner.red     { background: rgba(239,68,68,0.08);  border-color: rgba(239,68,68,0.35); }
.health-banner.neutral { background: rgba(100,116,139,0.08); border-color: rgba(100,116,139,0.3); }
.health-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1.3rem; }
.health-banner.green   .health-icon { background: rgba(22,163,74,0.15);  color: #16a34a; }
.health-banner.yellow  .health-icon { background: rgba(245,158,11,0.18); color: #d97706; }
.health-banner.red     .health-icon { background: rgba(239,68,68,0.18);  color: #ef4444; }
.health-banner.neutral .health-icon { background: rgba(100,116,139,0.18); color: var(--text-muted); }
.health-body strong { display: block; font-size: 1rem; color: var(--text-main); }
.health-body small { color: var(--text-muted); font-size: 0.85rem; }

/* Projection */
.projection-section { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); margin-bottom: 2rem; }
.projection-section h4 { margin: 0 0 4px 0; color: var(--text-main); }
.projection-hint { margin: 0 0 1rem 0; color: var(--text-muted); font-size: 0.85rem; }
.projection-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.proj-card { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; border-left: 4px solid var(--primary); }
.proj-card.negative { border-left-color: #ef4444; }
.proj-header { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem; }
.proj-row { display: flex; justify-content: space-between; font-size: 0.88rem; padding: 4px 0; color: var(--text-muted); }
.proj-row .pos { color: #16a34a; font-family: monospace; }
.proj-row .neg { color: #ef4444; font-family: monospace; }
.proj-net { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); font-weight: 700; }
.proj-net strong { font-family: monospace; color: var(--primary); }
.proj-card.negative .proj-net strong { color: #ef4444; }

@media (max-width: 900px) {
  .projection-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
  .cash-flow-summary { grid-template-columns: 1fr; gap: 0.6rem; }
  .cf-card { padding: 0.85rem; }
  .cf-card .value { font-size: 0.95rem; }
  .health-banner { padding: 0.85rem; gap: 0.6rem; }
  .health-body strong { font-size: 0.9rem; }
  .health-body small { font-size: 0.78rem; }
  .projection-section { padding: 1rem; }
  .fixed-expenses-section { padding: 1rem; }
}

@media (max-width: 640px) {
  .container { padding: 1rem; }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  /* Stack form rows */
  .add-expense-form {
      gap: 1rem;
  }

  .form-row {
      flex-direction: column;
      align-items: stretch;
  }

  .input-amount, .input-freq, .input-date {
      width: 100%;
      text-align: left;
  }

  /* Table to Cards */
  .details-table, .details-table thead, .details-table tbody, .details-table th, .details-table td, .details-table tr {
    display: block;
    width: 100%;
  }

  .details-table thead { display: none; }

  .details-table tr {
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    background: var(--bg-surface);
  }

  .details-table td {
    border: none;
    padding: 0.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: right;
  }
  
  .details-table td:first-child {
      justify-content: flex-start;
      font-weight: bold;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
  }

  .details-table td:before {
    content: attr(data-label); /* Requires adding data-label to template */
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: left;
  }
  
  .details-table td:first-child:before { display: none; }
}
</style>
