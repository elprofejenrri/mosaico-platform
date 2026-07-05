const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const toMinutes = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const toTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function buildAvailabilityOptions(start, end, durations = [30, 45, 60], cooldown = 0) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return durations.map((duration) => {
    const slots = [];
    let cursor = startMinutes;
    while (cursor + duration <= endMinutes) {
      slots.push({ start: toTime(cursor), end: toTime(cursor + duration), duration });
      cursor += duration + cooldown;
    }
    return { duration, count: slots.length, slots };
  });
}

export const calendarStatuses = {
  booked: "Booked",
  available: "Available",
  blocked: "Blocked",
  cancelled: "Cancelled",
  completed: "Completed",
  conflict: "Conflict",
  empty: "Empty gap",
};

const students = [
  {
    id: "stu-elena",
    name: "Elena Brooks",
    level: "A2",
    roadmapStage: "A2 Everyday Spanish",
    progress: 68,
    credits: 8,
    lastClassDate: "Jun 28",
    preferredTime: "Evening",
    behindRoadmap: false,
    feedback: ["Great confidence ordering food.", "Needs more past tense repetition."],
    badges: ["Foundation Builder", "Cafe Speaker"],
  },
  {
    id: "stu-noah",
    name: "Noah Kim",
    level: "B1",
    roadmapStage: "B1 Business Conversations",
    progress: 54,
    credits: 5,
    lastClassDate: "Jun 20",
    preferredTime: "Morning",
    behindRoadmap: true,
    feedback: ["Strong vocabulary.", "Practice meeting transitions."],
    badges: ["Meeting Ready"],
  },
  {
    id: "stu-ava",
    name: "Ava Patel",
    level: "A1",
    roadmapStage: "A1 Foundations",
    progress: 43,
    credits: 12,
    lastClassDate: "Jun 18",
    preferredTime: "Afternoon",
    behindRoadmap: true,
    feedback: ["Very steady attendance.", "Needs pronunciation warmups."],
    badges: ["First Step"],
  },
  {
    id: "stu-mateo",
    name: "Mateo Silva",
    level: "B2",
    roadmapStage: "B2 Confident Speaker",
    progress: 71,
    credits: 2,
    lastClassDate: "Jul 01",
    preferredTime: "Saturday",
    behindRoadmap: false,
    feedback: ["Excellent fluency.", "Prepare interview story structure."],
    badges: ["Conversation Ready", "Interview Sprint"],
  },
];

let sessions = [
  {
    id: "session-1",
    date: "2026-07-06",
    day: "Mon",
    start: "09:00",
    end: "10:00",
    status: "booked",
    studentId: "stu-noah",
    studentName: "Noah Kim",
    classType: "Business Spanish",
    level: "B1",
    roadmapStage: "B1 Business Conversations",
    credits: 2,
    location: "Google Meet",
  },
  {
    id: "session-2",
    date: "2026-07-06",
    day: "Mon",
    start: "10:30",
    end: "11:30",
    status: "available",
    classType: "Open private lesson",
    durationOptions: [30, 45, 60],
    cooldownMinutes: 0,
    slotOptions: buildAvailabilityOptions("10:30", "11:30", [30, 45, 60], 0),
    credits: 2,
    location: "Online",
  },
  {
    id: "availability-window-1",
    date: "2026-07-11",
    day: "Sat",
    start: "09:00",
    end: "11:00",
    status: "available",
    classType: "Wide availability window",
    durationOptions: [30, 45, 60],
    cooldownMinutes: 0,
    slotOptions: buildAvailabilityOptions("09:00", "11:00", [30, 45, 60], 0),
    credits: 2,
    location: "Online",
  },
  {
    id: "session-3",
    date: "2026-07-06",
    day: "Mon",
    start: "13:00",
    end: "14:00",
    status: "blocked",
    classType: "Administrative work",
    reason: "Administrative work",
    credits: 0,
  },
  {
    id: "session-4",
    date: "2026-07-07",
    day: "Tue",
    start: "15:00",
    end: "16:00",
    status: "completed",
    studentId: "stu-elena",
    studentName: "Elena Brooks",
    classType: "Real Conversations A2",
    level: "A2",
    roadmapStage: "A2 Everyday Spanish",
    credits: 2,
  },
  {
    id: "session-5",
    date: "2026-07-08",
    day: "Wed",
    start: "18:00",
    end: "19:00",
    status: "conflict",
    studentId: "stu-ava",
    studentName: "Ava Patel",
    classType: "A1 Grammar",
    level: "A1",
    roadmapStage: "A1 Foundations",
    credits: 2,
    conflict: "Imported Google busy event overlaps by 30 minutes",
  },
  {
    id: "session-6",
    date: "2026-07-09",
    day: "Thu",
    start: "11:00",
    end: "12:00",
    status: "cancelled",
    studentId: "stu-mateo",
    studentName: "Mateo Silva",
    classType: "Interview practice",
    level: "B2",
    roadmapStage: "B2 Confident Speaker",
    credits: 2,
  },
  {
    id: "session-7",
    date: "2026-07-10",
    day: "Fri",
    start: "19:00",
    end: "20:00",
    status: "booked",
    studentId: "stu-elena",
    studentName: "Elena Brooks",
    classType: "Cafe roleplay",
    level: "A2",
    roadmapStage: "A2 Everyday Spanish",
    credits: 2,
  },
];

