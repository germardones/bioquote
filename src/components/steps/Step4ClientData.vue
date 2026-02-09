<template>
  <div class="container">
    <h2>Datos del Cliente</h2>

    <div class="card">
      <label>Nombre:</label>
      <input v-model="cliente.nombre" type="text" placeholder="Ej: Juan Pérez" />
      <p v-if="errores.nombre" class="error">{{ errores.nombre }}</p>

      <label>Razón Social:</label>
      <input v-model="cliente.razonSocial" type="text" placeholder="Ej: Inversiones JP SpA" />
      <p v-if="errores.razonSocial" class="error">{{ errores.razonSocial }}</p>

      <label>RUT:</label>
      <div class="rut-input-group">
        <input 
          v-model="cliente.rut" 
          type="text" 
          placeholder="Ej: 12.345.678-9" 
          @focus="showDropdown = true"
          @blur="handleBlur"
          @input="handleRutInput"
          maxlength="12"
        />
        <span v-if="buscandoCliente" class="loading-icon">🔍</span>
        
        <!-- Dropdown Autocomplete -->
        <ul v-if="showDropdown && filteredClients.length > 0" class="autocomplete-dropdown">
            <li 
                v-for="c in filteredClients" 
                :key="c.rut" 
                @mousedown.prevent="seleccionarCliente(c)"
            >
                <strong>{{ c.rut }}</strong> - {{ c.razonSocial || c.nombre }}
            </li>
        </ul>
      </div>
      <p v-if="errores.rut" class="error">{{ errores.rut }}</p>

      <label>Dirección:</label>
      <input v-model="cliente.direccion" type="text" placeholder="Ej: Av. Libertad 1234" />

      <label>Correo electrónico:</label>
      <input v-model="cliente.email" type="email" placeholder="Ej: cliente@correo.com" />
      <p v-if="errores.email" class="error">{{ errores.email }}</p>

      <label>Contacto (teléfono u otro):</label>
      <input v-model="cliente.contacto" type="text" placeholder="Ej: +56 9 1234 5678" />
      <p v-if="errores.contacto" class="error">{{ errores.contacto }}</p>
    </div>

    <div class="btn-group">
      <button class="btn-continuar" @click="guardarYContinuar">Continuar</button>
      <button @click="volverAtras" class="btn-volver">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from '../../store/quotation'
import { reactive, ref, onMounted, computed, watch } from 'vue' // Added watch
import { useRouter } from 'vue-router'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore'
import { formatRut } from '../../utils/rutUtils'

const router = useRouter()
const store = useQuotationStore()

const cliente = reactive({ ...store.cliente })
const errores = reactive({})
const buscandoCliente = ref(false)

// Validaciones
const validarRut = (rut) => /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK]$/.test(rut)
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validarTelefono = (telefono) => {
  const soloNumeros = telefono.replace(/\D/g, '')
  return soloNumeros.length >= 9 && soloNumeros.length <= 12
}

const handleRutInput = (e) => {
    cliente.rut = formatRut(e.target.value)
}

const knownClients = ref([])
const showDropdown = ref(false)

// Cargar clientes previos
onMounted(async () => {
    try {
        const snap = await getDocs(collection(db, 'projects'))
        const unique = new Map()
        
        snap.docs.forEach(d => {
            const p = d.data()
            // Prioridad: client_data > cliente > fallback
            const c = p.client_data || p.cliente
            if (c && c.rut) {
                // Guardamos el más reciente si ya existe (asumiendo orden, o simplemente el primero)
                // O mejor, sobreescribimos para tener la data más "fresca" si ordenamos por fecha...
                // Simplemente guardemos si no está.
                if (!unique.has(c.rut)) {
                    unique.set(c.rut, {
                        nombre: c.nombre || p.client_name || '',
                        razonSocial: c.razonSocial || '',
                        rut: c.rut,
                        direccion: c.direccion || '',
                        email: c.email || '',
                        contacto: c.contacto || ''
                    })
                }
            }
        })
        knownClients.value = Array.from(unique.values())
    } catch (e) {
        console.error("Error loading history:", e)
    }
})

const filteredClients = computed(() => {
    if (!cliente.rut) return []
    const term = cliente.rut.toLowerCase()
    return knownClients.value.filter(c => 
        c.rut.toLowerCase().includes(term) || 
        c.razonSocial.toLowerCase().includes(term)
    ).slice(0, 5) // Limit to 5 results
})

const seleccionarCliente = (c) => {
    Object.assign(cliente, c)
    // Ensure format on selection
    if(cliente.rut) cliente.rut = formatRut(cliente.rut)
    showDropdown.value = false
    errores.rut = ''
}

// Ocultar dropdown al perder foco (con delay para permitir click)
const handleBlur = () => {
    setTimeout(() => { showDropdown.value = false }, 200)
}

const guardarYContinuar = () => {
  errores.nombre = !cliente.nombre ? 'El nombre es obligatorio.' : ''
  errores.razonSocial = !cliente.razonSocial ? 'La razón social es obligatoria.' : ''
  errores.rut = cliente.rut && !validarRut(cliente.rut)
    ? 'Formato de RUT no válido. Ej: 12.345.678-9'
    : ''
  errores.email = !cliente.email
    ? 'El correo electrónico es obligatorio.'
    : !validarEmail(cliente.email)
      ? 'Correo electrónico no válido.'
      : ''
  errores.contacto = cliente.contacto && !validarTelefono(cliente.contacto)
    ? 'Número de contacto no válido (debe tener entre 9 y 12 dígitos).'
    : ''

  const hayErrores = Object.values(errores).some(Boolean)
  if (hayErrores) return

  store.cliente = cliente
  router.push({ name: 'Paso3Resumen' })
}

const volverAtras = () => {
  router.push({ name: 'Paso1Specs' })
}
</script>

<style scoped>
.card {
  background: var(--bg-surface);
  padding: 2rem;
  margin-top: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

input {
  padding: 12px;
  margin-bottom: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-main);
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0, 131, 102, 0.2);
}

label {
  font-weight: 600;
  margin-top: 1.25rem;
  display: block;
  color: var(--text-main);
}

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn-continuar {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--primary);
  color: white;
  transition: all 0.2s;
  flex: 1;
}

.btn-continuar:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}

.rut-input-group {
  position: relative;
}

.loading-icon {
  position: absolute;
  right: 12px;
  top: 14px;
  color: var(--primary);
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    border: 1px solid var(--primary);
    border-radius: 0 0 8px 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    z-index: 10;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
}

.autocomplete-dropdown li {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-main);
}

.autocomplete-dropdown li:hover {
    background: var(--bg-app);
    color: var(--primary);
}

.autocomplete-dropdown li:last-child {
    border-bottom: none;
}
</style>
