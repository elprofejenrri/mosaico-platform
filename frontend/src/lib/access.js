export function isTechnicalUser(user) {
  const roles = new Set([user?.role, ...(user?.roles || [])].filter(Boolean));
  const permissions = user?.permissions || {};
  return roles.has("administrador_sitio") || roles.has("developer") || Number(permissions["*"] || 0) >= 100;
}
