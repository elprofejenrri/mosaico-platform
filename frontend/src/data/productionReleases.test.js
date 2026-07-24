import { productionReleases } from "./productionReleases";

const versionValue = (version) => version.split(".").map(Number);
const compare = (left, right) => {
  const a = versionValue(left);
  const b = versionValue(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
};

test("production releases are complete, unique, and newest first", () => {
  expect(productionReleases.length).toBeGreaterThan(0);
  expect(new Set(productionReleases.map((release) => release.version)).size).toBe(productionReleases.length);

  productionReleases.forEach((release, index) => {
    expect(release.version).toMatch(/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
    expect(release.title.trim()).not.toBe("");
    expect(release.summary.trim()).not.toBe("");
    expect(release.items.length).toBeGreaterThan(0);
    release.items.forEach((item) => expect(item.trim()).not.toBe(""));
    if (index > 0) {
      expect(compare(productionReleases[index - 1].version, release.version)).toBeGreaterThan(0);
    }
  });
});

test("visible release outcomes avoid sensitive implementation language", () => {
  const visibleText = productionReleases
    .flatMap((release) => [release.title, release.summary, ...release.items])
    .join(" ");
  const forbidden = [
    /https?:\/\//i,
    /\b(api|backend|database|migration|schema|token|secret|credential|endpoint|repository|branch|workflow)\b/i,
    /(?:^|\s)(?:src|docs|backend|frontend)\//i,
  ];

  forbidden.forEach((pattern) => expect(visibleText).not.toMatch(pattern));
});
