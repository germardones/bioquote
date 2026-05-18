<template>
  <div class="container">
    <div class="header">
      <h2>Calculadora de Precio</h2>
      <div class="actions">
        <button @click="pasarAlWizard" class="btn-secondary" title="Cargar estos valores en una nueva cotización">
          <i class="fa-solid fa-arrow-right"></i> Pasar al wizard
        </button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <p class="lead">
      Estima cuánto cobrar por un proyecto sin necesidad de guardar una cotización.
      Útil para responder rápido un "¿cuánto saldría algo así?" sin meterte al wizard completo.
    </p>

    <!-- View mode -->
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
      <button class="reset-btn" @click="resetear"><i class="fa-solid fa-arrow-rotate-left"></i> Resetear</button>
    </div>

    <div class="layout">
      <!-- LEFT: inputs -->
      <div class="panel inputs-panel">
        <h3 class="panel-title">Parámetros</h3>

        <div v-if="settingsLoading" class="loading">Cargando configuración...</div>

        <div v-else>
          <div class="specs-grid">
            <div v-for="spec in (settings.specs || [])" :key="spec.id" class="spec-card">
              <label>{{ spec.label }}</label>
              <p class="hint">{{ spec.hint }} · {{ spec.baseHours }}h base</p>
              <div class="counter">
                <button @click="dec(spec.id)">−</button>
                <input type="number" v-model.number="specs[spec.id]" min="0" />
                <button @click="inc(spec.id)">+</button>
              </div>
            </div>
          </div>

          <div class="complexity-card">
            <label>Factor de complejidad: <strong>{{ complejidad.toFixed(1) }}×</strong></label>
            <input type="range" v-model.number="complejidad" min="1" max="1.5" step="0.1" />
            <div class="range-labels">
              <span>Estándar (1.0)</span>
              <span>Alta (1.5)</span>
            </div>
          </div>

          <div class="discount-card">
            <label>Descuento opcional</label>
            <select v-model="selectedDiscountId" @change="onDiscountChange">
              <option :value="null">Sin descuento</option>
              <option v-for="d in (settings.discounts || [])" :key="d.id" :value="d.id">
                {{ d.label }} ({{ d.value }}%)
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- RIGHT: result -->
      <div class="panel result-panel">
        <h3 class="panel-title">Resultado</h3>

        <div class="result-row">
          <span>Horas estimadas</span>
          <strong>{{ result.horasMercado }} h</strong>
        </div>
        <div v-if="viewMode === 'internal'" class="result-row">
          <span>Horas reales (Antigravity)</span>
          <strong>{{ result.horasReales }} h</strong>
        </div>

        <div v-if="viewMode === 'internal'" class="breakdown">
          <div class="bd-row"><span>Subtotal ({{ result.horasMercado }}h × ${{ valor_hora_venta.toLocaleString('es-CL') }})</span><span>${{ result.valorBasePuro.toLocaleString('es-CL') }}</span></div>
          <div class="bd-row"><span>+ Factor seguridad (20%)</span><span>${{ result.montoSeguridad.toLocaleString('es-CL') }}</span></div>
          <div v-if="result.montoDescuento > 0" class="bd-row neg"><span>− Descuento</span><span>−${{ result.montoDescuento.toLocaleString('es-CL') }}</span></div>
        </div>

        <div class="total-box">
          <span class="total-label">{{ viewMode === 'client' ? 'Precio (Neto)' : 'Precio Venta' }}</span>
          <span class="total-value">${{ result.precioSugerido.toLocaleString('es-CL') }}</span>
        </div>
        <div class="iva-row">
          <span>+ IVA (19%): ${{ Math.round(result.precioSugerido * 0.19).toLocaleString('es-CL') }}</span>
          <span class="grand-total">Total con IVA: ${{ Math.round(result.precioSugerido * 1.19).toLocaleString('es-CL') }}</span>
        </div>

        <div v-if="viewMode === 'internal'" class="internal-stats">
          <div class="stat">
            <span>Costo interno</span>
            <strong class="cost">${{ result.costoInterno.toLocaleString('es-CL') }}</strong>
          </div>
          <div class="stat">
            <span>Margen bruto</span>
            <strong class="margin" :class="{ low: result.margenPorcentaje < 30 }">
              ${{ result.margen.toLocaleString('es-CL') }}
              <small>({{ result.margenPorcentaje }}%)</small>
            </strong>
          </div>
        </div>

        <p v-if="result.precioSugerido === 0" class="empty-hint">
          Ajusta los parámetros a la izquierda para ver el cálculo.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettings } from '../composables/useSettings'
