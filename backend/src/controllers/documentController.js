const documentService = require('../services/documentService');
const jwt = require('jsonwebtoken');

async function list(req, res, next) {
  try {
    const documents = await documentService.getDocuments();
    return res.json({ documents });
  } catch (error) { return next(error); }
}

async function editorConfig(req, res, next) {
  try {
    const user = { id: req.user.idusuario, name: req.user.nombre };
    const config = await documentService.getEditorConfig(req.params.id, user);
    if (!config) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
    return res.json({ documentServerUrl: process.env.ONLYOFFICE_URL, config });
  } catch (error) { return next(error); }
}

async function content(req, res, next) {
  let access;
  try {
    access = jwt.verify(req.query.accessToken, process.env.APP_JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'INVALID_DOCUMENT_TOKEN' });
  }
  if (access.scope !== 'document:read' || String(access.documentId) !== String(req.params.id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  try {
    const result = await documentService.getDocumentStream(req.params.id);
    if (!result) return res.sendStatus(404);
    res.type(result.fileType);
    return result.stream.pipe(res);
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length > 255) return res.status(400).json({ error: 'El título debe tener entre 1 y 255 caracteres.' });
    const result = await documentService.createDocument(title, req.user.idusuario);
    return res.status(201).json(result);
  } catch (error) { return next(error); }
}

async function audit(req, res, next) {
  try {
    const result = await documentService.getAudit(req.params.id);
    if (!result) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
    return res.json({ audit: result });
  } catch (error) { return next(error); }
}

async function save(req, res, next) {
  try {
    const result = await documentService.requestSave(req.params.id, req.user.idusuario);
    if (!result) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function versions(req, res, next) {
  try {
    const result = await documentService.getVersions(req.params.id);
    if (!result) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
    return res.json({ versions: result });
  } catch (error) { return next(error); }
}
module.exports = { list, editorConfig, content, versions, audit, create, save };
