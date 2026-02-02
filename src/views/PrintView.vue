<template>
  <div class="print-layout" v-if="project">
    <!-- Header Empresa -->
    <header class="header">
      <div class="company-info">
        <h1>BIOBIO CODE</h1>
        <p>Barros Arana 492, Of. 78, Concepción</p>
        <p>RUT: 76.123.456-7</p>
        <p>+56 9 3104 7688</p>
        <p>contacto@biobiocode.cl</p>
      </div>
      <div class="quotation-meta">
        <h2>COTIZACIÓN</h2>
        <div class="meta-row">
            <span>Nº Cotización:</span>
            <strong>{{ project.codigo }}</strong>
        </div>
        <div class="meta-row">
            <span>Fecha Emisión:</span>
            <strong>{{ formatFecha(project.created_at) }}</strong>
        </div>
        <div class="meta-row">
            <span>Validez:</span>
            <strong>30 días</strong>
        </div>
      </div>
    </header>

    <hr class="divider">

    <!-- Cliente -->
    <section class="client-section">
      <h3>DATOS DEL CLIENTE</h3>
      <table class="client-table">
        <tr>
            <th>Razón Social:</th>
            <td>{{ project.client_data?.razonSocial || project.client_name }}</td>
        </tr>
        <tr>
            <th>RUT:</th>
            <td>{{ project.client_data?.rut || '-' }}</td>
        </tr>
        <tr>
            <th>Dirección:</th>
            <td>{{ project.client_data?.direccion || '-' }}</td>
        </tr>
        <tr>
            <th>Contacto:</th>
            <td>{{ project.client_data?.contacto || '-' }}</td>
        </tr>
        <tr>
            <th>Email:</th>
            <td>{{ project.client_data?.email || '-' }}</td>
        </tr>
      </table>
    </section>

    <!-- Detalle -->
    <section class="details-section">
      <h3>DETALLE DEL SERVICIO</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th class="text-right">Precio Unitario</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <!-- Parametric Mode -->
          <tr v-if="project.specs?.type !== 'custom'">
            <td>
                <strong>Desarrollo de Software / Servicios Tecnológicos</strong>
                <br>
                <small>Proyecto: {{ project.name }}</small>
                <br>
                <small class="specs-summary">
                    Especificaciones: {{ project.specs?.entity_count }} Entidades, 
                    {{ project.specs?.role_count }} Roles, 
                    {{ project.specs?.view_count }} Vistas, 
                    {{ project.specs?.api_count }} APIs.
                    Complejidad: {{ project.specs?.complexity }}x.
                </small>
            </td>
            <td>1</td>
            <td class="text-right">${{ (project.financials?.quoted_price || 0).toLocaleString() }}</td>
            <td class="text-right">${{ (project.financials?.quoted_price || 0).toLocaleString() }}</td>
          </tr>

          <!-- Custom Mode -->
          <template v-else>
               <tr v-for="(item, index) in project.specs?.custom_items" :key="index">
                   <td>
                       <strong>{{ item.description }}</strong>
                       <br>
                       <small v-if="item.observation">{{ item.observation }}</small>
                   </td>
                   <td>
                       <span v-if="item.pricingMethod === 'fixed'">1</span>
                       <span v-else>{{ item.hours }} hrs</span>
                   </td>
                   <td class="text-right">
                       <span v-if="item.pricingMethod === 'fixed'">${{ (item.fixedValue || 0).toLocaleString() }}</span>
                       <span v-else>${{ (item.rate || 0).toLocaleString() }}</span>
                   </td>
                   <td class="text-right">
                       <span v-if="item.pricingMethod === 'fixed'">${{ (item.fixedValue || 0).toLocaleString() }}</span>
                       <span v-else>${{ (item.hours * item.rate).toLocaleString() }}</span>
                   </td>
               </tr>
          </template>
        </tbody>
      </table>
    </section>

    <!-- Totales -->
    <section class="totals-section">
      <div class="totals-box">
        <div class="total-row">
            <span>Neto:</span>
            <span>${{ (project.financials?.quoted_price || 0).toLocaleString() }}</span>
        </div>
        <div class="total-row">
            <span>IVA (19%):</span>
            <span>${{ calculateIVA(project.financials?.quoted_price).toLocaleString() }}</span>
        </div>
        <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${{ calculateTotal(project.financials?.quoted_price).toLocaleString() }}</span>
        </div>
      </div>
    </section>

    <footer class="footer">
        <p>Gracias por preferir a BioBio Code.</p>
        <p class="disclaimer">Documento válido para fines informativos y comerciales. No constituye factura electrónica.</p>
    </footer>

    <!-- Botones (No se imprimen) -->
    <div class="no-print action-buttons">
        <button @click="print" class="btn-print">🖨️ Imprimir</button>
        <button @click="router.push('/dashboard')" class="btn-volver">
          <span class="icon">⬅️</span> Volver
        </button>
    </div>

  </div>
  <div v-else class="loading">Cargando datos de cotización...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const project = ref(null)