import { useQuotationStore } from '../store/quotation'

const router = useRouter()
const { settings, fetchSettings } = useSettings()
const quotation = useQuotationStore()

const settingsLoading = ref(true)
const viewMode = ref('client')

// Local state (NOT touching the quotation store unless user clicks "Pasar al wizard")
const specs = reactive({})
const complejidad = ref(1.0)
const selectedDiscountId = ref(null)
const selectedDiscount = ref(null)

// Constants (mirror quotation store defaults)
const valor_hora_venta = computed(() => settings.value.rates?.hourlyRate || 25000)
const valor_hora_costo = 15000
const factor_seguridad = 1.20
const factor_antigravity = 0.50

const STORAGE_KEY = 'bb_calc_state_v1'

onMounted(async () => {
  await fetchSettings()
  // Initialize spec keys from settings
  ;(settings.value.specs || []).forEach(s => {
    if (specs[s.id] === undefined) specs[s.id] = 0
  })
  // Restore last calculator state
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved) {
      Object.assign(specs, saved.specs || {})
      complejidad.value = saved.complejidad || 1.0
      viewMode.value = saved.viewMode || 'client'
    }
  } catch {}
  settingsLoading.value = false
})

watch([specs, complejidad, viewMode], () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    specs: { ...specs },
    complejidad: complejidad.value,
    viewMode: viewMode.value
  }))
}, { deep: true })

function onDiscountChange() {
  if (!selectedDiscountId.value) {
    selectedDiscount.value = null
  } else {
    selectedDiscount.value = (settings.value.discounts || []).find(d => d.id === selectedDiscountId.value) || null
  }
}

const inc = (id) => { specs[id] = (Number(specs[id]) || 0) + 1 }
const dec = (id) => { specs[id] = Math.max(0, (Number(specs[id]) || 0) - 1) }

const result = computed(() => {
  let baseHours = 0
  ;(settings.value.specs || []).forEach(s => {
    baseHours += (Number(specs[s.id]) || 0) * (Number(s.baseHours) || 0)
  })
  const horasMercado = Math.round(baseHours * (complejidad.value || 1.0) * 10) / 10
  const horasReales = Math.round(horasMercado * (1 - factor_antigravity) * 10) / 10

  const valorBasePuro = horasMercado * valor_hora_venta.value
  const montoSeguridad = valorBasePuro * (factor_seguridad - 1)
  let precioVenta = valorBasePuro + montoSeguridad

  let montoDescuento = 0
  if (selectedDiscount.value && selectedDiscount.value.value) {
    montoDescuento = precioVenta * (Number(selectedDiscount.value.value) / 100)
    precioVenta -= montoDescuento
  }

  const costoInterno = horasReales * valor_hora_costo
  const margen = precioVenta - costoInterno

  return {
    horasMercado,
    horasReales,
    valorBasePuro: Math.round(valorBasePuro),
    montoSeguridad: Math.round(montoSeguridad),
    montoDescuento: Math.round(montoDescuento),
    precioSugerido: Math.round(precioVenta),
    costoInterno: Math.round(costoInterno),
    margen: Math.round(margen),
    margenPorcentaje: precioVenta > 0 ? Math.round((margen / precioVenta) * 100) : 0
  }
})

function resetear() {
  ;(settings.value.specs || []).forEach(s => { specs[s.id] = 0 })
  complejidad.value = 1.0
  selectedDiscountId.value = null
  selectedDiscount.value = null
  localStorage.removeItem(STORAGE_KEY)
}

