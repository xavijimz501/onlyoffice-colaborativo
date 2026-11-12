import { apiRequest } from './api'

export async function getDocuments() {
  const data = await apiRequest('/api/documents')
  return data.documents || []
}

export async function getDocumentEditorConfig(documentId) {
  return apiRequest(`/api/documents/${documentId}/editor-config`)
}

export async function getDocumentVersions(documentId) {
  const data = await apiRequest(`/api/documents/${documentId}/versions`)
  return data.versions || []
}

export async function getDocumentAudit(documentId) {
  const data = await apiRequest(`/api/documents/${documentId}/audit`)
  return data.audit || []
}

export async function createDocument(title) {
  return apiRequest('/api/documents', { method: 'POST', body: JSON.stringify({ title }) })
}

export async function saveDocument(documentId) {
  return apiRequest(`/api/documents/${documentId}/save`, { method: 'POST' })
}
