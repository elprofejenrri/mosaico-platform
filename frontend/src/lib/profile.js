export function profileInitials(publicName, email = "") {
  return (publicName || email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
}

export function parseProfileList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item, index, items) => item && items.indexOf(item) === index);
}

export function profileAllowsAudit(profile) {
  return Boolean(profile?.canViewAudit);
}
