import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";

const MobileShellContext = createContext(null);

export function resolveMobileActions(actions = [], can = () => true, scopes = () => []) {
  return actions
    .filter((action) => {
      if (!action || action.visible === false) return false;
      if (action.visibilityRule && !action.visibilityRule()) return false;
      if (action.permission && !can(action.permission, action.minLevel || 1)) return false;
      if (action.scope && !scopes(action.permission).includes(action.scope)) return false;
      return typeof action.handler === "function";
    })
    .map((action) => ({
      ...action,
      disabled: Boolean(action.disabled || action.disabledRule?.()),
    }))
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

function activeRegistration(registrations) {
  const entries = Array.from(registrations.values());
  entries.sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));
  return entries[entries.length - 1]?.registration || null;
}

export function MobileShellProvider({ children }) {
  const location = useLocation();
  const { can, scopes } = usePermissions();
  const [openDrawer, setOpenDrawer] = useState(null);
  const [navigationRegistrations, setNavigationRegistrations] = useState(new Map());
  const [pageRegistrations, setPageRegistrations] = useState(new Map());

  const registerNavigation = useCallback((id, registration, priority = 0) => {
    setNavigationRegistrations((current) => {
      const next = new Map(current);
      next.set(id, { priority, registration });
      return next;
    });
    return () => {
      setNavigationRegistrations((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    };
  }, []);

  const registerPage = useCallback((id, registration, priority = 0) => {
    setPageRegistrations((current) => {
      const next = new Map(current);
      next.set(id, { priority, registration });
      return next;
    });
    return () => {
      setPageRegistrations((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    };
  }, []);

  useEffect(() => {
    setOpenDrawer(null);
  }, [location.key, location.pathname]);

  const navigation = activeRegistration(navigationRegistrations);
  const page = activeRegistration(pageRegistrations);
  const closeDrawers = useCallback(() => setOpenDrawer(null), []);
  const openNavigation = useCallback(() => setOpenDrawer("navigation"), []);
  const openActions = useCallback(() => setOpenDrawer("actions"), []);
  const actions = useMemo(
    () => resolveMobileActions(page?.actions || [], can, scopes),
    [can, page, scopes],
  );

  const value = useMemo(() => ({
    actions,
    navigation,
    openDrawer,
    page,
    closeDrawers,
    openNavigation,
    openActions,
    registerNavigation,
    registerPage,
    setOpenDrawer,
  }), [actions, closeDrawers, navigation, openActions, openDrawer, openNavigation, page, registerNavigation, registerPage]);

  return <MobileShellContext.Provider value={value}>{children}</MobileShellContext.Provider>;
}

export function useMobileShell() {
  const context = useContext(MobileShellContext);
  if (!context) throw new Error("useMobileShell must be used inside MobileShellProvider");
  return context;
}

export function useMobileNavigation(registration, priority = 0) {
  const id = useId();
  const { registerNavigation } = useMobileShell();
  useEffect(
    () => registerNavigation(id, registration, priority),
    [id, priority, registerNavigation, registration],
  );
}

export function useMobilePageActions(registration, priority = 0) {
  const id = useId();
  const { registerPage } = useMobileShell();
  useEffect(
    () => registerPage(id, registration, priority),
    [id, priority, registerPage, registration],
  );
}
