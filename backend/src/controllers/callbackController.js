const { verifyCallbackToken } = require('../services/onlyofficeService');
const { processCallback } = require('../services/callbackService');

const SIGNED_CALLBACK_FIELDS = [
  'key', 'status', 'url', 'changesurl', 'changesUrl', 'history', 'users',
  'actions', 'userdata', 'lastsave', 'notmodified', 'forcesavetype', 'filetype',
];

function parseCallbackBody(rawBody) {
  if (!Buffer.isBuffer(rawBody)) return rawBody || {};
  const text = rawBody.toString('utf8').replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('Callback ONLYOFFICE vacío.');
  return JSON.parse(text);
}

function mergeSignedCallback(body, signedPayload) {
  const callback = { ...body };
  for (const field of SIGNED_CALLBACK_FIELDS) {
    if (signedPayload[field] !== undefined) callback[field] = signedPayload[field];
  }
  return callback;
}

async function callback(req, res) {
  let body;
  try {
    body = parseCallbackBody(req.body);
    const signedPayload = verifyCallbackToken(req, body);
    const result = await processCallback(mergeSignedCallback(body, signedPayload));
    if (!result.ignored && !result.duplicate) {
      req.app.get('io')?.to(`document:${result.documentId}`).emit('audit:update', {
        saveRequestId: result.saveRequestId,
      });
    }
    return res.json({ error: 0 });
  } catch (error) {
    console.error('Callback ONLYOFFICE error:', {
      message: error.message,
      status: body?.status,
      fields: body && typeof body === 'object' ? Object.keys(body) : [],
      hasChangesUrl: Boolean(body?.changesurl || body?.changesUrl),
    });
    return res.status(200).json({ error: 0 });
  }
}
module.exports = { callback };
