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
    country: "Mexico",
    languages: ["Spanish", "English"],
    specialty: "Conversation and travel Spanish",
    specialties: ["Kids", "Travel", "Conversation"],
    level: "A2-C1",
    price: 24,
    creditCost: 2,
    rating: 4.9,
    reviews: 248,
    teachingStyle: "Warm, visual, and confidence-first.",
    bio: "Marisol helps younger learners and adults speak Spanish naturally through guided conversation and practical scenarios.",
    availability: "Today 18:00",
    color: "#E8704C",
  },
  {
    id: "andres",
    name: "Andres Molina",
    country: "Colombia",
    languages: ["Spanish", "English", "Portuguese"],
    specialty: "Business Spanish and interviews",
    specialties: ["Business", "Interviews", "B1-C2"],
    level: "B1-C2",
    price: 32,
    creditCost: 3,
    rating: 4.8,
    reviews: 186,
    teachingStyle: "Structured, goal-oriented, and practical.",
    bio: "Andres builds fluency for professional situations, presentations, interviews, and confident workplace communication.",
    availability: "Tomorrow 09:00",
    color: "#2DA89F",
  },
  {
    id: "lucia",
    name: "Lucia Ramos",
    country: "Spain",
    languages: ["Spanish", "English", "French"],
    specialty: "Grammar, DELE prep, and writing",
    specialties: ["DELE", "Grammar", "Writing"],
    level: "A1-C1",
    price: 28,
    creditCost: 2,
    rating: 5.0,
    reviews: 311,
    teachingStyle: "Precise, encouraging, and test-aware.",
    bio: "Lucia turns grammar into usable language and supports checkpoint tests with clear rubrics and steady feedback.",
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

export const tutorProfile = {
  id: "tutor-1",
  name: "Camila Torres",
  relationship: "Parent / guardian",
  learningAccountId: "family-account-1",
  timezone: "America/Cancun",
};

export const learningAccount = {
  id: "family-account-1",
  name: "Torres Family Learning Account",
  sharedCredits: 9,
  tutors: ["Camila Torres", "Rafael Torres"],
  students: ["sofia", "diego"],
};

export const tutorStudents = [
  {
    id: "sofia",
    name: "Sofia Torres",
    age: 12,
    profile: "Middle school learner, visual memory, loves music.",
    currentLevel: "A1.3",
    targetLevel: "A2",
    progress: 58,
    weeklyStudyMinutes: 95,
    classesAttended: 14,
    credits: 3,
    upcomingClass: "Marisol Vega - Today 18:00",
    risk: "Attention",
    targetDate: "September checkpoint",
    streak: 2,
    lessonsCompleted: 31,
    testsCompleted: 2,
    roadmapStage: "A1 Foundations",
  },
  {
    id: "diego",
    name: "Diego Torres",
    age: 16,
    profile: "Teen learner preparing for travel and school credit.",
    currentLevel: "A2.8",
    targetLevel: "B1",
    progress: 82,
    weeklyStudyMinutes: 165,
    classesAttended: 22,
    credits: 5,
    upcomingClass: "Lucia Ramos - Friday 16:30",
    risk: "On track",
    targetDate: "B1 readiness in 4 weeks",
    streak: 9,
    lessonsCompleted: 54,
    testsCompleted: 5,
    roadmapStage: "A2 Everyday Spanish",
  },
];

export const creditPackages = [
  { id: "starter-credits", name: "Starter Pack", credits: 6, price: "$49", bestFor: "One learner trying live classes" },
  { id: "family-credits", name: "Family Pack", credits: 16, price: "$119", bestFor: "Shared balance for siblings" },
  { id: "intensive-credits", name: "Intensive Pack", credits: 36, price: "$239", bestFor: "Weekly classes and test prep" },
];

export const creditHistory = [
  { id: "ctx-1", type: "Purchase", amount: 16, target: "Shared wallet", date: "Jun 28", note: "Family Pack" },
  { id: "ctx-2", type: "Assignment", amount: -4, target: "Sofia", date: "Jun 29", note: "Weekly class budget" },
  { id: "ctx-3", type: "Booking", amount: -2, target: "Diego", date: "Jul 01", note: "Grammar checkpoint class" },
];

export const teacherAvailability = [
  { teacherId: "marisol", day: "Mon", slots: ["16:00", "18:00"], unavailable: ["19:30"] },
  { teacherId: "marisol", day: "Tue", slots: ["15:00", "17:30"], unavailable: ["20:00"] },
  { teacherId: "andres", day: "Wed", slots: ["09:00", "12:00"], unavailable: ["18:00"] },
  { teacherId: "lucia", day: "Fri", slots: ["10:00", "16:30"], unavailable: ["12:30"] },
];

export const tutorProgressByStudent = {
  sofia: [
    { skill: "Speaking", value: 52 },
    { skill: "Listening", value: 61 },
    { skill: "Reading", value: 66 },
    { skill: "Writing", value: 44 },
    { skill: "Grammar", value: 49 },
    { skill: "Vocabulary", value: 72 },
  ],
  diego: [
    { skill: "Speaking", value: 78 },
    { skill: "Listening", value: 84 },
    { skill: "Reading", value: 80 },
    { skill: "Writing", value: 63 },
    { skill: "Grammar", value: 74 },
    { skill: "Vocabulary", value: 88 },
  ],
};

export const testResults = [
  { id: "test-1", studentId: "sofia", name: "Placement test", status: "Completed", score: "A1", skill: "General", date: "Jun 12", next: "Continue A1 Foundations" },
  { id: "test-2", studentId: "sofia", name: "Vocabulary quiz", status: "Recommended", score: "-", skill: "Vocabulary", date: "This week", next: "Review food and travel words" },
  { id: "test-3", studentId: "diego", name: "A2 checkpoint", status: "Ready", score: "82%", skill: "Level checkpoint", date: "Jul 05", next: "Book speaking review" },
  { id: "test-4", studentId: "diego", name: "Listening drill", status: "Completed", score: "88%", skill: "Listening", date: "Jun 26", next: "Move to B1 conversations" },
];

export const learningRoadmap = [
  { stage: "Onboarding", status: "Completed", lessons: 2, tests: 0, classes: 0, badge: "First Step" },
  { stage: "Placement test", status: "Completed", lessons: 0, tests: 1, classes: 0, badge: "Level Finder" },
  { stage: "A1 Foundations", status: "Current", lessons: 30, tests: 2, classes: 8, badge: "Foundation Builder" },
  { stage: "A2 Everyday Spanish", status: "Current", lessons: 36, tests: 3, classes: 10, badge: "Everyday Speaker" },
  { stage: "B1 Real Conversations", status: "Locked", lessons: 42, tests: 4, classes: 12, badge: "Conversation Ready" },
  { stage: "B2 Confident Speaker", status: "Locked", lessons: 48, tests: 4, classes: 14, badge: "Confident Speaker" },
  { stage: "C1 Advanced Fluency", status: "Locked", lessons: 54, tests: 5, classes: 16, badge: "Advanced Fluency" },
];

export const teacherFeedback = [
  {
    id: "fb-1",
    studentId: "sofia",
    teacherId: "marisol",
    teacher: "Marisol Vega",
    classDate: "Jul 01",
    skill: "Speaking",
    strengths: "Sofia used greetings and restaurant phrases with more confidence.",
    improve: "Needs more practice forming questions without translating word by word.",
    vocabulary: ["cuenta", "quisiera", "postre"],
    grammar: "Review gender agreement with food items.",
    homework: "Record 5 restaurant requests before next class.",
    next: "Short restaurant roleplay with AI Tutor.",
  },
  {
    id: "fb-2",
    studentId: "diego",
    teacherId: "lucia",
    teacher: "Lucia Ramos",
    classDate: "Jun 29",
    skill: "Grammar",
    strengths: "Diego can explain preterite vs imperfect in simple examples.",
    improve: "Needs faster recall when speaking.",
    vocabulary: ["ayer", "mientras", "de repente"],
    grammar: "Contrast event actions with background descriptions.",
    homework: "Write 8 sentences about last weekend.",
    next: "Book A2 checkpoint review.",
  },
];

export const tutorMessages = [
  { id: "msg-1", teacher: "Marisol Vega", studentId: "sofia", date: "Today", body: "Sofia was shy at first but completed the restaurant roleplay well." },
  { id: "msg-2", teacher: "Lucia Ramos", studentId: "diego", date: "Yesterday", body: "Diego is ready for his A2 checkpoint if he reviews past tense triggers." },
];

export const tutorAlerts = [
  { id: "alert-1", studentId: "sofia", type: "Missed practice", status: "New", message: "Sofia has not practiced in 5 days.", cta: "Send reminder" },
  { id: "alert-2", studentId: "diego", type: "Test recommended", status: "New", message: "Diego is ready for the A2 checkpoint test.", cta: "View tests" },
  { id: "alert-3", studentId: "account", type: "Low credits", status: "Open", message: "Credits are low. Add credits to avoid missing classes.", cta: "Buy credits" },
  { id: "alert-4", studentId: "sofia", type: "Feedback available", status: "Read", message: "New teacher feedback is available from Marisol.", cta: "Review feedback" },
];

export const tutorBadges = [
  { id: "badge-1", studentId: "sofia", name: "First Conversation", status: "Earned", date: "Jun 18", description: "Completed first live conversation class." },
  { id: "badge-2", studentId: "sofia", name: "Vocabulary Spark", status: "Earned", date: "Jun 26", description: "Learned 50 useful words." },
  { id: "badge-3", studentId: "sofia", name: "A2 Explorer", status: "Locked", date: "-", description: "Complete the A1 Foundations roadmap." },
  { id: "badge-4", studentId: "diego", name: "Grammar Builder", status: "Earned", date: "Jun 21", description: "Passed three grammar practices." },
  { id: "badge-5", studentId: "diego", name: "Checkpoint Ready", status: "Earned", date: "Jul 01", description: "Met the A2 checkpoint readiness score." },
  { id: "badge-6", studentId: "diego", name: "B1 Speaker", status: "Locked", date: "-", description: "Complete B1 real conversation stage." },
];

export const tutorPayments = [
  { id: "pay-1", date: "Jun 28", item: "Family Pack", amount: "$119", status: "Paid" },
  { id: "pay-2", date: "Jun 10", item: "Starter Pack", amount: "$49", status: "Paid" },
  { id: "pay-3", date: "Jul 05", item: "Live class reservation", amount: "2 credits", status: "Scheduled" },
];
