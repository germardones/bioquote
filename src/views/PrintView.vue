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
      <p><strong>TOTAL:</strong> ${{ store.total.toLocaleString() }}</p>
      <p><strong>TOTAL + IVA:</strong> ${{ totalConIVA.toLocaleString() }}</p>
    </div>

    <div class="mensajes-finales">
      <p><em>Esta cotización tiene una validez de 30 días desde su emisión. Pasado este plazo, los valores podrían ser modificados.</em></p>
      <p><strong>Importante:</strong> Si esta es su primera compra con nosotros, puede acceder a un <strong>10% de descuento</strong>. Consulte con nuestro equipo para confirmar la vigencia de este beneficio.</p>
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
