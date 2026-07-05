import { api } from "./api";

const SESSION_KEY = "mosaico_session_id";

export function getAnalyticsSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function trackEvent(eventName, options = {}) {
  try {
    await api.post("/analytics/events", {
      eventName,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      metadata: options.metadata || {},
      sessionId: getAnalyticsSessionId(),
    });
  } catch {
    // Analytics must never block the primary user workflow.
  }
}
