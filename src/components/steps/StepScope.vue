<template>
  <div class="container">
    <h2>Alcances y Condiciones</h2>
    <p class="subtitle">Define detalladamente qué incluye y qué no incluye este servicio para mayor transparencia.</p>

    <div class="form-container">
      
      <!-- Scope of Service -->
      <div class="field-group">
        <label for="scope">
          <i class="fa-solid fa-check-circle icon-valid"></i> Alcance del Servicio
          <span class="tooltip" title="Describe qué entregables y actividades están comprometidas."><i class="fa-solid fa-circle-info"></i></span>
        </label>
        <textarea 
          id="scope"
          v-model="store.scopeOfService" 
          placeholder="Ej: 
- Desarrollo de módulo de autenticación con Google.
- Panel administrativo para gestión de usuarios.
- Pruebas unitarias para funcionalidades críticas.
- Despliegue en servidor de pruebas."
          rows="8"
        ></textarea>
        <p class="helper-text">Usa guiones (-) para listar puntos clave.</p>
      </div>

      <!-- Exclusions / Conditions -->
      <div class="field-group">
        <label for="exclusions">
          <i class="fa-solid fa-circle-exclamation icon-warn"></i> Exclusiones y Condiciones
          <span class="tooltip" title="Lo que explícitamente NO está incluido o condiciones requeridas."><i class="fa-solid fa-circle-info"></i></span>
        </label>
        <textarea 
          id="exclusions"
          v-model="store.exclusions" 
          placeholder="Ej:
- No incluye diseño de logotipo ni manual de marca.
- El cliente debe proveer crédito para servicios Cloud (AWS/GCP).
- Soporte limitado a 30 días post-entrega.
- Integraciones con sistemas de terceros no mencionados."
          rows="6"
        ></textarea>
        <p class="helper-text">Define límites claros para evitar malentendidos futuros.</p>
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
import { useRouter } from 'vue-router'
import { useQuotationStore } from '../../store/quotation'
import { useSettings } from '../../composables/useSettings'
import { onMounted } from 'vue'

const router = useRouter()
const store = useQuotationStore()
const { settings, fetchSettings } = useSettings()

onMounted(async () => {
    // Ensure settings are loaded
    await fetchSettings()
    
    // Pre-fill if empty
    if (!store.scopeOfService && settings.value.defaults?.scope) {
        store.scopeOfService = settings.value.defaults.scope
    }
    if (!store.exclusions && settings.value.defaults?.exclusions) {
        store.exclusions = settings.value.defaults.exclusions
    }
})

const irAlSiguientePaso = () => {
  // Could add validation here if needed, but these fields can be optional
  router.push({ name: 'Paso2Cliente' })
}

const volverAtras = () => {
  router.push({ name: 'Paso1Specs' })
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

.form-container {
  background: var(--bg-surface);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
}

.field-group {
  margin-bottom: 2rem;
}

.field-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.8rem;
  font-size: 1.1rem;
}

.icon-valid { color: #22c55e; }
.icon-warn { color: #f59e0b; }

.tooltip {
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.tooltip:hover { opacity: 1; }

textarea {
  width: 100%;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--input-bg); /* Check theme var usually var(--bg-app) or similar */
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}

textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 131, 102, 0.1);
}

.helper-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  font-style: italic;
}

.acciones {
  display: flex;
  gap: 1rem;
  flex-direction: row-reverse; /* Continuar a la derecha */
}

.btn-continuar, .btn-volver {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-size: 1rem;
  transition: transform 0.1s;
}

.btn-continuar {
  background: var(--primary);
  color: white;
  flex: 2;
}
.btn-continuar:hover { opacity: 0.9; }

.btn-volver {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-volver:hover {
  background: var(--bg-app);
  color: var(--text-main);
}
</style>
