const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "frontend", "src", "data", "productionReleases.json");
const markdownPath = path.join(root, "docs", "TECHNICAL_WIKI.md");
const releases = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const markdown = fs.readFileSync(markdownPath, "utf8");

const errors = [];
const versions = releases.map((release) => release.version);
const uniqueVersions = new Set(versions);

if (!Array.isArray(releases) || releases.length === 0) {
  errors.push("The application release history must contain at least one release.");
}
if (uniqueVersions.size !== versions.length) {
  errors.push("Application release versions must be unique.");
}

const operationalVersion = /^\d{4}\.\d{2}\.\d{2}\.\d+$/;
const semanticVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const isValidIsoDate = (value) => {
  if (!isoDate.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const versionParts = (version) => version.split(/[.-]/).map((part) => /^\d+$/.test(part) ? Number(part) : part);
const compareVersions = (left, right) => {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index] === b[index]) continue;
    if (a[index] === undefined) return -1;
    if (b[index] === undefined) return 1;
    if (typeof a[index] === "number" && typeof b[index] === "number") return a[index] - b[index];
    return String(a[index]).localeCompare(String(b[index]));
  }
  return 0;
};

releases.forEach((release, index) => {
  if (!release || typeof release !== "object") {
    errors.push(`Release at index ${index} is invalid.`);
    return;
  }
  if (!operationalVersion.test(release.version || "") && !semanticVersion.test(release.version || "")) {
    errors.push(`Release ${release.version || index} has an invalid version.`);
  }
  if (!isValidIsoDate(release.releaseDate)) {
    errors.push(`Release ${release.version || index} must have a valid ISO release date.`);
  }
  if (operationalVersion.test(release.version || "") &&
      release.version.slice(0, 10).replaceAll(".", "-") !== release.releaseDate) {
    errors.push(`Release ${release.version} date must match its operational version.`);
  }
  if (!(release.title || "").trim()) errors.push(`Release ${release.version} has an empty title.`);
  if (!(release.summary || "").trim()) errors.push(`Release ${release.version} has an empty summary.`);
  if (!Array.isArray(release.items) || release.items.length === 0 || release.items.some((item) => !(item || "").trim())) {
    errors.push(`Release ${release.version} must have non-empty outcome items.`);
  }
  if (index > 0 && compareVersions(releases[index - 1].version, release.version) <= 0) {
    errors.push("Application releases must be in strictly descending version order.");
  }
  if (index > 0 && releases[index - 1].releaseDate < release.releaseDate) {
    errors.push("Application release dates must be in descending order.");
  }
});

const blockPattern = /<!-- RELEASE: ([^\s]+) -->\s*### ([^\n]+)\n\nSummary: ([^\n]+)\n\nRelease date: ([^\n]+)\n\n([\s\S]*?)\n<!-- \/RELEASE -->/g;
const markdownReleases = [];
let match;
while ((match = blockPattern.exec(markdown)) !== null) {
  const heading = match[2].trim();
  const separator = heading.indexOf(" — ");
  const headingVersion = separator >= 0 ? heading.slice(0, separator) : heading;
  const title = separator >= 0 ? heading.slice(separator + 3) : "";
  markdownReleases.push({
    version: match[1],
    headingVersion,
    title,
    summary: match[3].trim(),
    releaseDate: match[4].trim(),
    items: match[5].split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim()),
  });
}

if (markdownReleases.length !== releases.length) {
  errors.push(`Markdown has ${markdownReleases.length} releases but the application has ${releases.length}.`);
}

releases.forEach((release, index) => {
  const documented = markdownReleases[index];
  if (!documented) return;
  if (documented.version !== release.version || documented.headingVersion !== release.version) {
    errors.push(`Version mismatch at release index ${index}.`);
  }
  if (documented.title !== release.title) errors.push(`Title mismatch for ${release.version}.`);
  if (documented.summary !== release.summary) errors.push(`Summary mismatch for ${release.version}.`);
  if (documented.releaseDate !== release.releaseDate) errors.push(`Release date mismatch for ${release.version}.`);
  if (JSON.stringify(documented.items) !== JSON.stringify(release.items)) {
    errors.push(`Outcome mismatch for ${release.version}.`);
  }
});

if (errors.length) {
  console.error("Release history validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Release history valid: ${releases.length} synchronized release(s), newest ${versions[0]}.`);
