<template>
  <div class="container">
    <h2>Especificaciones del Proyecto</h2>
    <p class="subtitle">Selecciona el método de estimación y define los detalles.</p>

    <!-- TIPO DE COTIZACIÓN -->
    <div class="type-selector">
      <button 
        :class="{ active: store.type === 'parametric' }" 
        @click="store.type = 'parametric'"
      >
        Estimación Paramétrica
      </button>
      <button 
        :class="{ active: store.type === 'custom' }" 
        @click="store.type = 'custom'"
      >
        Cotización Personalizada
      </button>
    </div>

    <!-- MODO PARAMÉTRICO -->
    <div v-if="store.type === 'parametric'" class="mode-parametric">
      <div class="grid-inputs">
        <!-- ENTIDADES -->
        <div class="input-card">
          <label>Entidades de Datos (Modelos)</label>
          <p class="hint">Ej: Usuarios, Productos, Pedidos (Base: 4h c/u)</p>
          <div class="counter">
            <button @click="decrement('entidades')">-</button>
            <input type="number" v-model.number="store.specs.entidades" min="0">
            <button @click="increment('entidades')">+</button>
          </div>
        </div>

        <!-- ROLES -->
        <div class="input-card">
          <label>Roles de Usuario</label>
          <p class="hint">Ej: Admin, Vendedor, Cliente (Base: 2h c/u)</p>
          <div class="counter">
            <button @click="decrement('roles')">-</button>
            <input type="number" v-model.number="store.specs.roles" min="0">
            <button @click="increment('roles')">+</button>
          </div>
        </div>

        <!-- VISTAS -->
        <div class="input-card">
          <label>Vistas Clave (Pantallas)</label>
          <p class="hint">Pantallas únicas o complejas (Base: 3h c/u)</p>
          <div class="counter">
            <button @click="decrement('vistas')">-</button>
            <input type="number" v-model.number="store.specs.vistas" min="0">
            <button @click="increment('vistas')">+</button>
          </div>
        </div>

        <!-- APIs -->
        <div class="input-card">
          <label>Integraciones / APIs</label>
          <p class="hint">Conexiones externas (Base: 8h c/u)</p>
          <div class="counter">
            <button @click="decrement('apis')">-</button>
            <input type="number" v-model.number="store.specs.apis" min="0">
            <button @click="increment('apis')">+</button>
          </div>
        </div>

        <!-- COMPLEJIDAD -->
        <div class="input-card full-width">
          <label>Factor de Complejidad: {{ store.specs.complejidad }}x</label>
          <p class="hint">Ajuste por dificultad técnica o incertidumbre (1.0 - 1.5)</p>
          <input 
            type="range" 
            v-model.number="store.specs.complejidad" 
            min="1" 
            max="1.5" 
            step="0.1"
            class="range-slider"
          >
          <div class="range-labels">
            <span>Estándar (1.0)</span>
            <span>Alta (1.5)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MODO PERSONALIZADO -->
    <div v-else class="mode-custom">
      <div class="custom-items-list">
        <div v-if="store.customItems.length === 0" class="empty-state">
          <p>No hay items agregados. Comienza añadiendo uno abajo.</p>
        </div>
        
        <div v-for="item in store.customItems" :key="item.id" class="custom-item-card">
          <div class="item-header">
            <span class="item-desc">{{ item.description }}</span>
            <button class="btn-delete" @click="store.removeItem(item.id)">×</button>
          </div>
          <div class="item-details">
            <template v-if="item.pricingMethod === 'fixed'">
               <span class="badge-fixed">Fijo</span>
               <span v-if="item.hours > 0" class="muted">({{ item.hours }} hrs est.)</span>
               <span class="item-total">${{ (item.fixedValue || 0).toLocaleString() }}</span>
            </template>
            <template v-else>
               <span>{{ item.hours }} hrs</span>
               <span>x</span>
               <span>${{ item.rate?.toLocaleString() }}</span>
               <span class="item-total">= ${{ (item.hours * item.rate).toLocaleString() }}</span>
            </template>
          </div>
          <p v-if="item.observation" class="item-obs">{{ item.observation }}</p>
        </div>
      </div>

      <div class="add-item-form">
        <h3>Agregar Item</h3>
        
        <!-- Toggle Pricing Method -->
        <div class="pricing-toggle">
            <label class="toggle-label" :class="{ active: newItem.pricingMethod !== 'fixed' }">
                <input type="radio" v-model="newItem.pricingMethod" value="hourly" class="hidden-radio">
                Por Hora
            </label>
            <label class="toggle-label" :class="{ active: newItem.pricingMethod === 'fixed' }">
                <input type="radio" v-model="newItem.pricingMethod" value="fixed" class="hidden-radio">
                Precio Fijo
            </label>
        </div>

        <div class="form-row">
          <div class="field grow">
            <label>Descripción</label>
            <input type="text" v-model="newItem.description" placeholder="Ej: Desarrollo Backend">
          </div>
          
          <div class="field short" v-if="newItem.pricingMethod !== 'fixed'">
            <label>Horas</label>
            <input type="number" v-model.number="newItem.hours" min="1">
          </div>
           <!-- En Fixed, horas es opcional/estimado -->
           <div class="field short" v-else>
            <label>Hrs (Est.)</label>
            <input type="number" v-model.number="newItem.hours" min="0" placeholder="0">
          </div>
        </div>

        <div class="form-row">
          <div class="field" v-if="newItem.pricingMethod !== 'fixed'">
            <label>Valor Hora</label>
            <input type="number" v-model.number="newItem.rate" step="1000">
          </div>
          
          <div class="field" v-else>
            <label>Precio Total</label>
            <input type="number" v-model.number="newItem.fixedValue" step="5000">
          </div>

          <div class="field grow">
            <label>Observación (Opcional)</label>
            <input type="text" v-model="newItem.observation" placeholder="Detalles técnicos...">
          </div>
        </div>
        <button class="btn-add" @click="addNewItem" :disabled="!isValidItem">+ Agregar Item</button>
      </div>
    </div>

    <!-- LIVE PREVIEW COMÚN -->
    <div class="preview-card">
      <h3>Resumen Preliminar</h3>
      <div class="stats-row">
        <div class="stat">
            <span class="label">Horas Totales:</span>
            <span class="value">{{ store.horasMercado }} h</span>
        </div>
        <div class="stat" v-if="store.type === 'custom'">
            <span class="label">Total Venta:</span>
            <span class="value">${{ store.financials.precioSugerido?.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="acciones">
      <button class="btn-continuar activo" @click="irAlSiguientePaso">Continuar</button>
      <button class="btn-volver" @click="volverAtras">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuotationStore } from '../../store/quotation'

const router = useRouter()
const store = useQuotationStore()

// State local para nuevo item
const newItem = ref({
  pricingMethod: 'hourly', // 'hourly' | 'fixed'
  description: '',
  hours: 0,
  rate: 25000,
  fixedValue: 0,
  observation: ''
})

const isValidItem = computed(() => {
  if (newItem.value.description.length === 0) return false
  
  if (newItem.value.pricingMethod === 'fixed') {
      return newItem.value.fixedValue > 0
  } else {
      return newItem.value.hours > 0 && newItem.value.rate >= 0
  }
})

const addNewItem = () => {
  if (!isValidItem.value) return
  
  store.addItem({ ...newItem.value })
  
  // Reset fields but keep rate/pricingMethod preferences
  const currentRate = newItem.value.rate
  const currentMethod = newItem.value.pricingMethod
  
  newItem.value = {
      pricingMethod: currentMethod,
      description: '',
      hours: 0,
      rate: currentRate,
      fixedValue: 0,
      observation: ''
  }
}

const increment = (field) => {
  store.specs[field]++
}

const decrement = (field) => {
  if (store.specs[field] > 0) {
    store.specs[field]--
  }
}

const irAlSiguientePaso = () => {
  router.push({ name: 'Paso2Cliente' })
}

const volverAtras = () => {
  router.push({ name: 'Dashboard' })
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

/* Selector de Tipo */
.type-selector {
  display: flex;
  background: var(--bg-app);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.type-selector button {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.2s;
}

.type-selector button.active {
  background: var(--bg-surface);
  color: var(--primary);
  box-shadow: var(--shadow);
}

/* Parametric Styles */
.grid-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.input-card {
  background: var(--bg-surface);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}

.input-card.full-width {
  grid-column: span 2;
}

.input-card label {
  font-weight: bold;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.counter {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: auto;
  justify-content: center;
}

.counter button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  cursor: pointer;
  font-weight: bold;
  color: var(--primary);
  transition: all 0.2s;
}

.counter button:hover:not(:disabled) {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.counter input {
  width: 60px;
  text-align: center;
  font-size: 1.3rem;
  border: none;
  background: transparent;
  font-weight: 700;
  color: var(--text-main);
  -moz-appearance: textfield;
}
.counter input::-webkit-outer-spin-button,
.counter input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.range-slider {
  width: 100%;
  margin: 1.5rem 0 1rem 0;
  accent-color: var(--primary);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Custom Styles */
.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--bg-app);
  border-radius: 12px;
  color: var(--text-muted);
  border: 2px dashed var(--border-color);
}

.custom-items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.custom-item-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

/* Pricing Toggle */
.pricing-toggle {
    display: flex;
    background: var(--bg-app);
    padding: 3px;
    border-radius: 8px;
    width: fit-content;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
}

.toggle-label {
    padding: 8px 16px;
    font-size: 0.9rem;
    cursor: pointer;
    border-radius: 6px;
    color: var(--text-muted);
    transition: all 0.2s;
    font-weight: 600;
}

.toggle-label.active {
    background: var(--bg-surface);
    color: var(--primary);
    box-shadow: var(--shadow);
}

.add-item-form {
  background: var(--bg-app);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

.add-item-form h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.preview-card {
  background: rgba(0, 131, 102, 0.05);
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  text-align: center;
  border: 2px dashed var(--primary);
  margin-top: 2.5rem;
}

.stat .value {
    font-weight: 800;
    color: var(--text-main);
}

.badge-fixed {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
}
</style>
