const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const documentRepository = require('../repositories/documentRepository');
const { createEditorConfig } = require('./onlyofficeService');

async function getEditorConfig(id, user) {
  const document = await documentRepository.findById(id);
  return document ? createEditorConfig(document, user) : null;
}

async function getDocuments() {
  return documentRepository.listDocuments();
}

async function getDocumentStream(id) {
  const document = await documentRepository.findById(id);
  if (!document) return null;
  const absolutePath = path.resolve(document.storage_path);
  const root = path.resolve(process.env.STORAGE_DIR);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new Error('Ruta fuera del almacenamiento permitido.');
  await fs.promises.access(absolutePath, fs.constants.R_OK);
  return { stream: fs.createReadStream(absolutePath), fileType: document.file_type };
}

async function getVersions(id) {
  const document = await documentRepository.findById(id);
  if (!document) return null;
  return documentRepository.listVersions(id);
}

async function getAudit(id) {
  const document = await documentRepository.findById(id);
  if (!document) return null;
  return documentRepository.listAudit(id);
}

function parseHistoryData(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function historyFileUrl(documentId, versionNumber, kind) {
  const accessToken = jwt.sign(
    { scope: 'document-history:file', documentId: String(documentId), versionNumber: Number(versionNumber), kind },
    process.env.APP_JWT_SECRET,
    { expiresIn: '10m' },
  );
  return `${process.env.APP_PUBLIC_URL}/api/documents/${documentId}/history/${versionNumber}/files/${kind}?accessToken=${encodeURIComponent(accessToken)}`;
}

async function getHistory(id) {
  const document = await documentRepository.findById(id);
  if (!document) return null;
  const rows = await documentRepository.listHistoryVersions(id);
  const history = rows.map((version) => {
    const data = parseHistoryData(version.history_data);
    return {
      created: new Date(version.created_at).toISOString(),
      key: version.history_key,
      user: { id: String(version.modified_by || 'system'), name: version.modified_name },
      version: version.version_number,
      ...(data.serverVersion ? { changes: data.changes || [], serverVersion: data.serverVersion } : {}),
    };
  });
  return { currentVersion: history.at(-1)?.version || document.current_version, history };
}

async function getHistoryVersionData(id, versionNumber) {
  const target = await documentRepository.findHistoryVersion(id, versionNumber);
  if (!target?.file_path) return null;
  const previous = await documentRepository.findPreviousHistoryVersion(id, versionNumber);
  const hasPreviousVersion = Boolean(previous?.file_path);
  const params = {
    fileType: target.file_type || 'docx',
    key: target.history_key,
    url: historyFileUrl(id, versionNumber, 'document'),
    version: Number(target.version_number),
    ...(hasPreviousVersion ? {
      previous: {
        fileType: previous.file_type || target.file_type || 'docx',
        key: previous.history_key,
        url: historyFileUrl(id, previous.version_number, 'document'),
      },
    } : {}),
    ...(target.changes_path && hasPreviousVersion
      ? { changesUrl: historyFileUrl(id, versionNumber, 'changes') }
      : {}),
  };
  return { ...params, token: jwt.sign(params, process.env.ONLYOFFICE_JWT_SECRET) };
}

async function getHistoryFile(id, versionNumber, kind) {
  const entry = await documentRepository.findHistoryFile(id, versionNumber, kind);
  if (!entry || !entry.file_path) return null;
  const absolutePath = path.resolve(entry.file_path);
  const root = path.resolve(process.env.STORAGE_DIR);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new Error('Ruta fuera del almacenamiento permitido.');
  await fsp.access(absolutePath, fs.constants.R_OK);
  return { stream: fs.createReadStream(absolutePath), fileType: entry.file_type || 'docx', kind };
}

async function createDocument(title, userId) {
  const template = path.resolve(process.env.DOCUMENT_TEMPLATE_PATH || path.join(__dirname, '../../storage/documentos/demo.docx'));
  const storageRoot = path.resolve(process.env.STORAGE_DIR);
  await fsp.access(template, fs.constants.R_OK);
  await fsp.mkdir(path.join(storageRoot, 'documents'), { recursive: true });
  const filePath = path.join(storageRoot, 'documents', `${crypto.randomUUID()}.docx`);
  const editorKey = `new-${crypto.randomUUID()}`;
  await fsp.copyFile(template, filePath);
  try {
    return await documentRepository.createDocument({ title, filePath, editorKey, userId, fileType: 'docx' });
  } catch (error) {
    await fsp.rm(filePath, { force: true });
    throw error;
  }
}

async function uploadDocument(fileNameHeader, fileBuffer, userId) {
  let fileName;
  try { fileName = decodeURIComponent(fileNameHeader); }
  catch { throw invalidUpload('El nombre del archivo no es válido.'); }

  const safeName = path.basename(fileName.replace(/\\/g, '/')).trim();
  const fileType = path.extname(safeName).slice(1).toLowerCase();
  const supportedTypes = new Set(['docx', 'xlsx', 'pptx']);
  if (!safeName || !supportedTypes.has(fileType)) {
    throw invalidUpload('Selecciona un documento .docx, .xlsx o .pptx.');
  }
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw invalidUpload('El archivo está vacío o no se recibió correctamente.');
  }
  if (fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
    throw invalidUpload('El archivo no parece ser un documento Office válido.');
  }

  const title = path.basename(safeName, path.extname(safeName)).trim();
  if (!title || title.length > 255) throw invalidUpload('El nombre del documento debe tener entre 1 y 255 caracteres.');

  const storageRoot = path.resolve(process.env.STORAGE_DIR);
  const documentsDirectory = path.join(storageRoot, 'documents');
  await fsp.mkdir(documentsDirectory, { recursive: true });
  const filePath = path.join(documentsDirectory, `${crypto.randomUUID()}.${fileType}`);
  const editorKey = `new-${crypto.randomUUID()}`;
  await fsp.writeFile(filePath, fileBuffer);
  try {
    return await documentRepository.createDocument({ title, filePath, editorKey, userId, fileType });
  } catch (error) {
    await fsp.rm(filePath, { force: true });
    throw error;
  }
}

function invalidUpload(message) {
  const error = new Error(message);
  error.code = 'INVALID_DOCUMENT_UPLOAD';
  return error;
}

async function requestSave(id, userId) {
  const document = await documentRepository.findById(id);
  if (!document) return null;
  const requestId = crypto.randomUUID();
  const command = { c: 'forcesave', key: document.editor_key, userdata: `user:${userId}:save:${requestId}` };
  const token = jwt.sign(command, process.env.ONLYOFFICE_JWT_SECRET);
  const commandUrl = process.env.ONLYOFFICE_COMMAND_URL || `${process.env.ONLYOFFICE_URL.replace(/\/$/, '')}/command`;
  const response = await fetch(commandUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...command, token }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Document Server respondió HTTP ${response.status}.`);
  const result = await response.json();
  if (result.error === 4) return { saved: false, message: 'No hay cambios pendientes para guardar.' };
  if (result.error !== 0) throw new Error(`Document Server rechazó el guardado (error ${result.error}).`);
  return { saved: true, requestId, message: 'Solicitud de guardado enviada.' };
}

module.exports = {
  getDocuments, getEditorConfig, getDocumentStream, getVersions, getAudit,
  getHistory, getHistoryVersionData, getHistoryFile,
  createDocument, uploadDocument, requestSave,
};
