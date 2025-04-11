<template>
  <div class="container">
    <h2>Selecciona un servicio base</h2>

    <div class="flex">
      <div
        class="card servicio-opcion"
        v-for="s in servicios"
        :key="s.id"
        :class="{ activo: selected?.id === s.id }"
        @click="selectService(s)"
      >
        <strong>{{ s.nombre }}</strong>
        <p>${{ s.cobroBase }}</p>
      </div>
    </div>

    <button
      :disabled="!selected"
      :class="['btn-continuar', { activo: selected }]"
      @click="$emit('next')"
    >
      Continuar
    </button>
    <button @click="volverAtras" class="btn-volver">← Volver atrás</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router"; // ✅ IMPORTANTE
import { useQuotationStore } from "../store/quotation";

const router = useRouter(); // ✅ NECESARIO
const store = useQuotationStore();
const selected = ref(store.servicio);

const servicios = [
  { id: 1, nombre: "Landing Page", cobroBase: 250000, cobroAdicional: 25000 },
  {
    id: 2,
    nombre: "Sitio institucional",
    cobroBase: 450000,
    cobroAdicional: 50000,
  },
  { id: 3, nombre: "Ecommerce", cobroBase: 600000, cobroAdicional: 25000 },
];

const selectService = (s) => {
  selected.value = s;
  store.servicio = s;
};

const volverAtras = () => {
  router.back(); // ✅ Ahora funcionará correctamente
};
</script>


<style scoped>
.servicio-opcion {
  cursor: pointer;
  flex: 1 1 calc(33% - 1rem);
  text-align: center;
  transition: transform 0.2s ease;
}

.servicio-opcion:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.servicio-opcion.activo {
  border: 2px solid var(--primary);
  background-color: #e8f8f3;
}
.btn-volver {
  background-color: var(--primary);
  color: white;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-volver:hover {
  background-color: #006e53;
}
.btn-continuar {
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: bold;
  border: none;
  cursor: not-allowed;
  background-color: #ccc;
  color: #666;
  margin-top: 1rem;
  margin-right: 1rem;
  transition: background-color 0.3s ease;
}

.btn-continuar.activo {
  background-color: var(--primary);
  color: white;
  cursor: pointer;
}

.btn-continuar.activo:hover {
  background-color: #006e53;
}

</style>
