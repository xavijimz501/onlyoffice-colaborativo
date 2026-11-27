import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useLocation, useNavigate } from 'react-router-dom'
import HeaderGobMX from '../components/HeaderGobMx'
import NavbarGobMX from '../components/navbar'
import FooterGobMX from '../components/footer'
import { SOCKET_PATH, SOCKET_URL } from '../services/api'
import { getCurrentUser } from '../services/authService'
import { createDocument, getDocumentAudit, getDocumentEditorConfig, getDocumentHistory, getDocumentHistoryVersion, getDocuments, getDocumentVersions, saveDocument, uploadDocument } from '../services/documentService'
import '../App.css'

const AUDIT_PAGE_SIZE = 8

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
  const [uploading, setUploading] = useState(false)
  const [documentId, setDocumentId] = useState(null)
  const [documents, setDocuments] = useState([])
  const [versions, setVersions] = useState([])
  const [audit, setAudit] = useState([])
  const [auditPage, setAuditPage] = useState(1)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [editorReady, setEditorReady] = useState(false)
  const [pendingSaveRequestId, setPendingSaveRequestId] = useState(null)
  const [viewingHistory, setViewingHistory] = useState(false)
  const [editorSession, setEditorSession] = useState(0)
  const editorRef = useRef(null)
  const uploadInputRef = useRef(null)
  const confirmedSaveRequestsRef = useRef(new Set())
  const pendingSaveRequestIdRef = useRef(null)
  const auditMaxIdRef = useRef(0)
  const saveAuditBaselineRef = useRef(0)
  const activeDocument = documents.find((document) => String(document.id) === String(documentId))
  const auditPageCount = Math.max(1, Math.ceil(audit.length / AUDIT_PAGE_SIZE))
  const visibleAudit = audit.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE)
  const inicial = user?.nombre?.trim().charAt(0).toUpperCase() || 'O';

  function resumeEditing() {
    setViewingHistory(false)
    setEditorSession((session) => session + 1)
  }

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
    setViewingHistory(false)
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
            onRequestHistory: async () => {
              try {
                const history = await getDocumentHistory(documentId)
                editor?.refreshHistory(history)
                setViewingHistory(true)
              } catch (cause) { setError(`No se pudo cargar el historial: ${cause.message}`) }
            },
            onRequestHistoryClose: resumeEditing,
            onRequestHistoryData: async (event) => {
              try {
                const versionData = await getDocumentHistoryVersion(documentId, event.data)
                editor?.setHistoryData(versionData)
              } catch (cause) {
                setError(`No se pudo abrir la versión: ${cause.message}`)
                editor?.setHistoryData({ error: 'No se pudo cargar esta versión.', version: event.data })
              }
            },
          },
        })
        editorRef.current = editor
        setError('')
      } catch (cause) {
        if (!cancelled) setError(cause.message || 'No se pudo iniciar ONLYOFFICE.')
      }
    }
    initializeEditor()
    return () => {
      cancelled = true
      editor?.destroyEditor()
      if (editorRef.current === editor) editorRef.current = null
    }
  }, [documentId, user, editorSession])

  useEffect(() => {
    setAuditPage(1)
    pendingSaveRequestIdRef.current = null
    confirmedSaveRequestsRef.current.clear()
    setPendingSaveRequestId(null)
    if (!documentId) { setVersions([]); setAudit([]); return undefined }
    let cancelled = false
    Promise.all([getDocumentVersions(documentId), getDocumentAudit(documentId)])
      .then(([nextVersions, nextAudit]) => {
        if (!cancelled) {
          setVersions(nextVersions)
          setAudit(nextAudit)
          auditMaxIdRef.current = Math.max(0, ...nextAudit.map((entry) => Number(entry.id) || 0))
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause.message) })
    return () => { cancelled = true }
  }, [documentId])

  useEffect(() => {
    if (!documentId || !pendingSaveRequestId) return undefined
    let cancelled = false
    let attempts = 0
    let timer

    async function confirmSaveFromAudit() {
      try {
        const [nextVersions, nextAudit] = await Promise.all([
          getDocumentVersions(documentId),
          getDocumentAudit(documentId),
        ])
        if (cancelled) return
        const latestAuditId = Math.max(0, ...nextAudit.map((entry) => Number(entry.id) || 0))
        auditMaxIdRef.current = latestAuditId
        if (latestAuditId > saveAuditBaselineRef.current) {
          setVersions(nextVersions)
          setAudit(nextAudit)
          setAuditPage(1)
          pendingSaveRequestIdRef.current = null
          setPendingSaveRequestId(null)
          setMessage('Guardado confirmado por ONLYOFFICE.')
          return
        }
      } catch { /* Reintenta mientras ONLYOFFICE entrega el callback. */ }

      attempts += 1
      if (attempts >= 30) {
        pendingSaveRequestIdRef.current = null
        setPendingSaveRequestId(null)
        setError('ONLYOFFICE no confirmó el guardado. Revisa el callback del servidor.')
        return
      }
      timer = window.setTimeout(confirmSaveFromAudit, 2000)
    }

    timer = window.setTimeout(confirmSaveFromAudit, 1000)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [documentId, pendingSaveRequestId])

  useEffect(() => {
    if (!token || !documentId || !editorReady) return undefined
    const socket = io(SOCKET_URL, { path: SOCKET_PATH, auth: { token }, transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('document:join', documentId))
    socket.on('presence:update', setOnlineUsers)
    socket.on('audit:update', async (event = {}) => {
      await refreshAudit(documentId)
      const requestId = event.saveRequestId
      if (!requestId) return
      if (pendingSaveRequestIdRef.current === requestId) {
        pendingSaveRequestIdRef.current = null
        setPendingSaveRequestId(null)
        setMessage('Guardado confirmado.')
      } else {
        confirmedSaveRequestsRef.current.add(requestId)
      }
    })
    socket.on('connect_error', () => setError('No se pudo conectar al canal de colaboración.'))
    return () => { socket.disconnect(); setOnlineUsers([]) }
  }, [documentId, token, editorReady])

  async function refreshAudit(id = documentId) {
    if (!id) return
    try {
      const [nextVersions, nextAudit] = await Promise.all([getDocumentVersions(id), getDocumentAudit(id)])
      setVersions(nextVersions)
      setAudit(nextAudit)
      auditMaxIdRef.current = Math.max(0, ...nextAudit.map((entry) => Number(entry.id) || 0))
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

  async function handleUploadDocument(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const result = await uploadDocument(file)
      setDocuments(await getDocuments())
      setDocumentId(String(result.id))
      setMessage(`Se cargó “${file.name}”. Ya puedes editarlo.`)
    } catch (cause) {
      setError(cause.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleSave() {
    if (!documentId) return
    setSaving(true)
    setMessage('')
    saveAuditBaselineRef.current = auditMaxIdRef.current
    try {
      const result = await saveDocument(documentId)
      if (result.saved && result.requestId) {
        pendingSaveRequestIdRef.current = result.requestId
        setPendingSaveRequestId(result.requestId)
        if (confirmedSaveRequestsRef.current.delete(result.requestId)) {
          pendingSaveRequestIdRef.current = null
          setPendingSaveRequestId(null)
          setMessage('Guardado confirmado por ONLYOFFICE')
          await refreshAudit()
        } else {
          setMessage('Guardado solicitado.')
        }
      } else {
        setMessage(result.message)
      }
      if (!result.saved) await refreshAudit()
    } catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }

  async function handleShowChanges(entry) {
    if (!entry.version_number || entry.source === 'initial') {
      setMessage('Esta entrada no tiene una versión anterior para consultar.')
      return
    }
    try {
      const history = await getDocumentHistory(documentId)
      // refreshHistory selecciona la revisión de esta entrada en la lista nativa de ONLYOFFICE.
      editorRef.current?.refreshHistory({ ...history, currentVersion: Number(entry.history_version || entry.version_number) })
      setViewingHistory(true)
      if (!entry.history_version) setMessage('Se abrirá la versión guardada; ONLYOFFICE no entregó datos para resaltar sus diferencias.')
    } catch (cause) { setError(`No se pudo abrir la comparación: ${cause.message}`) }
  }

  if (!user) return <main className="login-container">Cargando sesión…</main>

  return (
    <div className="documento-page">
      <HeaderGobMX />
      <NavbarGobMX />
      <main className="app-shell" id="mainContent">
        {/* <header className="topbar"
          <div className="brand-mark">O</div>
          <div className="brand-copy"><strong>{activeDocument?.title || 'Editor colaborativo'}</strong><span>{user.nombre} · {user.correo}</span></div>
          {documentId && <button className="toolbar-button primary" onClick={handleSave} disabled={saving || !editorReady}>{saving ? 'Guardando…' : 'Guardar'}</button>}
        </header> */}

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
                <input
                  ref={uploadInputRef}
                  className="file-upload-input"
                  type="file"
                  accept=".docx,.xlsx,.pptx"
                  onChange={handleUploadDocument}
                  aria-label="Seleccionar archivo Office para subir"
                />
                <button
                  type="button"
                  className="toolbar-button upload-document-button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo…' : 'Subir documento'}
                </button>
                {documents.length === 0 ? <p className="empty-state">No hay documentos todavía. Crea o sube uno para iniciar.</p> : <ul className="document-list">{documents.map((document) => <li key={document.id}><button className="document-list-item" onClick={() => { setMessage(''); setDocumentId(String(document.id)) }}><strong>{document.title}</strong><span>Documento {document.id} · versión {document.current_version}</span></button></li>)}</ul>}
              </section>
            ) : (
              <>
                <div className="brand-header">
                  <div className="brand-info">
                    <div className="brand-mark">{inicial}</div>
                    <div className="brand-copy">
                      <strong>{activeDocument?.title || 'Editor colaborativo'}</strong>
                      <span>{user?.nombre} · {user?.correo}</span>
                    </div>
                  </div>

                  {documentId && (
                    <button
                      className={`back-to-documents editor-action-button${viewingHistory ? ' editor-mode-button' : ' toolbar-button primary'}`}
                      onClick={viewingHistory ? resumeEditing : handleSave}
                      disabled={viewingHistory ? !editorReady : saving || !editorReady || Boolean(pendingSaveRequestId)}
                    >
                      {viewingHistory ? 'Seguir editando' : saving ? 'Guardando…' : pendingSaveRequestId ? 'Confirmando…' : 'Guardar'}
                    </button>
                  )}
                </div>

                <button className="back-to-documents" onClick={() => { setDocumentId(null); setMessage('') }}>← Cerrar editor</button>
                <section className="sidebar-section">
                  <h2>Usuarios en línea <span className="count-badge">{onlineUsers.length}</span></h2>
                  {onlineUsers.length === 0 ? <p className="empty-state">Conectando al documento…</p> : <ul className="online-list">{onlineUsers.map((onlineUser) => <li key={onlineUser.idusuario}><span className="presence-dot" />{onlineUser.nombre}{String(onlineUser.idusuario) === String(user.idusuario) && <small> (tú)</small>}</li>)}</ul>}
                </section>
                <section className="sidebar-section audit-section">
                  <h2>Historico</h2>
                  {audit.length === 0 ? <p className="empty-state">Aún no hay modificaciones registradas.</p> : <>
                    <ol className="audit-list">{visibleAudit.map((entry) => <li key={entry.id}>
                      <strong>{entry.nombre}</strong><span>{auditLabel(entry.action)}</span><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</time>
                      {entry.version_number && entry.source !== 'initial' && <button className="history-change-button" onClick={() => handleShowChanges(entry)}>{entry.history_version ? 'Ver cambios en el documento' : 'Ver versión guardada'}</button>}
                      {entry.version_number && entry.source !== 'initial' && !entry.history_version && <small className="history-pending">No hay datos de diferencias para resaltar en esta versión.</small>}
                    </li>)}</ol>
                    {audit.length > AUDIT_PAGE_SIZE && <nav className="audit-pagination" aria-label="Paginación del historial">
                      <button type="button" onClick={() => setAuditPage((page) => Math.max(1, page - 1))} disabled={auditPage === 1}><i class="snd__icono snd-arrow--left icono--24" aria-hidden="true"></i></button>
                      <span>Página {auditPage} de {auditPageCount} · {audit.length} cambios</span>
                      <button type="button" onClick={() => setAuditPage((page) => Math.min(auditPageCount, page + 1))} disabled={auditPage === auditPageCount}><i class="snd__icono snd-arrow--right icono--24" aria-hidden="true"></i></button>
                    </nav>}
                  </>}
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
