<template>
  <div class="container">
    <h2>Resumen de Cotización</h2>

    <div v-if="store.servicio && store.cliente && store.total !== null" class="card resumen">
      <h3>Cliente</h3>
      <p>{{ store.cliente.nombre }} | {{ store.cliente.razonSocial }} | {{ store.cliente.rut }}</p>

      <hr />

      <h3>Servicio Base</h3>
      <p>{{ store.servicio.nombre }} - ${{ store.servicio.cobroBase }}</p>

      <hr />

      <h3>Adicionales</h3>
      <ul v-if="store.adicionales.length > 0">
        <li v-for="a in store.adicionales" :key="a.id">
          {{ a.nombre }} - ${{ a.precio }}
        </li>
      </ul>
      <p v-else>(Sin adicionales)</p>

      <hr />

      <h3>Horas Extra</h3>
      <p>{{ store.horasExtra }} hora(s) - ${{ store.horasExtra * (store.servicio?.cobroAdicional || 0) }}</p>

      <hr />

      <h3>Total Final</h3>
      <p class="total">${{ store.total }}</p>
    </div>

    <p v-else>Cargando datos de cotización...</p>

    <!-- Botones -->
    <div class="btn-group">
      <button class="guardar-btn" @click="guardarCotizacion">
        💾 Guardar Cotización
      </button>
      <button
        class="pdf-btn"
        @click="exportarPDF"
        :disabled="!pdfListo"
        :style="{ backgroundColor: pdfListo ? '#071434' : '#aaa', cursor: pdfListo ? 'pointer' : 'not-allowed' }"
      >
        🧾 Exportar a PDF
      </button>


      <button class="volver-btn" @click="volverADashboard">
        🔙 Volver al Dashboard
      </button>
    </div>

    <!-- Contenido oculto para PDF (posición fuera de pantalla) -->
    <!-- Contenido oculto para PDF (posición fuera de pantalla) -->
    <div ref="pdfRef" style="opacity: 0; pointer-events: none; position: fixed; top: 0; left: 0; z-index: -1;">

  <div style="font-family: Arial, sans-serif; width: 600px; padding: 20px;">
    <!-- Usa la imagen desde /public/logo.png -->
    <!-- <img src="/logo.png" alt="Logo" style="height: 60px; margin-bottom: 20px;" /> -->

    <h2 style="margin-bottom: 10px;">Cotización {{ store.codigo }}</h2>
    <p><strong>Fecha:</strong> {{ new Date().toLocaleDateString() }}</p>
    <hr />

    <h3>Datos de la empresa</h3>
    <p>{{ store.empresa?.nombre }}</p>
    <p>RUT: {{ store.empresa?.rut }}</p>
    <p>Dirección: {{ store.empresa?.direccion }}</p>
    <p>Contacto: {{ store.empresa?.email }} | {{ store.empresa?.telefono }}</p>

    <hr />

    <h3>Datos del cliente</h3>
    <p>{{ store.cliente?.nombre }} — {{ store.cliente?.razonSocial }}</p>
    <p>RUT: {{ store.cliente?.rut }}</p>
    <p>Contacto: {{ store.cliente?.contacto }}</p>

    <hr />

    <h3>Vendedor</h3>
    <p>{{ store.vendedorNombre }} — {{ store.vendedorEmail }}</p>

    <hr />

    <h3>Servicios Cotizados</h3>
    <p><strong>Servicio base:</strong> {{ store.servicio?.nombre }} — ${{ store.servicio?.cobroBase }}</p>

    <ul v-if="store.adicionales.length > 0">
      <li v-for="a in store.adicionales" :key="a.id">
        {{ a.nombre }} — ${{ a.precio }}
      </li>
    </ul>
    <p v-else>(Sin adicionales)</p>

    <p><strong>Horas extra:</strong> {{ store.horasExtra }} — ${{ store.horasExtra * (store.servicio?.cobroAdicional || 0) }}</p>

    <hr />

    <h3>Total: ${{ store.total }}</h3>
  </div>
