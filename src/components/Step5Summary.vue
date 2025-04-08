<template>
    <div>
      <h2>Resumen de Cotización</h2>
      <h3>Cliente</h3>
      <p>{{ store.cliente.nombre }} | {{ store.cliente.razonSocial }} | {{ store.cliente.rut }}</p>
  
      <h3>Servicio Base</h3>
      <p>{{ store.servicio.nombre }} - ${{ store.servicio.cobroBase }}</p>
  
      <h3>Adicionales</h3>
      <ul>
        <li v-for="a in store.adicionales" :key="a.id">{{ a.nombre }} - ${{ a.precio }}</li>
      </ul>
  
      <h3>Horas Extra</h3>
      <p>{{ store.horasExtra }} hora(s) - ${{ store.horasExtra * store.servicio.cobroAdicional }}</p>
  
      <h3>Total</h3>
      <p><strong>${{ store.total }}</strong></p>
  
      <button @click="guardarCotizacion">Guardar y Generar PDF</button>
    </div>
  </template>
  <script setup>
  import { useQuotationStore } from '../store/quotation'
  import { useRouter } from 'vue-router'
  import { db, auth } from '../firebase/firebaseConfig'
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
  
  const store = useQuotationStore()
  const router = useRouter()
  
  const guardarCotizacion = async () => {
    try {
      const user = auth.currentUser
      if (!user) return alert('Usuario no autenticado.')
  
      const cotizacion = {
        vendedorUID: user.uid,
        cliente: store.cliente,
        servicioBase: store.servicio,
        adicionales: store.adicionales,
        horasExtra: store.horasExtra,
        total: store.total,
        createdAt: serverTimestamp()
      }
  
      await addDoc(collection(db, 'cotizaciones'), cotizacion)
  
      alert('Cotización guardada exitosamente.')
      store.reset()
      router.push('/dashboard')
    } catch (err) {
      console.error('Error al guardar cotización', err)
    }
  }
  </script>
  