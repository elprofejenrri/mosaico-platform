import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import TeacherCalendarWorkspace from "../components/teacher-calendar/TeacherCalendarWorkspace";
import AdminRbacWorkspace from "../components/admin-rbac/AdminRbacWorkspace";
import ActivityTimeline from "../components/ActivityTimeline";
import { useApp } from "../context/AppContext";
import { canAccessPortal, hasPermission } from "../lib/access";
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
  AlertTriangle,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Coins,
  Clock,
  CreditCard,
  FileSearch,
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
  clientBadgeGallery,
  clientLearningPath,
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
  rbacCatalogs,
  rbacPermissionLevels,
  rbacRoles,
  rbacUsers,
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
    ["roadmap", "Roadmap", Target],
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
    ["analytics", "Analytics", LineChart],
    ["atlas", "Mosaico Atlas", BookOpen],
    ["reports", "Reports", LineChart],
    ["roles-permissions", "Roles & Access", ShieldCheck],
    ["configuration", "Configuration", Settings],
    ["audit-logs", "Audit Logs", FileSearch],
    ["activity-logs", "Activity Logs", ClipboardCheck],
    ["system-settings", "System Health", ShieldCheck],
  ],
};

const roleNavGroups = {
  student: [
    ["Start", [""]],
    ["Learning", ["learn", "roadmap", "ai-tutor", "progress"]],
    ["Classes", ["classes"]],
    ["Community", ["community"]],
  ],
  tutor: [
    ["Start", [""]],
    ["Family", ["students", "alerts", "messages"]],
    ["Learning", ["roadmap", "tests", "progress", "badges", "feedback"]],
    ["Classes", ["classes"]],
    ["Money", ["credits", "payments"]],
  ],
  teacher: [
    ["Start", [""]],
    ["Teaching", ["calendar", "classes", "students"]],
    ["Content", ["materials", "evaluations"]],
    ["Money", ["earnings"]],
  ],
  admin: [
    ["Command Center", ["", "approvals"]],
    ["People & Learning", ["users", "teachers", "families", "lessons"]],
    ["Scheduling & Credits", ["bookings", "credits"]],
    ["Intelligence", ["analytics", "reports", "atlas"]],
    ["Access & Governance", ["roles-permissions", "audit-logs", "activity-logs"]],
    ["System", ["configuration", "system-settings"]],
  ],
};