const emptySlots = [
  { id: "empty-1", date: "2026-07-07", start: "17:00", end: "18:00", demand: "High", suggestion: "Invite A2 learners with unused credits" },
  { id: "empty-2", date: "2026-07-09", start: "09:00", end: "10:00", demand: "Medium", suggestion: "Share with morning-preference students" },
  { id: "empty-3", date: "2026-07-11", start: "10:00", end: "12:00", demand: "High", suggestion: "Saturday has high demand" },
];

let integration = {
  status: "connected",
  lastSyncedAt: "Today 08:42",
  syncDirection: "two-way",
  conflicts: 1,
};

export async function getTeacherCalendarWorkspace() {
  await delay(250);
  return {
    sessions: [...sessions],
    students,
    emptySlots,
    integration: { ...integration },
    insights: {
      weekHours: 18,
      monthHours: 64,
      occupancy: 72,
      availableHours: 12,
      bookedHours: 18,
      emptySlots: emptySlots.length,
      cancellationRate: 6,
      noShowRate: 2,
      studentsWaiting: 9,
      creditsScheduled: 28,
      suggestions: [
        "Open more evening slots",
        "Invite students with unused credits",
        "Reduce long gaps by moving availability",
        "Saturday has high demand",
      ],
    },
  };
}

export async function saveTeacherAvailability(payload) {
  await delay();
  const durationOptions = payload.durationOptions?.length ? payload.durationOptions : [Number(payload.duration || 60)];
  const cooldownMinutes = Number(payload.cooldownMinutes ?? payload.buffer ?? 0);
  const newSlot = {
    id: `available-${Date.now()}`,
    date: payload.date || "2026-07-12",
    day: payload.days?.[0] || "Mon",
    start: payload.startTime,
    end: payload.endTime,
    status: "available",
    classType: payload.template || "Open private lesson",
    durationOptions,
    cooldownMinutes,
    slotOptions: buildAvailabilityOptions(payload.startTime, payload.endTime, durationOptions, cooldownMinutes),
    credits: 2,
    location: payload.location || "Online",
  };
  sessions = [...sessions, newSlot];
  return newSlot;
}

export async function blockTeacherTime(payload) {
  await delay();
  const block = {
    id: `block-${Date.now()}`,
    date: payload.startDate || "2026-07-12",
    day: "Custom",
    start: payload.startTime,
    end: payload.endTime,
    status: "blocked",
    classType: payload.reason,
    reason: payload.reason,
    notes: payload.notes,
    credits: 0,
  };
  sessions = [...sessions, block];
  return { block, conflicts: sessions.filter((item) => item.status === "booked" && item.date === payload.startDate) };
}

export async function updateClassSession(sessionId, action, payload = {}) {
  await delay();
  sessions = sessions.map((session) => {
    if (session.id !== sessionId) return session;
    if (action === "cancel") return { ...session, status: "cancelled", cancellationReason: payload.reason };
    if (action === "complete") return { ...session, status: "completed", feedback: payload.feedback };
    if (action === "noshow") return { ...session, status: "cancelled", noShow: true, notes: payload.notes };
    if (action === "late") return { ...session, late: true, notes: payload.notes };
    if (action === "reschedule") return { ...session, date: payload.date, start: payload.start, end: payload.end };
    return { ...session, ...payload };
  });
  return sessions.find((session) => session.id === sessionId);
}

export async function sendStudentInvitations(slot, selectedStudentIds, message) {
  await delay();
  return {
    slot,
    invited: selectedStudentIds.length,
    message,
  };
}

export async function syncGoogleCalendar(nextState = {}) {
  await delay(500);
  integration = {
    ...integration,
    ...nextState,
    status: nextState.status || "connected",
    lastSyncedAt: "Just now",
  };
  return { ...integration };
}
