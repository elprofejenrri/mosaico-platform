import React, { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Coins,
  Clock,
  CreditCard,
  FilePlus2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LineChart,
  MessageCircle,
  PlayCircle,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  School,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserCheck,
  Users,
  Video,
  WalletCards,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  analytics,
  academicAssessments,
  academicCourses,
  academicLevels,
  academicProgress,
  bookings,
  communityPosts,
  courses,
  creditHistory,
  creditPackages,
  events,
  lessons,
  learningAccount,
  learningRoadmap,
  familyAccounts,
  lessonDrafts,
  payments,
  pillars,
  platformStats,
  schoolAdminMetrics,
  schoolAdminProfile,
  schoolCreditGrants,
  schoolReports,
  skillProgress,
  students,
  teacherAvailability,
  teacherFeedback,
  teacherMaterials,
  teachers,
  testResults,
  tutorAlerts,
  tutorBadges,
  tutorMessages,
  tutorPayments,
  tutorProfile,
  tutorProgressByStudent,
  tutorStudents,
  userApprovalQueue,
} from "../data/platformMock";

const colors = ["#E8704C", "#2DA89F", "#4A90D9", "#8B5BB8", "#4FA85F", "#F4C13D"];

const roleNav = {
  student: [
    ["", "Dashboard", LayoutDashboard],
    ["learn", "Learning Hub", Library],
    ["classes", "Live Classes", Video],
    ["ai-tutor", "AI Tutor", Bot],
    ["community", "Community", MessageCircle],
    ["progress", "Progress", Trophy],
  ],
  tutor: [
    ["", "Overview", LayoutDashboard],
    ["students", "Students", Users],
    ["classes", "Classes", CalendarCheck],
    ["credits", "Credits", Coins],
    ["progress", "Progress", LineChart],
    ["roadmap", "Roadmap", Target],
    ["tests", "Tests", ClipboardCheck],
    ["feedback", "Feedback", MessageCircle],
    ["messages", "Messages", Send],
    ["alerts", "Alerts", Bell],
    ["badges", "Badges", Award],
    ["payments", "Payments", CreditCard],
  ],
  teacher: [
    ["", "Dashboard", LayoutDashboard],
    ["calendar", "Calendar", CalendarDays],
    ["students", "Students", Users],
    ["classes", "Classes", Video],
    ["materials", "Materials", FileText],
    ["evaluations", "Evaluations", ClipboardCheck],
    ["earnings", "Earnings", CircleDollarSign],
  ],
  admin: [
    ["", "Overview", School],
    ["approvals", "Approvals", UserCheck],
    ["users", "People", Users],
    ["credits", "Credits", Coins],
    ["lessons", "Lessons", FilePlus2],
    ["teachers", "Teachers", GraduationCap],
    ["bookings", "Bookings", CalendarDays],
    ["families", "Families", ShieldCheck],
    ["reports", "Reports", LineChart],
    ["settings", "School Setup", Settings],
  ],
};

const roleMeta = {
  student: {
    label: "Student",
    base: "/student",
    title: "What should I do today?",
    subtitle: "Your Spanish plan, live classes, practice prompts, and community moments in one place.",
  },
  tutor: {
    label: "Tutor",
    base: "/tutor",
    title: "How is my student doing?",
    subtitle: "Manage learners, credits, bookings, feedback, alerts, and progress from one trusted family account.",
  },
  teacher: {
    label: "Teacher",
    base: "/teacher",
    title: "What do I need to teach and follow up today?",
    subtitle: "Classes, students, feedback, materials, and earnings for a modern teaching workflow.",
  },
  admin: {
    label: "Administrative",
    base: "/admin",
    title: "How is the school running today?",
    subtitle: "A principal-style view for approvals, credits, lessons, teachers, family accounts, and learner support.",
  },
};

const trendData = [
  { day: "Mon", lessons: 8, classes: 2, xp: 120 },
  { day: "Tue", lessons: 5, classes: 1, xp: 90 },
  { day: "Wed", lessons: 10, classes: 2, xp: 160 },
  { day: "Thu", lessons: 7, classes: 1, xp: 130 },
  { day: "Fri", lessons: 11, classes: 3, xp: 190 },
  { day: "Sat", lessons: 4, classes: 1, xp: 80 },
  { day: "Sun", lessons: 6, classes: 1, xp: 110 },
];

