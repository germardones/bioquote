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
        <strong>${{ horas * (store.servicio?.cobroAdicional || 0) }}</strong>
      </p>
    </div>

    <button class="continuar-btn" @click="guardarYContinuar">Continuar</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuotationStore } from '../store/quotation'

const emit = defineEmits(['next'])
const store = useQuotationStore()
const horas = ref(store.horasExtra)
const guardarYContinuar = () => {
  store.horasExtra = horas.value
  emit('next')
}
</script>

<style scoped>
input[type='number'] {
  margin-top: 0.5rem;
  width: 100%;
  max-width: 200px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: var(--border-radius);
  font-size: 1rem;
}

.card {
  background: #f9f9f9;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
}

.continuar-btn {
  margin-top: 2rem;
}
</style>
