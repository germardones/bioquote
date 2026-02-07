<template>
  <div class="config-view ">
    <div class="header">
      <h1>Configuración del Sistema</h1>
      <button @click="router.back()" class="btn-back">
         Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando configuraciones...</div>

    <div v-else class="content-grid">
        <!-- TABS -->
        <div class="tabs">
            <button :class="{ active: activeTab === 'specs' }" @click="activeTab = 'specs'">
                <i class="fa-solid fa-layer-group"></i> Specs Cotizador
            </button>
            <button :class="{ active: activeTab === 'matrix' }" @click="activeTab = 'matrix'">
                <i class="fa-solid fa-list-check"></i> Matriz CRM
            </button>
            <button :class="{ active: activeTab === 'discounts' }" @click="activeTab = 'discounts'">
                <i class="fa-solid fa-percent"></i> Descuentos
            </button>
            <button :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
                <i class="fa-solid fa-sliders"></i> General
            </button>

        </div>

        <!-- TAB: SPECS -->
        <div v-if="activeTab === 'specs'" class="tab-content card">
            <div class="card-header">
                <h2>Parámetros de Especificación (Cotizador)</h2>
                <button class="btn-add" @click="addSpec">+ Nuevo Parámetro</button>
            </div>
            <p class="section-desc">Define los items base que aparecen en el "Paso 1" de la cotización paramétrica.</p>
            
            <div class="specs-list">
                <div v-for="(spec, index) in localSettings.specs" :key="index" class="spec-item">
                    <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
                    <div class="spec-fields">
                        <div class="field-group">
                            <label>ID (Interno)</label>
                            <input v-model="spec.id" type="text" placeholder="ej: entidades">
                        </div>
                        <div class="field-group grow">
                            <label>Etiqueta Visible</label>
                            <input v-model="spec.label" type="text" placeholder="Ej: Entidades de Datos">
                        </div>
                        <div class="field-group short">
                            <label>Horas Base</label>
                            <input v-model.number="spec.baseHours" type="number">
                        </div>
                        <div class="field-group grow">
                            <label>Ayuda / Hint</label>
                            <input v-model="spec.hint" type="text" placeholder="Ej: Usuarios, etc...">
                        </div>
                    </div>
                    <button class="btn-delete" @click="removeSpec(index)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- TAB: MATRIX -->
        <div v-if="activeTab === 'matrix'" class="tab-content card">
            <div class="card-header">
                <h2>Reglas de Matriz de Seguimiento (CRM)</h2>
                <button class="btn-add" @click="addMatrixRule">+ Nueva Regla</button>
            </div>
            <p class="section-desc">Define los umbrales de días para alertar acciones en el pipeline.</p>
            
            <div class="matrix-list">
                <div v-for="(rule, index) in localSettings.matrix" :key="index" class="matrix-item" :class="rule.color">
                    <div class="field-group short">
                        <label>Día Límite</label>
                        <input v-model.number="rule.days" type="number">
                    </div>
                    <div class="field-group grow">
                        <label>Etiqueta Etapa</label>
                        <select v-model="rule.label">
                             <option v-for="stage in pipelineStages" :key="stage.value" :value="stage.label">
                                {{ stage.label }}
                            </option>
                        </select>
                    </div>
                    <div class="field-group grow">
                        <label>Acción Sugerida</label>
                        <input v-model="rule.action" type="text">
                    </div>
                    <!-- Color Selector -->
                    <div class="field-group">
                        <label>Color Alerta</label>
                        <select v-model="rule.color">
                            <option value="success">Verde (Al día)</option>
                            <option value="warning">Amarillo (Atención)</option>
                            <option value="danger">Rojo (Urgente)</option>
                        </select>
                    </div>
                     <button class="btn-delete" @click="removeMatrixRule(index)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- TAB: DISCOUNTS -->
        <div v-if="activeTab === 'discounts'" class="tab-content card">
            <div class="card-header">
                <h2>Gestión de Descuentos</h2>
                <button class="btn-add" @click="addDiscount">+ Nuevo Descuento</button>
            </div>
            <p class="section-desc">Define los descuentos aplicables en la cotización.</p>
            
            <div class="discount-list">
                <div v-for="(discount, index) in localSettings.discounts" :key="index" class="matrix-item">
                     <div class="field-group grow">
                        <label>Etiqueta</label>
                        <input v-model="discount.label" type="text" placeholder="Ej: Descuento Partner">
                    </div>
                    <div class="field-group short">
                        <label>Porcentaje %</label>
                        <input v-model.number="discount.value" type="number" min="0" max="100">
                    </div>
                     <button class="btn-delete" @click="removeDiscount(index)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- TAB: GENERAL -->
        <div v-if="activeTab === 'general'" class="tab-content card">
            <h2>Configuración General</h2>
            <div class="form-row">
                <div class="field">
                    <label>Valor Hora Base ($)</label>
                    <input v-model.number="localSettings.rates.hourlyRate" type="number">
                </div>
            </div>
        </div>

        <!-- SAVE BAR -->
        <div class="save-bar">
            <button class="btn-save" @click="guardarCambios" :disabled="saving">
                <span v-if="saving"><i class="fa-solid fa-spinner fa-spin"></i> Guardando...</span>
                <span v-else>Guardar Cambios</span>
            </button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSettings } from '../../composables/useSettings'
