import { formatReleaseDate } from "./releaseDates";

test("formats release dates for the active Wiki language without timezone drift", () => {
  expect(formatReleaseDate("2026-07-24", "en")).toBe("July 24, 2026");
  expect(formatReleaseDate("2026-07-24", "es")).toBe("24 de julio de 2026");
});
