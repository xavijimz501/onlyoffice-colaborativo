const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { correo, password } = req.body || {};
    if (typeof correo !== 'string' || typeof password !== 'string' || !correo.trim() || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }
    const result = await authService.authenticate(correo, password);
    if (!result) return res.status(401).json({ error: 'Credenciales inválidas o cuenta bloqueada.' });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.idusuario);
    if (!user) return res.status(401).json({ error: 'La cuenta ya no existe.' });
    return res.json({ user });
  } catch (error) { return next(error); }
}

module.exports = { login, me };
