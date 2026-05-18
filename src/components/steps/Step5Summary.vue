<template>
  <div class="container">
    <div class="header">
      <h2>Resumen de Proyecto</h2>
      <span v-if="store.codigo" class="codigo-cotizacion">ID: {{ store.codigo }}</span>
    </div>

    <!-- View mode toggle -->
    <div class="view-mode-bar">
      <span class="vm-label">Vista:</span>
      <div class="vm-toggle">
        <button :class="{ active: viewMode === 'client' }" @click="viewMode = 'client'">
          <i class="fa-solid fa-user-tie"></i> Cliente
        </button>
        <button :class="{ active: viewMode === 'internal' }" @click="viewMode = 'internal'">
          <i class="fa-solid fa-user-shield"></i> Interno
        </button>
      </div>
      <span class="vm-hint">
        {{ viewMode === 'client' ? 'Solo se ven datos compartibles con el cliente.' : 'Muestra costos internos y margen (información sensible).' }}
      </span>
    </div>

    <div v-if="store.cliente" class="card resumen">
      <h3>Datos del Cliente</h3>
      <p><strong>Nombre:</strong> {{ store.cliente.nombre }}</p>
      <p><strong>Razón Social:</strong> {{ store.cliente.razonSocial }}</p>
      <p><strong>RUT:</strong> {{ store.cliente.rut }}</p>
      <p><strong>Email:</strong> {{ store.cliente.email }}</p>

      <hr />

      <div v-if="store.type === 'custom'">
        <h3>Ítems de Cotización</h3>
        <div class="custom-items-summary">
            <div v-for="item in store.customItems" :key="item.id" class="summary-item">
                <div class="summary-item-desc">
                    <strong>{{ item.description }}</strong>
                    <span v-if="item.pricingMethod === 'fixed'" class="badge-fixed-sm">Fijo</span>
                    <span v-if="item.observation" class="summary-obs">({{ item.observation }})</span>
                </div>
                <div class="summary-item-vals">
                    <template v-if="item.pricingMethod === 'fixed'">
                        <span v-if="item.hours > 0" class="mini-hours">{{ item.hours }}h est.</span>
                        <strong>${{ (item.fixedValue || 0).toLocaleString() }}</strong>
                    </template>
                    <template v-else>
                        {{ item.hours }}h x ${{ item.rate?.toLocaleString() }} = <strong>${{ (item.hours * item.rate).toLocaleString() }}</strong>
                    </template>
                </div>
            </div>
        </div>
      </div>

      <div v-else>
        <h3>Especificaciones Técnicas</h3>
        <div class="specs-grid">
            <div class="spec-item">
            <span class="label">Entidades:</span>
            <span class="value">{{ store.specs.entidades }}</span>
            </div>
            <div class="spec-item">
            <span class="label">Roles:</span>
            <span class="value">{{ store.specs.roles }}</span>
            </div>
            <div class="spec-item">
            <span class="label">Vistas:</span>
            <span class="value">{{ store.specs.vistas }}</span>
            </div>
            <div class="spec-item">
            <span class="label">APIs:</span>
            <span class="value">{{ store.specs.apis }}</span>
            </div>
            <div class="spec-item">
            <span class="label">Complejidad:</span>
            <span class="value">{{ store.specs.complejidad }}x</span>
            </div>
        </div>
      </div>

      <hr />

      <h3>Evaluación Financiera</h3>
      <div class="financials-grid">
        <div class="fin-item">
          <span>Horas Estimadas:</span>
          <strong>{{ store.financials.horasMercado }} h</strong>
        </div>
        <div v-if="viewMode === 'internal'" class="fin-item">
          <span>Horas Reales (con Antigravity):</span>
          <strong>{{ store.financials.horasReales }} h</strong>
        </div>
        <div v-if="viewMode === 'internal'" class="fin-item highlight">
          <span>Costo Interno:</span>
          <strong>${{ store.financials.costoInterno.toLocaleString() }}</strong>
        </div>
        <div v-if="viewMode === 'internal'" class="fin-item highlight">
          <span>Margen Proyectado:</span>
          <strong>
            ${{ store.financials.margen.toLocaleString() }}
            <small>({{ store.financials.margenPorcentaje ?? 0 }}%)</small>
          </strong>
        </div>
      </div>

      <!-- DISCOUNT SECTION -->
      <div class="discount-section">
          <label>Aplicar Descuento:</label>
          <select v-model="selectedDiscountId" @change="applyDiscount">
              <option :value="null">Sin Descuento</option>
              <option v-for="d in activeDiscounts" :key="d.id" :value="d.id">
                  {{ d.label }} ({{ d.value }}%)
              </option>
          </select>
      </div>

      <!-- Validity -->
      <div class="meta-section">
        <div class="meta-field">
          <label><i class="fa-solid fa-calendar-xmark"></i> Validez de la cotización</label>
          <input type="date" v-model="store.validUntil" />
          <small>El cliente verá esta fecha en el PDF. Por default +30 días.</small>
        </div>
      </div>

      <!-- Payment plan editor -->
      <div class="payment-plan-section">
        <h3><i class="fa-solid fa-money-check-dollar"></i> Plan de pago</h3>
        <p class="hint-text">
          Define cómo se cobra la cotización. La suma de porcentajes debería ser 100%.
          <strong :class="planSumClass">Suma actual: {{ planSum }}%</strong>
        </p>
        <div v-for="(p, i) in store.paymentPlan" :key="p.id" class="pp-row">
          <input v-model="p.label" placeholder="Anticipo / Hito X / Entrega final" class="pp-label" />
          <div class="pp-pct">
            <input type="number" v-model.number="p.percentage" min="0" max="100" />
            <span>%</span>
          </div>
          <span class="pp-amount">${{ Math.round(store.financials.precioSugerido * (p.percentage || 0) / 100).toLocaleString() }}</span>
          <input type="date" v-model="p.dueDate" class="pp-date" :title="'Fecha estimada (opcional)'" />
          <button class="pp-remove" @click="removePaymentStep(i)" title="Quitar">×</button>
        </div>
        <button class="pp-add" @click="addPaymentStep">+ Agregar pago</button>
      </div>

      <div class="total-section">
        <h3>{{ viewMode === 'client' ? 'Precio Total' : 'Precio Sugerido (Venta)' }}</h3>

        <!-- Breakdown only in internal mode -->
        <div v-if="viewMode === 'internal'" class="financials-breakdown">
             <div class="breakdown-row">
                <span>Calculado ({{ store.financials.horasMercado }}h):</span>
                <span>${{ (store.financials.valorBasePuro || 0).toLocaleString() }}</span>
             </div>
             <div class="breakdown-row highlight-warn">
                <span>+ Factor Seguridad (20%):</span>
                <span>${{ (store.financials.montoSeguridad || 0).toLocaleString() }}</span>
             </div>
             <div v-if="store.financials.montoDescuento > 0" class="breakdown-row highlight-danger">
                <span>- Descuento:</span>
                <span>${{ store.financials.montoDescuento.toLocaleString() }}</span>
             </div>
        </div>

        <div v-if="viewMode === 'internal'" class="divider"></div>

        <p class="total-price">${{ store.financials.precioSugerido.toLocaleString() }}</p>
        <p class="disclaimer">+ IVA</p>
      </div>

    </div>

    <div class="btn-group">
      <button class="guardar-btn" @click="guardarProyecto" :disabled="cargando">
        <i class="fa-solid fa-floppy-disk"></i>
        {{ store.editingProjectId ? 'Actualizar' : 'Guardar' }}
      </button>

      <button v-if="store.editingProjectId" class="send-btn" @click="enviarAlCliente" :disabled="cargando || sending">
        <i class="fa-solid fa-paper-plane"></i>
        {{ sending ? 'Enviando...' : 'Enviar al cliente' }}
      </button>

      <button class="volver-btn" @click="volverADashboard" :disabled="cargando">
        🔙 Volver
      </button>
    </div>

    <div v-if="feedback" class="feedback" :class="feedback.type">
      <i :class="feedback.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
      {{ feedback.text }}
    </div>

    <div v-if="cargando" class="overlay-carga">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from "../../store/quotation";
