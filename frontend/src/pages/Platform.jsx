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
  BadgeCheck,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LineChart,
  MessageCircle,
  PlayCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Video,
  WalletCards,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  analytics,
  bookings,
  communityPosts,
  courses,
  events,
  lessons,
  payments,
  pillars,
  platformStats,
  skillProgress,
  students,
  teacherMaterials,
  teachers,
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
    ["", "Dashboard", LayoutDashboard],
    ["users", "Users", Users],
    ["teachers", "Teachers", GraduationCap],
    ["courses", "Courses", Library],
    ["bookings", "Bookings", CalendarDays],
    ["payments", "Payments", CreditCard],
    ["community", "Community", ShieldCheck],
    ["analytics", "Analytics", LineChart],
    ["settings", "Settings", Settings],
  ],
};

const roleMeta = {
  student: {
    label: "Student",
    base: "/student",
    title: "What should I do today?",
    subtitle: "Your Spanish plan, live classes, practice prompts, and community moments in one place.",
  },
  teacher: {
    label: "Teacher",
    base: "/teacher",
    title: "What do I need to teach and follow up today?",
    subtitle: "Classes, students, feedback, materials, and earnings for a modern teaching workflow.",
  },
  admin: {
    label: "Admin",
    base: "/admin",
    title: "How is the platform performing?",
    subtitle: "A control room for users, content, bookings, payments, moderation, and growth metrics.",
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

function ActionButton({ children, doneText, className = "", variant = "default" }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={variant}
      disabled={loading || done}
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
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#EFE4D0] bg-white p-1">
      {["student", "teacher", "admin"].map((role) => (
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
        {courses.map((course) => <CourseMini key={course.id} course={course} />)}
      </div>
    </div>
  );
}

function LearningHub() {
  const modules = ["Courses", "Lessons", "Videos", "Audio", "Reading", "Writing", "Speaking", "Grammar", "Vocabulary", "Flashcards", "Quizzes"];
  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Learning hub" title="Choose a mode and keep momentum." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((item, idx) => (
          <Card key={item}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 text-white" style={{ backgroundColor: colors[idx % colors.length] }}><BookOpen size={18} /></div>
              <p className="font-semibold">{item}</p>
            </div>
            <p className="mt-3 text-sm text-[#5C6680]">{idx % 2 ? "New practice set available." : "Continue your guided path."}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-display text-xl">Recommended lessons</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.title} className="rounded-lg border border-[#EFE4D0] p-4">
              <p className="font-semibold">{lesson.title}</p>
              <p className="mt-1 text-sm text-[#5C6680]">{lesson.type} - {lesson.time} - {lesson.skill}</p>
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
          {skillProgress.map((skill) => (
            <div key={skill.skill}>
              <div className="flex justify-between text-sm font-semibold"><span>{skill.skill}</span><span>{skill.value}%</span></div>
              <Progress value={skill.value} className="mt-2 h-2" />
            </div>
          ))}
        </div>
      </Card>
    </div>
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
      {module === "users" && <AdminUsers />}
      {module === "teachers" && <AdminTeachers />}
      {module === "courses" && <AdminCourses />}
      {module === "bookings" && <AdminBookings />}
      {module === "payments" && <AdminPayments />}
      {module === "community" && <AdminCommunity />}
      {module === "analytics" && <AdminAnalytics />}
      {module === "settings" && <AdminSettings />}
    </PlatformShell>
  );
}

function AdminDashboard() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total students" value="12,840" detail="1,840 active today" icon={Users} />
        <MetricCard label="Teachers" value="126" detail="8 pending approval" icon={GraduationCap} color="#2DA89F" />
        <MetricCard label="Bookings" value="3,214" detail="This month" icon={CalendarDays} color="#8B5BB8" />
        <MetricCard label="Revenue / MRR" value="$84.2k" detail="Dummy metric" icon={CircleDollarSign} color="#4A90D9" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <AdminAnalytics compact />
        <Card>
          <h3 className="font-display text-xl">Top courses and teachers</h3>
          <div className="mt-4 grid gap-3">
            {courses.map((course) => <CourseMini key={course.id} course={course} />)}
            {teachers.slice(0, 2).map((teacher) => <TeacherMini key={teacher.id} teacher={teacher} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminUsers() {
  return (
    <Card>
      <SectionHeader eyebrow="Users" title="Students, teachers, admins, roles, and status" />
      <StudentTable admin />
    </Card>
  );
}

function AdminTeachers() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {teachers.map((teacher) => (
        <Card key={teacher.id}>
          <TeacherMini teacher={teacher} />
          <p className="mt-4 text-sm text-[#5C6680]">Specialties: {teacher.specialty}. Calendar status: synced. Revenue: ${(teacher.price * 42).toLocaleString()}.</p>
          <ActionButton doneText="Teacher approved." className="mt-4 bg-[#2DA89F] text-white hover:bg-[#23877f]">Approve profile</ActionButton>
        </Card>
      ))}
    </div>
  );
}

function AdminCourses() {
  return (
    <Card>
      <SectionHeader eyebrow="Courses and content" title="Course list, lessons, categories, draft and published status" action={<ActionButton doneText="Draft course created." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Create course</ActionButton>} />
      <div className="mt-5 grid gap-3">
        {courses.map((course) => (
          <div key={course.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{course.title}</p>
                <p className="text-sm text-[#5C6680]">{course.lessons} lessons - {course.category}</p>
              </div>
              <span className="rounded-md bg-[#E0F2F0] px-3 py-1 text-sm text-[#2DA89F]">{course.status}</span>
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
      <SectionHeader eyebrow="Bookings" title="Upcoming, cancelled, completed, and refund placeholders" />
      <BookingList showFeedback />
    </Card>
  );
}

function AdminPayments() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        {payments.map((payment) => (
          <Card key={payment.plan}>
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{payment.status}</p>
            <h3 className="mt-2 font-display text-2xl">{payment.plan}</h3>
            <p className="mt-2 text-3xl font-display">{payment.price}</p>
            <p className="mt-2 text-sm text-[#5C6680]">{payment.users.toLocaleString()} subscribers</p>
            <ActionButton doneText="Payment plan updated." variant="outline" className="mt-4">Edit plan</ActionButton>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-display text-xl">Coupons, invoices, subscriptions, and packages are dummy flows.</h3>
      </Card>
    </div>
  );
}

function AdminCommunity() {
  return (
    <Card>
      <SectionHeader eyebrow="Moderation" title="Reported posts, flagged comments, and event approvals" />
      <div className="mt-5 grid gap-3">
        {communityPosts.map((post) => (
          <div key={post.id} className="rounded-lg border border-[#EFE4D0] p-4">
            <p className="font-semibold">{post.group}: {post.body}</p>
            <p className="text-sm text-[#5C6680]">Reported comments placeholder - {post.comments} comments</p>
            <div className="mt-3 flex gap-2">
              <ActionButton doneText="Post approved." className="bg-[#2DA89F] text-white hover:bg-[#23877f]">Approve</ActionButton>
              <ActionButton doneText="Post hidden." variant="outline">Hide</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminAnalytics({ compact = false }) {
  const chartData = useMemo(() => analytics.map((a) => ({ ...a, chartValue: a.value > 1000 ? a.value / 100 : a.value })), []);
  return (
    <Card>
      <SectionHeader eyebrow="Analytics" title={compact ? "Performance snapshot" : "Retention, revenue, completion, and engagement"} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {analytics.map((item) => (
          <div key={item.label} className="rounded-lg bg-[#FBF7EE] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">{item.label}</p>
            <p className="mt-2 font-display text-2xl">{item.label === "MRR" ? `$${(item.value / 1000).toFixed(1)}k` : item.value}</p>
            <p className="text-sm text-[#2DA89F]">{item.change}</p>
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
  const settings = ["Platform name", "Languages", "Pricing", "Stripe", "Google Calendar", "Google Meet", "Zoom", "Email", "WhatsApp"];
  return (
    <Card>
      <SectionHeader eyebrow="Settings" title="Platform configuration and integration placeholders" action={<ActionButton doneText="Settings saved." className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save settings</ActionButton>} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {settings.map((setting) => (
          <label key={setting} className="rounded-lg border border-[#EFE4D0] p-4">
            <span className="font-semibold">{setting}</span>
            <input className="mt-3 w-full rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder={setting.includes("Google") || setting === "Stripe" ? "Placeholder integration" : "MOSAICO"} />
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
