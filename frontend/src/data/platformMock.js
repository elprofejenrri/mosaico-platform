export const platformStats = [
  { label: "learners", value: "12.8k" },
  { label: "live classes", value: "48k" },
  { label: "avg rating", value: "4.9" },
  { label: "countries", value: "36" },
];

export const pillars = [
  { key: "learn", title: "Learn", body: "Structured courses, micro-lessons, quizzes, and guided learning paths." },
  { key: "practice", title: "Practice", body: "AI roleplays, corrections, speaking prompts, and daily vocabulary." },
  { key: "connect", title: "Connect", body: "Clubs, events, study groups, and social learning challenges." },
  { key: "grow", title: "Grow", body: "Progress tracking, badges, certificates, and skill analytics." },
  { key: "teach", title: "Teach", body: "Teacher calendars, students, feedback, materials, and earnings." },
  { key: "operate", title: "Operate", body: "Admin tools for users, content, bookings, payments, and insights." },
];

export const teachers = [
  {
    id: "marisol",
    name: "Marisol Vega",
    specialty: "Conversation and travel Spanish",
    level: "A2-C1",
    price: 24,
    rating: 4.9,
    availability: "Today 18:00",
    color: "#E8704C",
  },
  {
    id: "andres",
    name: "Andres Molina",
    specialty: "Business Spanish and interviews",
    level: "B1-C2",
    price: 32,
    rating: 4.8,
    availability: "Tomorrow 09:00",
    color: "#2DA89F",
  },
  {
    id: "lucia",
    name: "Lucia Ramos",
    specialty: "Grammar, DELE prep, and writing",
    level: "A1-C1",
    price: 28,
    rating: 5.0,
    availability: "Friday 16:30",
    color: "#8B5BB8",
  },
];

export const courses = [
  {
    id: "real-conversations-a2",
    title: "Real Conversations A2",
    status: "In progress",
    progress: 68,
    lessons: 24,
    nextLesson: "Ordering food with confidence",
    category: "Speaking",
  },
  {
    id: "travel-spanish",
    title: "Travel Spanish Sprint",
    status: "Recommended",
    progress: 22,
    lessons: 12,
    nextLesson: "Hotel check-in roleplay",
    category: "Travel",
  },
  {
    id: "grammar-builder",
    title: "Grammar Builder",
    status: "New",
    progress: 8,
    lessons: 18,
    nextLesson: "Preterite vs imperfect",
    category: "Grammar",
  },
];

export const lessons = [
  { title: "Airport arrival", type: "Roleplay", time: "12 min", skill: "Speaking" },
  { title: "Ser vs estar in real life", type: "Grammar", time: "16 min", skill: "Grammar" },
  { title: "Cafe listening drill", type: "Audio", time: "9 min", skill: "Listening" },
  { title: "Write a weekend plan", type: "Writing", time: "14 min", skill: "Writing" },
];

export const bookings = [
  { id: "b1", student: "Elena Brooks", teacher: "Marisol Vega", course: "Real Conversations A2", date: "Today", time: "18:00", status: "Confirmed" },
  { id: "b2", student: "Noah Kim", teacher: "Andres Molina", course: "Business Spanish", date: "Tomorrow", time: "09:00", status: "Confirmed" },
  { id: "b3", student: "Ava Patel", teacher: "Lucia Ramos", course: "DELE Grammar", date: "Friday", time: "16:30", status: "Pending notes" },
  { id: "b4", student: "Mateo Silva", teacher: "Marisol Vega", course: "Travel Spanish", date: "Yesterday", time: "11:00", status: "Completed" },
];

export const students = [
  { id: "s1", name: "Elena Brooks", level: "A2", goals: "Travel and daily conversation", attendance: "92%", progress: 68, risk: "Low" },
  { id: "s2", name: "Noah Kim", level: "B1", goals: "Business meetings", attendance: "87%", progress: 54, risk: "Medium" },
  { id: "s3", name: "Ava Patel", level: "A1", goals: "Grammar confidence", attendance: "96%", progress: 43, risk: "Low" },
  { id: "s4", name: "Mateo Silva", level: "B2", goals: "Interview practice", attendance: "71%", progress: 39, risk: "High" },
];

export const communityPosts = [
  { id: "p1", author: "Sofia", group: "Madrid Club", body: "Drop your favorite Spanish filler phrase. Mine is 'vale'.", likes: 32, comments: 8 },
  { id: "p2", author: "Kenji", group: "Business Spanish", body: "I made a 5-minute pitch in Spanish today. Terrifying, then fun.", likes: 48, comments: 14 },
  { id: "p3", author: "Maya", group: "A2 Learners", body: "Anyone joining the restaurant roleplay event tonight?", likes: 21, comments: 6 },
];

export const events = [
  { id: "e1", title: "Restaurant roleplay night", time: "Today 19:30", seats: 8, status: "Open" },
  { id: "e2", title: "Spanish film discussion", time: "Thursday 18:00", seats: 14, status: "Open" },
  { id: "e3", title: "DELE speaking circle", time: "Saturday 10:00", seats: 6, status: "Waitlist" },
];

export const skillProgress = [
  { skill: "Speaking", value: 74 },
  { skill: "Listening", value: 62 },
  { skill: "Reading", value: 71 },
  { skill: "Writing", value: 48 },
  { skill: "Grammar", value: 57 },
  { skill: "Vocabulary", value: 82 },
];

export const analytics = [
  { label: "DAU", value: 1840, change: "+12%" },
  { label: "MAU", value: 12800, change: "+18%" },
  { label: "MRR", value: 84200, change: "+9%" },
  { label: "Retention", value: 78, change: "+4%" },
  { label: "Completion", value: 64, change: "+7%" },
  { label: "Conversion", value: 11, change: "+2%" },
];

export const payments = [
  { plan: "Starter", price: "$19/mo", users: 3400, status: "Active" },
  { plan: "Live Plus", price: "$79/mo", users: 1120, status: "Active" },
  { plan: "Intensive", price: "$219/mo", users: 360, status: "Pilot" },
];

export const teacherMaterials = [
  { title: "Restaurant vocabulary deck", type: "PDF", used: "42 classes" },
  { title: "Business meeting phrases", type: "Video", used: "19 classes" },
  { title: "Past tense homework", type: "Exercise", used: "33 classes" },
  { title: "Travel listening links", type: "Links", used: "27 classes" },
];