import { useRouter, useRoute } from "vue-router";
import { db, auth } from "../../firebase/firebaseConfig";
import { collection, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useSettings } from '../../composables/useSettings'
import { ref, onMounted, computed, watch } from "vue";

const store = useQuotationStore();
const router = useRouter();
const route = useRoute();
const cargando = ref(false);
const sending = ref(false);
const feedback = ref(null);
const viewMode = ref('client'); // 'client' | 'internal'
const { settings, fetchSettings } = useSettings()

const activeDiscounts = computed(() => settings.value.discounts || [])
const selectedDiscountId = ref(null)

onMounted(async () => {
    await fetchSettings()
    if (store.selectedDiscount) {
        selectedDiscountId.value = store.selectedDiscount.id
    }
    if (!store.validUntil) {
      const d = new Date(); d.setDate(d.getDate() + 30)
      store.validUntil = d.toISOString().slice(0, 10)
    }
    if (!store.paymentPlan || store.paymentPlan.length === 0) {
      store.paymentPlan = [
        { id: '1', label: 'Anticipo al firmar', percentage: 50, dueDate: '', paid: false },
        { id: '2', label: 'Contra entrega',     percentage: 50, dueDate: '', paid: false }
      ]
    }
})

// Payment plan helpers
const planSum = computed(() =>
  (store.paymentPlan || []).reduce((s, p) => s + (Number(p.percentage) || 0), 0)
)
const planSumClass = computed(() => planSum.value === 100 ? 'ok' : 'warn')

