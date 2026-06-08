export const formatCurrency = (value, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const formatNumber = (value) => {
  return new Intl.NumberFormat('fr-FR').format(value)
}

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date))
}

export const formatDateShort = (date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short'
  }).format(new Date(date))
}

export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-900/30 text-green-400 border-green-700',
    inactive: 'bg-gray-900/30 text-gray-400 border-gray-700',
    pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
    shipped: 'bg-blue-900/30 text-blue-400 border-blue-700',
    delivered: 'bg-green-900/30 text-green-400 border-green-700',
    cancelled: 'bg-red-900/30 text-red-400 border-red-700',
    production: 'bg-purple-900/30 text-purple-400 border-purple-700',
    transit: 'bg-blue-900/30 text-blue-400 border-blue-700',
    customs: 'bg-orange-900/30 text-orange-400 border-orange-700',
    warehouse: 'bg-cyan-900/30 text-cyan-400 border-cyan-700',
    fba: 'bg-green-900/30 text-green-400 border-green-700'
  }
  return colors[status] || colors.pending
}

export const getAlertIcon = (type) => {
  const icons = {
    stock: '📦',
    price: '💰',
    review: '⭐',
    competitor: '🎯',
    order: '📋',
    quality: '⚠️'
  }
  return icons[type] || '🔔'
}
