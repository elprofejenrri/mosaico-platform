export function formatReleaseDate(date, lang = "en") {
  return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
