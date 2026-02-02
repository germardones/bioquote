// quotation.js
import { defineStore } from 'pinia'

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

    // Items para cotización personalizada
    customItems: [],
    // Estructura item: { id, description, hours, rate, observation }

    // Configuración global (Hardcoded por ahora, idealmente vendría de Firestore 'settings')
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
        factor_seguridad: 1.20,
        factor_antigravity: 0.50
      }
    },
    cliente: {
      nombre: '',
      contacto: '',
      razonSocial: '',
      rut: '',
      servicioDeseado: ''
    }
  }),
  getters: {
    // Cálculo de horas mercado
    horasMercado(state) {
      if (state.type === 'custom') {
        return state.customItems.reduce((acc, item) => acc + (Number(item.hours) || 0), 0)
      }

      const { entidades, roles, vistas, apis, complejidad } = state.specs
      const { costo_base } = state.config

      const baseHours =
        (entidades * costo_base.entidades) +
        (roles * costo_base.roles) +
        (vistas * costo_base.vistas) +
        (apis * costo_base.apis)

      return baseHours * complejidad
    },
    // Cálculo de horas reales (Antigravity impact)
    horasReales(state) {
      const horasM = this.horasMercado
      const { factor_antigravity } = state.config.tarifas

      // En custom, asumiremos que las horas reales son las mismas o aplicamos el mismo factor si se desea.
      // Por consistencia, aplicamos el mismo beneficio de Antigravity si es que aplica, 
      // pero en custom items a veces es "horas hombre" puras.
      // Dajémoslo con el factor por ahora para mostrar el "ahorro" o eficiencia.
      return horasM * (1 - factor_antigravity)
    },
    // Cálculo financiero completo
    financials(state) {
      const { valor_hora_venta, valor_hora_costo, factor_seguridad } = state.config.tarifas

      if (state.type === 'custom') {
        // En custom, el precio de venta suele ser explícito por item (hours * rate)
        // O si no tienen rate, se usa el standard.
        let precioVentaTotal = 0
        let horasTotal = 0

        state.customItems.forEach(item => {
          const h = Number(item.hours) || 0

          if (item.pricingMethod === 'fixed') {
            // Precio Fijo directo
            precioVentaTotal += (Number(item.fixedValue) || 0)
          } else {
            // Por Hora (Default)
            const r = Number(item.rate) || valor_hora_venta
            precioVentaTotal += (h * r)
          }

          horasTotal += h
        })

        // Costo interno sigue siendo base por hora (developers cost)
        // Aunque en custom items podría variar, asumiremos standard cost para simplificar
        const costoInterno = horasTotal * valor_hora_costo
        const margen = precioVentaTotal - costoInterno

        return {
          horasMercado: horasTotal,
          horasReales: Math.round(horasTotal * (1 - 0.5)), // Mismo dummy logic de 'real' vs 'mercado'
          precioSugerido: Math.round(precioVentaTotal), // En custom, el sugerido es el calculado
          costoInterno: Math.round(costoInterno),
          margen: Math.round(margen),
          margenPorcentaje: precioVentaTotal > 0 ? Math.round((margen / precioVentaTotal) * 100) : 0
        }
      }

      // Logic paramétrico standard
      const horasM = this.horasMercado
      const horasR = this.horasReales

      const prezzoBase = horasM * valor_hora_venta
      // const precioSugerido = prezzoBase + (prezzoBase * (factor_seguridad - 1)) 
      // Simplificado:
      const precioVenta = (horasM * valor_hora_venta) * factor_seguridad

      const costoInterno = horasR * valor_hora_costo
      const margen = precioVenta - costoInterno

      return {
        horasMercado: Math.round(horasM * 10) / 10,
        horasReales: Math.round(horasR * 10) / 10,
        precioSugerido: Math.round(precioVenta),
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
