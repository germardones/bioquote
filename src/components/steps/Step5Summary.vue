<template>
  <div class="container">
    <div class="header">
      <h2>Resumen de Proyecto</h2>
      <span v-if="store.codigo" class="codigo-cotizacion">ID: {{ store.codigo }}</span>
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
          <span>Horas Mercado (Est.):</span>
          <strong>{{ store.financials.horasMercado }} h</strong>
        </div>
        <div class="fin-item">
          <span>Horas Reales (Est.):</span>
          <strong>{{ store.financials.horasReales }} h</strong>
        </div>
        <div class="fin-item highlight">
          <span>Costo Interno:</span>
          <strong>${{ store.financials.costoInterno.toLocaleString() }}</strong>
        </div>
        <div class="fin-item highlight">
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

      <div class="total-section">
        <h3>Precio Sugerido (Venta)</h3>
        
        <!-- Breakdown -->
        <div class="financials-breakdown">
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
        
        <div class="divider"></div>

        <p class="total-price">${{ store.financials.precioSugerido.toLocaleString() }}</p>
        <p class="disclaimer">+ IVA</p>
      </div>

    </div>

    <div class="btn-group">
      <button class="guardar-btn" @click="guardarProyecto" :disabled="cargando">
        💾 Guardar Proyecto
      </button>
      
      <button class="volver-btn" @click="volverADashboard" :disabled="cargando">
        🔙 Volver al Dashboard
      </button>
    </div>

    <div v-if="cargando" class="overlay-carga">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from "../../store/quotation";
import { useRouter } from "vue-router";
import { db, auth } from "../../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSettings } from '../../composables/useSettings'
import { ref, onMounted, computed, watch } from "vue";

const store = useQuotationStore();
const router = useRouter();
const cargando = ref(false);
const { settings, fetchSettings } = useSettings()

const activeDiscounts = computed(() => settings.value.discounts || [])
const selectedDiscountId = ref(null)

onMounted(async () => {
    await fetchSettings()
    // Restore if already selected
    if (store.selectedDiscount) {
        selectedDiscountId.value = store.selectedDiscount.id
    }
})

const applyDiscount = () => {
    if (!selectedDiscountId.value) {
        store.setDiscount(null)
    } else {
        const disc = activeDiscounts.value.find(d => d.id === selectedDiscountId.value)
        store.setDiscount(disc)
    }
}

const guardarProyecto = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return alert("Usuario no autenticado.");

    cargando.value = true;

    // Estructura basada en proyecto_contexto.md
    const projectData = {
      client_name: store.cliente.nombre, // Simplificado, idealmente un ID de cliente
      name: `Proyecto para ${store.cliente.nombre}`, // Nombre por defecto
      status: "Draft",
      owner_uid: user.uid,
      sales_rep_name: user.displayName || user.email,
      
      // Datos del cliente completos
      client_data: {
        ...store.cliente,
        // Auto-add observation if discount applied
        observacion: store.selectedDiscount 
          ? `Aplicado: ${store.selectedDiscount.label} (${store.selectedDiscount.value}%)` 
          : '' 
      },

      // Specs
      specs: {
        type: store.type,
        custom_items: store.customItems || [],
        entity_count: store.specs.entidades,
        role_count: store.specs.roles,
        view_count: store.specs.vistas,
        api_count: store.specs.apis,
        complexity: store.specs.complejidad
      },

      // Financials (Add discount details)
      financials: {
        estimated_hours_market: store.financials.horasMercado,
        estimated_hours_real: store.financials.horasReales,
        quoted_price: store.financials.precioSugerido,
        discount_amount: store.financials.montoDescuento || 0,
        discount_applied: store.financials.descuentoAplicado || null,
        internal_cost: store.financials.costoInterno,
        projected_margin: store.financials.margen
      },

      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "projects"), projectData);
    
    store.codigo = docRef.id; // Usamos el ID del documento como código temporal
    console.log("Proyecto guardado con ID: ", docRef.id);
    
    alert("Proyecto guardado exitosamente.");

  } catch (err) {
    console.error("Error al guardar proyecto", err);
    alert("Error al guardar el proyecto.");
  } finally {
    cargando.value = false;
  }
};

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
