const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const documentRepository = require('../repositories/documentRepository');

function assertTrustedDownloadUrl(value) {
  const target = new URL(value);
  const trusted = new URL(process.env.ONLYOFFICE_URL);
  if (!['http:', 'https:'].includes(target.protocol) || target.host !== trusted.host) throw new Error('URL de descarga no confiable.');
}

async function processCallback(body) {
  const { key, status, url, users } = body;
  if (status !== 2 && status !== 6) return { ignored: true };
  if (!key || !url) throw new Error('Callback de guardado incompleto.');
  assertTrustedDownloadUrl(url);
  const document = await documentRepository.findByEditorKey(key);
  if (!document) throw new Error('No se encontró el documento para la key recibida.');

  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Error descargando documento: HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const callbackHash = crypto.createHash('sha256').update(`${key}|${status}|${url}`).digest('hex');
  const filePath = path.join(process.env.STORAGE_DIR, 'versions', `document-${document.id}-${callbackHash}.${document.file_type}`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  try {
    const result = await documentRepository.recordVersion({
      documentId: document.id, filePath, modifiedBy: users?.[0] || null,
      source: status === 2 ? 'close' : 'forcesave', callbackHash,
    });
    if (result.duplicate) await fs.rm(filePath, { force: true });
    return { ...result, documentId: document.id };
  } catch (error) { await fs.rm(filePath, { force: true }); throw error; }
}
module.exports = { processCallback };
