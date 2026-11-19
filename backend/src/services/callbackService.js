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

async function processCallback(body) {
  const { key, status, url, changesurl, history, users, userdata, filetype } = body;
  if (status !== 2 && status !== 6) return { ignored: true };
  if (!key || !url) throw new Error('Callback de guardado incompleto.');
  assertTrustedDownloadUrl(url);
  const document = await documentRepository.findByEditorKey(key);
  if (!document) throw new Error('No se encontró el documento para la key recibida.');

  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Error descargando documento: HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  // userdata distingue cada guardado explícito y permite deduplicar los reintentos del callback.
  const callbackHash = crypto.createHash('sha256').update(`${key}|${status}|${url}|${userdata || ''}`).digest('hex');
  const filePath = path.join(process.env.STORAGE_DIR, 'versions', `document-${document.id}-${callbackHash}.${document.file_type}`);
  const changesPath = changesurl
    ? path.join(process.env.STORAGE_DIR, 'versions', `changes-${callbackHash}.zip`)
    : null;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  if (changesPath) {
    assertTrustedDownloadUrl(changesurl);
    const changesResponse = await fetch(changesurl, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (!changesResponse.ok) throw new Error(`Error descargando cambios: HTTP ${changesResponse.status}.`);
    await fs.writeFile(changesPath, Buffer.from(await changesResponse.arrayBuffer()));
  }
  const result = await documentRepository.recordVersion({
    documentId: document.id, filePath, modifiedBy: users?.[0] || null,
    source: status === 2 ? 'close' : 'forcesave', callbackHash,
    editorKey: key, changesPath, historyData: history ? JSON.stringify(history) : null,
    fileType: filetype || document.file_type,
  });
  if (result.merged && result.previousFilePath !== filePath) {
    await fs.rm(result.previousFilePath, { force: true }).catch(() => {});
  }
  const saveRequestId = /^user:\d+:save:([\w-]+)$/.exec(userdata || '')?.[1] || null;
  return { ...result, documentId: document.id, saveRequestId };
}
module.exports = { processCallback };
