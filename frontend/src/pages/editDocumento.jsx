import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useLocation, useNavigate } from 'react-router-dom'
import HeaderGobMX from '../components/HeaderGobMx'
import NavbarGobMX from '../components/navbar'
import FooterGobMX from '../components/footer'
import { API_URL } from '../services/api'
import { getCurrentUser } from '../services/authService'
import { createDocument, getDocumentAudit, getDocumentEditorConfig, getDocuments, getDocumentVersions, saveDocument } from '../services/documentService'
import '../App.css'

function readSavedUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

export default function EditDocumento() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [user, setUser] = useState(location.state?.user || readSavedUser())
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [documentId, setDocumentId] = useState(null)
  const [documents, setDocuments] = useState([])
  const [versions, setVersions] = useState([])
  const [audit, setAudit] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [editorReady, setEditorReady] = useState(false)
  const activeDocument = documents.find((document) => String(document.id) === String(documentId))

  useEffect(() => {
    let active = true
    if (!token) { navigate('/login', { replace: true }); return undefined }
    getCurrentUser().then((currentUser) => {
      if (!active) return
      setUser(currentUser)
      localStorage.setItem('user', JSON.stringify(currentUser))
    }).catch(() => navigate('/login', { replace: true }))
    return () => { active = false }
  }, [token, navigate])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    getDocuments()
      .then((items) => { if (!cancelled) setDocuments(items) })
      .catch((cause) => { if (!cancelled) setError(cause.message) })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    let editor
    let cancelled = false
    setEditorReady(false)
    setOnlineUsers([])
    if (!user || !documentId) return undefined

    async function initializeEditor() {
      try {
        const { documentServerUrl, config } = await getDocumentEditorConfig(documentId)
        await loadOnlyOfficeApi(documentServerUrl)
        if (cancelled) return
        editor = new window.DocsAPI.DocEditor('onlyoffice-editor', {
          ...config,
          width: '100%',
          height: '100%',
          events: {
            ...config.events,
            onDocumentReady: () => setEditorReady(true),
            onError: (event) => setError(event?.data?.errorDescription || 'ONLYOFFICE reportó un error.'),
          },
        })
        setError('')
      } catch (cause) {
        if (!cancelled) setError(cause.message || 'No se pudo iniciar ONLYOFFICE.')
      }
    }
    initializeEditor()
    return () => { cancelled = true; editor?.destroyEditor() }
  }, [documentId, user])

  useEffect(() => {
    if (!documentId) { setVersions([]); setAudit([]); return undefined }
    let cancelled = false
    Promise.all([getDocumentVersions(documentId), getDocumentAudit(documentId)])
      .then(([nextVersions, nextAudit]) => {
        if (!cancelled) { setVersions(nextVersions); setAudit(nextAudit) }
      })
      .catch((cause) => { if (!cancelled) setError(cause.message) })
    return () => { cancelled = true }
  }, [documentId])

  useEffect(() => {
    if (!token || !documentId || !editorReady) return undefined
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('document:join', documentId))
    socket.on('presence:update', setOnlineUsers)
    socket.on('audit:update', () => refreshAudit(documentId))
    socket.on('connect_error', () => setError('No se pudo conectar al canal de colaboración.'))
    return () => { socket.disconnect(); setOnlineUsers([]) }
  }, [documentId, token, editorReady])

  async function refreshAudit(id = documentId) {
    if (!id) return
    try {
      const [nextVersions, nextAudit] = await Promise.all([getDocumentVersions(id), getDocumentAudit(id)])
      setVersions(nextVersions)
      setAudit(nextAudit)
    } catch { /* La conexión realtime volverá a emitir al reintentar. */ }
  }

  async function handleCreateDocument() {
    const title = window.prompt('Nombre del documento nuevo', 'Documento colaborativo')
    if (!title?.trim()) return
    setCreating(true)
    setMessage('')
    try {
      const result = await createDocument(title.trim())
      const nextDocuments = await getDocuments()
      setDocuments(nextDocuments)
      setDocumentId(String(result.id))
      setMessage('Documento creado. Ya puedes editarlo.')
    } catch (cause) { setError(cause.message) }
    finally { setCreating(false) }
  }

  async function handleSave() {
    if (!documentId) return
    setSaving(true)
    setMessage('')
    try {
      const result = await saveDocument(documentId)
      setMessage(result.saved ? 'Guardado solicitado; auditoría se actualizará al confirmar ONLYOFFICE.' : result.message)
      if (!result.saved) await refreshAudit()
    } catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }

  if (!user) return <main className="login-container">Cargando sesión…</main>

  return (
    <div className="documento-page">
      <HeaderGobMX />
      <NavbarGobMX />
      <main className="app-shell" id="mainContent">
        <header className="topbar">
          <div className="brand-mark">O</div>
          <div className="brand-copy"><strong>{activeDocument?.title || 'Editor colaborativo'}</strong><span>{user.nombre} · {user.correo}</span></div>
          {documentId && <button className="toolbar-button primary" onClick={handleSave} disabled={saving || !editorReady}>{saving ? 'Guardando…' : 'Guardar'}</button>}
        </header>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {message && <div className="info-banner" role="status">{message}</div>}

        <div className="editor-layout">
          <section className="editor-frame" aria-label="Editor de documentos">
            {documentId ? <div id="onlyoffice-editor" /> : <div className="editor-empty">Selecciona un documento en el panel para comenzar.</div>}
          </section>

          <aside className="collaboration-sidebar" aria-label="Documentos y colaboración">
            {!documentId ? (
              <section className="sidebar-section document-list-section">
                <h2>Documentos disponibles <span className="count-badge">{documents.length}</span></h2>
                <button className="toolbar-button primary new-document-button" onClick={handleCreateDocument} disabled={creating}>{creating ? 'Creando…' : 'Nuevo documento'}</button>
                {documents.length === 0 ? <p className="empty-state">No hay documentos todavía. Crea uno para iniciar.</p> : <ul className="document-list">{documents.map((document) => <li key={document.id}><button className="document-list-item" onClick={() => { setMessage(''); setDocumentId(String(document.id)) }}><strong>{document.title}</strong><span>Documento {document.id} · versión {document.current_version}</span></button></li>)}</ul>}
              </section>
            ) : (
              <>
                <button className="back-to-documents" onClick={() => { setDocumentId(null); setMessage('') }}>← Documentos disponibles</button>
                <section className="sidebar-section">
                  <h2>Usuarios en línea <span className="count-badge">{onlineUsers.length}</span></h2>
                  {onlineUsers.length === 0 ? <p className="empty-state">Conectando al documento…</p> : <ul className="online-list">{onlineUsers.map((onlineUser) => <li key={onlineUser.idusuario}><span className="presence-dot" />{onlineUser.nombre}{String(onlineUser.idusuario) === String(user.idusuario) && <small> (tú)</small>}</li>)}</ul>}
                </section>
                <section className="sidebar-section audit-section">
                  <h2>Historico</h2>
                  {audit.length === 0 ? <p className="empty-state">Aún no hay modificaciones registradas.</p> : <ol className="audit-list">{audit.map((entry) => <li key={entry.id}><strong>{entry.nombre}</strong><span>{auditLabel(entry.action)}</span><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</time></li>)}</ol>}
                  <details className="versions-panel"><summary>Versiones ({versions.length})</summary><ol>{versions.map((version) => <li key={version.version_number}><strong>v{version.version_number}</strong><span>{version.source === 'initial' ? 'Inicial' : version.source === 'close' ? 'Al cerrar' : 'Guardado'}</span><time>{new Date(version.created_at).toLocaleString('es-MX')}</time></li>)}</ol></details>
                </section>
              </>
            )}
          </aside>
        </div>
        <FooterGobMX />
      </main>
    </div>
  )
}

function auditLabel(action) {
  if (action === 'document_created') return 'creó el documento'
  if (action === 'Modificó el archivo') return action
  if (action === 'modification') return 'Modificó el archivo'
  return action
}

function loadOnlyOfficeApi(serverUrl) {
  if (window.DocsAPI) return Promise.resolve()
  const scriptUrl = `${serverUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`)
    if (existingScript) {
      if (window.DocsAPI) return resolve()
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar la API de ONLYOFFICE.')), { once: true })
      return undefined
    }
    const script = document.createElement('script')
    script.src = scriptUrl
    script.onload = resolve
    script.onerror = () => reject(new Error(`No se pudo cargar ${scriptUrl}`))
    document.body.appendChild(script)
    return undefined
  })
}
