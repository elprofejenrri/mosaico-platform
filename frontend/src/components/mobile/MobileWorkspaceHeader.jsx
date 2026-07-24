import React, { useMemo, useState } from "react";
import { Menu, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { useMobileShell } from "../../context/MobileShellContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

const groupOrder = ["primary", "record", "view", "secondary", "destructive"];

function groupedActions(actions) {
  return actions.reduce((groups, action) => {
    const group = action.destructive ? "destructive" : (action.group || "secondary");
    groups[group] = groups[group] || [];
    groups[group].push(action);
    return groups;
  }, {});
}

export default function MobileWorkspaceHeader({
  fallbackNavigation,
  fallbackTitle,
}) {
  const { lang, t } = useApp();
  const {
    actions,
    closeDrawers,
    navigation,
    openActions,
    openDrawer,
    openNavigation,
    page,
    setOpenDrawer,
  } = useMobileShell();
  const [runningAction, setRunningAction] = useState("");
  const copy = t.mobileShell;
  const navigationContent = navigation?.content || fallbackNavigation;
  const title = page?.title || fallbackTitle;
  const context = page?.context || "";
  const groups = useMemo(() => groupedActions(actions), [actions]);
  const hasActions = actions.length > 0;

  const runAction = async (action) => {
    if (action.disabled || action.loading || runningAction) return;
    setRunningAction(action.id);
    try {
      await action.handler();
      if (!action.keepOpen) closeDrawers();
    } catch (error) {
      toast.error(error?.appError?.message || error?.message || copy.actionFailed);
    } finally {
      setRunningAction("");
    }
  };

  const closeNavigationFromSelection = (event) => {
    if (event.target.closest("a,[data-mobile-drawer-close='true']")) closeDrawers();
  };

  return (
    <div
      className="grid min-h-16 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 px-3 lg:hidden"
      style={{
        minHeight: "calc(4rem + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
      data-testid="mobile-workspace-header"
    >
      <Sheet
        open={openDrawer === "navigation"}
        onOpenChange={(open) => setOpenDrawer(open ? "navigation" : null)}
      >
        <SheetTrigger asChild>
          <button
            type="button"
            onClick={openNavigation}
            className="grid min-h-11 min-w-11 place-items-center rounded-md text-[#1F3B6E] outline-none hover:bg-[#FFF0E6] focus-visible:ring-2 focus-visible:ring-[#E8704C]"
            aria-label={openDrawer === "navigation" ? copy.closeNavigation : copy.openNavigation}
            aria-expanded={openDrawer === "navigation"}
            aria-controls="mobile-main-navigation"
            data-testid="mobile-navigation-trigger"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent
          id="mobile-main-navigation"
          side="left"
          closeLabel={copy.closeNavigation}
          className="h-[100dvh] w-[min(88vw,22rem)] max-w-none overflow-hidden border-[#EFE4D0] bg-[#FBF7EE] p-0 motion-reduce:transition-none"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          data-testid="mobile-navigation-drawer"
        >
          <SheetHeader className="border-b border-[#EFE4D0] px-5 py-4 text-left">
            <SheetTitle className="pr-10 text-xl text-[#1F3B6E]">{copy.mainNavigation}</SheetTitle>
            <SheetDescription className="text-[#5C6680]">
              {navigation?.description || copy.currentSection}
            </SheetDescription>
          </SheetHeader>
          <nav
            className="h-[calc(100dvh_-_5.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain p-4"
            aria-label={copy.mainNavigation}
            onClick={closeNavigationFromSelection}
          >
            {navigationContent}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 text-center" aria-live="polite">
        {context && <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E8704C]">{context}</p>}
        <p className="truncate text-sm font-extrabold text-[#1F3B6E]" data-testid="mobile-page-title">{title}</p>
      </div>

      {hasActions ? (
        <Sheet
          open={openDrawer === "actions"}
          onOpenChange={(open) => setOpenDrawer(open ? "actions" : null)}
        >
          <SheetTrigger asChild>
            <button
              type="button"
              onClick={openActions}
              className="grid min-h-11 min-w-11 place-items-center rounded-md text-[#1F3B6E] outline-none hover:bg-[#FFF0E6] focus-visible:ring-2 focus-visible:ring-[#E8704C]"
              aria-label={openDrawer === "actions" ? copy.closeActions : copy.openActions}
              aria-expanded={openDrawer === "actions"}
              aria-controls="mobile-page-actions"
              data-testid="mobile-actions-trigger"
            >
              <MoreHorizontal size={22} aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            id="mobile-page-actions"
            side="right"
            closeLabel={copy.closeActions}
            className="h-[100dvh] w-[min(88vw,22rem)] max-w-none overflow-hidden border-[#EFE4D0] bg-white p-0 motion-reduce:transition-none"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
            data-testid="mobile-actions-drawer"
          >
            <SheetHeader className="border-b border-[#EFE4D0] px-5 py-4 text-left">
              <SheetTitle className="pr-10 text-xl text-[#1F3B6E]">{copy.pageActions}</SheetTitle>
              <SheetDescription className="text-[#5C6680]">{title}</SheetDescription>
            </SheetHeader>
            <div className="h-[calc(100dvh_-_5.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain p-4">
              {groupOrder.map((group) => {
                const items = groups[group] || [];
                if (!items.length) return null;
                return (
                  <section key={group} className={`py-3 first:pt-0 ${group === "destructive" ? "mt-4 border-t border-red-200" : ""}`}>
                    <h3 className={`mb-2 text-xs font-bold uppercase tracking-[0.14em] ${group === "destructive" ? "text-red-700" : "text-[#5C6680]"}`}>
                      {copy.actionGroups[group]}
                    </h3>
                    <div className="grid gap-2">
                      {items.map((action) => {
                        const Icon = action.icon;
                        const disabled = Boolean(action.disabled || action.loading || runningAction);
                        return (
                          <div key={action.id}>
                            <button
                              type="button"
                              onClick={() => runAction(action)}
                              disabled={disabled}
                              className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#E8704C] disabled:cursor-not-allowed disabled:opacity-55 ${
                                action.destructive
                                  ? "border-red-200 text-red-700 hover:bg-red-50"
                                  : "border-[#EFE4D0] text-[#1F3B6E] hover:bg-[#FFF0E6]"
                              }`}
                              data-testid={`mobile-action-${action.id}`}
                            >
                              {Icon && <Icon size={18} aria-hidden="true" />}
                              <span className="min-w-0 flex-1">{runningAction === action.id || action.loading ? copy.loadingAction : action.label}</span>
                            </button>
                            {disabled && action.disabledReason && <p className="mt-1 px-2 text-xs text-[#5C6680]">{action.disabledReason}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      ) : <span className="min-h-11 min-w-11" aria-hidden="true" />}
    </div>
  );
}
