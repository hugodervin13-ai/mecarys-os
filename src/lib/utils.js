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
    active: 'bg-green-50 text-green-600 border-green-200',
    inactive: 'bg-gray-50 text-gray-600 border-gray-200',
    pending: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    shipped: 'bg-blue-50 text-blue-600 border-blue-200',
    delivered: 'bg-green-50 text-green-600 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    production: 'bg-purple-50 text-purple-600 border-purple-200',
    transit: 'bg-blue-50 text-blue-600 border-blue-200',
    customs: 'bg-orange-50 text-orange-600 border-orange-200',
    warehouse: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    fba: 'bg-green-50 text-green-600 border-green-200'
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
