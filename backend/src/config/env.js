function validateConfig() {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'ONLYOFFICE_URL', 'ONLYOFFICE_JWT_SECRET', 'APP_JWT_SECRET', 'APP_PUBLIC_URL', 'STORAGE_DIR'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
}
module.exports = { validateConfig };