const addPaymentStep = () => {
  store.paymentPlan.push({
    id: String(Date.now()),
    label: '',
    percentage: 0,
    dueDate: '',
    paid: false
  })
}
const removePaymentStep = (i) => {
  if (store.paymentPlan.length === 1) return
  store.paymentPlan.splice(i, 1)
}

const applyDiscount = () => {
    if (!selectedDiscountId.value) {
        store.setDiscount(null)
    } else {
        const disc = activeDiscounts.value.find(d => d.id === selectedDiscountId.value)
        store.setDiscount(disc)
    }
}

// Build payload from current store state
function buildProjectPayload(user) {
  return {
    client_name: store.cliente.nombre,
    name: `Proyecto para ${store.cliente.nombre}`,
    owner_uid: user.uid,
    sales_rep_name: user.displayName || user.email,

    client_data: {
      ...store.cliente,
      observacion: store.selectedDiscount
        ? `Aplicado: ${store.selectedDiscount.label} (${store.selectedDiscount.value}%)`
        : ''
    },

    specs: {
      type: store.type,
      custom_items: store.customItems || [],
      entity_count: store.specs.entidades,
      role_count: store.specs.roles,
      view_count: store.specs.vistas,
      api_count: store.specs.apis,
      complexity: store.specs.complejidad,
      scope: {
        included: store.scopeOfService || '',
        excluded: store.exclusions || ''
      }
    },

    financials: {
      estimated_hours_market: store.financials.horasMercado,
      estimated_hours_real: store.financials.horasReales,
      quoted_price: store.financials.precioSugerido,
      discount_amount: store.financials.montoDescuento || 0,
      discount_applied: store.financials.descuentoAplicado || null,
      internal_cost: store.financials.costoInterno,
      projected_margin: store.financials.margen
    },

    paymentPlan: store.paymentPlan,
    validUntil: store.validUntil,
    updated_at: serverTimestamp()
  }
}

const guardarProyecto = async () => {
  feedback.value = null
  try {
    const user = auth.currentUser
    if (!user) { feedback.value = { type: 'error', text: 'Usuario no autenticado.' }; return }

    cargando.value = true
    const payload = buildProjectPayload(user)

    if (store.editingProjectId) {
      // UPDATE: append a version snapshot when price changes
      const refDoc = doc(db, 'projects', store.editingProjectId)
      const versionEntry = {
        at: new Date().toISOString(),
        by: user.email || user.uid,
        price: payload.financials.quoted_price,
        hours: payload.financials.estimated_hours_market,
        note: 'Edición desde wizard'
      }
      await updateDoc(refDoc, {
        ...payload,
        versions: arrayUnion(versionEntry),
        history: arrayUnion({
          at: new Date().toISOString(),
          by: user.email || user.uid,
          from: null,
          to: 'Editado'
        })
      })
      feedback.value = { type: 'success', text: 'Cotización actualizada correctamente.' }
    } else {
      // CREATE
      const newDoc = {
        ...payload,
        status: 'Draft',
        milestones: [],
        versions: [],
        history: [{
          at: new Date().toISOString(),
          by: user.email || user.uid,
          from: null,
          to: 'Draft'
        }],
        created_at: serverTimestamp()
      }
      const docRef = await addDoc(collection(db, 'projects'), newDoc)
      store.codigo = docRef.id
      store.editingProjectId = docRef.id
      feedback.value = { type: 'success', text: 'Cotización guardada. Ahora puedes enviarla al cliente.' }
    }
  } catch (err) {
    console.error('Error al guardar proyecto', err)
    feedback.value = { type: 'error', text: `Error al guardar: ${err.message || err}` }
  } finally {
    cargando.value = false
  }
}

