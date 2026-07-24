import { useMemo } from "react";
import { useApp } from "../context/AppContext";

export function usePermissions() {
  const { user } = useApp();
  return useMemo(() => {
    const levels = user?.permissions || {};
    const grants = user?.grants || {};
    const can = (permission, minLevel = 1) =>
      Number(levels["*"] || 0) >= minLevel || Number(levels[permission] || 0) >= minLevel;
    const scopes = (permission) => [...new Set([...(grants["*"] || []), ...(grants[permission] || [])])];
    return { can, cannot: (permission, minLevel = 1) => !can(permission, minLevel), scopes, levels, grants };
  }, [user]);
}