function ActionButton({ children, doneText, className = "", variant = "default", disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={variant}
      disabled={disabled || loading || done}
      className={className}
      onClick={() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          setDone(true);
          toast.success(doneText);
        }, 650);
      }}
    >
      {loading ? "Working..." : done ? <><Check size={16} className="mr-2" />Done</> : children}
    </Button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function MetricCard({ label, value, detail, icon: Icon, color = "#E8704C" }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680] font-semibold">{label}</p>
          <p className="mt-2 font-display text-3xl">{value}</p>
          {detail && <p className="mt-1 text-sm text-[#5C6680]">{detail}</p>}
        </div>
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1A`, color }}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.18em] text-[#E8704C] font-semibold">{eyebrow}</p>}
        <h2 className="mt-2 font-display text-2xl md:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function RoleSwitcher({ current }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#EFE4D0] bg-white p-1 sm:grid-cols-4 lg:grid-cols-2">
      {["student", "tutor", "teacher", "admin"].map((role) => (
        <Link
          key={role}
          to={roleMeta[role].base}
          className={`rounded-md px-3 py-2 text-center text-xs font-semibold transition-colors ${
            current === role ? "bg-[#1F3B6E] text-white" : "text-[#5C6680] hover:bg-[#FFF0E6]"
          }`}
        >
          {roleMeta[role].label}
        </Link>
      ))}
    </div>
  );
}

function PlatformShell({ role, children }) {
  const location = useLocation();
  const meta = roleMeta[role];
  return (
    <div className="bg-[#FBF7EE]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-3">
            <RoleSwitcher current={role} />
            <nav className="mt-4 grid gap-1">
              {roleNav[role].map(([slug, label, Icon]) => {
                const to = slug ? `${meta.base}/${slug}` : meta.base;
                const active = location.pathname === to;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                      active ? "bg-[#FFF0E6] text-[#E8704C]" : "text-[#1F3B6E] hover:bg-[#FFF0E6]"
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </NavLink>
                );
              })}
            </nav>
          </Card>
        </aside>
        <section className="min-w-0">
          <div className="mb-6 rounded-lg bg-[#1F3B6E] p-6 text-white">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">{meta.label} portal</p>
                <h1 className="mt-3 font-display text-3xl md:text-4xl">{meta.title}</h1>
                <p className="mt-3 max-w-2xl text-sm md:text-base text-white/75">{meta.subtitle}</p>
              </div>
              <Link to="/">
                <Button className="bg-[#F4C13D] text-[#1F3B6E] hover:bg-white">
                  Pitch home <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}

export function PlatformLanding() {
  return (
    <div data-testid="platform-landing" className="bg-[#FBF7EE]">
      <section className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=85"
          alt="International learners speaking together"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#1F3B6E]/70" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl content-center gap-10 px-6 py-16 lg:px-10">
          <div className="max-w-4xl text-white">
            <p className="text-xs uppercase tracking-[0.26em] text-[#F4C13D] font-semibold">MOSAICO Platform</p>
            <h1 className="mt-5 font-display text-4xl leading-tight sm:text-6xl lg:text-7xl">Learn Spanish through real conversations.</h1>
            <p className="mt-6 max-w-2xl text-lg text-white/82">
              A warm, modern language learning platform for lessons, live teachers, AI roleplay, community, progress, and operations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/student">
                <Button className="bg-[#E8704C] text-white hover:bg-[#C95630] px-6 py-6">
                  Start learning <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link to="/tutor">
                <Button variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white hover:text-[#1F3B6E] px-6 py-6">
                  Manage a learner
                </Button>
              </Link>
              <Link to="/teacher">
                <Button variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white hover:text-[#1F3B6E] px-6 py-6">
                  Explore teachers
                </Button>
              </Link>
              <Link to="/admin">
                <Button variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white hover:text-[#1F3B6E] px-6 py-6">
                  Book a demo
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {platformStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/20 bg-white/12 p-4 text-white backdrop-blur">
                <p className="font-display text-2xl">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <SectionHeader eyebrow="Product pillars" title="One platform for learners, teachers, and operators." />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, idx) => (
            <Card key={pillar.key}>
              <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: colors[idx % colors.length] }} />
              <h3 className="mt-4 font-display text-xl">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5C6680]">{pillar.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-16 lg:grid-cols-3 lg:px-10">
        <PreviewPanel title="Teacher preview" icon={GraduationCap}>
          {teachers.map((teacher) => <TeacherMini key={teacher.id} teacher={teacher} />)}
        </PreviewPanel>
        <PreviewPanel title="Course preview" icon={BookOpen}>
          {courses.map((course) => <CourseMini key={course.id} course={course} />)}
        </PreviewPanel>
        <PreviewPanel title="AI and community" icon={Bot}>
          <div className="rounded-lg bg-[#FFF0E6] p-4">
            <p className="text-sm font-semibold">Airport roleplay</p>
            <p className="mt-1 text-sm text-[#5C6680]">Practice a flight delay conversation with grammar correction.</p>
          </div>
          {events.slice(0, 2).map((event) => (
            <div key={event.id} className="rounded-lg border border-[#EFE4D0] p-4">
              <p className="font-semibold">{event.title}</p>
              <p className="text-sm text-[#5C6680]">{event.time}</p>
            </div>
          ))}
        </PreviewPanel>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="rounded-lg bg-[#E8704C] p-8 text-white md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">Pricing preview</p>
              <h2 className="mt-3 font-display text-3xl">Subscriptions, class packs, and premium tutoring.</h2>
              <p className="mt-3 max-w-2xl text-white/82">Payments are currently a pitch-ready dummy flow with realistic plans and package cards.</p>
            </div>
            <Link to="/admin/payments">
              <Button className="bg-[#F4C13D] text-[#1F3B6E] hover:bg-white">View plans</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PreviewPanel({ title, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#FFF0E6] p-2 text-[#E8704C]"><Icon size={18} /></div>
        <h3 className="font-display text-xl">{title}</h3>
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </Card>
  );
}

function TeacherMini({ teacher }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#EFE4D0] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg text-white font-display" style={{ backgroundColor: teacher.color }}>
          {teacher.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <p className="font-semibold">{teacher.name}</p>
          <p className="text-xs text-[#5C6680]">{teacher.specialty}</p>
        </div>
      </div>
      <p className="text-sm font-semibold">${teacher.price}</p>
    </div>
  );
}

function CourseMini({ course }) {
  return (
    <div className="rounded-lg border border-[#EFE4D0] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{course.title}</p>
        <span className="rounded-md bg-[#E0F2F0] px-2 py-1 text-xs text-[#2DA89F]">{course.category}</span>
      </div>
      <Progress value={course.progress} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-[#5C6680]">Next: {course.nextLesson}</p>
    </div>
  );
}

export function StudentPortal({ module = "dashboard" }) {
  return (
    <PlatformShell role="student">
      {module === "dashboard" && <StudentDashboard />}
      {module === "learn" && <LearningHub />}
      {module === "classes" && <StudentClasses />}
      {module === "ai-tutor" && <AiTutor />}
      {module === "community" && <Community />}
      {module === "progress" && <ProgressPage />}
    </PlatformShell>
  );
}

function StudentDashboard() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Level" value="A2.4" detail="B1 readiness in 6 weeks" icon={Target} />
        <MetricCard label="Weekly progress" value="74%" detail="5 of 7 study goals done" icon={LineChart} color="#2DA89F" />
        <MetricCard label="XP and streak" value="2,840" detail="12 day streak" icon={Sparkles} color="#8B5BB8" />
        <MetricCard label="Vocabulary" value="486" detail="32 words this week" icon={BookOpen} color="#4A90D9" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <SectionHeader
            eyebrow="Today"
            title="Recommended next actions"
            action={<ActionButton doneText="Daily plan started." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Start plan</ActionButton>}
          />
          <div className="mt-5 grid gap-3">
            {[
              ["Continue lesson", "Ordering food with confidence", PlayCircle],
              ["Practice with AI", "Restaurant roleplay with corrections", Bot],
              ["Upcoming class", "Marisol Vega today at 18:00", Video],
              ["Community event", "Restaurant roleplay night at 19:30", Users],
            ].map(([label, title, Icon]) => (
              <div key={title} className="flex items-center justify-between gap-4 rounded-lg bg-[#FBF7EE] p-4">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-[#E8704C]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-[#5C6680]">{label}</p>
                    <p className="font-semibold">{title}</p>
                  </div>
                </div>
                <ChevronRight size={18} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Weekly activity</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Area dataKey="xp" stroke="#E8704C" fill="#E8704C33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {academicCourses.map((course) => (
          <Card key={course.id}>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{course.status}</p>
            <h3 className="mt-2 font-display text-xl">{course.title}</h3>
            <p className="mt-2 text-sm text-[#5C6680]">{course.subtitle}</p>
            <Progress value={course.progress} className="mt-4 h-2" />
            <Link to="/student/learn" className="mt-4 inline-block text-sm font-semibold text-[#E8704C]">Open course →</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LearningHub() {
  const [selectedCourseId, setSelectedCourseId] = useState(academicCourses[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState(academicCourses[0].units[0].lessons[1].id);
  const [earnedXp, setEarnedXp] = useState(0);
  const [activityState, setActivityState] = useState(() => {
    const state = {};
    academicCourses.forEach((course) => {
      course.units.forEach((unit) => {
        unit.lessons.forEach((lesson) => {
          lesson.activities.forEach((activity) => {
            state[`${lesson.id}::${activity.title}`] = activity.status;
          });
        });
      });
    });
    return state;
  });
  const selectedCourse = academicCourses.find((course) => course.id === selectedCourseId) || academicCourses[0];
  const allLessons = selectedCourse.units.flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, unitTitle: unit.title, outcome: unit.outcome })));
  const selectedLesson = allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0];
  const activityKey = (lesson, activity) => `${lesson.id}::${activity.title}`;
  const lessonProgress = (lesson) => {
    const completed = lesson.activities.filter((activity) => activityState[activityKey(lesson, activity)] === "Completed").length;
    return Math.round((completed / lesson.activities.length) * 100);
  };
  const lessonStatus = (lesson) => {
    const progress = lessonProgress(lesson);
    if (progress === 100) return "Completed";
    if (progress > 0) return "In progress";
    return lesson.status;
  };
  const courseProgress = (course) => {
    const activities = course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.activities.map((activity) => ({ lesson, activity }))));
    const completed = activities.filter(({ lesson, activity }) => activityState[activityKey(lesson, activity)] === "Completed").length;
    return Math.max(course.progress, Math.round((completed / activities.length) * 100));
  };
  const selectedLessonProgress = lessonProgress(selectedLesson);
  const advanceActivity = (activity) => {
    const key = activityKey(selectedLesson, activity);
    const current = activityState[key] || activity.status;
    if (current === "Completed") {
      toast.success(`${activity.title} opened for review.`);
      return;
    }
    const next = current === "In progress" ? "Completed" : "In progress";
    setActivityState((state) => ({ ...state, [key]: next }));
    if (next === "Completed") {
      const xp = Math.max(10, Math.round(selectedLesson.xp / selectedLesson.activities.length));
      setEarnedXp((total) => total + xp);
      toast.success(`${activity.title} completed. +${xp} XP`);
    } else {
      toast.success(`${activity.title} started.`);
    }
  };

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Academic model" title="Courses, units, lessons, activities, and checkpoints" />
      <div className="grid gap-3 md:grid-cols-4">
        {academicLevels.map((level) => (
          <Card key={level.id} className={level.status === "current" ? "ring-2 ring-[#E8704C]" : ""}>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{level.cefr}</p>
            <h3 className="mt-2 font-display text-xl">{level.name}</h3>
            <p className="mt-2 text-sm text-[#5C6680]">{level.description}</p>
            <span className={`mt-4 inline-block rounded-md px-2 py-1 text-xs ${level.status === "locked" ? "bg-[#F3EEE3] text-[#5C6680]" : "bg-[#FFF0E6] text-[#E8704C]"}`}>
              {level.status}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <SectionHeader eyebrow="Courses" title="Learning paths" />
          <div className="mt-5 grid gap-3">
            {academicCourses.map((course) => (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setSelectedLessonId(course.units[0].lessons[0].id);
                  toast.success(`${course.title} selected.`);
                }}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedCourseId === course.id ? "border-[#E8704C] bg-[#FFF0E6]" : "border-[#EFE4D0] bg-white hover:bg-[#FBF7EE]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{course.title}</p>
                    <p className="text-sm text-[#5C6680]">{course.subtitle}</p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs text-[#E8704C]">{course.status}</span>
                </div>
                <Progress value={courseProgress(course)} className="mt-4 h-2" />
                <p className="mt-2 text-xs font-semibold text-[#1F3B6E]">{courseProgress(course)}% complete</p>
                <p className="mt-3 text-xs text-[#5C6680]">Focus: {course.skillFocus.join(", ")}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Selected course"
            title={selectedCourse.title}
            action={<ActionButton doneText="Course resumed." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Continue course</ActionButton>}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#5C6680]">
            <span>{selectedCourse.subtitle}</span>
            <span className="rounded-md bg-[#E0F2F0] px-2 py-1 text-[#2DA89F]">{earnedXp} XP earned today</span>
          </div>
          <div className="mt-5 grid gap-4">
            {selectedCourse.units.map((unit) => (
              <div key={unit.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{unit.outcome}</p>
                <h3 className="mt-1 font-display text-xl">{unit.title}</h3>
                <div className="mt-4 grid gap-2">
                  {unit.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        toast.success(`${lesson.title} opened.`);
                      }}
                      className={`flex flex-col justify-between gap-2 rounded-md border p-3 text-left md:flex-row md:items-center ${
                        selectedLessonId === lesson.id ? "border-[#1F3B6E] bg-[#FBF7EE]" : "border-[#EFE4D0]"
                      }`}
                    >
                      <span>
                        <span className="font-semibold">{lesson.title}</span>
                        <span className="block text-sm text-[#5C6680]">{lesson.type} · {lesson.duration} · {lesson.xp} XP</span>
                        <span className="mt-2 block h-1.5 w-full rounded-full bg-[#EFE4D0] md:w-48">
                          <span className="block h-1.5 rounded-full bg-[#2DA89F]" style={{ width: `${lessonProgress(lesson)}%` }} />
                        </span>
                      </span>
                      <span className="rounded-md bg-[#FFF0E6] px-2 py-1 text-xs text-[#E8704C]">{lessonStatus(lesson)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader
            eyebrow="Lesson detail"
            title={selectedLesson.title}
            action={<span className="rounded-md bg-[#FFF0E6] px-3 py-2 text-sm font-semibold text-[#E8704C]">{selectedLessonProgress}% complete</span>}
          />
          <p className="mt-2 text-sm text-[#5C6680]">
            Unit: {selectedLesson.unitTitle} · Outcome: {selectedLesson.outcome}
          </p>
          <Progress value={selectedLessonProgress} className="mt-4 h-2" />
          <div className="mt-5 grid gap-3">
            {selectedLesson.activities.map((activity, index) => {
              const status = activityState[activityKey(selectedLesson, activity)] || activity.status;
              return (
              <div key={`${activity.type}-${activity.title}`} className="flex flex-col justify-between gap-3 rounded-lg border border-[#EFE4D0] p-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md text-white" style={{ backgroundColor: status === "Completed" ? "#2DA89F" : colors[index % colors.length] }}>
                    {status === "Completed" ? <Check size={16} /> : index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{activity.type}: {activity.title}</p>
                    <p className="text-sm text-[#5C6680]">{status}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => advanceActivity(activity)}
                  className={status === "Completed" ? "border-[#2DA89F] text-[#2DA89F]" : ""}
                >
                  {status === "Completed" ? "Review" : status === "In progress" ? "Mark complete" : "Start"}
                </Button>
              </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Checkpoint readiness" title="Assessment path" />
          <div className="mt-5 grid gap-3">
            {academicAssessments.map((assessment) => (
              <div key={assessment.id} className="rounded-lg bg-[#FBF7EE] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{assessment.name}</p>
                  <span className="text-sm font-semibold text-[#E8704C]">{assessment.readiness}%</span>
                </div>
                <Progress value={assessment.readiness} className="mt-3 h-2" />
                <p className="mt-2 text-sm text-[#5C6680]">{assessment.status} · {assessment.skills.join(", ")}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Skill evidence" title="How progress is calculated" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {academicProgress.map((skill) => (
            <div key={skill.skill} className="rounded-lg border border-[#EFE4D0] p-4">
              <div className="flex justify-between gap-3 text-sm font-semibold">
                <span>{skill.skill}</span>
                <span>{skill.current}% / target {skill.target}%</span>
              </div>
              <Progress value={skill.current} className="mt-3 h-2" />
              <p className="mt-2 text-sm text-[#5C6680]">{skill.evidence}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StudentClasses() {
  const [filter, setFilter] = useState("Conversation");
  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-3 text-[#5C6680]" size={16} />
            <input className="w-full rounded-md border border-[#EFE4D0] bg-white py-2 pl-9 pr-3 outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="Search by teacher, level, specialty" />
          </div>
          {["Conversation", "Business", "DELE", "Travel"].map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-2 text-sm font-semibold ${filter === item ? "bg-[#1F3B6E] text-white" : "bg-[#FFF0E6] text-[#1F3B6E]"}`}>
              {item}
            </button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <Card key={teacher.id}>
            <TeacherMini teacher={teacher} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-[#FBF7EE] p-2"><b>{teacher.rating}</b><br />rating</div>
              <div className="rounded-md bg-[#FBF7EE] p-2"><b>{teacher.level}</b><br />level</div>
              <div className="rounded-md bg-[#FBF7EE] p-2"><b>${teacher.price}</b><br />lesson</div>
            </div>
            <p className="mt-4 text-sm text-[#5C6680]">Next slot: {teacher.availability}</p>
            <div className="mt-4 flex gap-2">
              <ActionButton doneText="Class booked successfully." className="flex-1 bg-[#E8704C] text-white hover:bg-[#C95630]">Book class</ActionButton>
              <ActionButton doneText="Class rescheduled." variant="outline" className="flex-1">Reschedule</ActionButton>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-display text-xl">Upcoming and past classes</h3>
        <BookingList />
      </Card>
    </div>
  );
}

