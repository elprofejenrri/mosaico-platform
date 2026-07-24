import React, { useMemo } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, useNavigate } from "react-router-dom";
import MobileWorkspaceHeader from "./MobileWorkspaceHeader";
import {
  MobileShellProvider,
  resolveMobileActions,
  useMobileNavigation,
  useMobilePageActions,
  useMobileShell,
} from "../../context/MobileShellContext";

let mockLanguage = "en";
const mockTranslations = {
  en: {
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    mainNavigation: "Main navigation",
    openActions: "Open page actions",
    closeActions: "Close page actions",
    pageActions: "Page actions",
    currentSection: "Current section",
    loadingAction: "Working...",
    actionFailed: "The action could not be completed.",
    actionGroups: {
      primary: "Primary actions",
      record: "Record actions",
      view: "View controls",
      secondary: "More options",
      destructive: "Destructive actions",
    },
  },
  es: {
    openNavigation: "Abrir navegación",
    closeNavigation: "Cerrar navegación",
    mainNavigation: "Navegación principal",
    openActions: "Abrir acciones de la página",
    closeActions: "Cerrar acciones de la página",
    pageActions: "Acciones de la página",
    currentSection: "Sección actual",
    loadingAction: "Procesando...",
    actionFailed: "No se pudo completar la acción.",
    actionGroups: {
      primary: "Acciones principales",
      record: "Acciones del registro",
      view: "Controles de vista",
      secondary: "Más opciones",
      destructive: "Acciones destructivas",
    },
  },
};

jest.mock("../../context/AppContext", () => ({
  useApp: () => ({ lang: mockLanguage, t: { mobileShell: mockTranslations[mockLanguage] } }),
}));

const mockCan = (permission) => permission !== "admin.denied";
const mockScopes = (permission) => permission === "school.action" ? ["school"] : ["global"];
jest.mock("../../hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: mockCan,
    scopes: mockScopes,
  }),
}));

const mockDefaultAction = jest.fn();

function RegisteredScreen({ actionSpy = mockDefaultAction, includeActions = true }) {
  const navigate = useNavigate();
  const { openActions } = useMobileShell();
  const navigation = useMemo(() => ({
    description: "Student portal",
    content: (
      <div>
        <Link to="/student" aria-current="page">Dashboard</Link>
        <button type="button" onClick={openActions}>Open actions from navigation</button>
      </div>
    ),
  }), [openActions]);
  const page = useMemo(() => ({
    title: "Student dashboard",
    context: "Student",
    actions: includeActions ? [
      {
        id: "save",
        label: "Save",
        priority: 10,
        group: "primary",
        handler: actionSpy,
      },
      {
        id: "denied",
        label: "Denied",
        permission: "admin.denied",
        handler: actionSpy,
      },
    ] : [],
  }), [actionSpy, includeActions]);
  useMobileNavigation(navigation);
  useMobilePageActions(page);

  return (
    <>
      <MobileWorkspaceHeader fallbackNavigation={<a href="/">Home</a>} fallbackTitle="MOSAICO" />
      <input aria-label="Persistent form value" defaultValue="unchanged" />
      <button type="button" onClick={() => navigate("/next")}>Change route</button>
    </>
  );
}

function renderShell(props = {}) {
  return render(
    <MemoryRouter initialEntries={["/student"]}>
      <MobileShellProvider>
        <RegisteredScreen {...props} />
      </MobileShellProvider>
    </MemoryRouter>,
  );
}

function PriorityScreen() {
  const base = useMemo(() => ({ title: "Portal", actions: [] }), []);
  const route = useMemo(() => ({
    title: "Calendar",
    actions: [{ id: "specific", label: "Specific action", handler: mockDefaultAction }],
  }), []);
  useMobilePageActions(base, -100);
  useMobilePageActions(route);
  return <MobileWorkspaceHeader fallbackNavigation={<a href="/">Home</a>} fallbackTitle="MOSAICO" />;
}

beforeEach(() => {
  mockLanguage = "en";
});