function pasarAlWizard() {
  if (result.value.precioSugerido === 0) {
    alert('Agrega al menos un parámetro antes de pasar al wizard.')
    return
  }
  if (!confirm('Se cargarán estos valores en una nueva cotización. ¿Continuar?')) return
  // Push values into the quotation store and navigate to wizard
  quotation.reset()
  quotation.type = 'parametric'
  Object.keys(specs).forEach(k => { quotation.specs[k] = specs[k] })
  quotation.specs.complejidad = complejidad.value
  if (selectedDiscount.value) quotation.setDiscount(selectedDiscount.value)
  router.push('/cotizar')
}
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.actions { display: flex; gap: 0.5rem; }
.btn-secondary { background: var(--primary); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }

.lead { color: var(--text-muted); margin: 0 0 1.25rem 0; }

.view-mode-bar { display: flex; align-items: center; gap: 12px; padding: 0.6rem 0.85rem; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1.5rem; flex-wrap: wrap; }
.vm-label { font-weight: 700; color: var(--text-muted); font-size: 0.82rem; }
.vm-toggle { display: inline-flex; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px; }
.vm-toggle button { background: transparent; border: none; padding: 6px 12px; color: var(--text-muted); cursor: pointer; border-radius: 6px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
.vm-toggle button.active { background: var(--primary); color: white; }
.reset-btn { margin-left: auto; background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; }
.reset-btn:hover { color: #ef4444; border-color: rgba(239,68,68,0.3); }

.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); }
.panel-title { margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-main); }

.specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
.spec-card { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
.spec-card label { font-weight: 700; font-size: 0.85rem; color: var(--text-main); margin: 0; }
.spec-card .hint { font-size: 0.72rem; color: var(--text-muted); margin: 0 0 6px 0; }
.counter { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: auto; }
.counter button { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); cursor: pointer; color: var(--primary); font-weight: 700; }
.counter button:hover { background: var(--primary); color: white; border-color: var(--primary); }
.counter input { width: 50px; text-align: center; font-size: 1.05rem; font-weight: 700; border: none; background: transparent; color: var(--text-main); -moz-appearance: textfield; appearance: textfield; }
.counter input::-webkit-outer-spin-button, .counter input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.complexity-card { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.complexity-card label { display: block; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; font-size: 0.88rem; }
.complexity-card input[type="range"] { width: 100%; accent-color: var(--primary); }
.range-labels { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }

.discount-card { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; }
.discount-card label { display: block; font-weight: 700; color: var(--text-main); margin-bottom: 6px; font-size: 0.88rem; }
.discount-card select { width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }

/* Result panel */
.result-panel { background: linear-gradient(180deg, var(--bg-surface), rgba(0,131,102,0.04)); }
.result-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 0.92rem; color: var(--text-muted); }
.result-row strong { color: var(--text-main); font-weight: 700; }

.breakdown { margin: 1rem 0; padding: 0.75rem 1rem; background: var(--bg-app); border-radius: 8px; }
.bd-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; color: var(--text-muted); font-family: monospace; }
.bd-row.neg { color: #ef4444; }

.total-box { margin-top: 1rem; padding: 1.25rem; background: var(--primary); color: white; border-radius: 12px; text-align: right; }
.total-label { display: block; font-size: 0.85rem; opacity: 0.85; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.total-value { font-size: 2.2rem; font-weight: 800; font-family: monospace; line-height: 1; }
.iva-row { display: flex; justify-content: space-between; padding: 8px 4px; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap; gap: 4px; }
.iva-row .grand-total { font-weight: 700; color: var(--text-main); }

.internal-stats { margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.internal-stats .stat { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
.internal-stats .stat span { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
.internal-stats .stat strong { font-size: 1.1rem; font-family: monospace; }
.internal-stats .cost { color: #ef4444; }
.internal-stats .margin { color: #16a34a; }
.internal-stats .margin.low { color: #d97706; }

.empty-hint { color: var(--text-muted); font-style: italic; text-align: center; margin-top: 1rem; padding: 1rem; }

.loading { padding: 2rem; text-align: center; color: var(--text-muted); }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; align-items: stretch; }
  .actions { flex-wrap: wrap; }
  .specs-grid { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .total-value { font-size: 1.7rem; }
  .panel { padding: 1rem; }
  .internal-stats { grid-template-columns: 1fr; }
}
</style>