function AiTutor() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hola. Want a quick plan for today or a roleplay scenario?" },
  ]);
  const [input, setInput] = useState("");
  const scenarios = ["Airport", "Hotel", "Restaurant", "Doctor", "Business meeting", "Job interview"];
  const send = (text) => {
    const prompt = text || input;
    if (!prompt.trim()) return;
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: "Great. Today study 10 travel verbs, practice one roleplay, then say 5 sentences aloud. Correction: use 'me gustaria' for polite requests." }]);
      toast.success("AI Tutor replied.");
    }, 600);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <Card>
        <h3 className="font-display text-xl">Roleplay scenarios</h3>
        <div className="mt-4 grid gap-2">
          {scenarios.map((scenario) => (
            <button key={scenario} onClick={() => send(`Start ${scenario} roleplay`)} className="rounded-md border border-[#EFE4D0] p-3 text-left font-semibold hover:bg-[#FFF0E6]">
              {scenario}
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">
          Pronunciation feedback and voice input are placeholders for the MVP demo.
        </div>
      </Card>
      <Card className="flex min-h-[560px] flex-col">
        <div className="flex-1 space-y-3 overflow-auto">
          {messages.map((message, idx) => (
            <div key={`${message.role}-${idx}`} className={`max-w-[85%] rounded-lg p-3 text-sm ${message.role === "ai" ? "bg-[#FFF0E6] text-[#1F3B6E]" : "ml-auto bg-[#1F3B6E] text-white"}`}>
              {message.text}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-md border border-[#EFE4D0] px-3 py-2 outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="Ask: What should I study today?" />
          <Button onClick={() => send()} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Send</Button>
        </div>
      </Card>
    </div>
  );
}

function Community() {
  const [joined, setJoined] = useState({});
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <SectionHeader eyebrow="Feed" title="Practice socially." />
        <div className="mt-5 grid gap-3">
          {communityPosts.map((post) => (
            <div key={post.id} className="rounded-lg border border-[#EFE4D0] p-4">
              <p className="text-sm text-[#5C6680]">{post.author} in {post.group}</p>
              <p className="mt-2 font-semibold">{post.body}</p>
              <div className="mt-3 flex gap-2">
                <ActionButton doneText="Post liked." variant="outline">Like ({post.likes})</ActionButton>
                <ActionButton doneText="Comment added." variant="outline">Comment ({post.comments})</ActionButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-display text-xl">Events and challenges</h3>
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-lg bg-[#FBF7EE] p-4">
              <p className="font-semibold">{event.title}</p>
              <p className="text-sm text-[#5C6680]">{event.time} - {event.seats} seats - {event.status}</p>
              <Button
                disabled={joined[event.id]}
                onClick={() => {
                  setJoined((j) => ({ ...j, [event.id]: true }));
                  toast.success("You joined the event.");
                }}
                className="mt-3 bg-[#2DA89F] text-white hover:bg-[#23877f]"
              >
                {joined[event.id] ? "Joined" : "Join event"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProgressPage() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Level progress" value="68%" detail="A2 to B1" icon={Target} />
        <MetricCard label="Badges" value="14" detail="3 this month" icon={BadgeCheck} color="#2DA89F" />
        <MetricCard label="Certificates" value="1" detail="A1 completed" icon={Trophy} color="#8B5BB8" />
        <MetricCard label="Class history" value="28" detail="24 completed" icon={Video} color="#4A90D9" />
      </div>
      <Card>
        <h3 className="font-display text-xl">Skills breakdown</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {academicProgress.map((skill) => (
            <div key={skill.skill}>
              <div className="flex justify-between text-sm font-semibold"><span>{skill.skill}</span><span>{skill.current}%</span></div>
              <Progress value={skill.current} className="mt-2 h-2" />
              <p className="mt-1 text-xs text-[#5C6680]">{skill.evidence}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function useTutorState() {
  const [activeStudentId, setActiveStudentId] = useState(tutorStudents[0].id);
  const [sharedCredits, setSharedCredits] = useState(learningAccount.sharedCredits);
  const [studentCredits, setStudentCredits] = useState(
    Object.fromEntries(tutorStudents.map((student) => [student.id, student.credits]))
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0].id);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const activeStudent = tutorStudents.find((student) => student.id === activeStudentId) || tutorStudents[0];
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId) || teachers[0];

  return {
    activeStudentId,
    setActiveStudentId,
    activeStudent,
    sharedCredits,
    setSharedCredits,
    studentCredits,
    setStudentCredits,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedTeacher,
    selectedSlot,
    setSelectedSlot,
  };
}

export function TutorPortal({ module = "dashboard" }) {
  const tutorState = useTutorState();
  return (
    <PlatformShell role="tutor">
      <TutorStudentBar {...tutorState} />
      {module === "dashboard" && <TutorDashboard {...tutorState} />}
      {module === "students" && <TutorStudents {...tutorState} />}
      {module === "classes" && <TutorClasses {...tutorState} />}
      {module === "credits" && <TutorCredits {...tutorState} />}
      {module === "progress" && <TutorProgress {...tutorState} />}
      {module === "roadmap" && <TutorRoadmap />}
      {module === "tests" && <TutorTests {...tutorState} />}
      {module === "feedback" && <TutorFeedback {...tutorState} />}
      {module === "messages" && <TutorMessages {...tutorState} />}
      {module === "alerts" && <TutorAlerts {...tutorState} />}
      {module === "badges" && <TutorBadges {...tutorState} />}
      {module === "payments" && <TutorPayments />}
    </PlatformShell>
  );
}

function TutorStudentBar({ activeStudentId, setActiveStudentId, activeStudent, sharedCredits, studentCredits }) {
  return (
    <Card className="mb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#E8704C] font-semibold">Learning account</p>
          <h2 className="mt-1 font-display text-xl">{learningAccount.name}</h2>
          <p className="mt-1 text-sm text-[#5C6680]">
            {tutorProfile.name} manages {learningAccount.students.length} students. Shared wallet: {sharedCredits} credits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tutorStudents.map((student) => (
            <button
              key={student.id}
              onClick={() => {
                setActiveStudentId(student.id);
                toast.success(`${student.name} selected.`);
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                activeStudentId === student.id ? "bg-[#1F3B6E] text-white" : "bg-[#FFF0E6] text-[#1F3B6E] hover:bg-[#F8DFCF]"
              }`}
            >
              {student.name} · {studentCredits[student.id]} credits
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-[#FBF7EE] p-4">
        <p className="text-sm text-[#5C6680]">Selected student</p>
        <p className="font-semibold">{activeStudent.name}: {activeStudent.currentLevel} to {activeStudent.targetLevel} · {activeStudent.profile}</p>
      </div>
    </Card>
  );
}

function TutorDashboard({ activeStudent, sharedCredits, studentCredits }) {
  const feedback = teacherFeedback.find((item) => item.studentId === activeStudent.id);
  const alerts = tutorAlerts.filter((alert) => alert.studentId === activeStudent.id || alert.studentId === "account");
  const badges = tutorBadges.filter((badge) => badge.studentId === activeStudent.id && badge.status === "Earned");
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current level" value={activeStudent.currentLevel} detail={`Target ${activeStudent.targetLevel}`} icon={Target} />
        <MetricCard label="Progress" value={`${activeStudent.progress}%`} detail={activeStudent.targetDate} icon={LineChart} color="#2DA89F" />
        <MetricCard label="Weekly study" value={`${activeStudent.weeklyStudyMinutes}m`} detail={`${activeStudent.streak} day streak`} icon={Clock} color="#8B5BB8" />
        <MetricCard label="Credits" value={studentCredits[activeStudent.id]} detail={`${sharedCredits} shared credits`} icon={Coins} color="#4A90D9" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <SectionHeader
            eyebrow="Next action"
            title={`Support ${activeStudent.name} this week`}
            action={<ActionButton doneText="Recommendation saved for the tutor." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save action</ActionButton>}
          />
          <div className="mt-5 grid gap-3">
            <TutorInfoRow icon={CalendarDays} label="Upcoming class" value={activeStudent.upcomingClass} />
            <TutorInfoRow icon={Video} label="Classes attended" value={`${activeStudent.classesAttended} completed classes`} />
            <TutorInfoRow icon={MessageCircle} label="Latest teacher feedback" value={feedback?.next || "No new feedback yet."} />
            <TutorInfoRow icon={Award} label="Recent badges" value={badges.map((badge) => badge.name).join(", ") || "No badges yet."} />
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Attention alerts</h3>
          <div className="mt-4 grid gap-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg bg-[#FBF7EE] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#E8704C]">{alert.type}</p>
                <p className="mt-1 font-semibold">{alert.message}</p>
                <ActionButton doneText="Alert acknowledged." variant="outline" className="mt-3">{alert.cta}</ActionButton>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TutorInfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#FBF7EE] p-4">
      <div className="rounded-md bg-white p-2 text-[#E8704C]"><Icon size={18} /></div>
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#5C6680]">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function TutorStudents({ activeStudentId, setActiveStudentId, studentCredits }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {tutorStudents.map((student) => (
        <Card key={student.id} className={activeStudentId === student.id ? "ring-2 ring-[#E8704C]" : ""}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl">{student.name}</h3>
              <p className="mt-1 text-sm text-[#5C6680]">Age {student.age} · {student.profile}</p>
            </div>
            <span className="rounded-md bg-[#FFF0E6] px-3 py-1 text-sm text-[#E8704C]">{student.risk}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <TutorMiniStat label="Level" value={`${student.currentLevel} → ${student.targetLevel}`} />
            <TutorMiniStat label="Progress" value={`${student.progress}%`} />
            <TutorMiniStat label="Credits" value={studentCredits[student.id]} />
            <TutorMiniStat label="Next class" value={student.upcomingClass.split(" - ")[1]} />
          </div>
          <Progress value={student.progress} className="mt-4 h-2" />
          <Button
            onClick={() => {
              setActiveStudentId(student.id);
              toast.success(`${student.name} selected.`);
            }}
            className="mt-4 bg-[#1F3B6E] text-white hover:bg-[#E8704C]"
          >
            Select student
          </Button>
        </Card>
      ))}
    </div>
  );
}

function TutorMiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-[#FBF7EE] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-[#5C6680]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function TutorCredits({ activeStudent, sharedCredits, setSharedCredits, studentCredits, setStudentCredits }) {
  const [assignAmount, setAssignAmount] = useState(2);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Shared balance" value={sharedCredits} detail="Family account credits" icon={Coins} />
        <MetricCard label={`${activeStudent.name} balance`} value={studentCredits[activeStudent.id]} detail="Assigned to selected learner" icon={WalletCards} color="#2DA89F" />
        <MetricCard label="Class cost" value="2-3" detail="Credits per live class" icon={Video} color="#8B5BB8" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
        <Card>
          <SectionHeader eyebrow="Buy credits" title="Dummy credit packages" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {creditPackages.map((pack) => (
              <div key={pack.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <p className="font-display text-xl">{pack.name}</p>
                <p className="mt-2 text-3xl font-display">{pack.credits}</p>
                <p className="text-sm text-[#5C6680]">credits · {pack.price}</p>
                <p className="mt-2 text-xs text-[#5C6680]">{pack.bestFor}</p>
                <Button
                  className="mt-4 w-full bg-[#E8704C] text-white hover:bg-[#C95630]"
                  onClick={() => {
                    setSharedCredits((credits) => credits + pack.credits);
                    toast.success(`${pack.credits} credits added to shared wallet.`);
                  }}
                >
                  Buy credits
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Assign credits</h3>
          <p className="mt-2 text-sm text-[#5C6680]">Move credits from the shared wallet to {activeStudent.name}.</p>
          <input
            type="number"
            min="1"
            max={sharedCredits}
            value={assignAmount}
            onChange={(event) => setAssignAmount(Number(event.target.value))}
            className="mt-4 w-full rounded-md border border-[#EFE4D0] px-3 py-2 outline-none focus:ring-2 focus:ring-[#E8704C]"
          />
          <Button
            disabled={sharedCredits < assignAmount || assignAmount <= 0}
            onClick={() => {
              setSharedCredits((credits) => credits - assignAmount);
              setStudentCredits((credits) => ({ ...credits, [activeStudent.id]: credits[activeStudent.id] + assignAmount }));
              toast.success(`${assignAmount} credits assigned to ${activeStudent.name}.`);
            }}
            className="mt-4 w-full bg-[#2DA89F] text-white hover:bg-[#23877f]"
          >
            Confirm assignment
          </Button>
        </Card>
      </div>
      <Card>
        <h3 className="font-display text-xl">Credit history</h3>
        <div className="mt-4 grid gap-3">
          {creditHistory.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FBF7EE] p-4">
              <div>
                <p className="font-semibold">{item.type}: {item.target}</p>
                <p className="text-sm text-[#5C6680]">{item.date} · {item.note}</p>
              </div>
              <span className="font-display text-xl">{item.amount > 0 ? "+" : ""}{item.amount}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TutorClasses({ activeStudent, studentCredits, setStudentCredits, selectedTeacherId, setSelectedTeacherId, selectedTeacher, selectedSlot, setSelectedSlot }) {
  const canBook = studentCredits[activeStudent.id] >= selectedTeacher.creditCost && selectedSlot;
  return (
    <div className="grid gap-5">
      <Card>
        <SectionHeader eyebrow="Book for student" title={`Booking on behalf of ${activeStudent.name}`} />
        <p className="mt-2 text-sm text-[#5C6680]">
          Available balance: {studentCredits[activeStudent.id]} credits. Selected class cost: {selectedTeacher.creditCost} credits.
        </p>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="font-display text-xl">Compare teachers</h3>
          <div className="mt-4 grid gap-3">
            {teachers.map((teacher) => (
              <button
                key={teacher.id}
                onClick={() => {
                  setSelectedTeacherId(teacher.id);
                  setSelectedSlot(null);
                  toast.success(`${teacher.name} selected.`);
                }}
                className={`rounded-lg border p-4 text-left ${selectedTeacherId === teacher.id ? "border-[#E8704C] bg-[#FFF0E6]" : "border-[#EFE4D0] bg-white"}`}
              >
                <TeacherProfileSummary teacher={teacher} />
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Calendar" title={`${selectedTeacher.name} availability`} />
          <TutorCalendar teacherId={selectedTeacher.id} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} />
          <div className="mt-5 rounded-lg bg-[#FBF7EE] p-4">
            <p className="text-sm text-[#5C6680]">Selected slot</p>
            <p className="font-semibold">{selectedSlot || "Choose an available slot"} · Time zone: {tutorProfile.timezone}</p>
          </div>
          <Button
            disabled={!canBook}
            onClick={() => {
              setStudentCredits((credits) => ({ ...credits, [activeStudent.id]: credits[activeStudent.id] - selectedTeacher.creditCost }));
              toast.success(`Class booked for ${activeStudent.name}. ${selectedTeacher.creditCost} credits deducted.`);
            }}
            className="mt-4 bg-[#E8704C] text-white hover:bg-[#C95630]"
          >
            {studentCredits[activeStudent.id] < selectedTeacher.creditCost ? "Insufficient credits" : "Book class"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function TeacherProfileSummary({ teacher }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg text-white font-display" style={{ backgroundColor: teacher.color }}>
          {teacher.name.split(" ").map((name) => name[0]).join("")}
        </div>
        <div>
          <p className="font-semibold">{teacher.name}</p>
          <p className="text-xs text-[#5C6680]">{teacher.country} · {teacher.languages.join(", ")}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[#5C6680]">{teacher.bio}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {teacher.specialties.map((item) => <span key={item} className="rounded-md bg-[#E0F2F0] px-2 py-1 text-[#2DA89F]">{item}</span>)}
      </div>
      <p className="mt-3 text-sm font-semibold">{teacher.rating} rating · {teacher.reviews} reviews · {teacher.creditCost} credits</p>
    </div>
  );
}

function TutorCalendar({ teacherId, selectedSlot, setSelectedSlot }) {
  const rows = teacherAvailability.filter((item) => item.teacherId === teacherId);
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.day} className="rounded-lg border border-[#EFE4D0] p-4">
          <p className="font-semibold">{row.day}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {row.slots.map((slot) => {
              const value = `${row.day} ${slot}`;
              return (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedSlot(value);
                    toast.success(`${value} selected.`);
                  }}
                  className={`rounded-md px-2 py-1 text-sm ${selectedSlot === value ? "bg-[#1F3B6E] text-white" : "bg-[#E0F2F0] text-[#2DA89F]"}`}
                >
                  {slot}
                </button>
              );
            })}
            {row.unavailable.map((slot) => <span key={slot} className="rounded-md bg-[#F3EEE3] px-2 py-1 text-sm text-[#5C6680] line-through">{slot}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TutorProgress({ activeStudent }) {
  const progress = tutorProgressByStudent[activeStudent.id] || [];
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Level progress" value={`${activeStudent.progress}%`} detail={activeStudent.roadmapStage} icon={Target} />
        <MetricCard label="Lessons completed" value={activeStudent.lessonsCompleted} detail="Guided lessons" icon={BookOpen} color="#2DA89F" />
        <MetricCard label="Classes attended" value={activeStudent.classesAttended} detail="Live sessions" icon={Video} color="#8B5BB8" />
        <MetricCard label="Tests completed" value={activeStudent.testsCompleted} detail={`${activeStudent.streak} day streak`} icon={ClipboardCheck} color="#4A90D9" />
      </div>
      <Card>
        <SectionHeader eyebrow="Skill breakdown" title={`${activeStudent.name}'s progress`} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {progress.map((skill) => (
            <div key={skill.skill}>
              <div className="flex justify-between text-sm font-semibold"><span>{skill.skill}</span><span>{skill.value}%</span></div>
              <Progress value={skill.value} className="mt-2 h-2" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton doneText="Progress link copied." variant="outline"><Share2 size={16} className="mr-2" />Copy link</ActionButton>
          <ActionButton doneText="Report download prepared." variant="outline">Download report</ActionButton>
          <ActionButton doneText="Progress shared with family." variant="outline">Share with family</ActionButton>
          <ActionButton doneText="Progress shared with school." variant="outline">Share with school</ActionButton>
        </div>
      </Card>
    </div>
  );
}

function TutorRoadmap() {
  return (
    <Card>
      <SectionHeader eyebrow="Learning roadmap" title="From onboarding to advanced fluency" />
      <div className="mt-5 grid gap-3">
        {learningRoadmap.map((stage) => (
          <div key={stage.stage} className="grid gap-3 rounded-lg border border-[#EFE4D0] p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-semibold">{stage.stage}</p>
              <p className="text-sm text-[#5C6680]">{stage.lessons} lessons · {stage.tests} tests · {stage.classes} recommended classes · Badge: {stage.badge}</p>
            </div>
            <span className={`rounded-md px-3 py-1 text-sm ${stage.status === "Locked" ? "bg-[#F3EEE3] text-[#5C6680]" : stage.status === "Current" ? "bg-[#FFF0E6] text-[#E8704C]" : "bg-[#E0F2F0] text-[#2DA89F]"}`}>
              {stage.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TutorTests({ activeStudent }) {
  const rows = testResults.filter((test) => test.studentId === activeStudent.id);
  return (
    <Card>
      <SectionHeader eyebrow="Tests and results" title={`${activeStudent.name}'s test history`} />
      <div className="mt-5 grid gap-3">
        {rows.map((test) => (
          <div key={test.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{test.name}</p>
                <p className="text-sm text-[#5C6680]">{test.skill} · {test.date} · Score: {test.score}</p>
              </div>
              <span className="rounded-md bg-[#FFF0E6] px-3 py-1 text-sm text-[#E8704C]">{test.status}</span>
            </div>
            <p className="mt-3 text-sm text-[#5C6680]">Recommended next step: {test.next}</p>
            <ActionButton doneText="Test recommendation opened." variant="outline" className="mt-3">View recommendation</ActionButton>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TutorFeedback({ activeStudent }) {
  const [skillFilter, setSkillFilter] = useState("All");
  const rows = teacherFeedback.filter((item) => item.studentId === activeStudent.id && (skillFilter === "All" || item.skill === skillFilter));
  return (
    <Card>
      <SectionHeader eyebrow="Teacher feedback" title={`Feedback for ${activeStudent.name}`} />
      <div className="mt-4 flex flex-wrap gap-2">
        {["All", "Speaking", "Grammar"].map((skill) => (
          <button key={skill} onClick={() => setSkillFilter(skill)} className={`rounded-md px-3 py-2 text-sm font-semibold ${skillFilter === skill ? "bg-[#1F3B6E] text-white" : "bg-[#FFF0E6] text-[#1F3B6E]"}`}>
            {skill}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4">
        {rows.length === 0 && <p className="text-sm text-[#5C6680]">No feedback for this filter yet.</p>}
        {rows.map((item) => (
          <div key={item.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{item.teacher} · {item.classDate} · {item.skill}</p>
            <p className="mt-3 font-semibold">Strengths: {item.strengths}</p>
            <p className="mt-2 text-sm text-[#5C6680]">Areas to improve: {item.improve}</p>
            <p className="mt-2 text-sm text-[#5C6680]">Vocabulary: {item.vocabulary.join(", ")}</p>
            <p className="mt-2 text-sm text-[#5C6680]">Grammar notes: {item.grammar}</p>
            <p className="mt-2 text-sm text-[#5C6680]">Homework: {item.homework}</p>
            <p className="mt-2 font-semibold">Next: {item.next}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TutorMessages({ activeStudent }) {
  const [message, setMessage] = useState("");
  const rows = tutorMessages.filter((item) => item.studentId === activeStudent.id);
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h3 className="font-display text-xl">Recent messages</h3>
        <div className="mt-4 grid gap-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-lg bg-[#FBF7EE] p-4">
              <p className="font-semibold">{item.teacher}</p>
              <p className="text-xs text-[#5C6680]">{item.date}</p>
              <p className="mt-2 text-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Contact teacher" title="Send a dummy message" />
        <div className="mt-4 flex flex-wrap gap-2">
          {["Ask about progress", "Ask to reschedule", "Ask for recommendations"].map((prompt) => (
            <button key={prompt} onClick={() => setMessage(prompt)} className="rounded-md bg-[#FFF0E6] px-3 py-2 text-sm font-semibold text-[#1F3B6E]">{prompt}</button>
          ))}
        </div>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-4 min-h-36 w-full rounded-md border border-[#EFE4D0] p-3 outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder={`Write to ${activeStudent.name}'s teacher...`} />
        <Button
          disabled={!message.trim()}
          onClick={() => {
            setMessage("");
            toast.success("Message sent to teacher.");
          }}
          className="mt-4 bg-[#E8704C] text-white hover:bg-[#C95630]"
        >
          <Send size={16} className="mr-2" />Send message
        </Button>
      </Card>
    </div>
  );
}

function TutorAlerts({ activeStudent }) {
  const [acknowledged, setAcknowledged] = useState({});
  const rows = tutorAlerts.filter((alert) => alert.studentId === activeStudent.id || alert.studentId === "account");
  return (
    <Card>
      <SectionHeader eyebrow="Alerts" title="Notifications that need attention" />
      <div className="mt-5 grid gap-3">
        {rows.map((alert) => (
          <div key={alert.id} className="flex flex-col justify-between gap-3 rounded-lg border border-[#EFE4D0] p-4 md:flex-row md:items-center">
            <div>
              <p className="font-semibold">{alert.message}</p>
              <p className="text-sm text-[#5C6680]">{alert.type} · {acknowledged[alert.id] ? "Acknowledged" : alert.status}</p>
            </div>
            <Button
              disabled={acknowledged[alert.id]}
              onClick={() => {
                setAcknowledged((items) => ({ ...items, [alert.id]: true }));
                toast.success("Alert acknowledged.");
              }}
              variant="outline"
            >
              {acknowledged[alert.id] ? "Acknowledged" : alert.cta}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TutorBadges({ activeStudent }) {
  const rows = tutorBadges.filter((badge) => badge.studentId === activeStudent.id);
  return (
    <Card>
      <SectionHeader eyebrow="Badges" title={`${activeStudent.name}'s badge gallery`} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((badge) => (
          <div key={badge.id} className={`rounded-lg border p-4 ${badge.status === "Earned" ? "border-[#F4C13D] bg-[#FFF9E8]" : "border-[#EFE4D0] bg-[#FBF7EE] opacity-75"}`}>
            <Award className={badge.status === "Earned" ? "text-[#F4C13D]" : "text-[#5C6680]"} />
            <h3 className="mt-3 font-display text-xl">{badge.name}</h3>
            <p className="mt-2 text-sm text-[#5C6680]">{badge.description}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#5C6680]">{badge.status} · {badge.date}</p>
            <ActionButton doneText="Badge shared." disabled={badge.status !== "Earned"} variant="outline" className="mt-4">Share badge</ActionButton>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TutorPayments() {
  return (
    <Card>
      <SectionHeader eyebrow="Payments and history" title="Dummy family account transactions" />
      <div className="mt-5 grid gap-3">
        {tutorPayments.map((payment) => (
          <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EFE4D0] p-4">
            <div>
              <p className="font-semibold">{payment.item}</p>
              <p className="text-sm text-[#5C6680]">{payment.date} · {payment.status}</p>
            </div>
            <p className="font-display text-xl">{payment.amount}</p>
          </div>
        ))}
      </div>
      <ActionButton doneText="Invoice placeholder opened." variant="outline" className="mt-5">View invoice</ActionButton>
    </Card>
  );
}

export function TeacherPortal({ module = "dashboard" }) {
  return (
    <PlatformShell role="teacher">
      {module === "dashboard" && <TeacherDashboard />}
      {module === "calendar" && <TeacherCalendar />}
      {module === "students" && <TeacherStudents />}
      {module === "classes" && <TeacherClasses />}
      {module === "materials" && <TeacherMaterials />}
      {module === "evaluations" && <TeacherEvaluations />}
      {module === "earnings" && <TeacherEarnings />}
    </PlatformShell>
  );
}

function TeacherDashboard() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's classes" value="5" detail="2 need materials" icon={Video} />
        <MetricCard label="Active students" value="38" detail="4 new this week" icon={Users} color="#2DA89F" />
        <MetricCard label="Pending feedback" value="7" detail="Due today" icon={ClipboardCheck} color="#8B5BB8" />
        <MetricCard label="Monthly earnings" value="$3,420" detail="Dummy estimate" icon={WalletCards} color="#4A90D9" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader eyebrow="Schedule" title="Upcoming teaching day" />
          <BookingList teacherView />
        </Card>
        <Card>
          <h3 className="font-display text-xl">Student risk alerts</h3>
          <div className="mt-4 grid gap-3">
            {students.filter((s) => s.risk !== "Low").map((student) => (
              <div key={student.id} className="rounded-lg bg-[#FBF7EE] p-4">
                <p className="font-semibold">{student.name}</p>
                <p className="text-sm text-[#5C6680]">{student.goals} - Risk: {student.risk}</p>
                <ActionButton doneText="Follow-up note saved." className="mt-3 bg-[#E8704C] text-white hover:bg-[#C95630]">Send follow-up</ActionButton>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TeacherCalendar() {
  const slots = ["09:00", "10:00", "12:30", "15:00", "18:00", "19:30"];
  return (
    <Card>
      <SectionHeader eyebrow="Availability" title="Open and block weekly slots" action={<ActionButton doneText="Availability saved." className="bg-[#2DA89F] text-white hover:bg-[#23877f]">Save availability</ActionButton>} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => (
          <div key={day} className="rounded-lg border border-[#EFE4D0] p-4">
            <p className="font-semibold">{day}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.slice(idx % 3, idx % 3 + 3).map((slot) => <span key={slot} className="rounded-md bg-[#FFF0E6] px-2 py-1 text-sm">{slot}</span>)}
            </div>
            <ActionButton doneText={`${day} blocked.`} variant="outline" className="mt-3">Block time</ActionButton>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TeacherStudents() {
  return (
    <Card>
      <SectionHeader eyebrow="Students" title="Profiles, goals, notes, attendance, and progress" />
      <StudentTable />
    </Card>
  );
}

function TeacherClasses() {
  return (
    <Card>
      <SectionHeader eyebrow="Classes" title="Upcoming, past, notes, materials, and feedback" />
      <BookingList teacherView showFeedback />
    </Card>
  );
}

function TeacherMaterials() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {teacherMaterials.map((material) => (
        <Card key={material.title}>
          <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{material.type}</p>
          <h3 className="mt-2 font-display text-xl">{material.title}</h3>
          <p className="mt-2 text-sm text-[#5C6680]">Used in {material.used}</p>
          <ActionButton doneText="Material shared." className="mt-4 bg-[#1F3B6E] text-white hover:bg-[#E8704C]">Share with student</ActionButton>
        </Card>
      ))}
    </div>
  );
}

function TeacherEvaluations() {
  return (
    <div className="grid gap-5">
      <Card>
        <SectionHeader eyebrow="Rubrics" title="Speaking, grammar, vocabulary, listening, and writing" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {skillProgress.map((skill) => (
            <div key={skill.skill} className="rounded-lg border border-[#EFE4D0] p-4">
              <p className="font-semibold">{skill.skill}</p>
              <Progress value={skill.value - 8} className="mt-3 h-2" />
              <textarea className="mt-3 w-full rounded-md border border-[#EFE4D0] p-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder={`Teacher comments for ${skill.skill.toLowerCase()}`} />
            </div>
          ))}
        </div>
        <ActionButton doneText="Evaluation saved." className="mt-5 bg-[#E8704C] text-white hover:bg-[#C95630]">Save evaluation</ActionButton>
      </Card>
    </div>
  );
}

function TeacherEarnings() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Completed classes" value="124" detail="This month" icon={Check} />
        <MetricCard label="Pending payouts" value="$860" detail="Next Friday" icon={WalletCards} color="#2DA89F" />
        <MetricCard label="Commission" value="18%" detail="Placeholder" icon={CircleDollarSign} color="#8B5BB8" />
      </div>
      <Card>
        <h3 className="font-display text-xl">Monthly earnings trend</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D0" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="xp" fill="#2DA89F" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export function AdminPortal({ module = "dashboard" }) {
  return (
    <PlatformShell role="admin">
      {module === "dashboard" && <AdminDashboard />}
      {module === "approvals" && <AdminApprovals />}
      {module === "users" && <AdminUsers />}
      {module === "credits" && <AdminCredits />}
      {module === "lessons" && <AdminLessons />}
      {module === "teachers" && <AdminTeachers />}
      {module === "courses" && <AdminLessons />}
      {module === "bookings" && <AdminBookings />}
      {module === "families" && <AdminFamilies />}
      {module === "reports" && <AdminReports />}
      {module === "settings" && <AdminSettings />}
    </PlatformShell>
  );
}

function AdminDashboard() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {schoolAdminMetrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={[Users, UserCheck, Coins, FilePlus2][index]}
            color={colors[index % colors.length]}
          />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <SectionHeader eyebrow="Administrative focus" title={`${schoolAdminProfile.name}, ${schoolAdminProfile.title}`} />
          <p className="mt-3 text-sm text-[#5C6680]">{schoolAdminProfile.focus}.</p>
          <div className="mt-5 grid gap-3">
            {userApprovalQueue.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg bg-[#FBF7EE] p-4">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[#5C6680]">{item.type} · {item.request} · {item.status}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">School actions</h3>
          <div className="mt-4 grid gap-3">
            <ActionButton doneText="Approval queue opened." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Review approvals</ActionButton>
            <ActionButton doneText="Credit grant form opened." variant="outline">Give credits</ActionButton>
            <ActionButton doneText="New lesson draft started." variant="outline">Create lesson</ActionButton>
          </div>
        </Card>
      </div>
      <AdminReports compact />
    </div>
  );
}

function AdminApprovals() {
  return (
    <Card>
      <SectionHeader eyebrow="Approvals" title="Approve people before they enter the school" />
      <div className="mt-5 grid gap-3">
        {userApprovalQueue.map((item) => (
          <div key={item.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[#5C6680]">{item.type} · {item.request} · Risk: {item.risk}</p>
              </div>
              <span className="rounded-md bg-[#FFF0E6] px-3 py-1 text-sm text-[#E8704C]">{item.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton doneText={`${item.name} approved.`} className="bg-[#2DA89F] text-white hover:bg-[#23877f]">Approve</ActionButton>
              <ActionButton doneText={`More information requested from ${item.name}.`} variant="outline">Request info</ActionButton>
              <ActionButton doneText={`${item.name} scheduled for review.`} variant="outline">Schedule review</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminUsers() {
  return (
    <Card>
      <SectionHeader eyebrow="People" title="Students, tutors, teachers, and school staff" />
      <div className="mt-5 grid gap-3">
        {[...tutorStudents.map((student) => ({
          name: student.name,
          type: "Student",
          detail: `${student.currentLevel} to ${student.targetLevel}`,
          status: student.risk,
        })), ...teachers.map((teacher) => ({
          name: teacher.name,
          type: "Teacher",
          detail: teacher.specialty,
          status: `${teacher.rating} rating`,
        })), { name: "Camila Torres", type: "Tutor / Guardian", detail: "Torres Family Learning Account", status: "Active" }].map((person) => (
          <div key={`${person.type}-${person.name}`} className="flex flex-col justify-between gap-3 rounded-lg border border-[#EFE4D0] p-4 md:flex-row md:items-center">
            <div>
              <p className="font-semibold">{person.name}</p>
              <p className="text-sm text-[#5C6680]">{person.type} · {person.detail}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#E0F2F0] px-3 py-1 text-sm text-[#2DA89F]">{person.status}</span>
              <ActionButton doneText={`${person.name} profile opened.`} variant="outline">View</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminCredits() {
  const [schoolPool, setSchoolPool] = useState(1840);
  const [grantAmount, setGrantAmount] = useState(4);
  const [selectedAccount, setSelectedAccount] = useState(familyAccounts[0].name);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="School credit pool" value={schoolPool} detail="Credits available to grant" icon={Coins} />
        <MetricCard label="Low-credit families" value="3" detail="Need follow-up this week" icon={Bell} color="#E8704C" />
        <MetricCard label="Courtesy credits" value="42" detail="Granted this month" icon={WalletCards} color="#2DA89F" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <SectionHeader eyebrow="Give credits" title="Grant credits to a family or learner" />
          <label className="mt-4 block text-sm font-semibold">Account</label>
          <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)} className="mt-2 w-full rounded-md border border-[#EFE4D0] px-3 py-2 outline-none focus:ring-2 focus:ring-[#E8704C]">
            {familyAccounts.map((account) => <option key={account.id}>{account.name}</option>)}
          </select>
          <label className="mt-4 block text-sm font-semibold">Credits</label>
          <input type="number" min="1" value={grantAmount} onChange={(event) => setGrantAmount(Number(event.target.value))} className="mt-2 w-full rounded-md border border-[#EFE4D0] px-3 py-2 outline-none focus:ring-2 focus:ring-[#E8704C]" />
          <Button
            disabled={grantAmount <= 0 || grantAmount > schoolPool}
            onClick={() => {
              setSchoolPool((pool) => pool - grantAmount);
              toast.success(`${grantAmount} credits granted to ${selectedAccount}.`);
            }}
            className="mt-4 w-full bg-[#E8704C] text-white hover:bg-[#C95630]"
          >
            Give credits
          </Button>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Recent credit grants</h3>
          <div className="mt-4 grid gap-3">
            {schoolCreditGrants.map((grant) => (
              <div key={grant.id} className="rounded-lg bg-[#FBF7EE] p-4">
                <p className="font-semibold">{grant.account}</p>
                <p className="text-sm text-[#5C6680]">{grant.student} · {grant.credits} credits · {grant.reason} · {grant.date}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminTeachers() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {teachers.map((teacher) => (
        <Card key={teacher.id}>
          <TeacherMini teacher={teacher} />
          <p className="mt-4 text-sm text-[#5C6680]">Specialties: {teacher.specialty}. Style: {teacher.teachingStyle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton doneText="Teacher approved for classes." className="bg-[#2DA89F] text-white hover:bg-[#23877f]">Approve teacher</ActionButton>
            <ActionButton doneText="Teacher feedback reviewed." variant="outline">Review feedback</ActionButton>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminLessons() {
  return (
    <Card>
      <SectionHeader eyebrow="Lessons" title="Create, review, and publish learning materials" action={<ActionButton doneText="New lesson draft created." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Create lesson</ActionButton>} />
      <div className="mt-5 grid gap-3">
        {lessonDrafts.map((lesson) => (
          <div key={lesson.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{lesson.title}</p>
                <p className="text-sm text-[#5C6680]">{lesson.course} · {lesson.level} · {lesson.skill} · Author: {lesson.author}</p>
              </div>
              <span className="rounded-md bg-[#FFF0E6] px-3 py-1 text-sm text-[#E8704C]">{lesson.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton doneText={`${lesson.title} approved.`} variant="outline">Approve lesson</ActionButton>
              <ActionButton doneText={`${lesson.title} opened for editing.`} variant="outline">Edit lesson</ActionButton>
              <ActionButton doneText={`Notes sent to ${lesson.author}.`} variant="outline">Request changes</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminBookings() {
  return (
    <Card>
      <SectionHeader eyebrow="Bookings" title="Classes that need administrative attention" />
      <BookingList showFeedback />
    </Card>
  );
}

function AdminFamilies() {
  return (
    <Card>
      <SectionHeader eyebrow="Families and learning accounts" title="Support families, guardians, and school groups" />
      <div className="mt-5 grid gap-3">
        {familyAccounts.map((account) => (
          <div key={account.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-[#5C6680]">Tutor: {account.tutor} · Students: {account.students} · Credits: {account.credits}</p>
                <p className="mt-1 text-sm text-[#5C6680]">Admin note: {account.alert}</p>
              </div>
              <span className="rounded-md bg-[#E0F2F0] px-3 py-1 text-sm text-[#2DA89F]">{account.status}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <ActionButton doneText={`Opened ${account.name}.`} variant="outline">View account</ActionButton>
              <ActionButton doneText={`Follow-up scheduled for ${account.name}.`} variant="outline">Schedule follow-up</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminReports({ compact = false }) {
  const chartData = useMemo(() => schoolReports.map((item) => ({ ...item, chartValue: item.value })), []);
  return (
    <Card>
      <SectionHeader eyebrow="School reports" title={compact ? "Academic health snapshot" : "Attendance, lessons, feedback, and credits"} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {schoolReports.map((item) => (
          <div key={item.label} className="rounded-lg bg-[#FBF7EE] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{item.label}</p>
            <p className="mt-2 font-display text-2xl">{item.value}%</p>
            <p className="text-sm text-[#5C6680]">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFE4D0" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="chartValue" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => <Cell key={entry.label} fill={colors[index % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AdminSettings() {
  const settings = ["School name", "Academic levels", "Credit policy", "Approval rules", "Lesson review flow", "Teacher standards", "Family communication", "Class cancellation policy", "Certificate wording"];
  return (
    <Card>
      <SectionHeader eyebrow="School setup" title="Administrative rules, not technical integrations" action={<ActionButton doneText="School setup saved." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save setup</ActionButton>} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {settings.map((setting) => (
          <label key={setting} className="rounded-lg border border-[#EFE4D0] p-4">
            <span className="font-semibold">{setting}</span>
            <input className="mt-3 w-full rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="Administrative placeholder" />
          </label>
        ))}
      </div>
    </Card>
  );
}

function BookingList({ teacherView = false, showFeedback = false }) {
  return (
    <div className="mt-5 grid gap-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="rounded-lg border border-[#EFE4D0] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{teacherView ? booking.student : booking.teacher}</p>
              <p className="text-sm text-[#5C6680]">{booking.course} - {booking.date} at {booking.time}</p>
            </div>
            <span className="rounded-md bg-[#FFF0E6] px-3 py-1 text-sm text-[#E8704C]">{booking.status}</span>
          </div>
          {showFeedback && (
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton doneText="Feedback saved." variant="outline">Add feedback</ActionButton>
              <ActionButton doneText="Homework assigned." variant="outline">Assign homework</ActionButton>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StudentTable({ admin = false }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">
          <tr>
            <th className="border-b border-[#EFE4D0] py-3">Name</th>
            <th className="border-b border-[#EFE4D0] py-3">Level</th>
            <th className="border-b border-[#EFE4D0] py-3">Goals</th>
            <th className="border-b border-[#EFE4D0] py-3">Attendance</th>
            <th className="border-b border-[#EFE4D0] py-3">Progress</th>
            <th className="border-b border-[#EFE4D0] py-3">{admin ? "Roles" : "Risk"}</th>
            <th className="border-b border-[#EFE4D0] py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => (
            <tr key={student.id}>
              <td className="border-b border-[#EFE4D0] py-3 font-semibold">{student.name}</td>
              <td className="border-b border-[#EFE4D0] py-3">{student.level}</td>
              <td className="border-b border-[#EFE4D0] py-3">{student.goals}</td>
              <td className="border-b border-[#EFE4D0] py-3">{student.attendance}</td>
              <td className="border-b border-[#EFE4D0] py-3">
                <div className="flex items-center gap-2"><Progress value={student.progress} className="h-2 w-24" />{student.progress}%</div>
              </td>
              <td className="border-b border-[#EFE4D0] py-3">{admin ? (idx === 1 ? "Student, Teacher" : "Student") : student.risk}</td>
              <td className="border-b border-[#EFE4D0] py-3">
                <ActionButton doneText={admin ? "User updated." : "Note saved."} variant="outline">{admin ? "Edit" : "Add note"}</ActionButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
