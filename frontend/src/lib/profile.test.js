import { parseProfileList, profileAllowsAudit, profileInitials } from "./profile";

test("profile initials use public name before email", () => {
  expect(profileInitials("Ana Gomez", "ana@example.com")).toBe("AG");
  expect(profileInitials("", "ana@example.com")).toBe("A");
});

test("profile lists are trimmed and deduplicated", () => {
  expect(parseProfileList("Conversation, Grammar, Conversation")).toEqual([
    "Conversation",
    "Grammar",
  ]);
});

test("audit visibility follows the backend capability", () => {
  expect(profileAllowsAudit({ canViewAudit: true })).toBe(true);
  expect(profileAllowsAudit({ canViewAudit: false })).toBe(false);
});
