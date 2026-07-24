import { translations } from "./i18n";

test("mobile shell English and Spanish translation keys remain in parity", () => {
  expect(Object.keys(translations.es.mobileShell).sort()).toEqual(
    Object.keys(translations.en.mobileShell).sort(),
  );
  expect(Object.keys(translations.es.mobileShell.actionGroups).sort()).toEqual(
    Object.keys(translations.en.mobileShell.actionGroups).sort(),
  );
  Object.values(translations.en.mobileShell).forEach((value) => expect(value).toBeTruthy());
  Object.values(translations.es.mobileShell).forEach((value) => expect(value).toBeTruthy());
});
