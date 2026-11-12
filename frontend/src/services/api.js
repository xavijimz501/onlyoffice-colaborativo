const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    throw new Error(data.error || 'No fue posible completar la solicitud.')
  }
  return data
}

export { API_URL }
