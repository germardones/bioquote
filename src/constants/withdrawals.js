// Partner withdrawals constants
// IMPORTANT: withdrawals are NOT operational expenses.
// They are equity distributions and must be tracked separately
// to avoid distorting the income statement.

export const WITHDRAWAL_TYPES = [
  {
    id: 'utilidades',
    label: 'Retiro de utilidades',
    color: '#0ea5e9',
    icon: 'fa-money-bill-trend-up',
    description: 'Distribución de ganancias acumuladas.'
  },
  {
    id: 'capital',
    label: 'Devolución de capital',
    color: '#8b5cf6',
    icon: 'fa-piggy-bank',
    description: 'Devolución parcial o total del aporte de capital del socio.'
  },
  {
    id: 'anticipo',
    label: 'Anticipo de utilidades',
    color: '#f59e0b',
    icon: 'fa-hand-holding-dollar',
    description: 'Adelanto contra utilidades futuras (debe regularizarse al cierre).'
  }
]

export const withdrawalTypeMeta = (id) =>
  WITHDRAWAL_TYPES.find(t => t.id === id) || WITHDRAWAL_TYPES[0]
