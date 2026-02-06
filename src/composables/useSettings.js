import { ref } from 'vue'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'

const settings = ref({
    specs: [
        { id: 'entidades', label: 'Entidades de Datos (Modelos)', baseHours: 4, hint: 'Ej: Usuarios, Productos, Pedidos' },
        { id: 'roles', label: 'Roles de Usuario', baseHours: 2, hint: 'Ej: Admin, Vendedor, Cliente' },
        { id: 'vistas', label: 'Vistas Clave (Pantallas)', baseHours: 3, hint: 'Pantallas únicas o complejas' },
        { id: 'apis', label: 'Integraciones / APIs', baseHours: 8, hint: 'Conexiones externas' }
    ],
    matrix: [
        { days: 1, label: 'Contacto Inicial', stage: 'lead', color: 'warning', icon: 'fa-solid fa-stopwatch', action: 'Contactar y Presentar' },
        { days: 4, label: 'Seguimiento 1', stage: 'contact', color: 'danger', icon: 'fa-solid fa-bell', action: 'Recordatorio (Wsp/LinkedIn)' },
        { days: 9, label: 'Aporte Valor', stage: 'followup', color: 'danger', icon: 'fa-solid fa-gift', action: 'Enviar Aporte de Valor' },
        { days: 15, label: 'Seguimiento 2', stage: 'followup', color: 'danger', icon: 'fa-solid fa-circle-question', action: 'Consultar revisión' },
        { days: 30, label: 'Check-in Mensual', stage: 'closed_won', color: 'danger', icon: 'fa-solid fa-calendar', action: 'Check-in Mensual' }
    ],
    discounts: [
        { id: 'd1', label: 'Descuento Partner', value: 10 },
        { id: 'd2', label: 'Pago Contado', value: 5 }
    ],
    rates: {
        hourlyRate: 25000
    }
})

const loading = ref(false)
const error = ref(null)

export function useSettings() {

    const fetchSettings = async () => {
        loading.value = true
        try {
            const docRef = doc(db, 'system_settings', 'general')
            const snap = await getDoc(docRef)
            if (snap.exists()) {
                const data = snap.data()
                // Merge carefully to avoid wiping defaults if keys miss
                if (data.specs) settings.value.specs = data.specs
                if (data.matrix) settings.value.matrix = data.matrix
                if (data.discounts) settings.value.discounts = data.discounts
                if (data.rates) settings.value.rates = data.rates
            } else {
                // If not exists, create it with defaults
                await saveSettings(settings.value)
            }
        } catch (e) {
            console.error("Error fetching settings:", e)
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    const saveSettings = async (newSettings) => {
        loading.value = true
        try {
            const docRef = doc(db, 'system_settings', 'general')
            await setDoc(docRef, newSettings)
            settings.value = newSettings
        } catch (e) {
            console.error("Error saving settings:", e)
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        settings,
        loading,
        error,
        fetchSettings,
        saveSettings
    }
}
