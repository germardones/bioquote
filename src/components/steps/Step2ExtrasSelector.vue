<template>
  <div class="container">
    <h2>Selecciona adicionales para los servicios seleccionados</h2>

    <div v-if="serviciosConAdicionales.length">
      <div
        v-for="servicio in serviciosConAdicionales"
        :key="servicio.id"
        class="bloque-servicio"
      >
        <h3>{{ servicio.nombre }}</h3>

        <div class="adicionales-grid">
          <div
            class="adicional-opcion"
            v-for="a in adicionalesPorServicio[servicio.id]"
            :key="a.id"
            :class="{ activo: seleccionados.some(sel => sel.id === a.id) }"
            @click="toggleAdicional(a, servicio.id)"
          >
            <strong>{{ a.nombre }}</strong>
            <p v-if="a.precio">${{ a.precio.toLocaleString() }}</p>
            <p v-else class="info">Se calculará posteriormente</p>
          </div>
        </div>
      </div>
    </div>

    <p v-else>No hay servicios con adicionales seleccionados.</p>

    <div class="acciones">
      <button class="btn-continuar activo" @click="irAlSiguientePaso">Continuar</button>
      <button class="btn-volver" @click="volverAtras">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useQuotationStore } from '../../store/quotation'

const router = useRouter()
const store = useQuotationStore()
const seleccionados = ref([...store.adicionales])

const adicionalesPorServicio = {
  1: [
    { id: 'a1', nombre: 'Formularios personalizados', precio: 30000 },
    { id: 'a2', nombre: 'Animaciones especiales', precio: 30000 },
    { id: 'a3', nombre: 'Integraciones externas', precio: 40000 },
    { id: 'a4', nombre: 'Multilenguaje', precio: 35000 },
    { id: 'a5', nombre: 'Diseño no entregado', precio: 50000 },
    { id: 'a6', nombre: 'SEO avanzado', precio: 45000 }
  ],
  2: [{ id: 'a7', nombre: 'Página adicional', precio: 50000 }],
  3: [
    { id: 'a8', nombre: 'Carga masiva de productos', precio: 50000 },
    { id: 'a9', nombre: 'Checkout personalizado', precio: 50000 },
    { id: 'a10', nombre: 'Integraciones', precio: 50000 },
    { id: 'a11', nombre: 'Multilenguaje / multimoneda', precio: 60000 }
  ],
  4: [
    { id: 'a12', nombre: 'Roles múltiples', precio: 40000 },
    { id: 'a13', nombre: 'Integraciones API', precio: 50000 },
    { id: 'a14', nombre: 'Multitenencia', precio: 60000 },
    { id: 'a15', nombre: 'Personalización visual', precio: 45000 }
  ],
  5: [
    { id: 'a16', nombre: 'Formularios múltiples', precio: 40000 },
    { id: 'a17', nombre: 'Autenticación de usuarios', precio: 50000 },
    { id: 'a18', nombre: 'Dashboard interactivo', precio: 60000 },
    { id: 'a19', nombre: 'Conexión con APIs', precio: 50000 }
  ],
  6: [
    { id: 'a20', nombre: 'Usuarios 6–20', precio: 120000 },
    { id: 'a21', nombre: 'Usuarios 21–50', precio: 150000 },
    { id: 'a22', nombre: 'Usuarios 51+', precio: 200000 },
    { id: 'a23', nombre: 'Entidad adicional', precio: 50000 }
  ],
  7: [
    { id: 'a24', nombre: 'Diagnóstico extendido', precio: 120000 },
    { id: 'a25', nombre: 'Versión ejecutiva', precio: 50000 }
  ],
  8: [{ id: 'a26', nombre: 'Conexiones reales / validación externa', precio: null }],
  9: [{ id: 'a27', nombre: 'Horas de soporte técnico-comercial', precio: null }]
}

const serviciosConAdicionales = computed(() => {
  return store.servicios.filter(s => adicionalesPorServicio[s.id]?.length > 0)
})

const toggleAdicional = (a, servicioId) => {
  const existente = seleccionados.value.find(
    item => item.id === a.id && item.servicioId === servicioId
  )

  if (existente) {
    seleccionados.value = seleccionados.value.filter(
      item => !(item.id === a.id && item.servicioId === servicioId)
    )
  } else {
    seleccionados.value.push({ ...a, servicioId })
  }

  store.adicionales = seleccionados.value
}


const volverAtras = () => {
  router.push({ name: 'Paso1Servicios' })
}

const irAlSiguientePaso = async () => {
  store.adicionales = seleccionados.value
  await nextTick()
  router.push({ name: 'Paso3Horas' })
}
</script>



<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.bloque-servicio {
  margin-bottom: 2rem;
}

.bloque-servicio h3 {
  margin-bottom: 0.75rem;
  color: var(--dark);
  font-weight: bold;
}

.adicionales-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.adicional-opcion {
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: 0.2s ease;
  background-color: #fff;
}

.adicional-opcion:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.06);
}

.adicional-opcion.activo {
  border-color: var(--primary);
  background-color: #e8f9f3;
}

.info {
  color: #777;
  font-size: 0.9rem;
}

/* Botones */
.acciones {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-continuar {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: bold;
  border: none;
  background-color: var(--primary);
  color: white;
  cursor: pointer;
}
</style>
