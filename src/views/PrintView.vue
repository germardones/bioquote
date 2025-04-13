<template>
  <div class="cotizacion-container" v-if="datosCargados">
    <div class="encabezado">
      <div class="empresa">
        <p><strong>BioBio Code</strong></p>
        <p>Barros Arana 492, Of. 78, Concepción</p>
        <p>RUT: 76.123.456-7</p>
        <p>+56 9 3104 7688</p>
        <p>contacto@biobiocode.cl</p>
      </div>
      <div class="datos-cotizacion">
        <p><strong>NÚMERO:</strong> {{ store.codigo }}</p>
        <p><strong>FECHA:</strong> {{ fecha }}</p>
        <p><strong>VÁLIDO HASTA:</strong> {{ fechaValidez }}</p>
      </div>
    </div>

    <h3 class="seccion">DATOS DEL CLIENTE</h3>
    <div class="cliente">
      <p><strong>Nombre:</strong> {{ store.cliente.nombre }}</p>
      <p><strong>Dirección:</strong> {{ store.cliente.direccion || '(Sin dirección)' }}</p>
      <p><strong>RUT:</strong> {{ store.cliente.rut }}</p>
      <p><strong>Teléfono:</strong> {{ store.cliente.contacto }}</p>
      <p><strong>E-mail:</strong> {{ store.cliente.email || '(Sin email)' }}</p>
    </div>

    <table class="tabla-servicios">
      <thead>
        <tr>
          <th>DESCRIPCIÓN</th>
          <th>UNIDADES</th>
          <th>PRECIO</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="servicio in store.servicios" :key="servicio.id">
          <td>{{ servicio.nombre }}</td>
          <td>1</td>
          <td>${{ servicio.cobroBase.toLocaleString() }}</td>
          <td>${{ servicio.cobroBase.toLocaleString() }}</td>
        </tr>
        <tr v-for="a in store.adicionales" :key="a.id">
          <td>{{ a.nombre }}</td>
          <td>1</td>
          <td v-if="a.precio">${{ a.precio.toLocaleString() }}</td>
          <td v-if="a.precio">${{ a.precio.toLocaleString() }}</td>
          <td v-else colspan="2">Se calculará posteriormente</td>
        </tr>
        <tr v-if="store.horasExtra > 0">
          <td>Horas Extra</td>
          <td>{{ store.horasExtra }}</td>
          <td>${{ totalHora.toLocaleString() }}</td>
          <td>${{ (store.horasExtra * totalHora).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <div class="totales">
      <p><strong>SUBTOTAL:</strong> ${{ subtotal.toLocaleString() }}</p>
      <p><strong>IVA (19%):</strong> ${{ iva.toLocaleString() }}</p>
      <p><strong>TOTAL + IVA:</strong> ${{ totalConIVA.toLocaleString() }}</p>
    </div>

    <div class="mensajes-finales">
      <p><em>Esta cotización tiene una validez de 30 días desde su emisión. Pasado este plazo, los valores podrían ser modificados.</em></p>
    </div>

    <button class="volver-btn" @click="volverADashboard">Volver al Dashboard</button>
  </div>

  <div v-else>
    <p>Cargando datos de cotización...</p>
  </div>
</template>

<script setup>
import { useQuotationStore } from '../store/quotation'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'

const store = useQuotationStore()
const router = useRouter()

const datosCargados = ref(false)

const fecha = new Date().toLocaleDateString()
const fechaValidez = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()

const totalHora = computed(() =>
  store.servicios.reduce((sum, s) => sum + (s.cobroAdicional || 0), 0)
)

const subtotal = computed(() => {
  const base = store.servicios.reduce((sum, s) => sum + (s.cobroBase || 0), 0)
  const adicionales = store.adicionales.reduce((sum, a) => sum + (a.precio || 0), 0)
  const extra = store.horasExtra * totalHora.value
  return base + adicionales + extra
})

const iva = computed(() => Math.round(subtotal.value * 0.19))
const totalConIVA = computed(() => subtotal.value + iva.value)

const volverADashboard = () => {
  if (confirm('¿Estás seguro de salir?')) {
    store.reset()
    router.push('/dashboard')
  }
}

onMounted(() => {
  const localData = localStorage.getItem('ultimaCotizacion')
  if (localData) {
    try {
      const cot = JSON.parse(localData)
      if (cot?.cliente && cot?.servicios) {
        store.cliente = cot.cliente
        store.servicios = cot.servicios
        store.adicionales = cot.adicionales || []
        store.horasExtra = cot.horasExtra || 0
        store.codigo = cot.codigo || ''
        store.empresa = cot.empresa || {}
        datosCargados.value = true

        setTimeout(() => {
          window.print()
        }, 300)
      }
    } catch (e) {
      console.error('Error al cargar cotización desde localStorage:', e)
    }
  }
})
</script>
<style scoped>
.cotizacion-container {
  max-width: 960px;
  margin: 2rem auto;
  font-family: 'Segoe UI', sans-serif;
  font-size: 15px;
  color: #111;
  background: #fff;
  padding: 2rem;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.1);
}

.encabezado {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.empresa p,
.datos-cotizacion p {
  margin: 0.2rem 0;
}

.seccion {
  margin-top: 2rem;
  font-weight: bold;
  font-size: 1.1rem;
  border-bottom: 1px solid #ddd;
  padding-bottom: 0.5rem;
}

.cliente p {
  margin: 0.3rem 0;
}

.tabla-servicios {
  width: 100%;
  margin-top: 1.5rem;
  border-collapse: collapse;
}

.tabla-servicios th,
.tabla-servicios td {
  border: 1px solid #ccc;
  padding: 0.75rem;
  text-align: left;
  font-size: 14px;
}

.tabla-servicios th {
  background-color: #f5f5f5;
}

.tabla-servicios td[colspan="2"] {
  text-align: center;
  font-style: italic;
  color: #777;
}

.totales {
  margin-top: 2rem;
  border-top: 2px solid #eee;
  padding-top: 1rem;
  font-size: 15px;
}

.totales p {
  margin: 0.3rem 0;
}

.mensajes-finales {
  margin-top: 2rem;
  font-size: 0.95rem;
  color: #444;
}

.volver-btn {
  margin-top: 2rem;
  padding: 10px 20px;
  background-color: var(--primary, #008366);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.volver-btn:hover {
  background-color: #006e53;
}

@media print {
  .volver-btn {
    display: none;
  }

  .cotizacion-container {
    box-shadow: none;
    padding: 0;
  }

  body {
    background: white !important;
    margin: 0 !important;
  }
}
</style>

