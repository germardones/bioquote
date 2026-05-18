<template>
  <div class="container">
    <div class="header">
      <h2>Plantillas de Cotización</h2>
      <div class="actions">
        <button class="btn-primary" @click="openCreate"><i class="fa-solid fa-plus"></i> Nueva plantilla</button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <p class="hint">
      Las plantillas precargan especificaciones y alcance en el wizard de cotización.
      Útiles para tipos de proyecto que cotizas con frecuencia (landing, app, ERP, etc).
    </p>

    <div v-if="store.loading" class="loading">Cargando...</div>
    <div v-else-if="store.items.length === 0" class="empty">
      <i class="fa-regular fa-folder-open"></i>
      <p>No tienes plantillas todavía. Crea la primera.</p>
    </div>
    <div v-else class="cards-grid">
      <div v-for="t in store.items" :key="t.id" class="tmpl-card">
        <div class="card-head">
          <h3>{{ t.name }}</h3>
          <span class="type-pill" :class="t.type">{{ t.type === 'custom' ? 'Custom' : 'Paramétrica' }}</span>
        </div>
        <p class="desc">{{ t.description || 'Sin descripción' }}</p>
        <div class="specs-preview" v-if="t.type === 'parametric'">
          <span class="chip">{{ t.specs?.entidades || 0 }} entidades</span>
          <span class="chip">{{ t.specs?.roles || 0 }} roles</span>
          <span class="chip">{{ t.specs?.vistas || 0 }} vistas</span>
          <span class="chip">{{ t.specs?.apis || 0 }} APIs</span>
          <span class="chip">{{ t.specs?.complejidad || 1.0 }}x</span>
        </div>
        <div class="specs-preview" v-else>
          <span class="chip">{{ (t.customItems || []).length }} items</span>
        </div>
        <div class="card-actions">
          <button class="btn-i" @click="openEdit(t)" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn-i del" @click="onDelete(t)" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editing ? 'Editar plantilla' : 'Nueva plantilla' }}</h3>
          <button class="close-btn" @click="close">&times;</button>
        </div>
        <form @submit.prevent="save" class="form">
          <div class="form-group">
            <label>Nombre</label>
            <input v-model="form.name" required placeholder="Landing institucional / App MVP / ERP módulo básico..." />
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea v-model="form.description" rows="2" placeholder="Cuándo usar esta plantilla..."></textarea>
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <div class="type-toggle">
              <button type="button" :class="{ active: form.type === 'parametric' }" @click="form.type = 'parametric'">Paramétrica</button>
              <button type="button" :class="{ active: form.type === 'custom' }" @click="form.type = 'custom'">Custom</button>
            </div>
          </div>

          <div v-if="form.type === 'parametric'" class="grid-2">
            <div class="form-group">
              <label>Entidades</label>
              <input type="number" v-model.number="form.specs.entidades" min="0" />
            </div>
            <div class="form-group">
              <label>Roles</label>
              <input type="number" v-model.number="form.specs.roles" min="0" />
            </div>
            <div class="form-group">
              <label>Vistas</label>
              <input type="number" v-model.number="form.specs.vistas" min="0" />
            </div>
            <div class="form-group">
              <label>APIs</label>
              <input type="number" v-model.number="form.specs.apis" min="0" />
            </div>
            <div class="form-group full">
              <label>Complejidad: {{ form.specs.complejidad }}x</label>
              <input type="range" v-model.number="form.specs.complejidad" min="1" max="1.5" step="0.1" />
            </div>
          </div>

          <div v-else class="custom-items">
            <label>Items (descripción · horas · valor hora)</label>
            <div v-for="(it, i) in form.customItems" :key="i" class="ci-row">
              <input v-model="it.description" placeholder="Descripción" />
              <input type="number" v-model.number="it.hours" placeholder="Hrs" />
              <input type="number" v-model.number="it.rate" placeholder="$/h" />
              <button type="button" class="btn-rm" @click="form.customItems.splice(i, 1)">×</button>
            </div>
            <button type="button" class="btn-add-item" @click="addCustomItem">+ Agregar item</button>
          </div>

          <div class="form-group">
            <label>Alcance del servicio</label>
            <textarea v-model="form.scope" rows="3" placeholder="Qué se incluye..."></textarea>
          </div>
          <div class="form-group">
            <label>Exclusiones</label>
            <textarea v-model="form.exclusions" rows="2" placeholder="Qué NO se incluye..."></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="close">Cancelar</button>
            <button type="submit" class="btn-save">{{ editing ? 'Guardar' : 'Crear' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuoteTemplatesStore } from '../../store/quoteTemplates'

const router = useRouter()
const store = useQuoteTemplatesStore()
const showModal = ref(false)
const editing = ref(null)

const blankForm = () => ({
  name: '', description: '',
  type: 'parametric',
  specs: { entidades: 0, roles: 0, vistas: 0, apis: 0, complejidad: 1.0 },
  customItems: [],
  scope: '', exclusions: ''
})
const form = reactive(blankForm())

onMounted(() => store.fetchAll())

function openCreate() {
  editing.value = null
  Object.assign(form, blankForm())
  showModal.value = true
}
function openEdit(t) {
  editing.value = t
  Object.assign(form, {
    name: t.name || '',
    description: t.description || '',
    type: t.type || 'parametric',
    specs: { entidades: 0, roles: 0, vistas: 0, apis: 0, complejidad: 1.0, ...(t.specs || {}) },
    customItems: [...(t.customItems || [])],
    scope: t.scope || '',
    exclusions: t.exclusions || ''
  })
  showModal.value = true
}
function close() { showModal.value = false; editing.value = null }
function addCustomItem() {
  form.customItems.push({ description: '', hours: 0, rate: 25000, pricingMethod: 'hourly', observation: '' })
}

async function save() {
  try {
    if (editing.value) {
      const { id, ...payload } = { id: editing.value.id, ...form }
      await store.update(editing.value.id, payload)
    } else {
      await store.create({ ...form })
    }
    close()
  } catch (e) { console.error(e); alert('Error al guardar plantilla.') }
}

async function onDelete(t) {
  if (!confirm(`¿Eliminar plantilla "${t.name}"?`)) return
  try { await store.remove(t.id) }
  catch (e) { console.error(e); alert('Error al eliminar.') }
}
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.5rem; }
.btn-primary { background: var(--primary); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.hint { color: var(--text-muted); margin: 0 0 1.5rem 0; font-size: 0.9rem; }

.loading, .empty { padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: 12px; }
.empty i { font-size: 2.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.5; }

.cards-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.tmpl-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 0.6rem; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.card-head h3 { margin: 0; font-size: 1rem; color: var(--text-main); }
.type-pill { padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
.type-pill.parametric { background: rgba(0,131,102,0.12); color: var(--primary); }
.type-pill.custom { background: rgba(245,158,11,0.15); color: #f59e0b; }
.desc { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
.specs-preview { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { background: var(--bg-app); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; color: var(--text-muted); }
.card-actions { margin-top: auto; display: flex; justify-content: flex-end; gap: 4px; }
.btn-i { background: transparent; border: 1px solid var(--border-color); width: 30px; height: 30px; border-radius: 6px; cursor: pointer; color: var(--text-muted); }
.btn-i:hover { color: var(--primary); border-color: var(--primary); }
.btn-i.del:hover { color: #ef4444; border-color: #ef4444; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: var(--bg-surface); width: 92%; max-width: 600px; border-radius: 12px; max-height: 92vh; overflow-y: auto; }
.modal-header { background: var(--bg-app); padding: 1rem 1.5rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.form { padding: 1.5rem; }
.form-group { margin-bottom: 0.75rem; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
.form-group input, .form-group textarea { width: 100%; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); font-family: inherit; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

.type-toggle { display: flex; background: var(--bg-app); padding: 3px; border-radius: 8px; width: fit-content; border: 1px solid var(--border-color); }
.type-toggle button { background: transparent; border: none; padding: 8px 14px; cursor: pointer; color: var(--text-muted); border-radius: 6px; font-weight: 600; }
.type-toggle button.active { background: var(--bg-surface); color: var(--primary); }

.custom-items { display: flex; flex-direction: column; gap: 6px; margin-bottom: 0.75rem; }
.ci-row { display: grid; grid-template-columns: 1fr 70px 100px 28px; gap: 6px; }
.ci-row input { padding: 7px 9px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.btn-rm { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; }
.btn-add-item { background: var(--bg-app); border: 1px dashed var(--border-color); padding: 8px; border-radius: 6px; cursor: pointer; color: var(--text-muted); font-weight: 600; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem; }
.btn-save { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 6px; cursor: pointer; }

@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .grid-2 { grid-template-columns: 1fr; }
  .ci-row { grid-template-columns: 1fr 60px 80px 28px; }
}
</style>
