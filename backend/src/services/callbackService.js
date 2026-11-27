const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const documentRepository = require('../repositories/documentRepository');

function assertTrustedDownloadUrl(value) {
  const target = new URL(value);
  const trusted = new URL(process.env.ONLYOFFICE_URL);
  const trustedHosts = new Set([
    trusted.host,
    ...(process.env.ONLYOFFICE_DOWNLOAD_HOSTS || '').split(',').map((host) => host.trim()).filter(Boolean),
  ]);
  if (!['http:', 'https:'].includes(target.protocol) || !trustedHosts.has(target.host)) throw new Error('URL de descarga no confiable.');
}

function internalDocumentServerUrl(value) {
  assertTrustedDownloadUrl(value);
  const publicUrl = new URL(value);
  const commandUrl = new URL(process.env.ONLYOFFICE_COMMAND_URL || process.env.ONLYOFFICE_URL);
  if (commandUrl.origin === publicUrl.origin) return publicUrl.toString();

  const publicBasePath = new URL(process.env.ONLYOFFICE_URL).pathname.replace(/\/$/, '');
  const upstreamPath = publicBasePath && publicUrl.pathname.startsWith(`${publicBasePath}/`)
    ? publicUrl.pathname.slice(publicBasePath.length)
    : publicUrl.pathname;

  commandUrl.pathname = upstreamPath;
  commandUrl.search = publicUrl.search;
  commandUrl.hash = '';
  return commandUrl.toString();
}

async function downloadDocumentServerFile(value) {
  const response = await fetch(internalDocumentServerUrl(value), {
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Document Server respondió HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function processCallback(body) {
  const { key, status, url, changesurl, changesUrl, history, users, userdata, filetype } = body;
  const rawChangesUrl = changesurl || changesUrl;
  console.info('ONLYOFFICE callback:', {
    status: body.status,
    fields: Object.keys(body),
    notmodified: body.notmodified,
    hasChangesUrl: Boolean(rawChangesUrl),
    historyKeys: Object.keys(history || {}),
  });
  if (status !== 2 && status !== 6) return { ignored: true };
  if (!key || !url) throw new Error('Callback de guardado incompleto.');
  const document = await documentRepository.findByEditorKey(key);
  if (!document) throw new Error('No se encontró el documento para la key recibida.');

  const bytes = await downloadDocumentServerFile(url);
  // userdata distingue cada guardado explícito y permite deduplicar los reintentos del callback.
  const callbackHash = crypto.createHash('sha256').update(`${key}|${status}|${url}|${userdata || ''}`).digest('hex');
  const filePath = path.join(process.env.STORAGE_DIR, 'versions', `document-${document.id}-${callbackHash}.${document.file_type}`);
  let changesPath = null;
  if (rawChangesUrl) {
    try {
      const changesBytes = await downloadDocumentServerFile(rawChangesUrl);
      changesPath = path.join(process.env.STORAGE_DIR, 'versions', `changes-${callbackHash}.zip`);
      await fs.mkdir(path.dirname(changesPath), { recursive: true });
      await fs.writeFile(changesPath, changesBytes);
    } catch (err) {
      console.warn('[ONLYOFFICE] Error al procesar changesurl.', { message: err.message });
    }
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  const result = await documentRepository.recordVersion({
    documentId: document.id, filePath, modifiedBy: users?.[0] || null,
    source: status === 2 ? 'close' : 'forcesave', callbackHash,
    editorKey: key, changesPath,
    historyData: history && Object.keys(history).length ? JSON.stringify(history) : null,
    fileType: filetype || document.file_type,
  });
  if (result.merged && result.previousFilePath !== filePath) {
    await fs.rm(result.previousFilePath, { force: true }).catch(() => { });
  }
  const saveRequestId = /^user:\d+:save:([\w-]+)$/.exec(userdata || '')?.[1] || null;
  console.info('[ONLYOFFICE] Versión registrada.', {
    documentId: document.id,
    version: result.versionNumber,
    source: status === 2 ? 'close' : 'forcesave',
    hasChangesPath: Boolean(changesPath),
    hasHistoryData: Boolean(history && Object.keys(history).length),
  });
  return { ...result, documentId: document.id, saveRequestId };
}
module.exports = { processCallback };