import { PIPELINE_STAGES } from '../../constants/crm'

const router = useRouter()
const { settings, fetchSettings, saveSettings, loading } = useSettings()
const pipelineStages = PIPELINE_STAGES
const activeTab = ref('specs')
const saving = ref(false)

// Local state for editing without committing immediately
const localSettings = reactive({
    specs: [],
    matrix: [],
    discounts: [],
    rates: {}
})

onMounted(async () => {
    await fetchSettings()
    // Clone to local
    localSettings.specs = JSON.parse(JSON.stringify(settings.value.specs))
    localSettings.matrix = JSON.parse(JSON.stringify(settings.value.matrix))
    localSettings.discounts = JSON.parse(JSON.stringify(settings.value.discounts || []))
    localSettings.rates = JSON.parse(JSON.stringify(settings.value.rates))
    // Defaults if missing

})

const addSpec = () => {
    localSettings.specs.push({ id: 'new_id', label: 'Nuevo Item', baseHours: 1, hint: '' })
}

const removeSpec = (index) => {
    if (confirm('¿Eliminar este parámetro?')) {
        localSettings.specs.splice(index, 1)
    }
}

const addMatrixRule = () => {
    localSettings.matrix.push({ days: 10, label: 'Nueva Regla', stage: 'active', color: 'success', action: '-' })
}

const removeMatrixRule = (index) => {
    if (confirm('¿Eliminar esta regla?')) {
        localSettings.matrix.splice(index, 1)
    }
}

const addDiscount = () => {
    localSettings.discounts.push({ id: Date.now().toString(), label: 'Nuevo Descuento', value: 5 })
}

const removeDiscount = (index) => {
    if (confirm('¿Eliminar este descuento?')) {
        localSettings.discounts.splice(index, 1)
    }
}

const guardarCambios = async () => {
    saving.value = true
    try {
        await saveSettings(localSettings)
        alert('Configuración guardada correctamente')
    } catch (e) {
        alert('Error al guardar: ' + e.message)
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.config-view {
    padding: 2rem;
    max-width: 1000px;
    margin: 0 auto;
    padding-bottom: 5rem; /* Space for fixed save bar if needed, here just margin */
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.btn-back {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;
}
.subtitle { color: var(--text-muted); margin-top: 0.5rem; }

/* TABS */
.tabs {
    display: flex; gap: 1rem; margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1px;
}
.tabs button {
    background: none; border: none; padding: 10px 20px;
    font-weight: 600; color: var(--text-muted); cursor: pointer;
    border-bottom: 3px solid transparent; transition: all 0.2s;
    font-size: 1rem; display: flex; align-items: center; gap: 8px;
}
.tabs button.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

.card {
    background: var(--bg-surface);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
}
.card-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1rem;
}
.btn-add {
    background: var(--bg-app); border: 1px solid var(--primary);
    color: var(--primary); padding: 8px 16px; border-radius: 6px;
    cursor: pointer; font-weight: 600;
}
.section-desc { color: var(--text-muted); margin-bottom: 2rem; font-style: italic; }

/* LISTS */
.specs-list, .matrix-list { display: flex; flex-direction: column; gap: 1rem; }

.spec-item, .matrix-item {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem; background: var(--bg-app);
    border-radius: 8px; border: 1px solid var(--border-color);
}

.matrix-item.success { border-left: 4px solid #22c55e; }
.matrix-item.warning { border-left: 4px solid #f59e0b; }
.matrix-item.danger { border-left: 4px solid #ef4444; }

.drag-handle { color: var(--text-muted); cursor: move; }
.spec-fields, .field-group { display: flex; gap: 1rem; flex: 1; align-items: flex-end; }
.field-group { flex-direction: column; align-items: flex-start; gap: 4px; }
.field-group label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }

.field-group.grow { flex: 1; }
.field-group.short { width: 80px; }

input, select, textarea {
    width: 100%; padding: 8px; border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--input-bg); color: var(--text-main);
    font-family: inherit;
}
.mt-4 { margin-top: 1.5rem; }

.btn-delete {
    background: none; border: none; color: #ef4444;
    cursor: pointer; padding: 8px; opacity: 0.7;
}
.btn-delete:hover { opacity: 1; }

.save-bar {
    margin-top: 2rem; display: flex; justify-content: flex-end;
}
.btn-save {
    background: var(--primary); color: white;
    padding: 12px 30px; border-radius: 8px; border: none;
    font-size: 1rem; font-weight: bold; cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

@media(max-width: 768px) {
    .spec-item, .matrix-item { flex-direction: column; align-items: stretch; }
    .spec-fields { flex-direction: column; }
    .field-group { width: 100%; }
}
</style>
