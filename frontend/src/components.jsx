/**
 * components.jsx
 * Reusable UI building blocks shared across pages.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Paper,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CampaignIcon from "@mui/icons-material/Campaign";
import PaymentsIcon from "@mui/icons-material/Payments";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth.js";
import { pollNotifications } from "./services.js";
import logo from "./assets/logo.jpg";

export const DRAWER_WIDTH = 240;

/* ---------------- Sidebar ---------------- */
export function Sidebar({ items, open, onClose, variant }) {
  const navigate = useNavigate();
  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", borderRight: "1px solid #E3E9F2" },
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Box component="img" src={logo} alt="Chithramaya School of Arts" sx={{ height: 34, width: 34, objectFit: "contain" }} />
        <Typography variant="subtitle1" sx={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#1651B6", lineHeight: 1.1, fontSize: "0.95rem" }}>
          Chithramaya
        </Typography>
      </Toolbar>
      <List sx={{ px: 1 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            onClick={() => {
              navigate(item.path);
              if (variant === "temporary") onClose();
            }}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "#1651B6" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

/* ---------------- Topbar ---------------- */
export function Topbar({ title, onMenuClick }) {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName = profile?.full_name || profile?.name || profile?.username || "User";

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { sm: `${DRAWER_WIDTH}px` },
        bgcolor: "#fff",
        color: "#0D1B34",
        borderBottom: "1px solid #E3E9F2",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton edge="start" onClick={onMenuClick} sx={{ display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            {title}
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ bgcolor: "#1651B6", width: 36, height: 36, fontSize: 15 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>{displayName} ({role})</MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

/* ---------------- Layout shell ---------------- */
export function Layout({ title, menuItems, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSmUp = useMediaQuery("(min-width:600px)");

  return (
    <Box sx={{ display: "flex" }}>
      <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
      <Sidebar
        items={menuItems}
        open={isSmUp ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant={isSmUp ? "permanent" : "temporary"}
      />
      <NotificationBanner />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          p: { xs: 2, sm: 3 },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* ---------------- Notification banner ----------------
 * Polls the backend every few seconds while the app is open and pops a
 * dismissible card for anything new: students/assistants see new
 * announcements for their batch, admin sees newly-submitted fee
 * payments. This is an in-app banner, not a real OS push notification —
 * it only fires while the tab is open. */
export function NotificationBanner() {
  const [items, setItems] = useState([]);
  const sinceRef = useRef(new Date().toISOString());
  const { refresh } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await pollNotifications(sinceRef.current);
        if (cancelled) return;
        sinceRef.current = res.server_time;
        if (res.events.length) {
          const fresh = res.events.map((e, i) => ({ id: `${e.type}-${e.created_at}-${i}`, ...e }));
          setItems((prev) => [...prev, ...fresh]);
          fresh.forEach((it) => {
            setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== it.id)), 8000);
          });
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          // Session no longer valid (expired, or the backend restarted and
          // lost its in-memory session store) — stop polling and let the
          // auth context re-check, which sends the user back to login.
          clearInterval(interval);
          if (!cancelled) refresh();
        }
        // other transient network errors — just skip this tick
      }
    };
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh]);

  const dismiss = (id) => setItems((prev) => prev.filter((p) => p.id !== id));

  if (!items.length) return null;

  return (
    <Box sx={{ position: "fixed", top: 76, right: 16, zIndex: 2000, display: "flex", flexDirection: "column", gap: 1, maxWidth: 320 }}>
      {items.map((it) => (
        <Paper key={it.id} elevation={6} sx={{ p: 1.5, pr: 4, borderRadius: 2, borderLeft: "4px solid #1651B6", position: "relative" }}>
          <IconButton size="small" onClick={() => dismiss(it.id)} sx={{ position: "absolute", top: 4, right: 4 }}>
            <CloseIcon fontSize="inherit" sx={{ fontSize: 16 }} />
          </IconButton>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            {it.type === "fee_submitted" ? <PaymentsIcon fontSize="small" sx={{ color: "#1651B6", mt: 0.3 }} /> : <CampaignIcon fontSize="small" sx={{ color: "#1651B6", mt: 0.3 }} />}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#1651B6", display: "block" }}>
                {it.type === "fee_submitted" ? "New Fee Payment" : "New Announcement"}
              </Typography>
              <Typography variant="body2">{it.message}</Typography>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}

/* ---------------- Stat card ---------------- */
export function StatCard({ label, value, icon, color = "#1651B6" }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid #E3E9F2",
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: "100%",
      }}
    >
      <Box
        sx={{
          bgcolor: `${color}1A`,
          color,
          borderRadius: 2,
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

/* ---------------- Status chip ---------------- */
export function StatusChip({ status }) {
  const map = {
    present: { color: "success", label: "Present" },
    absent: { color: "error", label: "Absent" },
    leave: { color: "warning", label: "Leave" },
    paid: { color: "success", label: "Paid" },
    approved: { color: "success", label: "Approved" },
    rejected: { color: "error", label: "Rejected" },
    pending: { color: "warning", label: "Pending" },
    partial: { color: "info", label: "Partial" },
    active: { color: "success", label: "Active" },
    inactive: { color: "default", label: "Inactive" },
  };
  const conf = map[status] || { color: "default", label: status };
  return <Chip size="small" color={conf.color} label={conf.label} sx={{ fontWeight: 600 }} />;
}

/* ---------------- Attendance star indicator ---------------- */
const STAR_COLOR_MAP = { green: "#22c55e", blue: "#3b82f6", red: "#ef4444" };
const STAR_LABEL_MAP = { green: "Excellent (100%)", blue: "Good (50-99%)", red: "Needs Improvement (below 50%)" };

/** 🟢 100% | 🔵 50-99% | 🔴 below 50% — clickable to view the detailed
 * records behind it, per the spec. Pass onClick to make it interactive. */
export function StarIndicator({ star, percentage, onClick }) {
  return (
    <Chip
      icon={<span style={{ color: STAR_COLOR_MAP[star] || "#94a3b8", fontSize: 16, lineHeight: 1 }}>★</span>}
      label={`${percentage}%`}
      size="small"
      title={STAR_LABEL_MAP[star]}
      onClick={onClick}
      clickable={!!onClick}
      sx={{ fontWeight: 700, bgcolor: `${STAR_COLOR_MAP[star] || "#94a3b8"}1A`, color: STAR_COLOR_MAP[star] || "#64748b" }}
    />
  );
}

/* ---------------- Confirm dialog ---------------- */
export function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ message }) {
  return (
    <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
      <Typography>{message}</Typography>
    </Box>
  );
}

/* ---------------- Loading ---------------- */
export function LoadingScreen() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <CircularProgress />
    </Box>
  );
}

/* ---------------- Splash screen ---------------- */
export function SplashScreen() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eaf0fc 0%, #f6f8fc 60%)",
        gap: 2,
      }}
    >
      <Box component="img" src={logo} alt="Chithramaya School of Arts" sx={{ width: 140, height: "auto" }} />
      <Typography variant="h5" sx={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#1651B6" }}>
        Chithramaya School of Arts
      </Typography>
      <CircularProgress size={28} sx={{ mt: 2 }} />
    </Box>
  );
}

/* ---------------- Toast / snackbar helper ---------------- */
export function useToast() {
  const [state, setState] = useState({ open: false, message: "", severity: "success" });

  const showToast = (message, severity = "success") => setState({ open: true, message, severity });
  const closeToast = () => setState((s) => ({ ...s, open: false }));

  const ToastElement = (
    <Snackbar open={state.open} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert onClose={closeToast} severity={state.severity} variant="filled" sx={{ width: "100%" }}>
        {state.message}
      </Alert>
    </Snackbar>
  );

  return { showToast, ToastElement };
}
