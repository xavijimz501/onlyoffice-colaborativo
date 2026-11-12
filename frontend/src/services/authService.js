import { apiRequest } from './api'

export async function login(correo, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, password }),
  })
}

export async function getCurrentUser() {
  const result = await apiRequest('/api/auth/me')
  return result.user
}
