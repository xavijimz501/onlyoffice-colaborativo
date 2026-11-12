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

async function createDocument(title, userId) {
  const template = path.resolve(process.env.DOCUMENT_TEMPLATE_PATH || path.join(__dirname, '../../storage/documentos/demo.docx'));
  const storageRoot = path.resolve(process.env.STORAGE_DIR);
  await fsp.access(template, fs.constants.R_OK);
  await fsp.mkdir(path.join(storageRoot, 'documents'), { recursive: true });
  const filePath = path.join(storageRoot, 'documents', `${crypto.randomUUID()}.docx`);
  const editorKey = `new-${crypto.randomUUID()}`;
  await fsp.copyFile(template, filePath);
  try {
    return await documentRepository.createDocument({ title, filePath, editorKey, userId });
  } catch (error) {
    await fsp.rm(filePath, { force: true });
    throw error;
  }
}

async function requestSave(id, userId) {
  const document = await documentRepository.findById(id);
  if (!document) return null;
  const command = { c: 'forcesave', key: document.editor_key, userdata: `user:${userId}` };
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
  return { saved: true, message: 'Solicitud de guardado enviada.' };
}

module.exports = { getDocuments, getEditorConfig, getDocumentStream, getVersions, getAudit, createDocument, requestSave };
