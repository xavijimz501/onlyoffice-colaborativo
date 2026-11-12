const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

async function authenticate(correo, password) {
  const user = await userRepository.findByEmail(correo.trim());
  if (!user || (user.bloqueado !== null && Number(user.bloqueado) !== 0)) return null;

  const isBcryptHash = /^\$2[aby]\$/.test(user.password || '');
  const validPassword = isBcryptHash
    ? await bcrypt.compare(password, user.password)
    : process.env.ALLOW_LEGACY_PLAINTEXT_PASSWORDS === 'true' && password === user.password;
  if (!validPassword) return null;

  const perfiles = await userRepository.listProfiles(user.idusuario);
  const publicUser = {
    idusuario: user.idusuario,
    nombre: user.nombre,
    correo: user.correo,
    perfiles,
  };
  const token = jwt.sign(
    { idusuario: user.idusuario, nombre: user.nombre, correo: user.correo },
    process.env.APP_JWT_SECRET,
    { expiresIn: '8h' },
  );
  return { token, user: publicUser };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  return { ...user, perfiles: await userRepository.listProfiles(user.idusuario) };
}

module.exports = { authenticate, getCurrentUser };
