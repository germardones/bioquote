<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Editar Alcances y Condiciones</h3>
        <button class="btn-close" @click="close">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <p class="subtitle">Editando proyecto: <strong>{{ projectCode }}</strong> - {{ projectName }}</p>

        <div v-if="loading" class="loading-state">
          <i class="fa-solid fa-spinner fa-spin"></i> Cargando datos...
        </div>

        <div v-else class="form-container">
          <!-- Alcance -->
          <div class="field-group">
            <label>
              <i class="fa-solid fa-check-circle icon-valid"></i> Alcance del Servicio
            </label>
            <div class="editor-wrapper">
                <QuillEditor theme="snow" v-model:content="scopeContent" contentType="html" toolbar="essential" />
            </div>
            <p class="helper-text">Define qué incluye el servicio.</p>
          </div>

          <!-- Exclusiones -->
          <div class="field-group mt-4">
            <label>
              <i class="fa-solid fa-circle-exclamation icon-warn"></i> Exclusiones y Condiciones
            </label>
            <div class="editor-wrapper">
                <QuillEditor theme="snow" v-model:content="exclusionsContent" contentType="html" toolbar="essential" />
            </div>
            <p class="helper-text">Lo que NO incluye o requisitos previos.</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close">Cancelar</button>
        <button class="btn-save" @click="save" :disabled="saving">
          <span v-if="saving"><i class="fa-solid fa-spinner fa-spin"></i> Guardando...</span>
          <span v-else>Guardar Cambios</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch } from 'vue'
import { db } from '../../firebase/firebaseConfig'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const props = defineProps({
  show: Boolean,
  projectId: String
})

const emit = defineEmits(['close', 'saved'])

const loading = ref(true)
const saving = ref(false)
const scopeContent = ref('')
const exclusionsContent = ref('')
const projectCode = ref('')
const projectName = ref('')

// Load data when modal opens or projectId changes
watch(() => props.show, async (newVal) => {
  if (newVal && props.projectId) {
    await loadProjectData()
  }
})

const loadProjectData = async () => {
    loading.value = true
    try {
        const docRef = doc(db, 'projects', props.projectId)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
            const data = snap.data()
            projectCode.value = snap.id.substring(0, 8).toUpperCase()
            projectName.value = data.name || 'Sin nombre'
            
            // Populate editors. Handle structure: specs.scope.included / excluded
            scopeContent.value = data.specs?.scope?.included || ''
            exclusionsContent.value = data.specs?.scope?.excluded || ''
        } else {
            alert('El proyecto no existe.')
            emit('close')
        }
    } catch (e) {
        console.error('Error loading project:', e)
        alert('Error al cargar datos del proyecto.')
    } finally {
        loading.value = false
    }
}

const save = async () => {
    saving.value = true
    try {
        const docRef = doc(db, 'projects', props.projectId)
        await updateDoc(docRef, {
            'specs.scope.included': scopeContent.value,
            'specs.scope.excluded': exclusionsContent.value,
            'updated_at': new Date()
        })
        emit('saved')
        emit('close')
        alert('Alcances actualizados correctamente.')
    } catch (e) {
        console.error('Error saving scope:', e)
        alert('Error al guardar los cambios.')
    } finally {
        saving.value = false
    }
}

const close = () => {
    emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-surface);
  color: var(--text-main);
  width: 90%;
  max-width: 900px; /* Wider for rich text */
  max-height: 90vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  border: 1px solid var(--border-color);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 { margin: 0; font-size: 1.25rem; }

.btn-close {
  background: none; border: none; font-size: 1.25rem;
  color: var(--text-muted); cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.subtitle { color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem; }

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.field-group label {
  display: block; font-weight: 700; margin-bottom: 0.5rem;
  display: flex; align-items: center; gap: 8px;
}
.icon-valid { color: #22c55e; }
.icon-warn { color: #f59e0b; }

.editor-wrapper {
    background: white;
    color: black;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
}

:deep(.ql-editor) {
    min-height: 300px;
    font-size: 1rem;
}


.mt-4 { margin-top: 1.5rem; }
.helper-text { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }

.btn-cancel {
  background: transparent; border: 1px solid var(--border-color);
  color: var(--text-muted); padding: 10px 20px; border-radius: 6px;
  cursor: pointer;
}
.btn-save {
  background: var(--primary); border: none;
  color: white; padding: 10px 20px; border-radius: 6px;
  cursor: pointer; font-weight: bold;
}
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

.loading-state { padding: 2rem; text-align: center; color: var(--text-muted); }
</style>
