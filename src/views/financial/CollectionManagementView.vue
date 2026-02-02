<template>
  <div class="container">
    <div class="header">
      <h2>Gestión de Cobros</h2>
      <button @click="router.push('/dashboard')" class="btn-volver">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else>
        <!-- Summary Card -->
        <div class="summary-card green">
            <div class="card-icon"><i class="fa-solid fa-money-bill-trend-up"></i></div>
            <div class="info">
                <label>Recaudado (Cash)</label>
                <span class="value">{{ formatCurrency(kpis.totalCollected) }}</span>
                 <div class="progress-mini">
                    <div class="fill" :style="{ width: getCollectionRate() + '%' }"></div>
                </div>
            </div>
        </div>

        <div class="payment-management-view">
             <div class="pending-summary">
                <span>Total Por Cobrar: </span>
                <span class="amount pending">{{ formatCurrency(kpis.totalPending) }}</span>
            </div>

             <div v-if="detailData.sales.length === 0" class="empty-state">
                <p>No hay proyectos activos.</p>
            </div>
       
            <div v-else class="projects-grid">
                <div v-for="p in detailData.sales" :key="p.id" class="project-card">
                <div class="card-header">
                    <div>
                        <span class="code">{{ p.codigo }}</span>
                        <h3>{{ p.name }}</h3>
                        <span class="client">{{ p.client_name }}</span>
                    </div>
                    <div class="total-badge">
                        <small>Total Contrato</small>
                        <div>{{ formatCurrency(p.totalValue) }}</div>
                    </div>
                </div>
        
                <div class="progress-payment">
                    <div class="payment-stats">
                        <div class="stat">
                            <span>Pagado</span>
                            <span class="amount paid">{{ formatCurrency(p.paidAmount) }}</span>
                        </div>
                        <div class="stat">
                            <span>Pendiente</span>
                            <span class="amount pending">{{ formatCurrency(p.totalValue - p.paidAmount) }}</span>
                        </div>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" :style="{ width: getPaymentProgress(p) + '%' }"></div>
                    </div>
                </div>
        
                <div class="actions">
                    <button class="btn-payment" @click="openPaymentModal(p)">
                        💰 Registrar Pago
                    </button>
                </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
            <h3>Registrar Pago</h3>
            <p class="modal-subtitle">{{ selectedProject?.name }}</p>
            
            <form @submit.prevent="registerPayment">
                <div class="form-group">
                    <label>Monto</label>
                    <input v-model.number="form.amount" type="number" required min="1" :max="availableToPay" />
                    <small>Pendiente: {{ formatCurrency(availableToPay) }}</small>
                </div>
                <div class="form-group">
                    <label>Fecha</label>
                    <input v-model="form.date" type="date" required />
                </div>
                <div class="form-group">
                    <label>Pagado Por (Nombre)</label>
                    <input v-model="form.payerName" type="text" placeholder="Ej. Juan Pérez" />
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label>Medio de Pago</label>
                        <select v-model="form.paymentMethod">
                            <option value="Transferencia">Transferencia</option>
                            <option value="Efectivo">Efectivo</option>
                        </select>
                    </div>
                    <div class="form-group half">
                        <label>Cuenta Destino</label>
                        <select v-model="form.targetAccount">
                            <option value="Santander">Santander</option>
                            <option value="Mercado Pago">Mercado Pago</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Nota / Comprobante</label>
                    <input v-model="form.note" type="text" placeholder="Ej. Anticipo 50%" />
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
                    <button type="submit" class="btn-save">Guardar Pago</button>
                </div>
            </form>
        </div>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFinancials } from '../../composables/useFinancials'
import { db } from '../../firebase/firebaseConfig'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'

const router = useRouter()
const { loading, kpis, detailData, fetchFinancialData, formatCurrency } = useFinancials()

// Modal Logic
const showModal = ref(false)
const selectedProject = ref(null)
const form = ref({
    amount: 0,
    date: new Date().toISOString().substr(0, 10),
    note: '',
    payerName: '',
    paymentMethod: 'Transferencia',
    targetAccount: 'Santander'
})

onMounted(() => {
    fetchFinancialData()
})

