module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRATION || "7d",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "30d",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  lockTime: process.env.LOCK_TIME || 15 * 60 * 1000, // 15 minutes
};
  