<template>
  <div class="container">
    <div class="header">
      <h2>Seguimiento de Pagos</h2>
      <button @click="router.back()" class="btn-volver" :disabled="loading">
         Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando proyectos...</div>

    <div v-else class="content">
      <div v-if="projects.length === 0" class="empty-state">
        <p>No hay proyectos aprobados pendientes de cobro.</p>
      </div>

      <div v-else class="projects-grid">
        <div v-for="p in projects" :key="p.id" class="project-card">
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
                     <span v-if="p.totalValue > 0 && (p.totalValue - p.paidAmount) <= 0" class="badge-paid">
                        ✅ Pagado
                     </span>
                     <span v-else-if="p.totalValue === 0" class="badge-warning">
                        ⚠️ Sin Valor
                     </span>
                     <span v-else class="amount pending">{{ formatCurrency(p.totalValue - p.paidAmount) }}</span>
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
              <button class="btn-history" @click="toggleHistory(p)">
                  {{ p.showHistory ? 'Ocultar Historial' : 'Ver Historial' }}
              </button>
          </div>

          <!-- Payment History Dropdown -->
          <div v-if="p.showHistory" class="payment-history">
              <h4>Historial de Pagos</h4>
              <ul v-if="p.payments && p.payments.length > 0">
                  <li v-for="(pay, idx) in p.payments" :key="idx">
                      <span>{{ formatDate(pay.date) }}</span>
                      <span>{{ pay.note }}</span>
                      <span class="history-amount">{{ formatCurrency(pay.amount) }}</span>
                  </li>
              </ul>
              <p v-else class="no-history">Sin pagos registrados.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Register Payment -->
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore'

const router = useRouter()
const projects = ref([])
const loading = ref(true)

// Modal State
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

onMounted(async () => {
    await fetchProjects()
})

const fetchProjects = async () => {
    try {
        const user = auth.currentUser
        if (!user) return

        const q = query(
            collection(db, 'projects'),
            where('owner_uid', '==', user.uid)
        )
        const snap = await getDocs(q)
        
        // Filter logic: Approved, Active, Completed.
        // We calculate total value from quotation items if not explicitly set.
        const raw = snap.docs.map(d => {
            const data = d.data()
            const total = calculateProjectTotal(data)
            
            // Calculate paid amount
            const payments = data.payments || []
            const paid = payments.reduce((acc, curr) => acc + Number(curr.amount), 0)

            return {
                id: d.id,
                codigo: d.id.substring(0, 8).toUpperCase(),
                ...data,
                totalValue: total,
                paidAmount: paid,
                payments: payments,
                showHistory: false
            }
        })

        // Filter: only those with status that implies "Sales"
        projects.value = raw.filter(p => ['Approved', 'En Curso', 'Completed'].includes(p.status))

    } catch (e) {
        console.error("Error fetching projects", e)
    } finally {
        loading.value = false
    }
}

const calculateProjectTotal = (data) => {
    // Ideally this should be saved in the project doc when created/approved
    // But we fall back to recalculating from items
    if (data.totalValue) return Number(data.totalValue)
    
    // Fallback logic similar to quotation store
    // Check if it has items
    const items = data.items || [] // Custom items
    // ... Simplified calculation assuming "total" is stored or we sum custom items
    // If we can't calculate, return 0 (should be handled in quotation approval)
    // For now, let's assume 'items' have a 'total' or we sum them
    
    // Simplest approach: Use stored Total if available (from quotation view)
    // If not, sum custom items
    let sum = 0
    items.forEach(i => {
        if (i.pricingMethod === 'fixed') sum += Number(i.fixedValue) || 0
        else sum += (Number(i.hours)*Number(i.rate || 25000)) // Fallback rate
    })
    
    // If parametric
    if (data.type === 'parametric' && data.specs) {
        // We might need to re-calculate using the same logic as store...
        // For this MVP, let's assume project docs have a 'total_clp' or similar field saved
        // If not, we should update the "Approve" logic to save it.
        // Let's check if 'total' exists on data
        if (data.total) return Number(data.total)
    }
    
    return sum || data.total || 0
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
            date: new Date(form.value.date).toISOString(), // Store as ISO
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
        
        // Update local state
        selectedProject.value.payments.push(payment)
        selectedProject.value.paidAmount += payment.amount
        
        closeModal()
        alert('Pago registrado exitosamente')

    } catch (e) {
        console.error("Payment error", e)
        alert("Error al registrar pago")
    }
}

const toggleHistory = (p) => {
    p.showHistory = !p.showHistory
}

const getPaymentProgress = (p) => {
    if (p.totalValue === 0) return 0
    return Math.min(100, (p.paidAmount / p.totalValue) * 100)
}

const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0)
}

const formatDate = (isoStr) => {
    if (!isoStr) return '-'
    // Handle both ISO string and Firestore Timestamp if needed
    const date = new Date(isoStr)
    return new Intl.DateTimeFormat('es-CL').format(date)
}

</script>

<style scoped>
.container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.projects-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.project-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    border: 1px solid #eee;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
}

.code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: monospace;
    color: #555;
}

.project-card h3 {
    margin: 0.5rem 0 0.2rem 0;
    font-size: 1.2rem;
}

.client {
    color: #666;
    font-size: 0.95rem;
}

.total-badge {
    text-align: right;
    background: #eef2ff;
    padding: 8px 12px;
    border-radius: 8px;
    color: #3730a3;
}

.total-badge div {
    font-size: 1.2rem;
    font-weight: bold;
}

.progress-payment {
    margin-bottom: 1.5rem;
}

.payment-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.stat {
    display: flex;
    flex-direction: column;
}

.amount { font-weight: bold; font-size: 1.1rem; }
.amount.paid { color: #16a34a; }
.amount.pending { color: #dc2626; }

.progress-bar-bg {
    height: 10px;
    background: #f3f4f6;
    border-radius: 5px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #16a34a);
    transition: width 0.5s ease;
}

.actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.btn-payment {
    background: var(--primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
}

.btn-history {
    background: white;
    border: 1px solid #ddd;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
}

.payment-history {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    background: #fafafa;
    padding: 1rem;
    border-radius: 6px;
}

.payment-history h4 { margin-top: 0; }
.payment-history ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.payment-history li {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eaeaea;
}
.history-amount { font-weight: bold; }

.badge-paid {
    background: #dcfce7;
    color: #16a34a;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.9rem;
}

.badge-warning {
    background: #fefce8;
    color: #ca8a04;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.9rem;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
}

.modal {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    width: 400px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.modal-subtitle {
    color: #666;
    margin-bottom: 1.5rem;
}

.form-group {
    margin-bottom: 1.2rem;
}
.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}
.form-row {
    display: flex;
    gap: 1rem;
}
.form-group.half {
    flex: 1;
}
.form-group input, .form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

.btn-save {
    background: var(--primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
}

.btn-cancel {
    background: white;
    border: 1px solid #ccc;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
}
</style>