</div>

  </div>
</template>

<script setup>
import { useQuotationStore } from '../store/quotation'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore'

import { ref, nextTick } from 'vue'
import html2pdf from 'html2pdf.js'

const store = useQuotationStore()
const router = useRouter()
const pdfRef = ref(null)

const empresa = {
  nombre: 'BioBio Code',
  rut: '76.123.456-7',
  direccion: 'Barros Arana 492, Of. 78, Concepción, Chile',
  telefono: '+56 9 3104 7688',
  email: 'contacto@biobiocode.cl'
}
const pdfListo = ref(false)
const guardarCotizacion = async () => {
  try {
    const user = auth.currentUser
    if (!user) return alert('Usuario no autenticado.')

    const contadorRef = doc(db, 'contador', 'cotizaciones')
    const contadorSnap = await getDoc(contadorRef)

    let ultimoCorrelativo = 0
    if (contadorSnap.exists()) {
      ultimoCorrelativo = contadorSnap.data().ultimoCorrelativo || 0
    }

    const nuevoCorrelativo = ultimoCorrelativo + 1
    const codigoCotizacion = `COT-${String(nuevoCorrelativo).padStart(3, '0')}`

    const cotizacion = {
      codigo: codigoCotizacion,
      vendedorUID: user.uid,
      vendedorNombre: user.displayName || 'Sin nombre',
      vendedorEmail: user.email,
      cliente: store.cliente,
      servicioBase: store.servicio,
      adicionales: store.adicionales,
      horasExtra: store.horasExtra,
      total: store.total,
      createdAt: serverTimestamp(),
      empresa: empresa
    }
    

    await addDoc(collection(db, 'cotizaciones'), cotizacion)
    await setDoc(contadorRef, { ultimoCorrelativo: nuevoCorrelativo })

    store.codigo = codigoCotizacion
    store.vendedorNombre = user.displayName
    store.vendedorEmail = user.email
    store.empresa = empresa
    console.log('Código asignado al store:', store.codigo)
    alert('Cotización guardada exitosamente.')
    pdfListo.value = true // 🔓 Activar botón PDF

  } catch (err) {
    console.error('Error al guardar cotización', err)
    alert('Error al guardar cotización.')
  }
}


const exportarPDF = async () => {
  console.log('Exportar PDF llamado')

  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 100)) // 🕐 asegura el render

  const element = pdfRef.value
  console.log('Contenido capturado:', element?.innerText)

  if (!element) {
    alert('No se encontró el contenido para generar el PDF')
    return
  }

  const opt = {
    margin: 0.5,
    filename: `${store.codigo || 'cotizacion'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: true, // 👈 para ver en consola posibles fallos
    },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  }

  html2pdf().set(opt).from(element).save().then(() => {
    console.log('✅ PDF generado correctamente.')
  }).catch(err => {
    console.error('Error al generar PDF:', err)
  })
}




const volverADashboard = () => {
  if (confirm('¿Estás seguro de salir sin guardar la cotización?')) {
    store.reset()
    router.push('/dashboard')
  }
}
</script>

<style>
.card.resumen {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  margin-top: 1.5rem;
}

.card.resumen h3 {
  margin-bottom: 0.5rem;
  color: var(--dark);
}

ul {
  list-style: none;
  padding-left: 0;
}

li {
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.total {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 12px 18px;
  border: none;
  border-radius: var(--border-radius);
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: bold;
}

.guardar-btn {
  background-color: var(--primary);
  color: white;
}

.guardar-btn:hover {
  background-color: #006e53;
}

.pdf-btn {
  background-color: #071434;
  color: white;
}

.pdf-btn:hover {
  background-color: #0a1d4c;
}

.volver-btn {
  background-color: #ccc;
  color: #000;
}

.volver-btn:hover {
  background-color: #bbb;
}
</style>
