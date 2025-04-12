<template>
  <div class="container">
    <h2>Selecciona uno o más servicios base</h2>

    <div class="categorias-lista">
      <div
        v-for="categoria in categorias"
        :key="categoria.nombre"
        class="categoria-card"
      >
        <div class="categoria-header" @click="alternarCategoria(categoria.nombre)">
          <span>{{ categoria.nombre }}</span>
          <span class="toggle-indicator">
            {{ categoriasActivas.includes(categoria.nombre) ? '▲' : '▼' }}
          </span>
        </div>

        <transition name="fade">
          <div
            v-if="categoriasActivas.includes(categoria.nombre)"
            class="servicios-lista"
          >
            <div
              v-for="servicio in categoria.servicios"
              :key="servicio.id"
              class="servicio-card"
              :class="{ activo: estaSeleccionado(servicio.id) }"
              @click="toggleServicio(servicio)"
            >
              <strong>{{ servicio.nombre }}</strong>
              <p>${{ servicio.cobroBase.toLocaleString() }}</p>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div class="acciones">
      <button
        :disabled="store.servicios.length === 0"
        :class="['btn-continuar', { activo: store.servicios.length > 0 }]"
        @click="$emit('next')"
      >
        Continuar
      </button>
      <button @click="router.back()" class="btn-volver">← Volver atrás</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuotationStore } from '../store/quotation'

const router = useRouter()
const store = useQuotationStore()

const categoriasActivas = ref([])

const alternarCategoria = (nombre) => {
  if (categoriasActivas.value.includes(nombre)) {
    categoriasActivas.value = categoriasActivas.value.filter(c => c !== nombre)
  } else {
    categoriasActivas.value.push(nombre)
  }
}

const toggleServicio = (servicio) => {
  const index = store.servicios.findIndex(s => s.id === servicio.id)
  if (index >= 0) {
    store.servicios.splice(index, 1)
  } else {
    store.servicios.push(servicio)
  }
}

const estaSeleccionado = (id) => store.servicios.some(s => s.id === id)

const categorias = [
  {
    nombre: 'Desarrollo Web',
    servicios: [
      { id: 1, nombre: 'Landing Page', cobroBase: 250000 },
      { id: 2, nombre: 'Sitio Institucional (4 páginas)', cobroBase: 450000 },
      { id: 3, nombre: 'Sitio + E-commerce', cobroBase: 600000 },
    ]
  },
  {
    nombre: 'Automatización y Dashboards',
    servicios: [
      { id: 4, nombre: 'PWA / SaaS básica (MVP)', cobroBase: 500000 },
      { id: 5, nombre: 'Flujo automatizado + dashboard', cobroBase: 650000 },
      { id: 6, nombre: 'Sistema interno simple', cobroBase: 600000 }
    ]
  },
  {
    nombre: 'I+D y Diagnóstico',
    servicios: [
      { id: 7, nombre: 'Diagnóstico digital estratégico', cobroBase: 300000 },
      { id: 8, nombre: 'Prototipado / pruebas de concepto', cobroBase: 450000 },
      { id: 9, nombre: 'Acompañamiento técnico-comercial', cobroBase: 350000 }
    ]
  }
]
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
}

.categorias-lista {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.categoria-card {
  background-color: #f3f3f3;
  border: 2px solid #ccc;
  border-radius: 12px;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
}

.categoria-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
}

.toggle-indicator {
  font-size: 1.2rem;
}

.servicios-lista {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.servicio-card {
  background-color: white;
  border: 2px solid #ccc;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.servicio-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.servicio-card.activo {
  background-color: #e8f9f3;
  border-color: var(--primary);
}

/* Botones */
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
}

.btn-volver {
  background-color: var(--primary);
  color: white;
  cursor: pointer;
}

.btn-volver:hover {
  background-color: #006e53;
}

.btn-continuar {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
}

.btn-continuar.activo {
  background-color: var(--primary);
  color: white;
  cursor: pointer;
}

.btn-continuar.activo:hover {
  background-color: #006e53;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scaleY(0.95);
}
</style>
