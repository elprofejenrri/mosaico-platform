import { isTechnicalUser } from "./access";

test("technical administrators can access the technical wiki", () => {
  expect(isTechnicalUser({ roles: ["administrador_profesor"], permissions: {} })).toBe(true);
});

test("non-technical profiles do not gain technical wiki access", () => {
  expect(isTechnicalUser({ roles: ["alumno"], permissions: {} })).toBe(false);
});
