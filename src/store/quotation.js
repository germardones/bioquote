// quotation.js
import { defineStore } from 'pinia'
import { useSettings } from '../composables/useSettings'

export const useQuotationStore = defineStore('quotation', {
  state: () => ({
    // Tipo de cotización: 'parametric' | 'custom'
    type: 'parametric',

    // Nuevas variables parametúricas
    specs: {
      entidades: 0, // Base 4h
      roles: 0,     // Base 2h
      vistas: 0,    // Base 3h
      apis: 0,      // Base 8h
      complejidad: 1.0
    },

    selectedDiscount: null, // { id, label, value }

    // Items para cotización personalizada
    customItems: [],
    // Estructura item: { id, description, hours, rate, observation }

    // Configuración global
    config: {
      costo_base: {
        entidades: 4,
        roles: 2,
        vistas: 3,
        apis: 8
      },
      tarifas: {
        valor_hora_costo: 15000,
        valor_hora_venta: 25000,
        factor_seguridad: 1.20, // Restored as requested
        factor_antigravity: 0.50
      }
    },
    cliente: {
      nombre: '',
      contacto: '',
      razonSocial: '',
      rut: '',
      servicioDeseado: ''
    },
    // Alcance y Condiciones
    scopeOfService: '',
    exclusions: ''
  }),
  getters: {
    // Cálculo de horas mercado
    horasMercado(state) {
      if (state.type === 'custom') {
        return state.customItems.reduce((acc, item) => acc + (Number(item.hours) || 0), 0)
      }

      // Dynamic Calculation using Global Settings
      const { settings } = useSettings() // Access singleton state
      let baseHours = 0

      const specsList = settings.value.specs || []

      specsList.forEach(spec => {
        const count = state.specs[spec.id] || 0
        const hours = Number(spec.baseHours) || 0
        baseHours += count * hours
      })

      // Fallback for hardcoded if settings empty (rare/init)
      if (specsList.length === 0) {
        const { entidades, roles, vistas, apis } = state.specs
        baseHours = (entidades * 4) + (roles * 2) + (vistas * 3) + (apis * 8)
      }

      const complejidad = state.specs.complejidad || 1.0
      return baseHours * complejidad
    },
    // Cálculo de horas reales (Antigravity impact)
    horasReales(state) {
      const horasM = this.horasMercado
      const { factor_antigravity } = state.config.tarifas
      return horasM * (1 - factor_antigravity)
    },
    // Cálculo financiero completo
    financials(state) {
      const { settings } = useSettings()

      // Use dynamic rate if available, else fallback
      const dynamicRate = settings.value.rates?.hourlyRate
      const valor_hora_venta = dynamicRate || state.config.tarifas.valor_hora_venta

      const { valor_hora_costo, factor_seguridad } = state.config.tarifas

      if (state.type === 'custom') {
        let precioVentaTotal = 0
        let horasTotal = 0

        state.customItems.forEach(item => {
          const h = Number(item.hours) || 0
          if (item.pricingMethod === 'fixed') {
            precioVentaTotal += (Number(item.fixedValue) || 0)
          } else {
            const r = Number(item.rate) || valor_hora_venta
            precioVentaTotal += (h * r)
          }
          horasTotal += h
        })

        const costoInterno = horasTotal * valor_hora_costo
        const margen = precioVentaTotal - costoInterno

        return {
          horasMercado: horasTotal,
          horasReales: Math.round(horasTotal * (1 - 0.5)),
          precioSugerido: Math.round(precioVentaTotal),
          costoInterno: Math.round(costoInterno),
          margen: Math.round(margen),
          margenPorcentaje: precioVentaTotal > 0 ? Math.round((margen / precioVentaTotal) * 100) : 0
        }
      }

      // Logic paramétrico standard
      const horasM = this.horasMercado
      const horasR = this.horasReales

      // Base Calculation (Pure Hours)
      const valorBasePuro = horasM * valor_hora_venta

      // Safety Factor Calculation
      // Restore factor to 1.20 as requested
      const bufferSeguridad = valorBasePuro * (factor_seguridad - 1)
      let precioVenta = valorBasePuro + bufferSeguridad

      // Apply Discount if selected
      let discountAmount = 0
      if (state.selectedDiscount && state.selectedDiscount.value) {
        const pct = Number(state.selectedDiscount.value) / 100
        discountAmount = precioVenta * pct
        precioVenta = precioVenta - discountAmount
      }

      const costoInterno = horasR * valor_hora_costo
      const margen = precioVenta - costoInterno

      return {
        horasMercado: Math.round(horasM * 10) / 10,
        horasReales: Math.round(horasR * 10) / 10,
        valorBasePuro: Math.round(valorBasePuro),
        montoSeguridad: Math.round(bufferSeguridad), // Expose the "hidden" factor amount
        precioSugerido: Math.round(precioVenta),
        montoDescuento: Math.round(discountAmount),
        descuentoAplicado: state.selectedDiscount,
        costoInterno: Math.round(costoInterno),
        margen: Math.round(margen),
        margenPorcentaje: precioVenta > 0 ? Math.round((margen / precioVenta) * 100) : 0
      }
    },
    // Mantener compatibilidad si algo usa 'total'
    total() {
      return this.financials.precioSugerido
    }
  },
  actions: {
    reset() {
      this.type = 'parametric'
      this.customItems = []
      this.specs = {
        entidades: 0,
        roles: 0,
        vistas: 0,
        apis: 0,
        complejidad: 1.0
      }
      this.cliente = {
        nombre: '',
        contacto: '',
        razonSocial: '',
        rut: '',
        servicioDeseado: ''
      }
      // Strategy: Initialize empty here, and let the component (NewQuotation or StepScope) populate ONLY IF empty.
      this.scopeOfService = ''
      this.exclusions = ''
      this.selectedDiscount = null
    },
    setDiscount(discount) {
      this.selectedDiscount = discount ? { ...discount } : null
    },
    addItem(item) {
      this.customItems.push({
        id: Date.now(),
        ...item
      })
    },
    removeItem(id) {
      this.customItems = this.customItems.filter(i => i.id !== id)
    }
  }
})
