<template>
  <div class="container">
    <h2>¿Requiere horas de personalización adicional?</h2>

    <div class="card">
      <label for="horas">
        Ingrese la cantidad de horas adicionales:
        <input
          id="horas"
          type="number"
          v-model.number="horas"
          min="0"
          placeholder="0"
        />
      </label>

      <p style="margin-top: 1rem;">
        Total por horas extra:
        <strong>${{ horas * tarifaHora }}</strong>
      </p>
    </div>

    <div class="acciones">
      <button class="btn-continuar" @click="guardarYContinuar">Continuar</button>
      <button class="btn-volver" @click="volverAtras">← Volver atrás</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuotationStore } from '../../store/quotation'

const router = useRouter()
const store = useQuotationStore()

const horas = ref(store.horasExtra)

const tarifaHora = computed(() =>
  store.servicios.reduce((sum, s) => sum + (s.cobroAdicional || 0), 0)
)

const guardarYContinuar = () => {
  store.horasExtra = horas.value
  router.push({ name: 'Paso4Cliente' })
}

const volverAtras = () => {
  router.push({ name: 'Paso2Adicionales' })
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.card {
  background: #f9f9f9;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 12px;
}

input[type='number'] {
  margin-top: 0.5rem;
  width: 100%;
  max-width: 200px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.acciones {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-continuar,
.btn-volver {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: bold;
  border: none;
  cursor: pointer;
}

.btn-continuar {
  background-color: var(--primary);
  color: white;
}

.btn-volver {
  background-color: var(--primary);
  color: white;
}
</style>