const projectId = route.params.id

onMounted(async () => {
    if (!projectId) return
    try {
        const docRef = doc(db, 'projects', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            project.value = {
                id: docSnap.id,
                codigo: docSnap.id.substring(0, 8).toUpperCase(),
                ...docSnap.data()
            }
            // Auto print opcional
            // setTimeout(() => window.print(), 1000)
        }
    } catch (e) {
        console.error("Error loading project for print", e)
    }
})

const formatFecha = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return new Date().toLocaleDateString('es-CL')
  return timestamp.toDate().toLocaleDateString('es-CL')
}

const calculateIVA = (neto) => {
    return Math.round((neto || 0) * 0.19)
}

const calculateTotal = (neto) => {
    return (neto || 0) + calculateIVA(neto)
}

const print = () => window.print()
</script>

<style scoped>
.print-layout {
    max-width: 800px; /* Tamaño carta aprox */
    margin: 2rem auto;
    background: white;
    padding: 3rem;
    box-shadow: 0 0 15px rgba(0,0,0,0.1);
    font-family: 'Arial', sans-serif;
    color: #333;
}

.header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2rem;
}

.company-info h1 {
    color: var(--primary);
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
}
.company-info p { margin: 2px 0; font-size: 0.9rem; color: #555; }

.quotation-meta {
    text-align: right;
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #eee;
}

.quotation-meta h2 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #444; }

.meta-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.3rem;
    font-size: 0.9rem;
}

.divider { border: 0; border-top: 2px solid var(--primary); margin: 2rem 0; }

.client-section h3, .details-section h3 {
    font-size: 1.1rem;
    background: #eaeaea;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border-left: 4px solid var(--primary);
}

.client-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
.client-table th { text-align: left; width: 150px; padding: 5px 0; color: #666; }
.client-table td { font-weight: bold; }

.items-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
.items-table th { background: #333; color: white; padding: 10px; text-align: left; }
.items-table td { border-bottom: 1px solid #ddd; padding: 10px; vertical-align: top; }
.text-right { text-align: right; }

.specs-summary {
    display: block;
    margin-top: 0.5rem;
    color: #666;
    font-style: italic;
}

.totals-section {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 3rem;
}

.totals-box {
    width: 300px;
}

.total-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
}

.grand-total {
    font-weight: bold;
    font-size: 1.2rem;
    border-top: 2px solid #333;
    border-bottom: none;
    margin-top: 0.5rem;
    padding-top: 1rem;
}

.footer {
    text-align: center;
    font-size: 0.8rem;
    color: #888;
    margin-top: 4rem;
    border-top: 1px solid #eee;
    padding-top: 1rem;
}

.action-buttons {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    gap: 1rem;
}

.btn-print {
    padding: 12px 24px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 30px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}


@media print {
    .print-layout { margin: 0; padding: 0; box-shadow: none; max-width: 100%; }
    .no-print { display: none !important; }
    body { background: white; }
}
</style>
