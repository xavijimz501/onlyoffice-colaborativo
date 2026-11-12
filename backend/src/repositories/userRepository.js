const pool = require('../config/database');
const authDatabase = process.env.AUTH_DB_NAME || process.env.DB_NAME;
if (!/^[A-Za-z0-9_]+$/.test(authDatabase || '')) throw new Error('AUTH_DB_NAME contiene caracteres inválidos.');
const usersTable = `\`${authDatabase}\`.\`usuarios\``;
const profilesView = `\`${authDatabase}\`.\`view_usuarios_app_perfiles\``;

async function findByEmail(correo) {
  const [rows] = await pool.execute(
    `SELECT idusuario, correo, nombre, password, bloqueado
     FROM ${usersTable} WHERE correo = ? LIMIT 1`,
    [correo],
  );
  return rows[0] || null;
}

async function findById(userId) {
  const [rows] = await pool.execute(
    `SELECT idusuario, correo, nombre FROM ${usersTable} WHERE idusuario = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function listProfiles(userId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT aplicacionnombre, perfilnombre, tipoperfil, descripcion, abreviatura, version
     FROM ${profilesView} WHERE idusuario = ?`,
    [userId],
  );
  return rows;
}

module.exports = { findByEmail, findById, listProfiles };
