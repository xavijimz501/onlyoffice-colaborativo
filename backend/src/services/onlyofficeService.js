const jwt = require('jsonwebtoken');

function createEditorConfig(document, user) {
  const config = {
    documentType: document.file_type === 'xlsx' ? 'cell' : document.file_type === 'pptx' ? 'slide' : 'word',
    document: {
      fileType: document.file_type, key: document.editor_key, title: document.title,
      url: `${process.env.APP_PUBLIC_URL}/api/documents/${document.id}/content?accessToken=${jwt.sign(
        { scope: 'document:read', documentId: document.id }, process.env.APP_JWT_SECRET, { expiresIn: '10m' },
      )}`,
      permissions: { edit: true, download: true },
    },
    editorConfig: {
      mode: 'edit', callbackUrl: `${process.env.APP_PUBLIC_URL}/api/onlyoffice/callback`,
      user: { id: String(user.id), name: user.name },
    },
  };
  return { ...config, token: jwt.sign(config, process.env.ONLYOFFICE_JWT_SECRET) };
}

function verifyCallbackToken(req) {
  const token = req.body?.token || req.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Callback sin token JWT.');
  return jwt.verify(token, process.env.ONLYOFFICE_JWT_SECRET);
}

module.exports = { createEditorConfig, verifyCallbackToken };