test("renders the burger, title, active route, and no misleading action trigger", async () => {
  const user = userEvent.setup();
  renderShell({ includeActions: false });
  expect(await screen.findByTestId("mobile-page-title")).toHaveTextContent("Student dashboard");
  expect(screen.getByRole("button", { name: "Open navigation" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Open page actions" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
});

test("prefers a route registration over its portal fallback regardless of effect order", async () => {
  render(
    <MemoryRouter>
      <MobileShellProvider>
        <PriorityScreen />
      </MobileShellProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId("mobile-page-title")).toHaveTextContent("Calendar");
  expect(screen.getByRole("button", { name: "Open page actions" })).toBeVisible();
});

test("opens and closes navigation with Escape and restores focus", async () => {
  const user = userEvent.setup();
  renderShell();
  const trigger = await screen.findByRole("button", { name: "Open navigation" });
  await user.click(trigger);
  const drawer = await screen.findByTestId("mobile-navigation-drawer");
  expect(drawer).toBeVisible();
  expect(within(drawer).getByRole("heading", { name: "Main navigation" })).toBeVisible();

  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByTestId("mobile-navigation-drawer")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
});

test("traps keyboard focus inside an open drawer", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByRole("button", { name: "Open navigation" }));
  const drawer = await screen.findByTestId("mobile-navigation-drawer");
  for (let index = 0; index < 8; index += 1) await user.tab();
  expect(drawer).toContainElement(document.activeElement);
});

test("backdrop closes the navigation drawer", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByRole("button", { name: "Open navigation" }));
  await screen.findByTestId("mobile-navigation-drawer");
  const overlay = document.querySelector("[data-radix-dialog-overlay]");
  if (overlay) {
    fireEvent.pointerDown(overlay);
  } else {
    fireEvent.pointerDown(document.querySelector(".fixed.inset-0"));
  }
  await waitFor(() => expect(screen.queryByTestId("mobile-navigation-drawer")).not.toBeInTheDocument());
});

test("keeps only one drawer open and preserves center form state", async () => {
  const user = userEvent.setup();
  renderShell();
  const input = await screen.findByRole("textbox", { name: "Persistent form value" });
  await user.clear(input);
  await user.type(input, "draft value");
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  await user.click(screen.getByRole("button", { name: "Open actions from navigation" }));

  expect(screen.queryByTestId("mobile-navigation-drawer")).not.toBeInTheDocument();
  expect(await screen.findByTestId("mobile-actions-drawer")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(input).toHaveValue("draft value");
});

test("filters unauthorized actions and executes a registered real action once", async () => {
  const user = userEvent.setup();
  const actionSpy = jest.fn();
  renderShell({ actionSpy });
  await user.click(await screen.findByRole("button", { name: "Open page actions" }));
  expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Denied" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(actionSpy).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByTestId("mobile-actions-drawer")).not.toBeInTheDocument());
});

test("cleans up an open drawer on route change", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.click(await screen.findByRole("button", { name: "Open navigation" }));
  await user.click(screen.getByRole("link", { name: "Dashboard" }));
  await waitFor(() => expect(screen.queryByTestId("mobile-navigation-drawer")).not.toBeInTheDocument());
});

test("updates accessible labels when language changes", async () => {
  const rendered = renderShell();
  expect(await screen.findByRole("button", { name: "Open navigation" })).toBeVisible();
  mockLanguage = "es";
  rendered.rerender(
    <MemoryRouter initialEntries={["/student"]}>
      <MobileShellProvider>
        <RegisteredScreen />
      </MobileShellProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByRole("button", { name: "Abrir navegación" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Abrir acciones de la página" })).toBeVisible();
});

test.each([320, 360, 390, 430, 768, 1280])("keeps the shared header contract at %ipx", async (width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
  renderShell();
  expect(await screen.findByTestId("mobile-workspace-header")).toHaveClass("lg:hidden");
  expect(screen.getByTestId("mobile-page-title")).toHaveClass("truncate");
});

test("resolves permission, scope, visibility, disabled, and priority rules", () => {
  const handler = jest.fn();
  const actions = resolveMobileActions([
    { id: "late", priority: 50, handler },
    { id: "scope-denied", permission: "school.action", scope: "global", handler },
    { id: "permission-denied", permission: "admin.denied", handler },
    { id: "hidden", visible: false, handler },
    { id: "disabled", priority: 5, disabledRule: () => true, handler },
  ], (permission) => permission !== "admin.denied", (permission) => permission === "school.action" ? ["school"] : ["global"]);

  expect(actions.map((action) => action.id)).toEqual(["disabled", "late"]);
  expect(actions[0].disabled).toBe(true);
});
