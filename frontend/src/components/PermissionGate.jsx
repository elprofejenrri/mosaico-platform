import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";

export function PermissionGate({ permission, minLevel = 1, children, fallback = null }) {
  const { can } = usePermissions();
  return can(permission, minLevel) ? children : fallback;
}

export function ProtectedRoute({ permission, minLevel = 1, children, redirectTo = "/student" }) {
  const { can } = usePermissions();
  return can(permission, minLevel) ? children : <Navigate to={redirectTo} replace />;
}
