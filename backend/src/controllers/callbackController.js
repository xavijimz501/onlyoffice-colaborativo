const { verifyCallbackToken } = require('../services/onlyofficeService');
const { processCallback } = require('../services/callbackService');

async function callback(req, res) {
  try {
    verifyCallbackToken(req);
    const result = await processCallback(req.body);
    if (!result.ignored && !result.duplicate) {
      req.app.get('io')?.to(`document:${result.documentId}`).emit('audit:update');
    }
    return res.json({ error: 0 });
  } catch (error) {
    console.error('Callback ONLYOFFICE:', error.message);
    return res.status(500).json({ error: 1 });
  }
}
module.exports = { callback };
