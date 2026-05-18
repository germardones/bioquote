<template>
  <div class="cotizacion-wrapper">
    <div class="wizard-container">
      <div v-if="isEditMode" class="edit-banner">
        <i class="fa-solid fa-pen-to-square"></i>
        Editando cotización <strong>{{ projectId?.substring(0, 8).toUpperCase() }}</strong>
      </div>
      <div class="wizard-header">
        <div
          v-for="(paso, index) in pasos"
          :key="paso.label"
          class="step"
          :class="{
            activo: pasoActual === index,
            completado: index < pasoActual
          }"
        >
          <div class="circle">{{ index + 1 }}</div>
          <span class="label">{{ paso.label }}</span>
          <div v-if="index < pasos.length - 1" class="line"></div>
        </div>
      </div>
    </div>

    <router-view />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import { useQuotationStore } from '../store/quotation'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const store = useQuotationStore()

const projectId = computed(() => route.params.id)
const isEditMode = computed(() => !!projectId.value)

const pasos = [
  { keys: ['Paso1Specs', 'EditPaso1'],    label: 'Espec. Técnicas' },
  { keys: ['Paso2Cliente', 'EditPaso2'],  label: 'Cliente' },
  { keys: ['Paso3Resumen', 'EditPaso3'],  label: 'Finanzas' }
]
const pasoActual = computed(() =>
  pasos.findIndex(p => p.keys.includes(route.name))
)

// Load project when entering edit mode (or reset for new)
async function loadIfEdit() {
  if (isEditMode.value) {
    try {
      const snap = await getDoc(doc(db, 'projects', projectId.value))
      if (snap.exists()) {
        store.loadFromProject({ id: snap.id, ...snap.data() })
      }
    } catch (e) {
      console.error('Error loading project for edit:', e)
    }
  } else if (!store.editingProjectId && !store.cliente?.nombre) {
    // Only reset when starting fresh (don't wipe an ongoing wizard between steps)
    store.reset()
  }
}

onMounted(loadIfEdit)
watch(projectId, loadIfEdit)
</script>

<style scoped>
.wizard-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  box-sizing: border-box;
}

.edit-banner {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #d97706;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}
.edit-banner strong { font-family: monospace; }

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.step {
  display: flex;
  align-items: center;
  min-width: 100px;
  flex-grow: 1;
  justify-content: center;
  text-align: center;
  position: relative;
}

.circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  transition: all 0.3s ease;
  flex-shrink: 0;
  z-index: 2;
}

.label {
  margin-left: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  transition: color 0.3s;
}

/* Status: Active */
.activo .circle {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(0, 131, 102, 0.3);
}

.activo .label {
  color: var(--text-main);
  font-weight: 700;
}

/* Status: Completed */
.completado .circle {
  background-color: rgba(0, 131, 102, 0.1);
  color: var(--primary);
  border-color: var(--primary);
}

.completado .label {
  color: var(--primary);
}
</style>