const roleMeta = {
  student: {
    label: "Client",
    base: "/student",
    title: "What should I do today?",
    subtitle: "Your learning roadmap, live classes, practice tests, credits, badges, and daily Spanish plan in one place.",
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

const productionBackedModules = {
  admin: new Set(["users", "roles", "roles-permissions", "analytics", "atlas", "atlas-volume", "configuration", "audit-logs", "activity-logs", "system-settings"]),
};

function isProductionBackedModule(role, module = "dashboard") {
  return productionBackedModules[role]?.has(module) || false;
}

function canAccessNavItem(user, role, slug) {
  if (role !== "admin") return true;
  const permissionBySlug = {
    users: "users.profile.view",
    roles: "roles.management.view",
    "roles-permissions": "roles.management.view",
    analytics: "reports.analytics.view",
    atlas: "atlas.view",
    "atlas-volume": "atlas.view",
    configuration: "settings.platform.view",
    "audit-logs": "audit.logs.view",
    "activity-logs": "logs.activity.view",
    "system-settings": "settings.platform.view",
  };
  const permission = permissionBySlug[slug];
  return permission ? hasPermission(user, permission, 1) : true;
}

function PreviewSurfaceNotice({ role, module }) {
  if (isProductionBackedModule(role, module)) return null;
  return (
    <div className="mb-5 rounded-lg border border-[#F4C13D] bg-[#FFF9E8] p-4 text-sm text-[#7A5600]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold text-[#1F3B6E]">Preview service</p>
          <p className="mt-1">
            This workspace is isolated behind mock data while the backend domain is built. Production actions are disabled until they are connected to backend persistence.
          </p>
        </div>
        <Link to="/technical/wiki" className="shrink-0 font-semibold text-[#1F3B6E] hover:text-[#E8704C]">Implementation plan</Link>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  doneText = "Action complete.",
  className = "",
  variant = "default",
  disabled = false,
  onAction,
  unavailableText = "This product workflow is not connected to backend persistence yet.",
}) {
  const [loading, setLoading] = useState(false);
  const isConnected = typeof onAction === "function";
  const isDisabled = disabled || loading || !isConnected;
  const disabledReason = !isConnected ? unavailableText : "Action is unavailable in the current state.";
  const accessibleLabel = typeof children === "string" ? children : "Action";

  const runAction = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      await onAction();
      toast.success(doneText);
    } catch (error) {
      toast.error(error?.message || "Could not complete this action.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      disabled={isDisabled}
      className={className}
      title={isDisabled ? disabledReason : undefined}
      aria-label={isDisabled ? `${accessibleLabel}. ${disabledReason}` : undefined}
      onClick={runAction}
    >
      {loading ? "Working..." : children}
    </Button>
  );
}

function Card({ children, className = "", ...props }) {
  return <div {...props} className={`rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm ${className}`}>{children}</div>;
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
  const { user } = useApp();
  const visibleRoles = ["student", "tutor", "teacher", "admin"].filter((role) => canAccessPortal(user, role));
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#EFE4D0] bg-white p-1 sm:grid-cols-4 lg:grid-cols-2">
      {visibleRoles.map((role) => (
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

function groupedNavItems(role, items) {
  const bySlug = new Map(items.map((item) => [item[0], item]));
  const used = new Set();
  const groups = (roleNavGroups[role] || [["Navigation", items.map(([slug]) => slug)]]).map(([label, slugs]) => {
    const groupItems = slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
    groupItems.forEach(([slug]) => used.add(slug));
    return [label, groupItems];
  }).filter(([, groupItems]) => groupItems.length > 0);
  const leftovers = items.filter(([slug]) => !used.has(slug));
  if (leftovers.length) groups.push(["Other", leftovers]);
  return groups;
}

function SidebarNavGroup({ label, items, role, meta, location, expanded, onToggle }) {
  const hasActive = items.some(([slug]) => {
    const to = slug ? `${meta.base}/${slug}` : meta.base;
    return location.pathname === to || (slug && location.pathname.startsWith(to));
  });
  const open = expanded || hasActive;
  return (
    <div className="border-t border-[#EFE4D0] pt-2 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5C6680] hover:bg-[#FBF7EE]"
      >
        <span>{label}</span>
        {open ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
      </button>
      {open && (
        <div className="mt-1 grid gap-1">
          {items.map(([slug, itemLabel, Icon]) => {
            const to = slug ? `${meta.base}/${slug}` : meta.base;
            const active = location.pathname === to || (slug && location.pathname.startsWith(to));
            return (
              <NavLink
                key={`${role}-${slug || "dashboard"}`}
                to={to}
                className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-[#FFF0E6] text-[#E8704C]" : "text-[#1F3B6E] hover:bg-[#FFF0E6]"
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{itemLabel}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformShell({ role, module = "dashboard", children }) {
  const location = useLocation();
  const { user, authLoading } = useApp();
  const meta = roleMeta[role];
  const navStorageKey = `mosaico_nav_groups_${role}`;
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(navStorageKey) || "{}");
    } catch {
      return {};
    }
  });
  const deniedTitleByRole = {
    tutor: "Tutor access required",
    teacher: "Teacher access required",
    admin: "Administrative access required",
  };
  const deniedCopyByRole = {
    tutor: "This account does not have a tutor or parent role. Student-only users can use the client portal, but cannot open family management tools.",
    teacher: "This account does not have a teacher role or teacher calendar permission. Student-only users can use the client portal, but cannot open teacher operations.",
    admin: "This account does not have administrative roles or permissions. Student-only users can use the client portal, but cannot open school operations.",
  };

  useEffect(() => {
    if (!user || module !== "dashboard") return;
    trackEvent("dashboard_viewed", { module: role, metadata: { path: location.pathname } });
  }, [location.pathname, module, role, user]);

  useEffect(() => {
    localStorage.setItem(navStorageKey, JSON.stringify(expandedGroups));
  }, [expandedGroups, navStorageKey]);

  const visibleNavItems = roleNav[role].filter(([slug]) => canAccessNavItem(user, role, slug));
  const navGroups = groupedNavItems(role, visibleNavItems);

  if (!authLoading && !canAccessPortal(user, role)) {
    return (
      <div className="bg-[#FBF7EE] px-4 py-10">
        <Card className="mx-auto max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-[#FFF0E6] p-3 text-[#E8704C]"><ShieldCheck size={22} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Access denied</p>
              <h1 className="mt-2 font-display text-3xl text-[#1F3B6E]">{deniedTitleByRole[role] || "Access required"}</h1>
              <p className="mt-2 text-sm text-[#5C6680]">{deniedCopyByRole[role] || "This account does not have permission to open this workspace."}</p>
              <Link to="/student"><Button className="mt-5 bg-[#1F3B6E] text-white hover:bg-[#162B52]">Go to client portal</Button></Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div className="bg-[#FBF7EE]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-3">
            <RoleSwitcher current={role} />
            <nav className="mt-4 grid gap-3" aria-label={`${meta.label} navigation`}>
              {navGroups.map(([label, items]) => (
                <SidebarNavGroup
                  key={`${role}-${label}`}
                  label={label}
                  items={items}
                  role={role}
                  meta={meta}
                  location={location}
                  expanded={expandedGroups[label] !== false}
                  onToggle={() => setExpandedGroups((current) => ({ ...current, [label]: current[label] === false }))}
                />
              ))}
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
          <PreviewSurfaceNotice role={role} module={module} />
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
    <PlatformShell role="student" module={module}>
      {module === "dashboard" && <StudentDashboard />}
      {module === "learn" && <LearningHub />}
      {module === "roadmap" && <ClientRoadmap />}
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
              ["Roadmap unlock", "Claim badges, credits, levels, and tests", Award],
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

function ClientRoadmap() {
  const [claimedRewards, setClaimedRewards] = useState({});
  const [selectedStageId, setSelectedStageId] = useState("path-a1");
  const selectedStage = clientLearningPath.find((stage) => stage.id === selectedStageId) || clientLearningPath[2];
  const unlockedCredits = clientLearningPath
    .filter((stage) => stage.status === "Completed" || claimedRewards[stage.id])
    .reduce((sum, stage) => sum + stage.unlocks.credits, 0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Current path" value={selectedStage.level} detail={selectedStage.stage} icon={Target} />
        <MetricCard label="Path progress" value={`${selectedStage.progress}%`} detail={selectedStage.status} icon={LineChart} color="#2DA89F" />
        <MetricCard label="Unlocked credits" value={unlockedCredits} detail="From roadmap rewards" icon={Coins} color="#8B5BB8" />
        <MetricCard label="Badges earned" value={clientBadgeGallery.filter((badge) => badge.status === "Earned").length} detail="More unlock by level" icon={Award} color="#F4C13D" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <SectionHeader eyebrow="Client roadmap" title="Learning path with unlocks" />
          <div className="mt-5 grid gap-3">
            {clientLearningPath.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  setSelectedStageId(stage.id);
                  toast.success(`${stage.stage} selected.`);
                }}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedStageId === stage.id ? "border-[#E8704C] bg-[#FFF0E6]" : "border-[#EFE4D0] bg-white hover:bg-[#FBF7EE]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{stage.stage}</p>
                    <p className="text-sm text-[#5C6680]">{stage.description}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs ${stage.status === "Locked" ? "bg-[#F3EEE3] text-[#5C6680]" : "bg-white text-[#E8704C]"}`}>
                    {stage.status}
                  </span>
                </div>
                <Progress value={stage.progress} className="mt-4 h-2" />
                <p className="mt-2 text-xs font-semibold text-[#1F3B6E]">
                  Unlocks {stage.unlocks.credits} credits, {stage.unlocks.badge}, {stage.unlocks.level}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Selected stage"
            title={selectedStage.stage}
            action={
              <Button
                disabled={selectedStage.status === "Locked" || claimedRewards[selectedStage.id]}
                onClick={() => {
                  setClaimedRewards((items) => ({ ...items, [selectedStage.id]: true }));
                  toast.success(`${selectedStage.unlocks.credits} credits unlocked from ${selectedStage.stage}.`);
                }}
                className="bg-[#E8704C] text-white hover:bg-[#C95630]"
              >
                {claimedRewards[selectedStage.id] ? "Reward claimed" : "Claim unlocks"}
              </Button>
            }
          />
          <p className="mt-2 text-sm text-[#5C6680]">{selectedStage.description}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[#FBF7EE] p-4">
              <p className="font-semibold">Requirements</p>
              <ul className="mt-3 grid gap-2 text-sm text-[#5C6680]">
                {selectedStage.requirements.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg bg-[#FBF7EE] p-4">
              <p className="font-semibold">Unlocks</p>
              <div className="mt-3 grid gap-2 text-sm text-[#5C6680]">
                <p>{selectedStage.unlocks.credits} learning credits</p>
                <p>Badge: {selectedStage.unlocks.badge}</p>
                <p>Next level: {selectedStage.unlocks.level}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RoadmapTestList title="Official tests" tests={selectedStage.tests} actionText="Start test" />
            <RoadmapTestList title="Practice tests" tests={selectedStage.practiceTests} actionText="Practice" />
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Badges" title="Badge gallery and level rewards" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {clientBadgeGallery.map((badge) => (
            <div key={badge.id} className={`rounded-lg border p-4 ${badge.status === "Earned" ? "border-[#F4C13D] bg-[#FFF9E8]" : badge.status === "In progress" ? "border-[#E8704C] bg-[#FFF0E6]" : "border-[#EFE4D0] bg-[#FBF7EE]"}`}>
              <Award className={badge.status === "Locked" ? "text-[#5C6680]" : "text-[#F4C13D]"} />
              <h3 className="mt-3 font-display text-lg">{badge.name}</h3>
              <p className="mt-2 text-sm text-[#5C6680]">{badge.description}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#5C6680]">{badge.status} · {badge.reward}</p>
              <ActionButton doneText={`${badge.name} shared.`} disabled={badge.status === "Locked"} variant="outline" className="mt-4">Share</ActionButton>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RoadmapTestList({ title, tests, actionText }) {
  return (
    <div className="rounded-lg border border-[#EFE4D0] p-4">
      <p className="font-display text-xl">{title}</p>
      <div className="mt-4 grid gap-3">
        {tests.map((test) => (
          <div key={test.name} className="rounded-md bg-[#FBF7EE] p-3">
            <p className="font-semibold">{test.name}</p>
            <p className="text-sm text-[#5C6680]">
              {test.type || test.skill} · {test.status}{test.score ? ` · ${test.score}` : ""}
            </p>
            <ActionButton
              doneText={`${test.name} opened.`}
              disabled={test.status === "Locked" || test.status?.startsWith("Locked")}
              variant="outline"
              className="mt-3"
            >
              {actionText}
            </ActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function useTutorState() {
  const [activeStudentId, setActiveStudentId] = useState(tutorStudents[0].id);
  const [sharedCredits] = useState(learningAccount.sharedCredits);
  const [studentCredits] = useState(
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
    studentCredits,
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
    <PlatformShell role="tutor" module={module}>
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

function TutorCredits({ activeStudent, sharedCredits, studentCredits }) {
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
          <SectionHeader eyebrow="Buy credits" title="Credit packages pending payment connection" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {creditPackages.map((pack) => (
              <div key={pack.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <p className="font-display text-xl">{pack.name}</p>
                <p className="mt-2 text-3xl font-display">{pack.credits}</p>
                <p className="text-sm text-[#5C6680]">credits · {pack.price}</p>
                <p className="mt-2 text-xs text-[#5C6680]">{pack.bestFor}</p>
                <Button
                  disabled
                  title="Credit purchases require Stripe checkout and a credit ledger before production use."
                  className="mt-4 w-full bg-[#E8704C] text-white hover:bg-[#C95630]"
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
            disabled
            title="Credit assignment requires a persisted family wallet ledger before production use."
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

function TutorClasses({ activeStudent, studentCredits, selectedTeacherId, setSelectedTeacherId, selectedTeacher, selectedSlot, setSelectedSlot }) {
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
            disabled
            title="Booking requires the production booking lifecycle and credit ledger before production use."
            className="mt-4 bg-[#E8704C] text-white hover:bg-[#C95630]"
          >
            {!selectedSlot ? "Choose a slot first" : canBook ? "Book class" : "Insufficient credits"}
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
      <ActionButton doneText="Invoice preview opened." variant="outline" className="mt-5">View invoice</ActionButton>
    </Card>
  );
}

export function TeacherPortal({ module = "dashboard" }) {
  return (
    <PlatformShell role="teacher" module={module}>
      {module === "dashboard" && <TeacherDashboard />}
      {module === "calendar" && <TeacherCalendarWorkspace />}
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
    <PlatformShell role="admin" module={module}>
      {module === "dashboard" && <AdminDashboard />}
      {module === "approvals" && <AdminApprovals />}
      {module === "users" && <AdminUsersReal />}
      {module === "credits" && <AdminCredits />}
      {module === "lessons" && <AdminLessons />}
      {module === "teachers" && <AdminTeachers />}
      {module === "courses" && <AdminLessons />}
      {module === "bookings" && <AdminBookings />}
      {module === "families" && <AdminFamilies />}
      {module === "reports" && <AdminReports />}
      {module === "analytics" && <AdminAnalyticsDashboard />}
      {module === "atlas" && <MosaicoAtlas />}
      {module === "atlas-volume" && <MosaicoAtlasVolumeDetail />}
      {(module === "roles" || module === "roles-permissions") && <AdminRbacWorkspace />}
      {module === "configuration" && <SuperAdminConfigurationCenter />}
      {module === "audit-logs" && <AdminAuditLogs />}
      {module === "activity-logs" && <AdminActivityLogs />}
      {module === "system-settings" && <SystemHealthPanel />}
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

function AdminUsersReal() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/roles"),
      ]);
      const nextUsers = usersResponse.data || [];
      setUsers(nextUsers);
      setRoles(rolesResponse.data || []);
      setRoleDrafts(Object.fromEntries(nextUsers.map((user) => [user.user_id, user.roles?.length ? user.roles : [user.role].filter(Boolean)])));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => [user.name, user.email, user.role, ...(user.roles || [])].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [search, users]);

  const roleLabel = (roleName) => roles.find((role) => role.name === roleName)?.label || roleName;

  const toggleRole = (userId, roleName) => {
    setRoleDrafts((drafts) => {
      const current = new Set(drafts[userId] || []);
      if (current.has(roleName)) current.delete(roleName);
      else current.add(roleName);
      if (current.size === 0) current.add("alumno");
      return { ...drafts, [userId]: Array.from(current) };
    });
  };

  const saveRoles = async (user) => {
    try {
      await api.patch(`/admin/users/${user.user_id}/roles`, { roles: roleDrafts[user.user_id] || [user.role] });
      toast.success(`Roles updated for ${user.name || user.email}.`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update roles.");
    }
  };

  const updateActive = async (user, active) => {
    try {
      await api.patch(`/admin/users/${user.user_id}`, { active });
      toast.success(active ? "User activated." : "User deactivated.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update user.");
    }
  };

  const openUser = async (user) => {
    setSelectedUser(user);
    setAuditEvents([]);
    setLoginHistory([]);
    try {
      const [auditResponse, loginResponse] = await Promise.all([
        api.get(`/admin/users/${user.user_id}/audit-events`),
        api.get(`/admin/users/${user.user_id}/login-history`),
      ]);
      setAuditEvents(auditResponse.data || []);
      setLoginHistory(loginResponse.data || []);
    } catch {
      toast.error("Could not load user history.");
    }
  };

  const counts = {
    total: users.length,
    active: users.filter((user) => user.active !== false).length,
    admins: users.filter((user) => (user.roles || [user.role]).some((role) => role === "administrador_sitio" || role === "administrador_profesor")).length,
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Users in database" value={counts.total} detail="Synced from auth and local accounts" icon={Users} />
        <MetricCard label="Active users" value={counts.active} detail="Can access the platform" icon={UserCheck} color="#2DA89F" />
        <MetricCard label="Admin users" value={counts.admins} detail="Administrative or technical roles" icon={ShieldCheck} color="#8B5BB8" />
      </div>

      <Card>
        <SectionHeader eyebrow="People and roles" title="Manage real users from the database" action={<Button onClick={load} variant="outline" className="border-[#EFE4D0]">Refresh</Button>} />
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-96">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6680]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or role" className="w-full rounded-md border border-[#EFE4D0] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
          </div>
          <p className="text-sm text-[#5C6680]">{filteredUsers.length} visible</p>
        </div>

        {loading ? (
          <p className="mt-5 rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">Loading users...</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">
                <tr className="border-b border-[#EFE4D0]">
                  <th className="py-3 pr-4">User</th>
                  <th className="px-4 py-3">Primary role</th>
                  <th className="px-4 py-3">Assigned roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D0] text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        {user.picture ? <img src={user.picture} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E6] font-display text-[#E8704C]">{user.name?.[0] || "?"}</div>}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{user.name || "Unnamed user"}</p>
                          <p className="truncate text-xs text-[#5C6680]">{user.email}</p>
                          <p className="truncate text-xs text-[#5C6680]">{user.profile_type || "client"} - {user.auth_provider || "auth"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className="rounded-md bg-[#FBF7EE] px-3 py-1 text-sm text-[#1F3B6E]">{roleLabel(user.role)}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-md flex-wrap gap-2">
                        {roles.map((role) => (
                          <label key={`${user.user_id}-${role.name}`} className={`rounded-md border px-3 py-1 text-xs ${roleDrafts[user.user_id]?.includes(role.name) ? "border-[#2DA89F] bg-[#E0F2F0] text-[#2DA89F]" : "border-[#EFE4D0] bg-white text-[#5C6680]"}`}>
                            <input type="checkbox" checked={!!roleDrafts[user.user_id]?.includes(role.name)} onChange={() => toggleRole(user.user_id, role.name)} className="mr-2 accent-[#2DA89F]" />
                            {role.label || role.name}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={user.active !== false} onChange={(event) => updateActive(user, event.target.checked)} className="h-4 w-4 accent-[#2DA89F]" />
                        {user.active !== false ? "Active" : "Inactive"}
                      </label>
                    </td>
                    <td className="px-4 py-4 text-[#5C6680]">{user.booking_count || 0}</td>
                    <td className="py-4 pl-4">
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => saveRoles(user)} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save roles</Button>
                        <Button onClick={() => openUser(user)} variant="outline" className="border-[#EFE4D0]">History</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <p className="py-8 text-center text-sm text-[#5C6680]">No users match your search.</p>}
          </div>
        )}
      </Card>

      {selectedUser && (
        <Card>
          <SectionHeader eyebrow="User history" title={`${selectedUser.name || selectedUser.email}`} action={<Button onClick={() => setSelectedUser(null)} variant="outline">Close</Button>} />
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold">Audit events</h3>
              <div className="mt-3 grid max-h-96 gap-3 overflow-y-auto pr-1">
                {auditEvents.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No audit events yet.</p>}
                {auditEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border border-[#EFE4D0] p-4">
                    <p className="font-semibold">{event.event_type}</p>
                    <p className="text-sm text-[#5C6680]">{event.entity_type} {event.entity_id ? `- ${event.entity_id}` : ""}</p>
                    <p className="mt-1 text-xs text-[#5C6680]">{event.created_at}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Login history</h3>
              <div className="mt-3 grid max-h-96 gap-3 overflow-y-auto pr-1">
                {loginHistory.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No login history yet.</p>}
                {loginHistory.map((login) => (
                  <div key={login.id} className="rounded-lg border border-[#EFE4D0] p-4">
                    <p className="font-semibold">{login.provider}</p>
                    <p className="text-sm text-[#5C6680]">{login.email}</p>
                    <p className="mt-1 text-xs text-[#5C6680]">{login.created_at}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function AdminCredits() {
  const [schoolPool] = useState(1840);
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
            disabled
            title="Administrative credit grants require a persisted credit ledger and audit event before production use."
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

const atlasTabs = ["Volumes", "Master Index", "Decision Log", "Glossary", "Reviews", "Audit Trail", "Settings"];
const statusTone = {
  draft: "bg-[#EEF4FF] text-[#1F3B6E]",
  review: "bg-[#FFF7E6] text-[#B76E00]",
  approved: "bg-[#E7F7F3] text-[#08746D]",
  deprecated: "bg-[#F2F4F7] text-[#5C6680]",
  proposed: "bg-[#EEF4FF] text-[#1F3B6E]",
  rejected: "bg-[#FFE7E2] text-[#B42318]",
};

function AtlasBadge({ value }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusTone[value] || "bg-[#FBF7EE] text-[#5C6680]"}`}>{value || "draft"}</span>;
}

function AtlasField({ label, children }) {
  return <label className="block"><span className="text-sm font-semibold text-[#1F3B6E]">{label}</span><div className="mt-2">{children}</div></label>;
}

function AtlasModal({ title, children, onClose, onSubmit, loading, submitLabel = "Save" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F3B6E]/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-[#1F3B6E]">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-md px-2 py-1 text-[#5C6680] hover:bg-[#FBF7EE]">x</button>
        </div>
        <div className="mt-5 grid gap-4">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={loading} onClick={onSubmit} className="bg-[#E8704C] text-white disabled:opacity-50">{loading ? "Saving..." : submitLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function MosaicoAtlas() {
  const { user } = useApp();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Volumes");
  const [filters, setFilters] = useState({ q: "", status: "all", visibility: "all", priority: "all" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const canManage = hasPermission(user, "atlas.manage", 5);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/atlas");
      setData(res.data);
    } catch (err) {
      setError(err.appError?.message || "Could not load Mosaico Atlas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const volumes = useMemo(() => {
    const needle = filters.q.toLowerCase();
    return (data?.volumes || []).filter((volume) => {
      const haystack = `${volume.title} ${volume.description} ${(volume.tags || []).join(" ")}`.toLowerCase();
      return (!needle || haystack.includes(needle)) &&
        (filters.status === "all" || volume.status === filters.status) &&
        (filters.visibility === "all" || volume.visibility === filters.visibility) &&
        (filters.priority === "all" || volume.priority === filters.priority);
    });
  }, [data, filters]);

  const openModal = (type, initial = {}) => {
    setForm(initial);
    setModal(type);
  };

  const saveVolume = async () => {
    if (!form.title?.trim()) return toast.error("Title is required.");
    setSaving(true);
    try {
      const payload = { ...form, tags: String(form.tags || "").split(",").map((item) => item.trim()).filter(Boolean), createDraft: true };
      if (form.id && modal === "editVolume") {
        await api.patch(`/admin/atlas/volumes/${form.id}`, payload);
        toast.success("Atlas volume updated.");
      } else {
        const { id, slug, current_version, approved_at, deprecated_at, created_at, updated_at, ...createPayload } = payload;
        await api.post("/admin/atlas/volumes", createPayload);
        toast.success("Atlas volume created.");
      }
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.appError?.message || "Could not save volume.");
    } finally {
      setSaving(false);
    }
  };

  const saveDecision = async () => {
    if (!form.title?.trim()) return toast.error("Decision title is required.");
    setSaving(true);
    try {
      await api.post("/admin/atlas/decisions", form);
      toast.success("Decision saved.");
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.appError?.message || "Could not save decision.");
    } finally {
      setSaving(false);
    }
  };

  const saveGlossary = async () => {
    if (!form.term?.trim()) return toast.error("Term is required.");
    setSaving(true);
    try {
      await api.post("/admin/atlas/glossary", form);
      toast.success("Glossary term saved.");
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.appError?.message || "Could not save glossary term.");
    } finally {
      setSaving(false);
    }
  };

  const workflow = async (volume, action, confirmCritical = false) => {
    setSaving(true);
    try {
      await api.post(`/admin/atlas/volumes/${volume.id}/workflow`, { action, confirmCritical, critical: action === "approve" });
      toast.success(`Atlas volume ${action.replace("_", " ")} complete.`);
      await load();
    } catch (err) {
      toast.error(err.appError?.message || "Could not update workflow.");
    } finally {
      setSaving(false);
    }
  };

  const newVersion = async (volume) => {
    setSaving(true);
    try {
      await api.post(`/admin/atlas/volumes/${volume.id}/versions`, { version_type: "minor", change_summary: "New draft version from Atlas UI." });
      toast.success("New draft version created.");
      await load();
    } catch (err) {
      toast.error(err.appError?.message || "Could not create version.");
    } finally {
      setSaving(false);
    }
  };

  const exportAtlas = async (format = "json") => {
    try {
      const res = await api.get("/admin/atlas/export", { params: { format }, responseType: format === "markdown" ? "text" : "json" });
      const content = format === "markdown" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([content], { type: format === "markdown" ? "text/markdown" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mosaico-atlas.${format === "markdown" ? "md" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Atlas export prepared.");
    } catch (err) {
      toast.error(err.appError?.message || "Could not export Atlas.");
    }
  };

  if (loading) return <Card><div className="h-40 animate-pulse rounded-lg bg-[#FBF7EE]" /><p className="mt-3 text-sm text-[#5C6680]">Loading Mosaico Atlas...</p></Card>;
  if (error) return <Card><p className="text-sm text-[#B42318]" role="alert">{error}</p><Button onClick={load} className="mt-4">Retry</Button></Card>;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Super Admin System</p>
            <h2 className="mt-2 font-display text-3xl text-[#1F3B6E]">Mosaico Atlas</h2>
            <p className="mt-2 max-w-3xl text-sm text-[#5C6680]">Version-controlled operating documentation for the Mosaico company and platform.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canManage} onClick={() => openModal("volume", { visibility: "internal", priority: "medium" })} className="bg-[#E8704C] text-white disabled:opacity-50">New Volume</Button>
            <Button disabled={!canManage} onClick={() => openModal("decision", { decision_type: "product", status: "proposed" })} variant="outline">New Decision</Button>
            <Button disabled={!hasPermission(user, "atlas.export", 4)} onClick={() => exportAtlas("json")} variant="outline">Export Atlas</Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_repeat(3,160px)]">
          <input aria-label="Search Atlas" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search volumes, tags, decisions, glossary" className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
          <select aria-label="Status filter" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm"><option value="all">All status</option><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="deprecated">Deprecated</option></select>
          <select aria-label="Visibility filter" value={filters.visibility} onChange={(e) => setFilters({ ...filters, visibility: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm"><option value="all">All visibility</option><option value="super_admin_only">Super Admin</option><option value="internal">Internal</option><option value="investor_ready">Investor</option><option value="public_ready">Public</option></select>
          <select aria-label="Priority filter" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm"><option value="all">All priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        {Object.entries(data?.metrics || {}).map(([key, value]) => <MetricCard key={key} label={key.replaceAll("_", " ")} value={value} icon={BookOpen} color={key.includes("approved") ? "#2DA89F" : "#E8704C"} />)}
      </div>

      <Card>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {atlasTabs.map((tab) => <Button key={tab} onClick={() => setActiveTab(tab)} variant={activeTab === tab ? "default" : "outline"} className={activeTab === tab ? "bg-[#1F3B6E] text-white" : "border-[#EFE4D0]"}>{tab}</Button>)}
        </div>

        {activeTab === "Volumes" && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {volumes.map((volume) => (
              <div key={volume.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5C6680]">Volume {String(volume.number).padStart(2, "0")}</p>
                    <h3 className="mt-1 font-display text-xl text-[#1F3B6E]">{volume.title}</h3>
                    <p className="mt-2 text-sm text-[#5C6680]">{volume.description}</p>
                  </div>
                  <AtlasBadge value={volume.status} />
                </div>
                <div className="mt-4 grid gap-2 text-xs text-[#5C6680] sm:grid-cols-3">
                  <span>v{volume.current_version}</span><span>{volume.owner_role}</span><span>{volume.visibility}</span><span>{volume.estimated_pages} pages</span><span>{volume.priority}</span><span>{volume.updated_at?.slice(0, 10)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{(volume.tags || []).map((tag) => <span key={tag} className="rounded-md bg-[#FBF7EE] px-2 py-1 text-xs text-[#1F3B6E]">{tag}</span>)}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/admin/atlas/volumes/${volume.slug}`}><Button size="sm" className="bg-[#1F3B6E] text-white">Open</Button></Link>
                  <Button size="sm" variant="outline" disabled={!canManage} onClick={() => openModal("editVolume", { ...volume, tags: (volume.tags || []).join(", ") })}>Edit</Button>
                  <Button size="sm" variant="outline" disabled={!canManage} onClick={() => openModal("volume", { ...volume, id: undefined, slug: undefined, number: undefined, title: `${volume.title} Copy`, tags: (volume.tags || []).join(", ") })}>Duplicate</Button>
                  <Button size="sm" variant="outline" disabled={!canManage || saving} onClick={() => newVersion(volume)}>New version</Button>
                  <Button size="sm" variant="outline" disabled={!canManage || saving} onClick={() => workflow(volume, "send_review")}>Send to review</Button>
                  <Button size="sm" variant="outline" disabled={!hasPermission(user, "atlas.approve", 5) || saving} onClick={() => workflow(volume, "approve", true)}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={!hasPermission(user, "atlas.approve", 5) || saving} onClick={() => workflow(volume, "deprecate")}>Deprecate</Button>
                </div>
              </div>
            ))}
            {volumes.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-5 text-sm text-[#5C6680]">No Atlas volumes match these filters.</p>}
          </div>
        )}

        {activeTab === "Master Index" && <div className="mt-5 grid gap-3">{(data?.volumes || []).map((volume) => <Link key={volume.id} to={`/admin/atlas/volumes/${volume.slug}`} className="rounded-lg border border-[#EFE4D0] p-3 text-sm font-semibold text-[#1F3B6E] hover:bg-[#FBF7EE]">Volume {String(volume.number).padStart(2, "0")} - {volume.title}</Link>)}</div>}

        {activeTab === "Decision Log" && <AtlasList title="Decision Log" items={data?.decisions || []} empty="No decisions yet." render={(item) => <><div><p className="font-semibold text-[#1F3B6E]">{item.title}</p><p className="text-sm text-[#5C6680]">{item.decision || item.context}</p></div><AtlasBadge value={item.status} /></>} action={canManage && <Button onClick={() => openModal("decision", { decision_type: "product", status: "proposed" })}>New Decision</Button>} />}
        {activeTab === "Glossary" && <AtlasList title="Glossary" items={data?.glossary || []} empty="No glossary terms yet." render={(item) => <><div><p className="font-semibold text-[#1F3B6E]">{item.term}</p><p className="text-sm text-[#5C6680]">{item.definition}</p></div><Button size="sm" disabled={!canManage} onClick={() => openModal("glossary", item)} variant="outline">Edit</Button></>} action={canManage && <Button onClick={() => openModal("glossary", {})}>New Term</Button>} />}
        {activeTab === "Reviews" && <AtlasList title="Reviews" items={data?.reviews || []} empty="No pending reviews." render={(item) => <><div><p className="font-semibold text-[#1F3B6E]">{item.volume_id}</p><p className="text-sm text-[#5C6680]">{item.comments || "Review requested"}</p></div><AtlasBadge value={item.status} /></>} />}
        {activeTab === "Audit Trail" && <div className="mt-5"><ActivityTimeline items={(data?.audit || []).map((item) => ({ ...item, summary: item.action }))} emptyText="No Atlas audit events yet." /></div>}
        {activeTab === "Settings" && <AtlasSettings settings={data?.settings} canManage={canManage} onSaved={load} />}
      </Card>

      {(modal === "volume" || modal === "editVolume") && (
        <AtlasModal title={modal === "editVolume" ? "Edit Atlas Volume" : "New Atlas Volume"} onClose={() => setModal(null)} onSubmit={saveVolume} loading={saving}>
          <AtlasField label="Title"><input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
          <AtlasField label="Description"><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-md border border-[#EFE4D0] p-3" /></AtlasField>
          <div className="grid gap-4 md:grid-cols-3">
            <AtlasField label="Visibility"><select value={form.visibility || "internal"} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3"><option value="super_admin_only">Super Admin</option><option value="internal">Internal</option><option value="investor_ready">Investor ready</option><option value="public_ready">Public ready</option></select></AtlasField>
            <AtlasField label="Priority"><select value={form.priority || "medium"} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></AtlasField>
            <AtlasField label="Tags"><input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" placeholder="product, strategy" /></AtlasField>
          </div>
        </AtlasModal>
      )}
      {modal === "decision" && (
        <AtlasModal title="Atlas Decision" onClose={() => setModal(null)} onSubmit={saveDecision} loading={saving}>
          <AtlasField label="Title"><input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
          <div className="grid gap-4 md:grid-cols-2">
            <AtlasField label="Type"><select value={form.decision_type || "product"} onChange={(e) => setForm({ ...form, decision_type: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3"><option value="product">Product</option><option value="technical">Technical</option><option value="business">Business</option><option value="security">Security</option><option value="UX">UX</option><option value="operations">Operations</option><option value="finance">Finance</option><option value="GTM">GTM</option></select></AtlasField>
            <AtlasField label="Status"><select value={form.status || "proposed"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3"><option value="proposed">Proposed</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="superseded">Superseded</option></select></AtlasField>
          </div>
          <AtlasField label="Context"><textarea value={form.context || ""} onChange={(e) => setForm({ ...form, context: e.target.value })} className="min-h-20 w-full rounded-md border border-[#EFE4D0] p-3" /></AtlasField>
          <AtlasField label="Decision"><textarea value={form.decision || ""} onChange={(e) => setForm({ ...form, decision: e.target.value })} className="min-h-20 w-full rounded-md border border-[#EFE4D0] p-3" /></AtlasField>
        </AtlasModal>
      )}
      {modal === "glossary" && (
        <AtlasModal title="Glossary Term" onClose={() => setModal(null)} onSubmit={saveGlossary} loading={saving}>
          <AtlasField label="Term"><input value={form.term || ""} onChange={(e) => setForm({ ...form, term: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
          <AtlasField label="Definition"><textarea value={form.definition || ""} onChange={(e) => setForm({ ...form, definition: e.target.value })} className="min-h-24 w-full rounded-md border border-[#EFE4D0] p-3" /></AtlasField>
        </AtlasModal>
      )}
    </div>
  );
}

function AtlasList({ title, items, empty, render, action }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl text-[#1F3B6E]">{title}</h3>{action}</div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#EFE4D0] p-4">{render(item)}</div>)}
        {items.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">{empty}</p>}
      </div>
    </div>
  );
}

function AtlasSettings({ settings = {}, canManage, onSaved }) {
  const [draft, setDraft] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/admin/atlas/settings", draft);
      toast.success("Atlas settings saved.");
      await onSaved();
    } catch (err) {
      toast.error(err.appError?.message || "Could not save Atlas settings.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <AtlasField label="Default visibility"><select disabled={!canManage} value={draft.default_visibility || "internal"} onChange={(e) => setDraft({ ...draft, default_visibility: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3"><option value="super_admin_only">Super Admin</option><option value="internal">Internal</option><option value="investor_ready">Investor ready</option><option value="public_ready">Public ready</option></select></AtlasField>
      <AtlasField label="Required approvers"><input disabled={!canManage} type="number" value={draft.required_approvers || 1} onChange={(e) => setDraft({ ...draft, required_approvers: Number(e.target.value) })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
      <AtlasField label="Versioning policy"><input disabled={!canManage} value={draft.versioning_policy || "semantic"} onChange={(e) => setDraft({ ...draft, versioning_policy: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
      <AtlasField label="Export formats"><input disabled={!canManage} value={(draft.export_formats_enabled || ["markdown", "json"]).join(", ")} onChange={(e) => setDraft({ ...draft, export_formats_enabled: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
      <div className="md:col-span-2 flex justify-end"><Button disabled={!canManage || saving} onClick={save} className="bg-[#E8704C] text-white disabled:opacity-50">{saving ? "Saving..." : "Save settings"}</Button></div>
    </div>
  );
}

function MarkdownPreview({ content }) {
  const lines = String(content || "No content yet.").split("\n");
  return (
    <div className="space-y-2 rounded-lg bg-[#FBF7EE] p-4 text-sm leading-6 text-[#1F3B6E]">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) return <h4 key={index} className="font-display text-lg">{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={index} className="font-display text-xl">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={index} className="font-display text-2xl">{line.slice(2)}</h2>;
        if (line.startsWith("- ")) return <p key={index} className="pl-4">- {line.slice(2)}</p>;
        if (!line.trim()) return <div key={index} className="h-1" />;
        return <p key={index}>{line.replaceAll("**", "")}</p>;
      })}
    </div>
  );
}

function MosaicoAtlasVolumeDetail() {
  const { slug } = useParams();
  const { user } = useApp();
  const [volume, setVolume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const canEdit = hasPermission(user, "atlas.edit", 5);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/admin/atlas/volumes/${slug}`);
      setVolume(res.data);
    } catch (err) {
      setError(err.appError?.message || "Could not load Atlas volume.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const saveSection = async () => {
    if (!form.title?.trim()) return toast.error("Section title is required.");
    setSaving(true);
    try {
      await api.post("/admin/atlas/sections", { ...form, volume_id: volume.id });
      toast.success("Section saved.");
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.appError?.message || "Could not save section.");
    } finally {
      setSaving(false);
    }
  };

  const exportVolume = async (format) => {
    try {
      const res = await api.get("/admin/atlas/export", { params: { format, volume_id: volume.id }, responseType: format === "markdown" ? "text" : "json" });
      const content = format === "markdown" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([content], { type: format === "markdown" ? "text/markdown" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${volume.slug}.${format === "markdown" ? "md" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Volume export prepared.");
    } catch (err) {
      toast.error(err.appError?.message || "Could not export volume.");
    }
  };

  if (loading) return <Card><div className="h-40 animate-pulse rounded-lg bg-[#FBF7EE]" /></Card>;
  if (error) return <Card><p className="text-sm text-[#B42318]" role="alert">{error}</p><Button onClick={load} className="mt-4">Retry</Button></Card>;
  if (!volume) return <Card><p>No volume found.</p></Card>;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/admin/atlas" className="text-sm font-semibold text-[#E8704C]">Back to Atlas</Link>
            <h2 className="mt-2 font-display text-3xl text-[#1F3B6E]">Volume {String(volume.number).padStart(2, "0")} - {volume.title}</h2>
            <p className="mt-2 text-sm text-[#5C6680]">{volume.description}</p>
            <div className="mt-3 flex flex-wrap gap-2"><AtlasBadge value={volume.status} /><span className="rounded-md bg-[#FBF7EE] px-2 py-1 text-xs">v{volume.current_version}</span><span className="rounded-md bg-[#FBF7EE] px-2 py-1 text-xs">{volume.visibility}</span></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canEdit} onClick={() => { setForm({ status: "draft", order_index: (volume.sections || []).length + 1 }); setModal("section"); }} className="bg-[#E8704C] text-white disabled:opacity-50">Add Section</Button>
            <Button variant="outline" onClick={() => exportVolume("markdown")}>Export Markdown</Button>
            <Button variant="outline" onClick={() => exportVolume("json")}>Export JSON</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[260px_1fr_320px]">
        <Card>
          <h3 className="font-display text-xl text-[#1F3B6E]">Table of contents</h3>
          <div className="mt-4 grid gap-2">{(volume.sections || []).map((section) => <a key={section.id} href={`#${section.slug}`} className="rounded-md px-2 py-1 text-sm text-[#1F3B6E] hover:bg-[#FBF7EE]">{section.title}</a>)}</div>
          <h3 className="mt-6 font-display text-lg text-[#1F3B6E]">Linked volumes</h3>
          <p className="mt-2 text-sm text-[#5C6680]">{(volume.linked_volume_ids || []).length || 0} linked volumes</p>
        </Card>
        <div className="space-y-4">
          {(volume.sections || []).map((section) => (
            <Card key={section.id} id={section.slug}>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-display text-2xl text-[#1F3B6E]">{section.title}</h3><p className="mt-1 text-sm text-[#5C6680]">{section.summary}</p></div>
                <Button variant="outline" disabled={!canEdit || volume.status === "approved"} onClick={() => { setForm(section); setModal("section"); }}>Edit</Button>
              </div>
              <div className="mt-4"><MarkdownPreview content={section.content_markdown} /></div>
            </Card>
          ))}
          {(volume.sections || []).length === 0 && <Card><p className="text-sm text-[#5C6680]">No sections yet. Add the first section to start this volume.</p></Card>}
        </div>
        <div className="space-y-5">
          <Card><h3 className="font-display text-xl text-[#1F3B6E]">Metadata</h3><div className="mt-3 grid gap-2 text-sm text-[#5C6680]"><p>Owner: {volume.owner_role}</p><p>Priority: {volume.priority}</p><p>Estimated pages: {volume.estimated_pages}</p><p>Updated: {volume.updated_at}</p></div></Card>
          <Card><h3 className="font-display text-xl text-[#1F3B6E]">Version history</h3><div className="mt-3 grid gap-2">{(volume.versions || []).map((version) => <div key={version.id} className="rounded-md bg-[#FBF7EE] p-3 text-sm"><p className="font-semibold">v{version.version}</p><p className="text-[#5C6680]">{version.change_summary}</p></div>)}</div></Card>
          <Card><h3 className="font-display text-xl text-[#1F3B6E]">Audit summary</h3><ActivityTimeline items={(volume.audit || []).slice(0, 5).map((item) => ({ ...item, summary: item.action }))} emptyText="No audit events yet." /></Card>
        </div>
      </div>

      {modal === "section" && (
        <AtlasModal title="Atlas Section" onClose={() => setModal(null)} onSubmit={saveSection} loading={saving}>
          <AtlasField label="Title"><input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
          <div className="grid gap-4 md:grid-cols-2">
            <AtlasField label="Status"><select value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3"><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="deprecated">Deprecated</option></select></AtlasField>
            <AtlasField label="Order"><input type="number" value={form.order_index || 0} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3" /></AtlasField>
          </div>
          <AtlasField label="Summary"><textarea value={form.summary || ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="min-h-20 w-full rounded-md border border-[#EFE4D0] p-3" /></AtlasField>
          <AtlasField label="Markdown content"><textarea value={form.content_markdown || ""} onChange={(e) => setForm({ ...form, content_markdown: e.target.value })} className="min-h-56 w-full rounded-md border border-[#EFE4D0] p-3 font-mono text-sm" /></AtlasField>
        </AtlasModal>
      )}
    </div>
  );
}

const analyticsMetricLabels = {
  active_users: "Active users",
  classes_booked: "Classes booked",
  classes_completed: "Classes completed",
  cancellation_rate: "Cancellation rate",
  no_show_rate: "No-show rate",
  credits_purchased: "Credits purchased",
  credits_used: "Credits used",
  teacher_utilization: "Teacher utilization",
  student_engagement: "Student engagement",
  empty_slots: "Empty slots",
  booking_conversion: "Booking conversion",
};

function AdminAnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ date_from: "", date_to: "", role: "all", status: "all", module: "all" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== "all"));
      const res = await api.get("/admin/analytics/overview", { params });
      setData(res.data);
    } catch (err) {
      setError(err.appError?.message || err.response?.data?.detail || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader eyebrow="Product analytics" title="Platform Analytics" action={<Button onClick={load} disabled={loading} variant="outline" className="border-[#EFE4D0]">{loading ? "Refreshing..." : "Refresh"}</Button>} />
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <input aria-label="Date from" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
          <input aria-label="Date to" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
          <select aria-label="Role filter" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">
            <option value="all">All roles</option>
            <option value="alumno">Student</option>
            <option value="tutor_padre">Tutor / Parent</option>
            <option value="profesor">Teacher</option>
            <option value="administrador_profesor">Admin</option>
          </select>
          <select aria-label="Status filter" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
          <select aria-label="Module filter" value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">
            <option value="all">All modules</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="booking">Booking</option>
            <option value="credits">Credits</option>
            <option value="rbac">RBAC</option>
            <option value="settings">Settings</option>
          </select>
        </div>
        {error && <p className="mt-4 rounded-lg bg-[#FFE7E2] p-4 text-sm text-[#B42318]" role="alert">{error}</p>}
      </Card>

      {loading && <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-white" />)}</div>}

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(analyticsMetricLabels).map(([key, label]) => (
              <MetricCard key={key} label={label} value={`${metrics[key] ?? 0}${key.includes("rate") || key.includes("utilization") || key.includes("engagement") || key.includes("conversion") ? "%" : ""}`} detail="Current filter window" icon={LineChart} color={key.includes("rate") ? "#E8704C" : "#2DA89F"} />
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="font-display text-xl text-[#1F3B6E]">Feature usage</h3>
              <div className="mt-4 space-y-3">
                {(data?.feature_usage || []).slice(0, 8).map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-[#FBF7EE] px-3 py-2 text-sm">
                    <span className="font-semibold text-[#1F3B6E]">{item.name}</span>
                    <span className="text-[#5C6680]">{item.count}</span>
                  </div>
                ))}
                {(data?.feature_usage || []).length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No analytics events match these filters.</p>}
              </div>
            </Card>

            <Card>
              <h3 className="font-display text-xl text-[#1F3B6E]">Top teachers</h3>
              <div className="mt-4 space-y-3">
                {(data?.top_teachers || []).map((teacher) => (
                  <div key={teacher.teacher_id} className="flex items-center justify-between rounded-lg border border-[#EFE4D0] px-3 py-2 text-sm">
                    <span className="font-semibold text-[#1F3B6E]">{teacher.teacher_name}</span>
                    <span className="text-[#5C6680]">{teacher.classes} classes · {teacher.completed} completed</span>
                  </div>
                ))}
                {(data?.top_teachers || []).length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No teacher activity yet.</p>}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="font-display text-xl text-[#1F3B6E]">Students with unused credits</h3>
              <div className="mt-4 space-y-3">
                {(data?.students_with_unused_credits || []).map((student) => (
                  <div key={student.user_id} className="flex items-center justify-between rounded-lg bg-[#FBF7EE] px-3 py-2 text-sm">
                    <span className="font-semibold text-[#1F3B6E]">{student.name || student.email}</span>
                    <span className="text-[#5C6680]">{student.estimated_unused_credits} credits</span>
                  </div>
                ))}
                {(data?.students_with_unused_credits || []).length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No unused credit balances detected.</p>}
              </div>
            </Card>

            <Card>
              <h3 className="font-display text-xl text-[#1F3B6E]">Recent activity</h3>
              <div className="mt-4">
                <ActivityTimeline items={data?.recent_activity || []} emptyText="No recent activity recorded." />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
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

function AdminRolesAccess() {
  const [selectedRole, setSelectedRole] = useState(rbacRoles[1].id);
  const [selectedUser, setSelectedUser] = useState(rbacUsers[0].id);
  const activeRole = rbacRoles.find((role) => role.id === selectedRole) || rbacRoles[0];
  const activeUser = rbacUsers.find((user) => user.id === selectedUser) || rbacUsers[0];
  const permissionLookup = useMemo(() => {
    const entries = rbacCatalogs.flatMap((catalog) => catalog.permissions.map((permission) => [permission.key, { ...permission, catalog: catalog.name }]));
    return Object.fromEntries(entries);
  }, []);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-5">
        {rbacPermissionLevels.map((item) => (
          <div key={item.level} className="rounded-lg border border-[#EFE4D0] bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">Level {item.level}</p>
            <p className="mt-2 font-semibold">{item.label}</p>
            <p className="mt-1 text-sm text-[#5C6680]">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <SectionHeader eyebrow="Role catalog" title="Roles can hold many permission levels" />
          <label className="mt-4 block text-sm font-semibold">Role</label>
          <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="mt-2 w-full rounded-md border border-[#EFE4D0] px-3 py-2 outline-none focus:ring-2 focus:ring-[#E8704C]">
            {rbacRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
          <div className="mt-5 rounded-lg bg-[#FBF7EE] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{activeRole.label}</p>
                <p className="text-sm text-[#5C6680]">{activeRole.id}</p>
              </div>
              <span className="rounded-md bg-[#E0F2F0] px-3 py-1 text-sm text-[#2DA89F]">Level {activeRole.level}</span>
            </div>
            <div className="mt-4 grid gap-2">
              {activeRole.permissions.map((permissionKey) => {
                const permission = permissionLookup[permissionKey] || { feature: permissionKey, action: "Configured access", level: 1, catalog: "Custom" };
                return (
                  <div key={permissionKey} className="flex flex-col justify-between gap-2 rounded-md bg-white px-3 py-2 md:flex-row md:items-center">
                    <div>
                      <p className="font-medium">{permission.feature}</p>
                      <p className="text-sm text-[#5C6680]">{permission.action} - {permission.catalog}</p>
                    </div>
                    <span className="rounded-md bg-[#FFF0E6] px-3 py-1 text-sm text-[#E8704C]">L{permission.level}</span>
                  </div>
                );
              })}
            </div>
            <ActionButton doneText={`${activeRole.label} permissions saved.`} className="mt-4 bg-[#E8704C] text-white hover:bg-[#C95630]">Save role permissions</ActionButton>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Permission catalog" title="Functionality access by feature" />
          <div className="mt-5 grid gap-4">
            {rbacCatalogs.map((catalog) => (
              <div key={catalog.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <p className="font-semibold">{catalog.name}</p>
                <div className="mt-3 grid gap-2">
                  {catalog.permissions.map((permission) => (
                    <div key={permission.key} className="grid gap-2 rounded-md bg-[#FBF7EE] p-3 md:grid-cols-[0.8fr_1fr_auto] md:items-center">
                      <p className="font-medium">{permission.feature}</p>
                      <p className="text-sm text-[#5C6680]">{permission.action}</p>
                      <span className="w-fit rounded-md bg-white px-3 py-1 text-sm text-[#5C6680]">Level {permission.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Multi-role users" title="One person can inherit access from multiple roles" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <label className="block text-sm font-semibold">User</label>
            <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} className="mt-2 w-full rounded-md border border-[#EFE4D0] px-3 py-2 outline-none focus:ring-2 focus:ring-[#E8704C]">
              {rbacUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <div className="mt-4 rounded-lg bg-[#FBF7EE] p-4">
              <p className="font-semibold">{activeUser.name}</p>
              <p className="text-sm text-[#5C6680]">{activeUser.profile}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeUser.roles.map((roleId) => {
                  const role = rbacRoles.find((item) => item.id === roleId);
                  return <span key={roleId} className="rounded-md bg-white px-3 py-1 text-sm text-[#5C6680]">{role?.label || roleId}</span>;
                })}
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {rbacRoles.map((role) => (
              <label key={`${activeUser.id}-${role.id}`} className="flex items-start gap-3 rounded-lg border border-[#EFE4D0] p-4">
                <input type="checkbox" defaultChecked={activeUser.roles.includes(role.id)} className="mt-1 h-4 w-4 accent-[#E8704C]" />
                <span>
                  <span className="block font-semibold">{role.label}</span>
                  <span className="text-sm text-[#5C6680]">Level {role.level} - {role.permissions.length} permissions</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <ActionButton doneText={`${activeUser.name} roles updated.`} className="mt-5 bg-[#2DA89F] text-white hover:bg-[#23877f]">Save user roles</ActionButton>
      </Card>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel = "Confirm", onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#10213F]/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#FFF0E6] p-2 text-[#E8704C]"><AlertTriangle size={20} /></div>
          <div>
            <h2 className="font-display text-2xl text-[#1F3B6E]">{title}</h2>
            <p className="mt-2 text-sm text-[#5C6680]">{body}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-[#E8704C] text-white hover:bg-[#C95630]">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

const configSections = [
  ["general", "General platform"],
  ["feature_flags", "Feature flags"],
  ["booking_rules", "Booking rules"],
  ["credit_rules", "Credit rules"],
  ["cancellation_policy", "Cancellation policy"],
  ["teacher_availability_rules", "Teacher availability"],
  ["student_scheduling_rules", "Student scheduling"],
  ["notification_settings", "Notifications"],
  ["role_defaults", "Role defaults"],
];

function parseConfigValue(value, raw) {
  if (Array.isArray(value)) return raw.split(",").map((item) => Number(item.trim())).filter((item) => !Number.isNaN(item));
  if (typeof value === "number") return Number(raw);
  if (typeof value === "boolean") return raw === true || raw === "true";
  return raw;
}

function SuperAdminConfigurationCenter() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, healthRes] = await Promise.all([
        api.get("/admin/configuration/settings"),
        api.get("/admin/system-health"),
      ]);
      setData(settingsRes.data);
      setDraft(settingsRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load platform configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateConfig = (section, key, value) => {
    setDraft((current) => ({
      ...current,
      platform_config: {
        ...current.platform_config,
        [section]: { ...current.platform_config[section], [key]: value },
      },
    }));
  };

  const updateBranding = (key, value) => {
    setDraft((current) => ({ ...current, public_branding: { ...current.public_branding, [key]: value } }));
  };

  const validate = () => {
    const config = draft?.platform_config || {};
    if (!config.general?.platform_name?.trim()) return "Platform name is required.";
    if (Number(config.booking_rules?.max_days_ahead || 0) < 1) return "Max days ahead must be at least 1.";
    if (!config.teacher_availability_rules?.allowed_durations?.length) return "At least one class duration is required.";
    return "";
  };

  const persist = async () => {
    const validation = validate();
    if (validation) {
      toast.error(validation);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch("/admin/configuration/settings", draft);
      setData(res.data);
      setDraft(res.data);
      toast.success("Platform configuration saved.");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save configuration.");
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  if (loading) return <Card><div className="h-40 animate-pulse rounded-lg bg-[#FBF7EE]" /><p className="mt-3 text-sm text-[#5C6680]">Loading configuration...</p></Card>;
  if (error) return <Card><p className="text-sm text-[#B42318]">{error}</p><Button onClick={load} className="mt-4">Retry</Button></Card>;
  if (!draft) return <Card><p className="text-sm text-[#5C6680]">No configuration found.</p></Card>;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Maintenance" value={draft.platform_config.general.maintenance_mode ? "On" : "Off"} detail="Controls public operational mode" icon={Settings} />
        <MetricCard label="Active flags" value={Object.values(draft.platform_config.feature_flags || {}).filter(Boolean).length} detail="Enabled platform features" icon={ShieldCheck} color="#2DA89F" />
        <MetricCard label="Environment" value={draft.platform_config.general.environment_badge || "Production"} detail={health?.version?.commit || "local"} icon={School} color="#8B5BB8" />
      </div>

      <Card>
        <SectionHeader
          eyebrow="Super Admin"
          title="Configuration Center"
          action={<Button disabled={saving} onClick={() => setConfirm({ title: "Save platform configuration", body: "This changes platform-wide behavior and will be written to the audit log.", confirmLabel: "Save configuration" })} className="bg-[#E8704C] text-white hover:bg-[#C95630]">{saving ? "Saving..." : "Save changes"}</Button>}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {Object.entries(draft.public_branding || {}).map(([key, value]) => (
            <label key={key} className="block">
              <span className="text-sm font-semibold capitalize text-[#1F3B6E]">{key.replaceAll("_", " ")}</span>
              <input value={value || ""} onChange={(event) => updateBranding(key, event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
            </label>
          ))}
        </div>
      </Card>

      {configSections.map(([section, label]) => (
        <Card key={section}>
          <SectionHeader eyebrow="Settings" title={label} />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(draft.platform_config[section] || {}).map(([key, value]) => (
              <label key={`${section}-${key}`} className="block rounded-lg border border-[#EFE4D0] p-4">
                <span className="text-sm font-semibold capitalize text-[#1F3B6E]">{key.replaceAll("_", " ")}</span>
                {typeof value === "boolean" ? (
                  <select value={String(value)} onChange={(event) => updateConfig(section, key, event.target.value === "true")} className="mt-2 h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <input
                    value={Array.isArray(value) ? value.join(", ") : value ?? ""}
                    onChange={(event) => updateConfig(section, key, parseConfigValue(value, event.target.value))}
                    className="mt-2 h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"
                  />
                )}
              </label>
            ))}
          </div>
        </Card>
      ))}
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} onConfirm={persist} />}
    </div>
  );
}

function LogsWorkspace({ type }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ q: "", risk: "all", actor: "", action: "", target_type: "all" });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [page, setPage] = useState(0);
  const isAudit = type === "audit";
  const endpoint = isAudit ? "/admin/audit-logs" : "/admin/activity-logs";
  const pageSize = 25;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(0);
      setDebouncedFilters(filters);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(debouncedFilters).filter(([, value]) => value && value !== "all"));
      const res = await api.get(endpoint, { params: { ...params, limit: pageSize, offset: page * pageSize } });
      setRows(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.appError?.message || err.response?.data?.detail || "Could not load logs.");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, endpoint, page]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const csv = rows.map((row) => JSON.stringify(row).replaceAll("\n", " ")).join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-logs.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Log export prepared.");
  };

  return (
    <Card>
      <SectionHeader
        eyebrow={isAudit ? "Security" : "Operations"}
        title={isAudit ? "Audit Logs" : "Activity Logs"}
        action={<div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}>Refresh</Button><Button onClick={exportCsv} disabled={!rows.length} className="bg-[#1F3B6E] text-white disabled:opacity-50">Export</Button></div>}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <input aria-label="Search logs" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search logs" className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
        <input aria-label="Actor filter" value={filters.actor} onChange={(e) => setFilters({ ...filters, actor: e.target.value })} placeholder="Actor" className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
        <input aria-label="Action filter" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="Action" className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
        {isAudit ? (
          <select aria-label="Risk filter" value={filters.risk} onChange={(e) => setFilters({ ...filters, risk: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm"><option value="all">All risk</option><option value="low">Low</option><option value="high">High</option><option value="critical">Critical</option></select>
        ) : (
          <select aria-label="Target filter" value={filters.target_type} onChange={(e) => setFilters({ ...filters, target_type: e.target.value })} className="rounded-md border border-[#EFE4D0] px-3 py-2 text-sm"><option value="all">All targets</option><option value="booking">Booking</option><option value="credits">Credits</option><option value="platform_settings">Settings</option><option value="user">User</option></select>
        )}
        <Button onClick={load} disabled={loading} className="bg-[#E8704C] text-white disabled:opacity-50">Apply filters</Button>
      </div>
      {loading && <div className="mt-5"><ActivityTimeline loading /></div>}
      {error && <p className="mt-5 rounded-lg bg-[#FFE7E2] p-4 text-sm text-[#B42318]" role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && <p className="mt-5 rounded-lg bg-[#FBF7EE] p-5 text-sm text-[#5C6680]">No logs match these filters.</p>}
      {!loading && !error && rows.length > 0 && (
        <div className="mt-5">
          <ActivityTimeline items={rows.map((row) => ({ ...row, summary: row.summary || row.event_type || row.action }))} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5C6680]">Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total} logs.</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
              <Button variant="outline" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AdminAuditLogs() {
  return <LogsWorkspace type="audit" />;
}

function AdminActivityLogs() {
  return <LogsWorkspace type="activity" />;
}

function SystemHealthPanel() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setHealth((await api.get("/admin/system-health")).data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load system health.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <Card><div className="h-40 animate-pulse rounded-lg bg-[#FBF7EE]" /></Card>;
  if (error) return <Card><p className="text-sm text-[#B42318]">{error}</p><Button onClick={load} className="mt-4">Retry</Button></Card>;
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Database" value={health.database.ok ? "Healthy" : "Down"} detail={`${health.database.users} users`} icon={ShieldCheck} />
        <MetricCard label="Storage" value={health.storage.configured ? "Configured" : "Missing"} detail={health.storage.bucket} icon={FileText} color="#2DA89F" />
        <MetricCard label="Maintenance" value={health.maintenance_mode ? "On" : "Off"} detail="Platform mode" icon={Settings} color="#8B5BB8" />
        <MetricCard label="Version" value={health.version.commit.slice(0, 7)} detail={health.app} icon={School} color="#4A90D9" />
      </div>
      <Card>
        <SectionHeader eyebrow="System status" title="Feature flags and auth controls" action={<Button onClick={load} variant="outline">Refresh</Button>} />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Object.entries(health.features || {}).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-[#EFE4D0] p-4">
              <span className="font-semibold capitalize">{key.replaceAll("_", " ")}</span>
              <span className={`rounded-md px-2 py-1 text-xs ${enabled ? "bg-[#E0F2F0] text-[#1B6F68]" : "bg-[#F3EEE3] text-[#5C6680]"}`}>{enabled ? "Enabled" : "Disabled"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
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
            <input className="mt-3 w-full rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="Configuration value" />
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
