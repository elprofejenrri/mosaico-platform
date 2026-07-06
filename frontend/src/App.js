import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PlatformLanding, StudentPortal, TutorPortal, TeacherPortal, SchoolAdminPortal, AdminPortal } from "./pages/Platform";
import Pricing from "./pages/Pricing";
import Faq from "./pages/Faq";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Book from "./pages/Book";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import TechnicalWiki from "./pages/TechnicalWiki";
import PaymentSuccess from "./pages/PaymentSuccess";
import AuthCallback from "./pages/AuthCallback";
import { Toaster } from "sonner";
import { StickyBookCta } from "./components/StickyBookCta";
import ErrorBoundary from "./components/ErrorBoundary";

function AppRouter() {
  const location = useLocation();
  if (location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Routes>
          <Route path="/" element={<PlatformLanding />} />
          <Route path="/student" element={<StudentPortal />} />
          <Route path="/student/learn" element={<StudentPortal module="learn" />} />
          <Route path="/student/course" element={<StudentPortal module="learn" />} />
          <Route path="/student/lesson" element={<StudentPortal module="learn" />} />
          <Route path="/student/roadmap" element={<StudentPortal module="roadmap" />} />
          <Route path="/student/classes" element={<StudentPortal module="classes" />} />
          <Route path="/student/ai-tutor" element={<StudentPortal module="ai-tutor" />} />
          <Route path="/student/community" element={<StudentPortal module="community" />} />
          <Route path="/student/progress" element={<StudentPortal module="progress" />} />
          <Route path="/tutor" element={<TutorPortal />} />
          <Route path="/tutor/students" element={<TutorPortal module="students" />} />
          <Route path="/tutor/classes" element={<TutorPortal module="classes" />} />
          <Route path="/tutor/credits" element={<TutorPortal module="credits" />} />
          <Route path="/tutor/progress" element={<TutorPortal module="progress" />} />
          <Route path="/tutor/roadmap" element={<TutorPortal module="roadmap" />} />
          <Route path="/tutor/tests" element={<TutorPortal module="tests" />} />
          <Route path="/tutor/feedback" element={<TutorPortal module="feedback" />} />
          <Route path="/tutor/messages" element={<TutorPortal module="messages" />} />
          <Route path="/tutor/alerts" element={<TutorPortal module="alerts" />} />
          <Route path="/tutor/badges" element={<TutorPortal module="badges" />} />
          <Route path="/tutor/payments" element={<TutorPortal module="payments" />} />
          <Route path="/teacher" element={<TeacherPortal />} />
          <Route path="/teacher/calendar" element={<TeacherPortal module="calendar" />} />
          <Route path="/teacher/students" element={<TeacherPortal module="students" />} />
          <Route path="/teacher/classes" element={<TeacherPortal module="classes" />} />
          <Route path="/teacher/materials" element={<TeacherPortal module="materials" />} />
          <Route path="/teacher/evaluations" element={<TeacherPortal module="evaluations" />} />
          <Route path="/teacher/earnings" element={<TeacherPortal module="earnings" />} />
          <Route path="/school-admin" element={<SchoolAdminPortal />} />
          <Route path="/school-admin/approvals" element={<SchoolAdminPortal module="approvals" />} />
          <Route path="/school-admin/credits" element={<SchoolAdminPortal module="credits" />} />
          <Route path="/school-admin/classes" element={<SchoolAdminPortal module="classes" />} />
          <Route path="/school-admin/roadmaps" element={<SchoolAdminPortal module="roadmaps" />} />
          <Route path="/school-admin/lessons" element={<SchoolAdminPortal module="lessons" />} />
          <Route path="/school-admin/students" element={<SchoolAdminPortal module="students" />} />
          <Route path="/school-admin/teachers" element={<SchoolAdminPortal module="teachers" />} />
          <Route path="/school-admin/bookings" element={<SchoolAdminPortal module="bookings" />} />
          <Route path="/school-admin/families" element={<SchoolAdminPortal module="families" />} />
          <Route path="/school-admin/reports" element={<SchoolAdminPortal module="reports" />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/admin/approvals" element={<AdminPortal module="approvals" />} />
          <Route path="/admin/iam" element={<AdminPortal module="iam" />} />
          <Route path="/admin/users" element={<AdminPortal module="users" />} />
          <Route path="/admin/credits" element={<AdminPortal module="credits" />} />
          <Route path="/admin/lessons" element={<AdminPortal module="lessons" />} />
          <Route path="/admin/teachers" element={<AdminPortal module="teachers" />} />
          <Route path="/admin/courses" element={<AdminPortal module="courses" />} />
          <Route path="/admin/bookings" element={<AdminPortal module="bookings" />} />
          <Route path="/admin/families" element={<AdminPortal module="families" />} />
          <Route path="/admin/reports" element={<AdminPortal module="reports" />} />
          <Route path="/admin/roles" element={<AdminPortal module="roles" />} />
          <Route path="/admin/roles-permissions" element={<AdminPortal module="roles-permissions" />} />
          <Route path="/admin/configuration" element={<AdminPortal module="configuration" />} />
          <Route path="/admin/audit-logs" element={<AdminPortal module="audit-logs" />} />
          <Route path="/admin/activity-logs" element={<AdminPortal module="activity-logs" />} />
          <Route path="/admin/system-settings" element={<AdminPortal module="system-settings" />} />
          <Route path="/admin/payments" element={<AdminPortal module="credits" />} />
          <Route path="/admin/community" element={<AdminPortal module="families" />} />
          <Route path="/admin/analytics" element={<AdminPortal module="analytics" />} />
          <Route path="/admin/atlas" element={<AdminPortal module="atlas" />} />
          <Route path="/admin/atlas/volumes/:slug" element={<AdminPortal module="atlas-volume" />} />
          <Route path="/admin/settings" element={<AdminPortal module="settings" />} />
          <Route path="/technical/wiki" element={<TechnicalWiki />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/book" element={<Book />} />
          <Route path="/book/:productId" element={<Book />} />
          <Route path="/dashboard" element={<StudentPortal />} />
          <Route path="/legacy-dashboard" element={<Dashboard />} />
          <Route path="/legacy-admin" element={<Admin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
        </Routes>
      </main>
      <Footer />
      <StickyBookCta />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <AppRouter />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
