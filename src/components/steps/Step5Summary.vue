<template>
  <div class="container">
    <div class="header">
      <h2>Resumen de Cotización</h2>
      <span v-if="store.codigo" class="codigo-cotizacion"
        >Código: {{ store.codigo }}</span
      >
    </div>

    <div v-if="store.servicios.length && store.cliente" class="card resumen">
      <h3>Cliente</h3>
      <p>
        {{ store.cliente.nombre }} | {{ store.cliente.razonSocial }} |
        {{ store.cliente.rut }}
      </p>

      <hr />

      <h3>Servicios Cotizados</h3>
      <div
        v-for="servicio in store.servicios"
        :key="servicio.id"
        class="bloque-servicio"
      >
        <strong>{{ servicio.nombre }}</strong>
        <p>Base: ${{ servicio.cobroBase.toLocaleString() }}</p>

        <div v-if="adicionalesPorServicio(servicio.id).length">
          <ul v-if="adicionalesPorServicio(servicio.id).length" class="lista-adicionales">
          <li v-for="a in adicionalesPorServicio(servicio.id)" :key="a.id">
            <span class="guion">↳</span> {{ a.nombre }}
            <span class="precio">
              {{ a.precio ? '$' + a.precio.toLocaleString() : 'A definir' }}
            </span>
          </li>
        </ul>

        </div>
        <p v-else>(Sin adicionales)</p>

        <hr />
      </div>

      <h3>Horas Extra</h3>
      <p>
        {{ store.horasExtra }} hora(s) - $
        {{ (store.horasExtra * totalHorasExtras).toLocaleString() }}
      </p>

      <hr />

      <h3>Total Final</h3>
      <p class="total">${{ store.total.toLocaleString() }}</p>
    </div>

    <p v-else>Cargando datos de cotización...</p>

    <div class="btn-group">
      <button
        class="guardar-btn"
        @click="guardarCotizacion"
        :disabled="cargando"
      >
        💾 Guardar Cotización
      </button>

      <button @click="router.push('/imprimir')" :disabled="cargando">
        🖨️ Imprimir Cotización
      </button>

      <button class="volver-btn" @click="volverADashboard" :disabled="cargando">
        🔙 Volver al Dashboard
      </button>
    </div>

    <div v-if="cargando" class="overlay-carga">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from "../../store/quotation";
import { useRouter } from "vue-router";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { ref } from "vue";

const store = useQuotationStore();
const router = useRouter();
const cargando = ref(false);

const empresa = {
  nombre: "BioBio Code",
  rut: "76.123.456-7",
  direccion: "Barros Arana 492, Of. 78, Concepción, Chile",
  telefono: "+56 9 3104 7688",
  email: "contacto@biobiocode.cl",
};

const adicionalesPorServicio = (servicioId) => {
  return store.adicionales.filter((a) => a.servicioId === servicioId);
};

const totalHorasExtras = store.servicios.reduce((acc, s) => {
  return acc + (s.cobroAdicional || 0);
}, 0);

const guardarCotizacion = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return alert("Usuario no autenticado.");

    cargando.value = true;

    const contadorRef = doc(db, "contador", "cotizaciones");
    const contadorSnap = await getDoc(contadorRef);

    let ultimoCorrelativo = 0;
    if (contadorSnap.exists()) {
      ultimoCorrelativo = contadorSnap.data().ultimoCorrelativo || 0;
    }

    const nuevoCorrelativo = ultimoCorrelativo + 1;
    const codigoCotizacion = `COT-${String(nuevoCorrelativo).padStart(3, "0")}`;

    const cotizacion = {
      codigo: codigoCotizacion,
      vendedorUID: user.uid,
      vendedorNombre: user.displayName?.trim() || user.email || user.uid,
      vendedorEmail: user.email,
      cliente: store.cliente,
      servicios: store.servicios.map(s => ({
        ...s,
        categoria:
          [1, 2, 3].includes(s.id)
            ? 'Desarrollo Web'
            : [4, 5, 6].includes(s.id)
            ? 'Automatización y Dashboards'
            : [7, 8, 9].includes(s.id)
            ? 'I+D y Diagnóstico'
            : 'Sin categoría'
      })),

      adicionales: store.adicionales,
      horasExtra: store.horasExtra,
      total: store.total,
      createdAt: serverTimestamp(),
      empresa,
    };

    await addDoc(collection(db, "cotizaciones"), cotizacion);
    await setDoc(contadorRef, { ultimoCorrelativo: nuevoCorrelativo });

    store.codigo = codigoCotizacion;
    store.empresa = empresa;
    store.vendedorNombre = user.displayName;
    store.vendedorEmail = user.email;

    localStorage.setItem("ultimaCotizacion", JSON.stringify(cotizacion));
  } catch (err) {
    console.error("Error al guardar cotización", err);
  } finally {
    cargando.value = false;
  }
};

const volverADashboard = () => {
  if (confirm("¿Estás seguro de salir sin guardar la cotización?")) {
    store.reset();
    router.push("/dashboard");
  }
};
</script>

<style scoped>
.container {
  position: relative;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.codigo-cotizacion {
  font-size: 1rem;
  font-weight: bold;
  color: var(--primary);
}
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
.bloque-servicio {
  margin-bottom: 1rem;
}
ul {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0.5rem;
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
.volver-btn {
  background-color: #ccc;
  color: #000;
}
.volver-btn:hover {
  background-color: #bbb;
}
.overlay-carga {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.spinner {
  width: 50px;
  height: 50px;
  border: 6px solid #ddd;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.lista-adicionales {
  margin-top: 0.5rem;
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 2px solid #ddd;
}

.lista-adicionales li {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #444;
}

.lista-adicionales .guion {
  margin-right: 0.5rem;
  color: var(--primary);
  font-weight: bold;
}

.lista-adicionales .precio {
  color: #222;
  font-weight: bold;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
