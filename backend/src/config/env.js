function validateConfig() {
  const required = ['ONLYOFFICE_URL', 'ONLYOFFICE_JWT_SECRET', 'APP_JWT_SECRET', 'APP_PUBLIC_URL', 'STORAGE_DIR'];
  const missing = required.filter((key) => !process.env[key]);
  if (!(process.env.MYSQL_HOST || process.env.DB_HOST)) missing.push('MYSQL_HOST (o DB_HOST)');
  if (!(process.env.MYSQL_USER || process.env.DB_USER)) missing.push('MYSQL_USER (o DB_USER)');
  if (!(process.env.MYSQL_DATABASE || process.env.DB_NAME)) missing.push('MYSQL_DATABASE (o DB_NAME)');
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
}
module.exports = { validateConfig };