// Enviar al cliente: marca status Sent + abre cliente de email pre-llenado.
// (El PDF se descarga aparte desde la vista de impresión para que lo adjunten manualmente.
// Si más adelante quieres adjunto automático, el endpoint /api/send-quote ya lo soporta.)
const enviarAlCliente = async () => {
  if (!store.editingProjectId) {
    feedback.value = { type: 'error', text: 'Primero guarda la cotización.' }; return
  }
  const email = store.cliente.email
  if (!email) {
    feedback.value = { type: 'error', text: 'Falta el email del cliente. Edita los datos del cliente.' }; return
  }
  if (!confirm(`Enviar cotización a ${email}?\nSe abrirá tu cliente de correo y se marcará como "Enviada".`)) return

  sending.value = true
  try {
    const user = auth.currentUser
    const refDoc = doc(db, 'projects', store.editingProjectId)
    await updateDoc(refDoc, {
      status: 'Sent',
      sentAt: serverTimestamp(),
      updated_at: serverTimestamp(),
      history: arrayUnion({
        at: new Date().toISOString(),
        by: user.email || user.uid,
        from: 'Draft',
        to: 'Sent'
      })
    })

    // Open mail client (PDF is downloaded separately from PrintView)
    const subject = encodeURIComponent(`Cotización ${store.codigo} - BioBio Code`)
    const body = encodeURIComponent(
`Estimad@ ${store.cliente.nombre},

Adjunto la cotización solicitada.

Resumen:
- Servicio: ${store.cliente.servicioDeseado || 'desarrollo de software'}
- Total: $${store.financials.precioSugerido.toLocaleString('es-CL')} CLP + IVA
- Validez: hasta ${store.validUntil}

Quedo atento a tus comentarios.

Saludos,
${user.displayName || user.email}
BioBio Code`)
    window.open(`mailto:${email}?subject=${subject}&body=${body}`)

    feedback.value = { type: 'success', text: 'Estado actualizado a "Enviada". Se abrió tu cliente de correo.' }
  } catch (e) {
    console.error(e)
    feedback.value = { type: 'error', text: `Error al enviar: ${e.message || e}` }
  } finally {
    sending.value = false
  }
}

const volverADashboard = () => {
  if (confirm("¿Estás seguro de salir? Se perderán los datos no guardados.")) {
    store.reset();
    router.push("/dashboard");
  }
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.codigo-cotizacion {
  font-weight: bold;
  color: var(--text-muted);
}

.card.resumen {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: var(--shadow);
}

h3 {
  color: var(--primary);
  margin-top: 0;
  font-size: 1.1rem;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.spec-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-app);
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.spec-item .label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 4px;
}

.spec-item .value {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
}

.financials-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.fin-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
  color: var(--text-main);
}

.fin-item span {
    color: var(--text-muted);
}

.fin-item strong {
    color: var(--text-main);
}

.fin-item.highlight strong {
  color: var(--primary);
}

.total-section {
  text-align: right;
  background: rgba(0, 131, 102, 0.1);
  padding: 2rem;
  border-radius: 16px;
  margin-top: 2.5rem;
  border: 1px solid rgba(0, 131, 102, 0.2);
}

.total-price {
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--primary);
  margin: 0;
}

.disclaimer {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  font-weight: 600;
}

.btn-group {
  display: flex;
  gap: 1.25rem;
  margin-top: 2.5rem;
}

.guardar-btn, .volver-btn {
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  flex: 1;
  transition: all 0.2s;
}

.guardar-btn {
  background-color: var(--primary);
  color: white;
}

.guardar-btn:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}

