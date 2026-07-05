function effectiveRoles(user) {
  if (user?.roles?.length) return new Set(user.roles.filter(Boolean));
  return new Set([user?.role].filter(Boolean));
}

export function isTechnicalUser(user) {
  const roles = effectiveRoles(user);
  const permissions = user?.permissions || {};
  return roles.has("administrador_sitio") || roles.has("developer") || Number(permissions["*"] || 0) >= 100;
}

export function hasPermission(user, permission, minLevel = 1) {
  const permissions = user?.permissions || {};
  return Number(permissions["*"] || 0) >= minLevel || Number(permissions[permission] || 0) >= minLevel;
}

export function hasAnyRole(user, roleNames = []) {
  const roles = effectiveRoles(user);
  return roleNames.some((role) => roles.has(role));
}

export function canAccessPortal(user, portal) {
  if (portal === "student") return true;
  if (portal === "tutor") return hasAnyRole(user, ["tutor_padre", "administrador_sitio", "administrador_profesor", "coordinador"]);
  if (portal === "teacher") return hasAnyRole(user, ["profesor", "administrador_sitio", "administrador_profesor", "coordinador"]) || hasPermission(user, "calendar.teacher.view");
  if (portal === "admin") {
    return hasAnyRole(user, ["administrador_sitio", "administrador_profesor", "coordinador", "viewer"]) ||
      hasPermission(user, "roles.management.view") ||
      hasPermission(user, "users.profile.view") ||
      hasPermission(user, "reports.analytics.view");
  }
  return false;
}
