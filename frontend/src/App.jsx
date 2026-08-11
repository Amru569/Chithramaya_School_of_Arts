/**
 * App.jsx
 * Application shell: MUI theme, splash screen, routing, and role-based
 * sidebar layout.
 */
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StoreIcon from "@mui/icons-material/Store";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import GroupIcon from "@mui/icons-material/Group";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PaymentsIcon from "@mui/icons-material/Payments";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChatIcon from "@mui/icons-material/Chat";
import SettingsIcon from "@mui/icons-material/Settings";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { AuthProvider, useAuth } from "./auth.js";
import { Layout, LoadingScreen, SplashScreen } from "./components.jsx";
import {
  LoginPage,
  AdminDashboardPage,
  AssistantDashboardPage,
  StudentDashboardPage,
  BranchesPage,
  BatchesPage,
  StudentsPage,
  AttendancePage,
  CalendarPage,
  FeesPage,
  AnnouncementsPage,
  ChatPage,
  ReportsPage,
  SettingsPage,
} from "./pages.jsx";
import { ACADEMY_NAME } from "./utils.js";

const theme = createTheme({
  palette: {
    primary: { main: "#1651B6", dark: "#0D3A85" },
    secondary: { main: "#0F9D58" },
    background: { default: "#F6F8FC" },
    text: { primary: "#0D1B34" },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    h5: { fontFamily: "Poppins, sans-serif", fontWeight: 700 },
    h6: { fontFamily: "Poppins, sans-serif", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600, borderRadius: 8 } },
    },
    MuiTableCell: {
      styleOverrides: { head: { fontWeight: 700, backgroundColor: "#F6F8FC" } },
    },
  },
});