const getCollectionRate = () => {
    if (kpis.value.totalSold === 0) return 0
    return (kpis.value.totalCollected / kpis.value.totalSold) * 100
}

const getPaymentProgress = (p) => {
    if (p.totalValue === 0) return 0
    return Math.min(100, (p.paidAmount / p.totalValue) * 100)
}

const openPaymentModal = (p) => {
    selectedProject.value = p
    form.value.amount = 0
    form.value.note = ''
    form.value.payerName = ''
    form.value.paymentMethod = 'Transferencia'
    form.value.targetAccount = 'Santander'
    form.value.date = new Date().toISOString().substr(0, 10)
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    selectedProject.value = null
}

const availableToPay = computed(() => {
    if (!selectedProject.value) return 0
    return selectedProject.value.totalValue - selectedProject.value.paidAmount
})

const registerPayment = async () => {
    if (form.value.amount <= 0) return
    if (!selectedProject.value) return

    try {
        const payment = {
            amount: form.value.amount,
            date: new Date(form.value.date).toISOString(), 
            note: form.value.note,
            payerName: form.value.payerName,
            paymentMethod: form.value.paymentMethod,
            targetAccount: form.value.targetAccount,
            recordedAt: new Date().toISOString()
        }

        const pRef = doc(db, 'projects', selectedProject.value.id)
        await updateDoc(pRef, {
            payments: arrayUnion(payment)
        })
        
        // Update local state (Optimistic)
        if (!selectedProject.value.payments) selectedProject.value.payments = []
        selectedProject.value.payments.push(payment)
        selectedProject.value.paidAmount += payment.amount
        
        kpis.value.totalCollected += payment.amount
        kpis.value.totalPending -= payment.amount

        closeModal()
        alert('Pago registrado exitosamente')

    } catch (e) {
        console.error("Payment error", e)
        alert("Error al registrar pago")
    }
}
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.summary-card { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 1rem; border-left: 5px solid #22c55e; margin-bottom: 2rem; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.card-icon { font-size: 1.4rem; background: var(--bg-app); color: var(--text-muted); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
.info { display: flex; flex-direction: column; }
.value { font-size: 1.5rem; font-weight: bold; color: var(--text-main); }
.progress-mini { height: 4px; background: var(--border-color); margin-top: 8px; border-radius: 2px; width: 100px; }
.progress-mini .fill { height: 100%; background: #22c55e; }

.pending-summary { background: rgba(220, 38, 38, 0.1); color: #dc2626; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 1.2rem; font-weight: bold; border: 1px solid rgba(220, 38, 38, 0.2); display: inline-block; }
.projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
.project-card { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); border: 1px solid var(--border-color); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.project-card h3 { margin: 0.5rem 0 0.2rem 0; font-size: 1.1rem; color: var(--text-main); }
.client { color: var(--text-muted); font-size: 0.9rem; }
.total-badge { text-align: right; background: rgba(59, 130, 246, 0.1); padding: 6px 10px; border-radius: 8px; color: #3b82f6; }
.total-badge div { font-size: 1.1rem; font-weight: bold; }
.payment-stats { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem; }
.amount { font-weight: bold; }
.amount.paid { color: #16a34a; }
.amount.pending { color: #dc2626; }
.progress-bar-bg { height: 8px; background: var(--bg-app); border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #4ade80, #16a34a); transition: width 0.5s ease; }
.btn-payment { width: 100%; background: #22c55e; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999; }
.modal { background: var(--bg-surface); padding: 2rem; border-radius: 12px; width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); }
.modal-subtitle { color: var(--text-muted); margin-bottom: 1.5rem; }
.form-group { margin-bottom: 1.2rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-main); }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 1rem; background: var(--input-bg); color: var(--text-main); }
.form-row { display: flex; gap: 1rem; }
.form-group.half { flex: 1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.btn-save { background: #22c55e; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-cancel { background: var(--bg-app); border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 6px; cursor: pointer; color: var(--text-muted); }
.code { font-family: monospace; background: var(--bg-app); padding: 2px 6px; border-radius: 4px; color: var(--text-muted); }
</style>
