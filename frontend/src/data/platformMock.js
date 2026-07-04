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

export const academicLevels = [
  { id: "a1", name: "A1 Foundations", cefr: "A1", status: "current", description: "Build survival Spanish for greetings, family, food, and daily routines." },
  { id: "a2", name: "A2 Everyday Spanish", cefr: "A2", status: "next", description: "Handle travel, plans, stories, and everyday conversations with confidence." },
  { id: "b1", name: "B1 Real Conversations", cefr: "B1", status: "locked", description: "Speak across real-life situations with opinions, stories, and follow-up questions." },
  { id: "b2", name: "B2 Confident Speaker", cefr: "B2", status: "locked", description: "Discuss complex topics with nuance, rhythm, and stronger accuracy." },
];

export const academicCourses = [
  {
    id: "a1-real-start",
    levelId: "a1",
    title: "Spanish Real Start",
    subtitle: "Your first usable conversations",
    status: "In progress",
    progress: 64,
    skillFocus: ["Speaking", "Vocabulary", "Listening"],
    units: [
      {
        id: "u1",
        title: "Meet People",
        outcome: "Introduce yourself and ask simple questions.",
        lessons: [
          {
            id: "lesson-greetings",
            title: "Greetings that sound natural",
            type: "Speaking",
            duration: "12 min",
            status: "Completed",
            xp: 40,
            activities: [
              { type: "Watch", title: "Friendly greetings in context", status: "Completed" },
              { type: "Practice", title: "Record 5 introductions", status: "Completed" },
              { type: "Quiz", title: "Choose the right greeting", status: "Completed" },
            ],
          },
          {
            id: "lesson-questions",
            title: "Ask where someone is from",
            type: "Grammar",
            duration: "15 min",
            status: "In progress",
            xp: 50,
            activities: [
              { type: "Learn", title: "De donde eres vs donde vives", status: "Completed" },
              { type: "Practice", title: "Build 8 questions", status: "In progress" },
              { type: "Quiz", title: "Question word check", status: "Not started" },
            ],
          },
        ],
      },
      {
        id: "u2",
        title: "Food and Cafe",
        outcome: "Order politely and understand common menu words.",
        lessons: [
          {
            id: "lesson-ordering-food",
            title: "Ordering food with confidence",
            type: "Roleplay",
            duration: "18 min",
            status: "Recommended",
            xp: 60,
            activities: [
              { type: "Listen", title: "Cafe conversation", status: "Not started" },
              { type: "Flashcards", title: "20 menu words", status: "Not started" },
              { type: "Roleplay", title: "Order and ask for the bill", status: "Not started" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "a2-travel-sprint",
    levelId: "a2",
    title: "Travel Spanish Sprint",
    subtitle: "Hotels, transport, emergencies, and plans",
    status: "Recommended",
    progress: 22,
    skillFocus: ["Speaking", "Listening", "Reading"],
    units: [
      {
        id: "u3",
        title: "Arrival and Hotel",
        outcome: "Check in, ask for help, and solve simple travel problems.",
        lessons: [
          {
            id: "lesson-hotel-checkin",
            title: "Hotel check-in roleplay",
            type: "Roleplay",
            duration: "16 min",
            status: "Not started",
            xp: 55,
            activities: [
              { type: "Watch", title: "Hotel desk phrases", status: "Not started" },
              { type: "Practice", title: "Polite requests", status: "Not started" },
              { type: "Quiz", title: "Travel phrase check", status: "Not started" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "a2-grammar-builder",
    levelId: "a2",
    title: "Grammar Builder",
    subtitle: "Patterns that unlock clearer speech",
    status: "New",
    progress: 8,
    skillFocus: ["Grammar", "Writing", "Speaking"],
    units: [
      {
        id: "u4",
        title: "Past Tense Stories",
        outcome: "Tell simple stories about what happened.",
        lessons: [
          {
            id: "lesson-preterite-imperfect",
            title: "Preterite vs imperfect",
            type: "Grammar",
            duration: "20 min",
            status: "Not started",
            xp: 65,
            activities: [
              { type: "Learn", title: "Event vs background", status: "Not started" },
              { type: "Write", title: "Weekend story builder", status: "Not started" },
              { type: "Quiz", title: "Past tense choice", status: "Not started" },
            ],
          },
        ],
      },
    ],
  },
];

export const academicProgress = [
  { skill: "Speaking", current: 74, target: 82, evidence: "14 live classes, 6 roleplays" },
  { skill: "Listening", current: 62, target: 75, evidence: "18 audio drills" },
  { skill: "Reading", current: 71, target: 78, evidence: "9 short readings" },
  { skill: "Writing", current: 48, target: 65, evidence: "4 teacher-reviewed tasks" },
  { skill: "Grammar", current: 57, target: 72, evidence: "12 quizzes completed" },
  { skill: "Vocabulary", current: 82, target: 88, evidence: "486 active words" },
];

export const academicAssessments = [
  { id: "assess-a1", name: "A1 Foundations Checkpoint", status: "Available soon", readiness: 78, skills: ["Speaking", "Vocabulary", "Grammar"] },
  { id: "assess-speaking", name: "Cafe Speaking Rubric", status: "Recommended", readiness: 84, skills: ["Speaking", "Listening"] },
  { id: "assess-writing", name: "Short Writing Review", status: "Needs more practice", readiness: 52, skills: ["Writing", "Grammar"] },
];

export const clientLearningPath = [
  {
    id: "path-onboarding",
    stage: "Onboarding",
    level: "Start",
    status: "Completed",
    progress: 100,
    description: "Set goals, choose learner profile, and complete the first language snapshot.",
    requirements: ["Learning profile", "Goal selection", "Welcome activity"],
    unlocks: { credits: 1, badge: "First Step", level: "Placement unlocked" },
    tests: [{ name: "Learning profile check", type: "Setup", status: "Completed", score: "100%" }],
    practiceTests: [{ name: "Confidence warmup", skill: "Speaking", status: "Completed" }],
  },
  {
    id: "path-placement",
    stage: "Placement Test",
    level: "A1",
    status: "Completed",
    progress: 100,
    description: "Measure current level and place the learner on the right path.",
    requirements: ["Grammar snapshot", "Vocabulary check", "Speaking sample"],
    unlocks: { credits: 2, badge: "Level Finder", level: "A1 Foundations" },
    tests: [{ name: "Placement test", type: "Official checkpoint", status: "Completed", score: "A1.3" }],
    practiceTests: [{ name: "Mini placement retake", skill: "Mixed", status: "Available" }],
  },
  {
    id: "path-a1",
    stage: "A1 Foundations",
    level: "A1",
    status: "Current",
    progress: 64,
    description: "Build essential Spanish for greetings, food, family, routines, and simple questions.",
    requirements: ["30 lessons", "8 live classes", "2 checkpoint tests"],
    unlocks: { credits: 3, badge: "Foundation Builder", level: "A2 Everyday Spanish" },
    tests: [{ name: "A1 Foundations Checkpoint", type: "Level test", status: "Locked until 80%", score: "-" }],
    practiceTests: [
      { name: "A1 grammar practice test", skill: "Grammar", status: "Recommended" },
      { name: "Cafe speaking practice", skill: "Speaking", status: "Available" },
    ],
  },
  {
    id: "path-a2",
    stage: "A2 Everyday Spanish",
    level: "A2",
    status: "Next",
    progress: 22,
    description: "Handle travel, plans, past events, and everyday conversations.",
    requirements: ["36 lessons", "10 live classes", "3 checkpoint tests"],
    unlocks: { credits: 4, badge: "Everyday Speaker", level: "B1 Real Conversations" },
    tests: [{ name: "A2 checkpoint", type: "Level test", status: "Locked", score: "-" }],
    practiceTests: [{ name: "Travel Spanish mock test", skill: "Listening", status: "Available soon" }],
  },
  {
    id: "path-b1",
    stage: "B1 Real Conversations",
    level: "B1",
    status: "Locked",
    progress: 0,
    description: "Speak with opinions, stories, follow-up questions, and stronger fluency.",
    requirements: ["42 lessons", "12 live classes", "4 checkpoint tests"],
    unlocks: { credits: 5, badge: "Conversation Ready", level: "B2 Confident Speaker" },
    tests: [{ name: "B1 conversation checkpoint", type: "Level test", status: "Locked", score: "-" }],
    practiceTests: [{ name: "B1 speaking mock", skill: "Speaking", status: "Locked" }],
  },
];

export const clientBadgeGallery = [
  { id: "client-badge-1", name: "First Step", status: "Earned", stage: "Onboarding", reward: "1 credit", description: "Completed learning profile and first activity." },
  { id: "client-badge-2", name: "Level Finder", status: "Earned", stage: "Placement Test", reward: "2 credits", description: "Completed placement and unlocked A1 Foundations." },
  { id: "client-badge-3", name: "Foundation Builder", status: "In progress", stage: "A1 Foundations", reward: "3 credits", description: "Complete A1 requirements and checkpoint." },
  { id: "client-badge-4", name: "Everyday Speaker", status: "Locked", stage: "A2 Everyday Spanish", reward: "4 credits", description: "Unlock B1 with everyday conversation mastery." },
  { id: "client-badge-5", name: "Conversation Ready", status: "Locked", stage: "B1 Real Conversations", reward: "5 credits", description: "Prove real conversation fluency." },
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

export const schoolAdminProfile = {
  id: "school-admin-1",
  name: "Isabel Herrera",
  title: "Academic Director",
  campus: "MOSAICO Online Spanish School",
  focus: "Learner success, credits, teacher quality, and lesson operations",
};

export const schoolAdminMetrics = [
  { label: "Students active", value: "428", detail: "Across family and individual accounts" },
  { label: "Pending approvals", value: "12", detail: "7 families, 3 teachers, 2 lessons" },
  { label: "Credits available", value: "1,840", detail: "School-managed credit pool" },
  { label: "Lessons in review", value: "9", detail: "Drafts waiting for academic approval" },
];

export const userApprovalQueue = [
  { id: "ua-1", name: "Nora Alvarez", type: "Tutor / Guardian", request: "Family account for two learners", status: "New", risk: "Low" },
  { id: "ua-2", name: "Samuel Ortiz", type: "Student", request: "Teen learner profile", status: "Needs review", risk: "Medium" },
  { id: "ua-3", name: "Paula Mendez", type: "Teacher", request: "Conversation teacher application", status: "Interview complete", risk: "Low" },
  { id: "ua-4", name: "Colegio Horizonte", type: "School group", request: "Classroom pilot with 18 students", status: "New", risk: "Low" },
];

export const schoolCreditGrants = [
  { id: "grant-1", account: "Torres Family Learning Account", student: "Sofia Torres", credits: 4, reason: "Retention support", date: "Today" },
  { id: "grant-2", account: "Mendez Family", student: "Lucas Mendez", credits: 2, reason: "Missed class courtesy", date: "Yesterday" },
  { id: "grant-3", account: "Colegio Horizonte", student: "Shared classroom wallet", credits: 24, reason: "Pilot launch", date: "Jun 30" },
];

export const lessonDrafts = [
  { id: "lesson-1", title: "A1 Restaurant Roleplay", course: "A1 Foundations", author: "Marisol Vega", status: "Ready for review", level: "A1", skill: "Speaking" },
  { id: "lesson-2", title: "Past Tense Story Builder", course: "A2 Everyday Spanish", author: "Lucia Ramos", status: "Draft", level: "A2", skill: "Grammar" },
  { id: "lesson-3", title: "Job Interview Warmup", course: "B1 Real Conversations", author: "Andres Molina", status: "Needs edits", level: "B1", skill: "Speaking" },
];

export const familyAccounts = [
  { id: "family-1", name: "Torres Family", tutor: "Camila Torres", students: 2, credits: 17, status: "Healthy", alert: "Sofia needs practice reminder" },
  { id: "family-2", name: "Mendez Family", tutor: "Ana Mendez", students: 1, credits: 2, status: "Low credits", alert: "Offer credit package" },
  { id: "school-1", name: "Colegio Horizonte", tutor: "Academic coordinator", students: 18, credits: 24, status: "Pilot", alert: "Schedule onboarding class" },
];

export const schoolReports = [
  { label: "Attendance", value: 91, note: "Live class attendance this week" },
  { label: "Lesson completion", value: 68, note: "Assigned lessons completed" },
  { label: "Teacher feedback sent", value: 84, note: "Classes with feedback posted" },
  { label: "Credit utilization", value: 73, note: "Credits converted into classes" },
];