const MENUS = {
  admin: [
    { path: "/admin/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { path: "/admin/branches", label: "Branches", icon: <StoreIcon /> },
    { path: "/admin/batches", label: "Batches", icon: <ViewModuleIcon /> },
    { path: "/admin/students", label: "Students", icon: <GroupIcon /> },
    { path: "/admin/calendar", label: "Calendar", icon: <CalendarMonthIcon /> },
    { path: "/admin/attendance", label: "Attendance", icon: <EventAvailableIcon /> },
    { path: "/admin/fees", label: "Fees", icon: <PaymentsIcon /> },
    { path: "/admin/announcements", label: "Announcements", icon: <CampaignIcon /> },
    { path: "/admin/chat", label: "Chat", icon: <ChatIcon /> },
    { path: "/admin/settings", label: "Settings", icon: <SettingsIcon /> },
  ],
  assistant: [
    { path: "/assistant/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { path: "/assistant/students", label: "Students", icon: <GroupIcon /> },
    { path: "/assistant/calendar", label: "Calendar", icon: <CalendarMonthIcon /> },
    { path: "/assistant/attendance", label: "Attendance", icon: <EventAvailableIcon /> },
    { path: "/assistant/announcements", label: "Announcements", icon: <CampaignIcon /> },
    { path: "/assistant/chat", label: "Chat", icon: <ChatIcon /> },
  ],
  student: [
    { path: "/student/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { path: "/student/calendar", label: "Calendar", icon: <CalendarMonthIcon /> },
    { path: "/student/attendance", label: "Attendance", icon: <EventAvailableIcon /> },
    { path: "/student/reports", label: "Reports", icon: <AssessmentIcon /> },
    { path: "/student/fees", label: "Fees", icon: <PaymentsIcon /> },
    { path: "/student/announcements", label: "Announcements", icon: <CampaignIcon /> },
    { path: "/student/chat", label: "Chat", icon: <ChatIcon /> },
  ],
};

const TITLES = {
  dashboard: "Dashboard",
  branches: "Branches",
  batches: "Batches",
  students: "Students",
  calendar: "Calendar",
  attendance: "Attendance",
  reports: "Monthly Reports",
  fees: "Fees",
  announcements: "Announcements",
  chat: "Chat",
  settings: "Settings",
};

/** Wraps a page with the role-appropriate sidebar/topbar and blocks
 * access if the logged-in role doesn't match. */
function RoleLayout({ allowed, children, section }) {
  const { role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!role) return <Navigate to="/login" replace />;
  if (!allowed.includes(role)) return <Navigate to={`/${role}/dashboard`} replace />;

  return (
    <Layout title={TITLES[section] || ACADEMY_NAME} menuItems={MENUS[role]}>
      {children}
    </Layout>
  );
}

function AppRoutes() {
  const { role, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={role ? <Navigate to={`/${role}/dashboard`} replace /> : <LoginPage />} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<RoleLayout allowed={["admin"]} section="dashboard"><AdminDashboardPage /></RoleLayout>} />
      <Route path="/admin/branches" element={<RoleLayout allowed={["admin"]} section="branches"><BranchesPage /></RoleLayout>} />
      <Route path="/admin/batches" element={<RoleLayout allowed={["admin"]} section="batches"><BatchesPage /></RoleLayout>} />
      <Route path="/admin/students" element={<RoleLayout allowed={["admin"]} section="students"><StudentsPage /></RoleLayout>} />
      <Route path="/admin/calendar" element={<RoleLayout allowed={["admin"]} section="calendar"><CalendarPage /></RoleLayout>} />
      <Route path="/admin/attendance" element={<RoleLayout allowed={["admin"]} section="attendance"><AttendancePage /></RoleLayout>} />
      <Route path="/admin/fees" element={<RoleLayout allowed={["admin"]} section="fees"><FeesPage /></RoleLayout>} />
      <Route path="/admin/announcements" element={<RoleLayout allowed={["admin"]} section="announcements"><AnnouncementsPage /></RoleLayout>} />
      <Route path="/admin/chat" element={<RoleLayout allowed={["admin"]} section="chat"><ChatPage /></RoleLayout>} />
      <Route path="/admin/settings" element={<RoleLayout allowed={["admin"]} section="settings"><SettingsPage /></RoleLayout>} />

      {/* Assistant */}
      <Route path="/assistant/dashboard" element={<RoleLayout allowed={["assistant"]} section="dashboard"><AssistantDashboardPage /></RoleLayout>} />
      <Route path="/assistant/students" element={<RoleLayout allowed={["assistant"]} section="students"><StudentsPage /></RoleLayout>} />
      <Route path="/assistant/calendar" element={<RoleLayout allowed={["assistant"]} section="calendar"><CalendarPage /></RoleLayout>} />
      <Route path="/assistant/attendance" element={<RoleLayout allowed={["assistant"]} section="attendance"><AttendancePage /></RoleLayout>} />
      <Route path="/assistant/announcements" element={<RoleLayout allowed={["assistant"]} section="announcements"><AnnouncementsPage /></RoleLayout>} />
      <Route path="/assistant/chat" element={<RoleLayout allowed={["assistant"]} section="chat"><ChatPage /></RoleLayout>} />

      {/* Student */}
      <Route path="/student/dashboard" element={<RoleLayout allowed={["student"]} section="dashboard"><StudentDashboardPage /></RoleLayout>} />
      <Route path="/student/calendar" element={<RoleLayout allowed={["student"]} section="calendar"><CalendarPage /></RoleLayout>} />
      <Route path="/student/attendance" element={<RoleLayout allowed={["student"]} section="attendance"><AttendancePage /></RoleLayout>} />
      <Route path="/student/reports" element={<RoleLayout allowed={["student"]} section="reports"><ReportsPage /></RoleLayout>} />
      <Route path="/student/fees" element={<RoleLayout allowed={["student"]} section="fees"><FeesPage /></RoleLayout>} />
      <Route path="/student/announcements" element={<RoleLayout allowed={["student"]} section="announcements"><AnnouncementsPage /></RoleLayout>} />
      <Route path="/student/chat" element={<RoleLayout allowed={["student"]} section="chat"><ChatPage /></RoleLayout>} />

      <Route path="*" element={<Navigate to={role ? `/${role}/dashboard` : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  // Splash screen shows once per browser tab session, ~2s, then the real app.
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splash_shown"));

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem("splash_shown", "1");
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {showSplash ? (
        <SplashScreen />
      ) : (
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      )}
    </ThemeProvider>
  );
}
