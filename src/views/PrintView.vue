<template>
  <div class="print-container" v-if="project">
    
    <!-- PÁGINA 1: COTIZACIÓN -->
    <div class="print-page">
        <!-- Header Empresa -->
        <header class="header">
          <div class="company-info">
            <img src="../assets/img/logo_dark.png" alt="BioBio Code" class="print-logo" />
            <div class="company-details">
                <h1>BIOBIO CODE</h1>
                <p>Barros Arana 492, Of. 78, Concepción</p>
                <p>RUT: 76.123.456-7</p>
                <p>+56 9 3104 7688</p>
                <p>contacto@biobiocode.cl</p>
            </div>
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
    </div> 
    <!-- FIN PÁGINA 1 -->

    <!-- PÁGINA 2: ALCANCES -->
    <div class="print-page page-break" v-if="project.specs?.scope?.included || project.specs?.scope?.excluded">
        <!-- Header Página 2 -->
        <header class="header">
          <div class="company-info">
            <img src="../assets/img/logo_print.png" alt="BioBio Code" class="print-logo" />
            <div class="company-details">
                <h1>BIOBIO CODE</h1>
                <p>ANEXO: ALCANCES Y CONDICIONES</p>
                <p>Cotización Nº: {{ project.codigo }}</p>
            </div>
          </div>
        </header>

        <hr class="divider">

        <section class="scope-section">
          <h3>ALCANCES Y CONDICIONES</h3>
          
          <div v-if="project.specs?.scope?.included" class="scope-block">
            <h4>Alcance del Servicio</h4>
            <div class="scope-content" v-html="project.specs.scope.included"></div>
          </div>
    
          <div v-if="project.specs?.scope?.excluded" class="scope-block mt-4">
            <h4>Exclusiones y Requisitos</h4>
            <div class="scope-content" v-html="project.specs.scope.excluded"></div>
          </div>
        </section>

        <footer class="footer">
            <p>BioBio Code - Anexo de Alcances</p>
        </footer>
    </div>


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
/* Main Container background for screen view */
.print-container {
    background: #f3f4f6;
    min-height: 100vh;
    padding: 2rem 0;
}

/* Page Card Style (Screen) */
.print-page {
    max-width: 800px; /* Carta width */
    margin: 0 auto 2rem auto;
    background: white;
    padding: 3rem;
    box-shadow: 0 0 15px rgba(0,0,0,0.1);
    font-family: 'Arial', sans-serif;
    color: #333;
    position: relative;
    box-sizing: border-box;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
}

.company-info {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
}

.print-logo {
    height: 80px;
    width: auto;
    object-fit: contain;
}

.company-details h1 {
    color: var(--primary);
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    line-height: 1;
}
.company-details p { margin: 2px 0; font-size: 0.9rem; color: #555; }

.quotation-meta {
    text-align: right;
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #eee;
    min-width: 200px;
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

.client-section h3, .details-section h3, .scope-section h3 {
    font-size: 1.1rem;
    background: #eaeaea;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border-left: 4px solid var(--primary);
}

.scope-section { margin-bottom: 2rem; }
.scope-block { padding: 10px 20px; background: #fafafa; border-radius: 6px; border: 1px solid #eee; }
.scope-block h4 { margin: 0 0 0.5rem 0; color: var(--primary); font-size: 0.95rem; text-transform: uppercase; }
.scope-content { color: #444; font-size: 0.9rem; line-height: 1.5; }
.scope-content :deep(p) { margin-bottom: 0.5rem; }
.scope-content :deep(ul), .scope-content :deep(ol) { margin-left: 1.5rem; margin-bottom: 0.5rem; }
.scope-content :deep(li) { margin-bottom: 0.25rem; }
.mt-4 { margin-top: 1rem; }

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
    margin-top: auto; /* Push to bottom if flex */
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
    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-container { background: white; padding: 0; min-height: auto; }
    .print-page {
        margin: 0;
        padding: 0;
        box-shadow: none;
        max-width: 100%;
        width: 100%;
        min-height: auto; /* Allow natural height */
        page-break-after: auto; /* Let content flow naturally unless forced */
    }
    
    /* Force new page for Scope section specifically */
    .print-page.page-break { 
        page-break-before: always; 
        margin-top: 2cm; /* Spacing for start of new page */
    }

    /* Prevent breaks inside critical elements */
    .header, .items-table thead, .totals-section, .client-section { 
        page-break-inside: avoid; 
    }
    
    /* Allow table rows to break cleanly */
    .items-table tr { 
        page-break-inside: avoid; 
        page-break-after: auto; 
    }
    
    .items-table thead { 
        display: table-header-group; 
    }
    
    .items-table tfoot { 
        display: table-footer-group; 
    }

    .no-print { display: none !important; }
}
</style>