.volver-btn {
  background-color: var(--bg-app);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.volver-btn:hover {
    background-color: var(--bg-surface);
}

.overlay-carga {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-surface);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.badge-fixed-sm {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-left: 0.6rem;
    vertical-align: middle;
}

.mini-hours {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .card.resumen {
    padding: 1.5rem 1rem;
  }

  .financials-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .btn-group {
    flex-direction: column;
  }
  
  .specs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .total-price {
    font-size: 2rem;
  }
}

.discount-section {
    background: var(--bg-app);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px dashed var(--border-color);
}
.discount-section label {
    font-weight: 700;
    color: var(--text-main);
}
.discount-section select {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-main);
    flex-grow: 1;
    max-width: 300px;
    font-weight: 600;
}

.discount-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-bottom: 0.5rem;
}
.original-price {
    text-decoration: line-through;
    color: var(--text-muted);
    font-size: 1.1rem;
}
.discount-tag {
    color: #ef4444;
    font-weight: 700;
    font-size: 1.2rem;
}

/* View mode toggle */
.view-mode-bar { display: flex; align-items: center; gap: 12px; padding: 0.6rem 0.85rem; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; flex-wrap: wrap; }
.vm-label { font-weight: 700; color: var(--text-muted); font-size: 0.82rem; }
.vm-toggle { display: inline-flex; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px; }
.vm-toggle button { background: transparent; border: none; padding: 6px 12px; color: var(--text-muted); cursor: pointer; border-radius: 6px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
.vm-toggle button.active { background: var(--primary); color: white; }
.vm-hint { color: var(--text-muted); font-size: 0.8rem; flex: 1; min-width: 200px; }

/* Validity */
.meta-section { background: var(--bg-app); padding: 1rem; border-radius: 10px; margin-bottom: 1rem; border: 1px solid var(--border-color); }
.meta-field { display: flex; flex-direction: column; gap: 4px; }
.meta-field label { font-weight: 700; color: var(--text-main); font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
.meta-field input { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); max-width: 220px; }
.meta-field small { color: var(--text-muted); font-size: 0.78rem; }

/* Payment plan */
.payment-plan-section { background: var(--bg-app); padding: 1.25rem; border-radius: 10px; margin-bottom: 1rem; border: 1px solid var(--border-color); }
.payment-plan-section h3 { margin: 0 0 0.4rem 0; font-size: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
.hint-text { margin: 0 0 0.75rem 0; font-size: 0.85rem; color: var(--text-muted); }
.hint-text .ok { color: #16a34a; }
.hint-text .warn { color: #d97706; }
.pp-row { display: grid; grid-template-columns: 1fr 90px 110px 140px 28px; gap: 6px; align-items: center; margin-bottom: 6px; }
.pp-row input { padding: 7px 9px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.pp-pct { display: flex; align-items: center; gap: 4px; }
.pp-pct input { text-align: right; }
.pp-amount { font-family: monospace; font-weight: 700; color: var(--primary); text-align: right; }
.pp-remove { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; font-size: 1rem; line-height: 1; height: 32px; }
.pp-add { margin-top: 6px; background: var(--bg-surface); border: 1px dashed var(--border-color); padding: 8px; border-radius: 6px; cursor: pointer; color: var(--primary); font-weight: 600; width: 100%; }

@media (max-width: 640px) {
  .pp-row { grid-template-columns: 1fr 70px; }
  .pp-amount, .pp-date { grid-column: span 2; }
  .pp-remove { grid-column: 2; }
}

.send-btn { background: #f59e0b; color: white; border: none; padding: 14px 24px; border-radius: 10px; cursor: pointer; font-weight: 700; flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.send-btn:hover:not(:disabled) { background: #d97706; }

.feedback { margin-top: 1rem; padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; }
.feedback.success { background: rgba(34,197,94,0.12); color: #16a34a; border: 1px solid rgba(34,197,94,0.3); }
.feedback.error   { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }

.financials-breakdown {
    margin-bottom: 1rem;
    font-size: 0.95rem;
    color: var(--text-muted);
    width: 100%;
}
.breakdown-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
}
.breakdown-row.highlight-warn {
    color: #f59e0b;
    font-weight: 600;
}
.breakdown-row.highlight-danger {
    color: #ef4444;
    font-weight: 600;
}
.divider {
    height: 1px;
    background: rgba(0, 131, 102, 0.3);
    margin: 1rem 0;
}

.total-section {
    display: flex;
    flex-direction: column;
    align-items: flex-end; /* Align right */
}
</style>
