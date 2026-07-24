import { canAccessPortal, isTechnicalUser } from "./access";

const user = (role, permissions = {}) => ({ role, roles: [role], permissions });

test("student navigation is limited to the student portal", () => {
  const student = user("alumno");
  expect(canAccessPortal(student, "student")).toBe(true);
  expect(canAccessPortal(student, "teacher")).toBe(false);
  expect(canAccessPortal(student, "tutor")).toBe(false);
  expect(canAccessPortal(student, "schoolAdmin")).toBe(false);
  expect(canAccessPortal(student, "finance")).toBe(false);
  expect(canAccessPortal(student, "admin")).toBe(false);
});

test("teacher and tutor receive their role-specific portals", () => {
  const teacher = user("profesor");
  const tutor = user("tutor_padre");
  expect(canAccessPortal(teacher, "teacher")).toBe(true);
  expect(canAccessPortal(teacher, "admin")).toBe(false);
  expect(canAccessPortal(tutor, "tutor")).toBe(true);
  expect(canAccessPortal(tutor, "teacher")).toBe(false);
});

test("school and finance roles receive scoped portal families", () => {
  const schoolAdmin = user("administrador_escolar");
  const finance = user("finanzas");
  expect(canAccessPortal(schoolAdmin, "schoolAdmin")).toBe(true);
  expect(canAccessPortal(schoolAdmin, "finance")).toBe(false);
  expect(canAccessPortal(finance, "finance")).toBe(true);
  expect(canAccessPortal(finance, "admin")).toBe(false);
});

test("technical administrator and permission grants expose only authorized technical access", () => {
  const superAdmin = user("administrador_sitio", { "*": 100 });
  const wikiReader = user("viewer", { "technical.wiki.view": 1 });
  expect(["student", "teacher", "tutor", "schoolAdmin", "finance", "admin"].every(
    (portal) => canAccessPortal(superAdmin, portal),
  )).toBe(true);
  expect(isTechnicalUser(superAdmin)).toBe(true);
  expect(isTechnicalUser(wikiReader)).toBe(true);
  expect(canAccessPortal(wikiReader, "finance")).toBe(false);
});
