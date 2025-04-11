<template>
  <div class="cotizacion-container">
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
        <tr>
          <td>{{ store.servicio.nombre }}</td>
          <td>1</td>
          <td>${{ store.servicio.cobroBase.toLocaleString() }}</td>
          <td>${{ store.servicio.cobroBase.toLocaleString() }}</td>
        </tr>
        <tr v-for="a in store.adicionales" :key="a.id">
          <td>{{ a.nombre }}</td>
          <td>1</td>
          <td>${{ a.precio.toLocaleString() }}</td>
          <td>${{ a.precio.toLocaleString() }}</td>
        </tr>
        <tr v-if="store.horasExtra > 0">
          <td>Horas Extra</td>
          <td>{{ store.horasExtra }}</td>
          <td>${{ store.servicio.cobroAdicional.toLocaleString() }}</td>
          <td>${{ (store.horasExtra * store.servicio.cobroAdicional).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <div class="totales">
      <p><strong>SUBTOTAL:</strong> ${{ subtotal.toLocaleString() }}</p>
      <p><strong>IVA (19%):</strong> ${{ iva.toLocaleString() }}</p>
      <p><strong>TOTAL:</strong> ${{ store.total.toLocaleString() }}</p>
    </div>

    
    <div class="mensajes-finales">
      <p><em>Esta cotización tiene una validez de 30 días desde su emisión. Pasado este plazo, los valores podrían ser modificados.</em></p>
      <p><strong>Importante:</strong> Si esta es su primera compra con nosotros, puede acceder a un <strong>10% de descuento</strong>. Consulte con nuestro equipo para confirmar la vigencia de este beneficio.</p>
    </div>
    <button class="volver-btn" @click="volverADashboard">
        Volver al Dashboard
    </button>

  </div>
</template>

<script setup>
import { useQuotationStore } from '../store/quotation'
import { useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'

const store = useQuotationStore()
const router = useRouter()

const fecha = new Date().toLocaleDateString()
const fechaValidez = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString() // 15 días

const subtotal = computed(() => {
  const adicionalTotal = store.adicionales.reduce((acc, a) => acc + a.precio, 0)
  const horasTotal = store.horasExtra * store.servicio.cobroAdicional
  return store.servicio.cobroBase + adicionalTotal + horasTotal
})

const iva = computed(() => Math.round(subtotal.value * 0.19))

const volverADashboard = () => {
  if (confirm('¿Estás seguro de salir?')) {
    store.reset()
    router.push('/dashboard')
  }
}

onMounted(() => {
  window.print()
})
</script>

<style scoped>
.cotizacion-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
  background: white;
  color: #000;
}
.encabezado {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}
.seccion {
  background: #cce3f6;
  padding: 0.5rem;
  font-weight: bold;
}
.tabla-servicios {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
}
.tabla-servicios th,
.tabla-servicios td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
.totales {
  margin-top: 2rem;
  text-align: right;
}
.no-print {
  margin-top: 2rem;
}
.volver-btn {
  padding: 12px 18px;
  background-color: var(--primary); /* antes era #ccc */
  color: white;
  border: none;
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.volver-btn:hover {
  background-color: #006e53; /* tono más oscuro al pasar el mouse */
}

@media print {
  .volver-btn {
    display: none !important;
  }
}
.mensajes-finales {
  margin-top: 2rem;
  font-size: 0.95rem;
  color: #333;
  line-height: 1.5;
}
.mensajes-finales em {
  color: #555;
}

</style>
