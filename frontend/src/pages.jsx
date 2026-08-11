/**
 * pages.jsx
 * Every page/screen in the application. Role-based rendering happens
 * inside each page rather than via separate admin/assistant/student
 * files, keeping the file count minimal per the project spec.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  RadioGroup,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Radio,
  Avatar,
  Chip,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import StoreIcon from "@mui/icons-material/Store";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PaymentsIcon from "@mui/icons-material/Payments";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";

import { useAuth } from "./auth.js";
import * as api from "./services.js";
import {
  StatCard,
  StatusChip,
  StarIndicator,
  ConfirmDialog,
  EmptyState,
  LoadingScreen,
  useToast,
} from "./components.jsx";
import { formatDate, formatDateTime, formatTime, formatCurrency, apiErrorMessage, todayISO, ACADEMY_NAME, DAY_NAMES, TIME_OPTIONS, CALENDAR_COLORS, currentBillingMonth, formatBillingMonth, recentBillingMonths, recentMonths, LEAVE_REASON_CATEGORIES } from "./utils.js";
import logo from "./assets/logo.jpg";

/* ============================================================
   LOGIN PAGE
   ============================================================ */
export function LoginPage() {
  const [tab, setTab] = useState(0); // 0 = staff, 1 = student login, 2 = student register

  return (
    <Box className="login-screen">
      <Paper elevation={0} sx={{ maxWidth: 460, width: "100%", p: 4, borderRadius: 4, border: "1px solid #E3E9F2" }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <Box component="img" src={logo} alt={ACADEMY_NAME} sx={{ width: 48, height: 48, objectFit: "contain" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1651B6", lineHeight: 1.2 }}>
              {ACADEMY_NAME}
            </Typography>
            <Typography variant="caption" color="text.secondary">Academy Management</Typography>
          </Box>
        </Stack>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, mt: 2 }} variant="fullWidth">
          <Tab label="Admin / Assistant" />
          <Tab label="Student Login" />
          <Tab label="Student Register" />
        </Tabs>
        {tab === 0 && <StaffLoginForm />}
        {tab === 1 && <StudentLoginForm />}
        {tab === 2 && <StudentRegisterForm onDone={() => setTab(1)} />}
      </Paper>
    </Box>
  );
}

function StaffLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsStaff } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await loginAsStaff(username, password);
      window.location.href = user.role === "admin" ? "/admin/dashboard" : "/assistant/dashboard";
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Stack spacing={2}>
        <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required fullWidth />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
        {error && <Typography color="error" variant="body2">{error}</Typography>}
        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </Stack>
    </form>
  );
}

function StudentLoginForm() {
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsStudent } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAsStudent(mobile, code);
      window.location.href = "/student/dashboard";
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Stack spacing={2}>
        <TextField label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} required fullWidth />
        <TextField label="Student Code" placeholder="CSA1234" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required fullWidth />
        {error && <Typography color="error" variant="body2">{error}</Typography>}
        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </Stack>
    </form>
  );
}

function StudentRegisterForm({ onDone }) {
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({
    name: "", gender: "", date_of_birth: "", parent_name: "", parent_mobile: "",
    student_mobile: "", address: "", branch_id: "", batch_id: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { student_code, message }

  useEffect(() => { api.getBranches().then(setBranches); }, []);
  useEffect(() => {
    if (form.branch_id) api.getBatches(form.branch_id).then(setBatches);
    else setBatches([]);
  }, [form.branch_id]);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, branch_id: Number(form.branch_id), batch_id: Number(form.batch_id) };
      const res = await api.registerStudent(payload, photoFile);
      setResult(res);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon sx={{ fontSize: 56, color: "success.main" }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Registration Successful</Typography>
        <Paper elevation={0} sx={{ px: 3, py: 1.5, borderRadius: 2, bgcolor: "#EAF0FC" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1651B6", letterSpacing: 1 }}>
            {result.student_code}
          </Typography>
        </Paper>
        <Typography variant="body2" color="text.secondary">{result.message}</Typography>
        <Button variant="contained" onClick={onDone} fullWidth>Go to Student Login</Button>
      </Stack>
    );
  }

  return (
    <form onSubmit={submit}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={photoPreview} sx={{ width: 64, height: 64, bgcolor: "#EAF0FC", color: "#1651B6" }}>
            {!photoPreview && form.name.charAt(0)}
          </Avatar>
          <Button component="label" size="small" variant="outlined">
            {photoFile ? "Change Photo" : "Add Profile Photo (optional)"}
            <input type="file" hidden accept=".jpg,.jpeg,.png" onChange={handlePhoto} />
          </Button>
        </Stack>
        <TextField label="Full Name" value={form.name} onChange={(e) => setField("name", e.target.value)} required fullWidth />
        <TextField label="Gender" select value={form.gender} onChange={(e) => setField("gender", e.target.value)} fullWidth>
          <MenuItem value="female">Female</MenuItem>
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>
        <TextField
          label="Date of Birth" type="date" value={form.date_of_birth}
          onChange={(e) => setField("date_of_birth", e.target.value)}
          InputLabelProps={{ shrink: true }} fullWidth
        />
        <TextField label="Parent Name" value={form.parent_name} onChange={(e) => setField("parent_name", e.target.value)} fullWidth />
        <TextField label="Parent Mobile Number" value={form.parent_mobile} onChange={(e) => setField("parent_mobile", e.target.value)} fullWidth />
        <TextField label="Student Mobile Number" value={form.student_mobile} onChange={(e) => setField("student_mobile", e.target.value)} required fullWidth />
        <TextField label="Address" multiline minRows={2} value={form.address} onChange={(e) => setField("address", e.target.value)} fullWidth />
        <FormControl fullWidth required>
          <InputLabel>Branch</InputLabel>
          <Select label="Branch" value={form.branch_id} onChange={(e) => { setField("branch_id", e.target.value); setField("batch_id", ""); }}>
            {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth required disabled={!form.branch_id}>
          <InputLabel>Batch</InputLabel>
          <Select label="Batch" value={form.batch_id} onChange={(e) => setField("batch_id", e.target.value)}>
            {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>
        {error && <Typography color="error" variant="body2">{error}</Typography>}
        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }}>
          {loading ? "Registering..." : "Register"}
        </Button>
      </Stack>
    </form>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);

  useEffect(() => {
    api.getAdminDashboard().then(setData).catch(() => setData(null));
    api.getAdminDashboardHierarchy().then(setHierarchy).catch(() => setHierarchy(null));
  }, []);

  if (!data) return <LoadingScreen />;

  return (
    <Box>
      <Typography variant="h5" className="page-title">Admin Dashboard</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Students" value={data.total_students} icon={<GroupIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Branches" value={data.total_branches} icon={<StoreIcon />} color="#0F9D58" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Batches" value={data.total_batches} icon={<ViewModuleIcon />} color="#F4941E" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Fees Collected"
            value={formatCurrency(data.fee_summary.total_collected)}
            icon={<PaymentsIcon />}
            color="#D1495B"
          />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Branch-wise Overview</Typography>
        {hierarchy && <Typography variant="body2" color="text.secondary">— {hierarchy.month_label}</Typography>}
      </Stack>

      {!hierarchy ? (
        <LoadingScreen />
      ) : !hierarchy.branches.length ? (
        <EmptyState message="No branches yet. Add one to see the breakdown here." />
      ) : (
        <Stack spacing={1.5}>
          {hierarchy.branches.map((branch) => (
            <Accordion key={branch.branch_id} defaultExpanded elevation={0} sx={{ border: "1px solid #E3E9F2", borderRadius: 3, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <StoreIcon fontSize="small" sx={{ color: "#1651B6" }} />
                  <Typography sx={{ fontWeight: 700 }}>{branch.branch_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({branch.batches.reduce((sum, b) => sum + b.student_count, 0)} students)
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {branch.batches.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Batch</TableCell>
                        <TableCell align="right">Students</TableCell>
                        <TableCell align="right">Fee Collected</TableCell>
                        <TableCell align="right">Fee Pending</TableCell>
                        <TableCell align="right">Attendance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {branch.batches.map((b) => (
                        <TableRow key={b.batch_id}>
                          <TableCell>{b.batch_name}</TableCell>
                          <TableCell align="right">{b.student_count}</TableCell>
                          <TableCell align="right" sx={{ color: "success.main", fontWeight: 600 }}>{formatCurrency(b.fee_collected)}</TableCell>
                          <TableCell align="right" sx={{ color: b.fee_pending ? "warning.main" : "text.secondary", fontWeight: b.fee_pending ? 600 : 400 }}>{formatCurrency(b.fee_pending)}</TableCell>
                          <TableCell align="right">{b.attendance_percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">No batches in this branch yet.</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
}

/* ============================================================
   ASSISTANT DASHBOARD
   ============================================================ */
export function AssistantDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getAssistantDashboard().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <LoadingScreen />;

  return (
    <Box>
      <Typography variant="h5" className="page-title">Today's Overview</Typography>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2", mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Today's Batch</Typography>
        {data.todays_batches.length ? (
          data.todays_batches.map((b) => <BatchPill key={b} label={b} />)
        ) : (
          <EmptyState message="No batch assigned yet." />
        )}
      </Paper>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Today's Attendance</Typography>
        {data.todays_attendance.length ? (
          <List dense>
            {data.todays_attendance.map((a, i) => (
              <ListItem key={i}>
                <ListItemText primary={`Student #${a.student_id}`} />
                <StatusChip status={a.status} />
              </ListItem>
            ))}
          </List>
        ) : (
          <EmptyState message="Attendance not marked yet today." />
        )}
      </Paper>
    </Box>
  );
}
function BatchPill({ label }) {
  return (
    <Typography sx={{ display: "inline-block", px: 1.5, py: 0.5, bgcolor: "#EAF0FC", color: "#1651B6", borderRadius: 2, fontWeight: 600 }}>
      {label}
    </Typography>
  );
}

/* ============================================================
   STUDENT DASHBOARD
   ============================================================ */
export function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const { profile } = useAuth();

  useEffect(() => {
    api.getStudentDashboard().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <LoadingScreen />;

  const monthShort = data.month_label ? data.month_label.split(" ")[0] : "";

  return (
    <Box>
      <Typography variant="h5" className="page-title">Welcome, {profile?.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: -1.5, mb: 2 }}>{data.month_label}</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatCard label={`${monthShort} Attendance`} value={`${data.attendance_percentage}%`} icon={<EventAvailableIcon />} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard label={`${monthShort} Fee Status`} value={data.fee_status.replace("_", " ")} icon={<PaymentsIcon />} color="#F4941E" />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2", mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{monthShort} Class Schedule</Typography>
        {data.class_schedule?.length ? (
          <List dense>
            {data.class_schedule.map((s) => (
              <ListItem key={s.id} divider>
                <ListItemText
                  primary={`${formatDate(s.date)} · ${formatTime(s.start_time)} - ${formatTime(s.end_time)}`}
                  secondary={s.session_type === "compensation" ? "Compensation class" : (s.teacher || "Regular class")}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <EmptyState message="No classes scheduled this month yet." />
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Recent Announcements</Typography>
        {data.announcements.length ? (
          <List>
            {data.announcements.map((a) => (
              <ListItem key={a.id} alignItems="flex-start" divider>
                <ListItemText primary={a.title} secondary={a.message} />
              </ListItem>
            ))}
          </List>
        ) : (
          <EmptyState message="No announcements yet." />
        )}
      </Paper>
    </Box>
  );
}

/* ============================================================
   BRANCHES PAGE (admin)
   ============================================================ */
export function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [dialog, setDialog] = useState(null); // {mode, data}
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { showToast, ToastElement } = useToast();

  const load = () => api.getBranches().then(setBranches);
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (dialog.mode === "edit") await api.updateBranch(dialog.data.id, form);
      else await api.createBranch(form);
      showToast(dialog.mode === "edit" ? "Branch updated" : "Branch created");
      setDialog(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteBranch(confirmDelete.id);
      showToast("Branch deleted");
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="section-gap">
        <Typography variant="h5" className="page-title" sx={{ mb: 0 }}>Branches</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialog({ mode: "create", data: { name: "", location: "" } })}>
          Add Branch
        </Button>
      </Stack>
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.location || "-"}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setDialog({ mode: "edit", data: b })}><EditIcon fontSize="small" /></IconButton>
                  <IconButton onClick={() => setConfirmDelete(b)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!branches.length && <EmptyState message="No branches yet. Add one to get started." />}
      </Paper>

      {dialog && (
        <FormDialog
          title={dialog.mode === "edit" ? "Edit Branch" : "Add Branch"}
          initial={dialog.data}
          fields={[
            { name: "name", label: "Branch Name", required: true },
            { name: "location", label: "Location" },
          ]}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Branch"
        message={`Delete "${confirmDelete?.name}"? This will remove its batches too.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
      {ToastElement}
    </Box>
  );
}

/* ============================================================
   BATCHES PAGE (admin)
   ============================================================ */
export function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { showToast, ToastElement } = useToast();

  const [patternsByBatch, setPatternsByBatch] = useState({});

  const load = () => {
    api.getBatches().then(setBatches);
    api.getBranches().then(setBranches);
    api.getPatterns().then((all) => {
      const grouped = {};
      all.forEach((p) => { (grouped[p.batch_id] ||= []).push(p); });
      Object.values(grouped).forEach((list) => list.sort((a, b) => a.day_of_week - b.day_of_week));
      setPatternsByBatch(grouped);
    });
  };
  useEffect(() => { load(); }, []);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "-";
  const scheduleSummary = (batch) => {
    const patterns = patternsByBatch[batch.id];
    if (patterns?.length) {
      return patterns.map((p) => `${DAY_NAMES[p.day_of_week].slice(0, 3)} ${formatTime(p.start_time)}-${formatTime(p.end_time)}`).join(", ");
    }
    return batch.schedule || "-"; // legacy single-schedule text, for batches created before this change
  };

  const handleSave = async ({ name, branch_id }, schedules) => {
    try {
      const scheduleText = schedules.map((s) => `${DAY_NAMES[s.day_of_week]}, ${formatTime(s.start_time)} - ${formatTime(s.end_time)}`).join("; ");
      let batchId;
      if (dialog.mode === "edit") {
        await api.updateBatch(dialog.data.id, { name, branch_id, schedule: scheduleText });
        batchId = dialog.data.id;
      } else {
        const created = await api.createBatch({ name, branch_id, schedule: scheduleText });
        batchId = created.id;
      }
      await api.replaceBatchPatterns(batchId, schedules);
      showToast(dialog.mode === "edit" ? "Batch updated" : "Batch created");
      setDialog(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteBatch(confirmDelete.id);
      showToast("Batch deleted");
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="section-gap">
        <Typography variant="h5" className="page-title" sx={{ mb: 0 }}>Batches</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          disabled={!branches.length}
          onClick={() => setDialog({ mode: "create", data: { name: "", branch_id: branches[0]?.id || "", schedule: "" } })}
        >
          Add Batch
        </Button>
      </Stack>
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell>{branchName(b.branch_id)}</TableCell>
                <TableCell>{scheduleSummary(b)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setDialog({ mode: "edit", data: b })}><EditIcon fontSize="small" /></IconButton>
                  <IconButton onClick={() => setConfirmDelete(b)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!batches.length && <EmptyState message="No batches yet." />}
      </Paper>

      {dialog && (
        <BatchDialog
          mode={dialog.mode}
          initial={dialog.data}
          existingPatterns={patternsByBatch[dialog.data.id]}
          branches={branches}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Batch"
        message={`Delete "${confirmDelete?.name}"? This will remove its students too.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
      {ToastElement}
    </Box>
  );
}

/** Parses a legacy single-schedule string (e.g. "Monday, 5:00 PM - 6:30 PM")
 * back into one row, for batches created before multi-schedule support —
 * used only when a batch has no WeeklyPattern rows yet. */
function parseScheduleString(str) {
  if (!str) return null;
  const m = str.match(/^(\w+),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  const dayIdx = DAY_NAMES.findIndex((d) => d.toLowerCase() === m[1].toLowerCase());
  if (dayIdx === -1) return null;
  const to24 = (h, mm, ap) => {
    let hh = parseInt(h, 10) % 12;
    if (ap.toUpperCase() === "PM") hh += 12;
    return `${String(hh).padStart(2, "0")}:${mm}`;
  };
  return { day_of_week: dayIdx, start_time: to24(m[2], m[3], m[4]), end_time: to24(m[5], m[6], m[7]) };
}

function BatchDialog({ mode, initial, existingPatterns, branches, onClose, onSave }) {
  const legacyParsed = parseScheduleString(initial.schedule);
  const initialRows = existingPatterns?.length
    ? existingPatterns.map((p) => ({ day_of_week: p.day_of_week, start_time: p.start_time, end_time: p.end_time }))
    : legacyParsed
      ? [legacyParsed]
      : [{ day_of_week: 0, start_time: "17:00", end_time: "18:00" }];

  const [name, setName] = useState(initial.name);
  const [branchId, setBranchId] = useState(initial.branch_id);
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);

  const updateRow = (i, field, value) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  const addRow = () => setRows((r) => [...r, { day_of_week: 0, start_time: "17:00", end_time: "18:00" }]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ name, branch_id: branchId }, rows);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "edit" ? "Edit Batch" : "Add Batch"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Batch Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <FormControl fullWidth required>
            <InputLabel>Branch</InputLabel>
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Divider>Weekly Schedule</Divider>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            Add every day/time this batch meets — e.g. Monday 2–4 PM and Friday 3–5 PM. The calendar will generate classes from these automatically.
          </Typography>

          <Stack spacing={1.5}>
            {rows.map((row, i) => (
              <Paper key={i} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: "1px solid #E3E9F2", bgcolor: "#F6F8FC" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Day</InputLabel>
                    <Select label="Day" value={row.day_of_week} onChange={(e) => updateRow(i, "day_of_week", Number(e.target.value))}>
                      {DAY_NAMES.map((d, idx) => <MenuItem key={idx} value={idx}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>From</InputLabel>
                    <Select label="From" value={row.start_time} onChange={(e) => updateRow(i, "start_time", e.target.value)}>
                      {TIME_OPTIONS.map((t) => <MenuItem key={t} value={t}>{formatTime(t)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>To</InputLabel>
                    <Select label="To" value={row.end_time} onChange={(e) => updateRow(i, "end_time", e.target.value)}>
                      {TIME_OPTIONS.map((t) => <MenuItem key={t} value={t}>{formatTime(t)}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <IconButton size="small" onClick={() => removeRow(i)} disabled={rows.length === 1} sx={{ flexShrink: 0 }}>
                    <DeleteIcon fontSize="small" color={rows.length === 1 ? "disabled" : "error"} />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: "flex-start" }}>
            Add Another Schedule
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !name || !branchId}>{saving ? "Saving..." : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============================================================
   STUDENTS PAGE (admin: branch -> batch drill-down + full CRUD;
   assistant: read-only within their own batch)
   ============================================================ */
export function StudentsPage() {
  const { role, profile } = useAuth();
  const isAdmin = role === "admin";
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [batchId, setBatchId] = useState(isAdmin ? "" : profile?.batch_id || "");
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [profileDialog, setProfileDialog] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    if (isAdmin) api.getBranches().then(setBranches);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      if (branchId) api.getBatches(branchId).then(setBatches);
      else setBatches([]);
      setBatchId("");
    }
  }, [branchId, isAdmin]);

  const load = () => {
    if (isAdmin && !batchId) { setStudents([]); return; }
    api.getStudents(batchId).then(setStudents);
  };
  useEffect(() => { load(); }, [batchId]);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.student_code.toLowerCase().includes(q);
  });

  const handleSave = async (form) => {
    try {
      const payload = { ...form, batch_id: Number(form.batch_id) };
      if (dialog.mode === "edit") await api.updateStudent(dialog.data.id, payload);
      else await api.createStudent(payload);
      showToast(dialog.mode === "edit" ? "Student updated" : "Student registered");
      setDialog(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteStudent(confirmDelete.id);
      showToast("Student removed");
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await api.downloadStudentsExport(batchId ? { batch_id: batchId } : branchId ? { branch_id: branchId } : {});
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="section-gap" flexWrap="wrap" gap={1}>
        <Typography variant="h5" className="page-title" sx={{ mb: 0 }}>Students</Typography>
        {isAdmin && (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Export"}
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              disabled={!batchId}
              onClick={() => setDialog({
                mode: "create",
                data: { name: "", date_of_birth: "", gender: "", parent_name: "", parent_mobile: "", student_mobile: "", address: "", batch_id: batchId },
              })}
            >
              Register Student
            </Button>
          </Stack>
        )}
      </Stack>

      {isAdmin && (
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Branch</InputLabel>
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!branchId}>
            <InputLabel>Batch</InputLabel>
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          {!!batchId && (
            <TextField size="small" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
          )}
        </Stack>
      )}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.student_code}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.student_mobile}</TableCell>
                <TableCell><StatusChip status={s.status} /></TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => setProfileDialog(s)}><GroupIcon fontSize="small" /></IconButton>
                  {isAdmin && (
                    <>
                      <IconButton onClick={() => setDialog({ mode: "edit", data: s })}><EditIcon fontSize="small" /></IconButton>
                      <IconButton onClick={() => setConfirmDelete(s)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <EmptyState message={isAdmin && !batchId ? "Select a branch and batch to view students." : "No students found."} />
        )}
      </Paper>

      {dialog && (
        <FormDialog
          title={dialog.mode === "edit" ? "Edit Student" : "Register Student"}
          initial={dialog.data}
          fields={[
            { name: "name", label: "Full Name", required: true },
            { name: "gender", label: "Gender", select: true, options: [{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }] },
            { name: "date_of_birth", label: "Date of Birth", type: "date" },
            { name: "parent_name", label: "Parent Name" },
            { name: "parent_mobile", label: "Parent Mobile" },
            { name: "student_mobile", label: "Student Mobile", required: true },
            { name: "address", label: "Address", multiline: true },
            { name: "batch_id", label: "Batch", select: true, options: batches.map((b) => ({ value: b.id, label: b.name })), required: true, disabledIf: dialog.mode === "create" },
            ...(dialog.mode === "edit" ? [{ name: "status", label: "Status", select: true, options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }] : []),
          ]}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}

      {profileDialog && (
        <StudentProfileDialog
          student={profileDialog}
          onClose={() => setProfileDialog(null)}
          onPhotoUploaded={() => { load(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove Student"
        message={`Remove "${confirmDelete?.name}" from the academy?`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
      {ToastElement}
    </Box>
  );
}

function StudentProfileDialog({ student, onClose, onPhotoUploaded }) {
  const [uploading, setUploading] = useState(false);
  const months = recentMonths(12);
  const [selected, setSelected] = useState(`${months[0].year}-${months[0].month}`);
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const { showToast, ToastElement } = useToast();

  const [year, month] = selected.split("-").map(Number);

  useEffect(() => {
    api.getMonthlyReport(year, month, student.id).then(setReport).catch(() => setReport(null));
  }, [year, month, student.id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadStudentPhoto(student.id, file);
      showToast("Photo updated");
      onPhotoUploaded();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await api.downloadMonthlyReport(year, month, student.id);
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Student Profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Avatar src={student.photo_path ? `/uploads/${student.photo_path}` : undefined} sx={{ width: 88, height: 88, bgcolor: "#1651B6", fontSize: 32 }}>
            {student.name.charAt(0)}
          </Avatar>
          <Button component="label" size="small" disabled={uploading}>
            {uploading ? "Uploading..." : "Change Photo (JPG/PNG)"}
            <input type="file" hidden accept=".jpg,.jpeg,.png" onChange={handleFile} />
          </Button>
          <Stack spacing={0.5} sx={{ width: "100%" }}>
            <Typography variant="body2"><b>Code:</b> {student.student_code}</Typography>
            <Typography variant="body2"><b>Name:</b> {student.name}</Typography>
            <Typography variant="body2"><b>Gender:</b> {student.gender || "-"}</Typography>
            <Typography variant="body2"><b>Date of Birth:</b> {formatDate(student.date_of_birth)}</Typography>
            <Typography variant="body2"><b>Parent:</b> {student.parent_name || "-"} ({student.parent_mobile || "-"})</Typography>
            <Typography variant="body2"><b>Mobile:</b> {student.student_mobile}</Typography>
            <Typography variant="body2"><b>Address:</b> {student.address || "-"}</Typography>
            <Typography variant="body2"><b>Joined:</b> {formatDate(student.joining_date)}</Typography>
          </Stack>

          <Divider sx={{ width: "100%" }}>Monthly Attendance</Divider>
          <FormControl size="small" fullWidth>
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {months.map((m) => <MenuItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          {!report ? (
            <Typography variant="body2" color="text.secondary">Loading...</Typography>
          ) : !report.is_finalized ? (
            <Typography variant="body2" color="text.secondary">{report.month_label} is still in progress.</Typography>
          ) : (
            <Box sx={{ width: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.month_label}</Typography>
                <StarIndicator star={report.star} percentage={report.attendance_percentage} />
              </Stack>
              <Stack direction="row" spacing={3} sx={{ mb: 1.5 }} flexWrap="wrap">
                <Typography variant="body2">Scheduled: <b>{report.total_scheduled}</b></Typography>
                <Typography variant="body2">Attended: <b>{report.attended}</b></Typography>
                <Typography variant="body2">Missed: <b>{report.missed}</b></Typography>
                <Typography variant="body2">Prior Leaves: <b>{report.prior_leaves}</b></Typography>
              </Stack>
              <Button size="small" variant="outlined" onClick={download} disabled={downloading}>
                {downloading ? "Downloading..." : "Download Report"}
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      {ToastElement}
    </Dialog>
  );
}

/* ============================================================
   ATTENDANCE PAGE
   - Assistant/Admin: mark attendance for a scheduled class session,
     window state (not_started/active/draft/submitted) is computed
     live from the schedule — no cron. Only Present/Leave are recorded;
     a student with neither is inferred absent in reports.
   - Student: view own attendance history + monthly conducted-class %.
   ============================================================ */
export function AttendancePage() {
  const { role } = useAuth();
  if (role === "student") return <StudentAttendanceView />;
  return <SessionAttendanceView isAdmin={role === "admin"} />;
}

const WINDOW_LABELS = {
  not_started: { label: "Not Started", color: "default" },
  active: { label: "Open", color: "success" },
  draft: { label: "Draft Saved", color: "warning" },
  submitted: { label: "Submitted", color: "info" },
};

function SessionAttendanceView({ isAdmin }) {
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null); // session object
  const [statusData, setStatusData] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    if (isAdmin) api.getBranches().then(setBranches);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (branchId) api.getBatches(branchId).then(setBatches);
    else setBatches([]);
    setBatchId("");
  }, [branchId, isAdmin]);

  const loadSessions = () => {
    if (isAdmin) {
      const params = {};
      if (batchId) params.batch_id = batchId;
      else if (branchId) params.branch_id = branchId;
      api.getSessions(params).then(setSessions);
    } else {
      api.getMySessions().then(setSessions);
    }
  };
  useEffect(() => { loadSessions(); }, [branchId, batchId, isAdmin]);

  const openSession = async (session) => {
    setSelected(session);
    const [statusResult, studentList, leaves] = await Promise.all([
      api.getSessionAttendance(session.id),
      api.getStudents(session.batch_id),
      api.getSessionLeaveRequests(session.id),
    ]);
    setStatusData(statusResult);
    setStudents(studentList);
    setLeaveRequests(leaves);
    const initial = {};
    studentList.forEach((s) => {
      const existing = statusResult.records.find((r) => r.student_id === s.id);
      initial[s.id] = existing ? existing.status : "present";
    });
    setMarks(initial);
  };

  const toggle = (id, status) => setMarks((m) => ({ ...m, [id]: status }));

  const save = async (submit) => {
    setSaving(true);
    try {
      const records = Object.entries(marks).map(([student_id, status]) => ({ student_id: Number(student_id), status }));
      await api.saveAttendance({ batch_id: selected.batch_id, session_id: selected.id, submit, records });
      showToast(submit ? "Attendance submitted" : "Draft saved");
      const statusResult = await api.getSessionAttendance(selected.id);
      setStatusData(statusResult);
      loadSessions();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const windowStatus = statusData?.window_status;
  const locked = windowStatus === "not_started" || windowStatus === "submitted";
  const priorLeaveStudentIds = new Set(leaveRequests.map((l) => l.student_id));

  return (
    <Box>
      <Typography variant="h5" className="page-title">Attendance</Typography>

      {isAdmin && (
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Branch</InputLabel>
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <MenuItem value="">All Branches</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!branchId}>
            <InputLabel>Batch</InputLabel>
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <MenuItem value="">All Batches</MenuItem>
              {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", p: 1 }}>
            <List dense>
              {sessions.map((s) => (
                <ListItem
                  key={s.id}
                  button
                  selected={selected?.id === s.id}
                  onClick={() => openSession(s)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemText
                    primary={`${formatDate(s.date)} · ${formatTime(s.start_time)} - ${formatTime(s.end_time)}`}
                    secondary={s.session_type === "compensation" ? `Compensation class${s.teacher ? " · " + s.teacher : ""}` : (s.teacher || "Class session")}
                  />
                </ListItem>
              ))}
            </List>
            {!sessions.length && <EmptyState message="No class sessions in this window. Set up a weekly pattern on the Calendar page." />}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          {!selected ? (
            <EmptyState message="Select a class session to mark attendance." />
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatDate(selected.date)} · {formatTime(selected.start_time)}
                </Typography>
                {windowStatus && (
                  <Chip size="small" color={WINDOW_LABELS[windowStatus]?.color} label={WINDOW_LABELS[windowStatus]?.label} sx={{ fontWeight: 600 }} />
                )}
              </Stack>
              {windowStatus === "not_started" && <EmptyState message="Attendance opens automatically once this class starts." />}
              {windowStatus !== "not_started" && (
                <>
                  <Table size="small">
                    <TableHead>
                      <TableRow><TableCell>Student</TableCell><TableCell align="right">Status</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            {s.name}
                            {priorLeaveStudentIds.has(s.id) && (
                              <Chip size="small" label="Prior Leave" sx={{ ml: 1, bgcolor: "#FEF3C7", color: "#92400E", fontWeight: 600, height: 20, fontSize: "0.7rem" }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small" variant={marks[s.id] === "present" ? "contained" : "outlined"} color="success"
                              disabled={locked} onClick={() => toggle(s.id, "present")} sx={{ mr: 1 }}
                            >
                              Present
                            </Button>
                            <Button
                              size="small" variant={marks[s.id] === "leave" ? "contained" : "outlined"} sx={{ color: marks[s.id] === "leave" ? undefined : "#B7791F", borderColor: "#EAB308" }}
                              disabled={locked} onClick={() => toggle(s.id, "leave")}
                              color={marks[s.id] === "leave" ? "warning" : undefined}
                            >
                              Leave
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {windowStatus !== "submitted" && !!students.length && (
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button variant="outlined" disabled={saving} onClick={() => save(false)}>Save Draft</Button>
                      <Button variant="contained" disabled={saving} onClick={() => save(true)}>Submit Final</Button>
                    </Stack>
                  )}
                </>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
      {ToastElement}
    </Box>
  );
}

function StudentAttendanceView() {
  const [month, setMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; });
  const [monthly, setMonthly] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => { api.getMyAttendance().then(setRecords); }, []);
  useEffect(() => {
    api.getMonthlyAttendance(month.year, month.month).then(setMonthly);
  }, [month]);

  const shiftMonth = (delta) => {
    setMonth(({ year, month: m }) => {
      let newMonth = m + delta, newYear = year;
      if (newMonth < 1) { newMonth = 12; newYear -= 1; }
      if (newMonth > 12) { newMonth = 1; newYear += 1; }
      return { year: newYear, month: newMonth };
    });
  };

  const monthLabel = new Date(month.year, month.month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const recordsThisMonth = records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === month.year && d.getMonth() + 1 === month.month;
  });

  return (
    <Box>
      <Typography variant="h5" className="page-title">My Attendance</Typography>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton size="small" onClick={() => shiftMonth(-1)}><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 160, textAlign: "center" }}>{monthLabel}</Typography>
        <IconButton size="small" onClick={() => shiftMonth(1)}><ChevronRightIcon /></IconButton>
      </Stack>

      {monthly && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}><StatCard label="Attendance %" value={`${monthly.percentage}%`} icon={<EventAvailableIcon />} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Conducted" value={monthly.conducted_classes} icon={<ViewModuleIcon />} color="#0F9D58" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Present" value={monthly.present} icon={<CheckIcon />} color="#22c55e" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Leave" value={monthly.leave} icon={<EventAvailableIcon />} color="#eab308" /></Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Regular: {monthly.regular_classes} · Holiday: {monthly.holiday_classes} · Compensation: {monthly.compensation_classes}
          </Typography>
        </>
      )}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "auto", mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Date</TableCell><TableCell>Status</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {recordsThisMonth.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!recordsThisMonth.length && <EmptyState message="No attendance marked for this month." />}
      </Paper>
    </Box>
  );
}

/* ============================================================
   CALENDAR PAGE
   - Admin: defines the weekly recurring pattern per batch (day + time),
     marks holidays (batch or whole branch) and adds one-off compensation
     classes. Sessions for the month are auto-generated from the pattern.
   - Assistant/Student: read-only, scoped to their own batch, with a
     colored dot per day — 🟢 present, 🟡 leave, 🔵 holiday, 🟣 compensation.
   ============================================================ */
export function CalendarPage() {
  const { role, profile } = useAuth();
  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [batchId, setBatchId] = useState(isAdmin ? "" : profile?.batch_id || "");
  const [month, setMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; });
  const [days, setDays] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [compDialog, setCompDialog] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(null);
  const [leaveDialogSession, setLeaveDialogSession] = useState(null);
  const { showToast, ToastElement } = useToast();

  useEffect(() => { if (isAdmin) api.getBranches().then(setBranches); }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    if (branchId) api.getBatches(branchId).then(setBatches);
    else setBatches([]);
    setBatchId("");
  }, [branchId, isAdmin]);

  const loadCalendar = () => {
    if (!batchId) { setDays([]); setPatterns([]); return; }
    // Sessions are generated automatically from the batch's schedule
    // (set on the Batches page) the moment this is called — no separate
    // "add weekly slot" step needed here.
    api.getCalendar(batchId, month.year, month.month).then(setDays);
    api.getPatterns(batchId).then(setPatterns);
  };
  useEffect(() => { loadCalendar(); }, [batchId, month]);

  const shiftMonth = (delta) => {
    setMonth(({ year, month: m }) => {
      let newMonth = m + delta, newYear = year;
      if (newMonth < 1) { newMonth = 12; newYear -= 1; }
      if (newMonth > 12) { newMonth = 1; newYear += 1; }
      return { year: newYear, month: newMonth };
    });
  };
  const monthLabel = new Date(month.year, month.month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const dotColor = (day) => {
    const t = day.session.session_type;
    if (t === "holiday") return CALENDAR_COLORS.holiday;
    if (t === "compensation") return CALENDAR_COLORS.compensation;
    if (day.my_status === "present") return CALENDAR_COLORS.present;
    if (day.my_status === "leave") return CALENDAR_COLORS.leave;
    return CALENDAR_COLORS.regular;
  };

  const typeLabel = (day) => {
    if (day.session.session_type === "holiday") return "Holiday";
    if (day.session.session_type === "compensation") return "Compensation Class";
    if (day.my_status === "present") return "Present";
    if (day.my_status === "leave") return "Leave";
    return "Regular Class";
  };

  const handleDeleteSession = async () => {
    try {
      await api.deleteSession(confirmDeleteSession.session.id);
      showToast("Removed from calendar");
      setConfirmDeleteSession(null);
      loadCalendar();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  return (
    <Box>
      <Typography variant="h5" className="page-title">Calendar</Typography>

      {isAdmin && (
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Branch</InputLabel>
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!branchId}>
            <InputLabel>Batch</InputLabel>
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      )}

      {!batchId ? (
        <EmptyState message={isAdmin ? "Select a branch and batch to view its calendar." : "No batch assigned yet."} />
      ) : (
        <>
          {isAdmin && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E3E9F2", mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Weekly Schedule</Typography>
                <Button size="small" onClick={() => navigate("/admin/batches")}>Edit in Batches</Button>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {patterns.map((p) => (
                  <Chip
                    key={p.id}
                    label={`${DAY_NAMES[p.day_of_week]} · ${formatTime(p.start_time)} - ${formatTime(p.end_time)}`}
                    sx={{ bgcolor: "#EAF0FC", color: "#1651B6", fontWeight: 600 }}
                  />
                ))}
                {!patterns.length && (
                  <Typography variant="body2" color="text.secondary">
                    No weekly schedule set for this batch yet — add one from the Batches page.
                  </Typography>
                )}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" startIcon={<BeachAccessIcon />} onClick={() => setHolidayDialog(true)}>Mark Holiday</Button>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCompDialog(true)}>Add Compensation Class</Button>
              </Stack>
            </Paper>
          )}

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <IconButton size="small" onClick={() => shiftMonth(-1)}><ChevronLeftIcon /></IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 160, textAlign: "center" }}>{monthLabel}</Typography>
            <IconButton size="small" onClick={() => shiftMonth(1)}><ChevronRightIcon /></IconButton>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
            {Object.entries({ Present: CALENDAR_COLORS.present, Leave: CALENDAR_COLORS.leave, Holiday: CALENDAR_COLORS.holiday, Compensation: CALENDAR_COLORS.compensation }).map(([label, color]) => (
              <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Stack>
            ))}
          </Stack>

          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                  {isAdmin && <TableCell align="right">Actions</TableCell>}
                  {isStudent && <TableCell align="right">Leave</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.session.id}>
                    <TableCell><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: dotColor(d) }} /></TableCell>
                    <TableCell>{formatDate(d.session.date)}</TableCell>
                    <TableCell>{d.session.start_time ? `${formatTime(d.session.start_time)} - ${formatTime(d.session.end_time)}` : "-"}</TableCell>
                    <TableCell>{typeLabel(d)}</TableCell>
                    <TableCell>{d.session.notes || "-"}</TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => setConfirmDeleteSession(d)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                      </TableCell>
                    )}
                    {isStudent && (
                      <TableCell align="right">
                        {d.session.session_type !== "holiday" && d.session.date >= todayISO() && d.my_status !== "leave" ? (
                          <Button size="small" onClick={() => setLeaveDialogSession(d.session)}>Apply Leave</Button>
                        ) : d.my_status === "leave" ? (
                          <Chip size="small" label="Leave Requested" sx={{ bgcolor: "#FEF3C7", color: "#92400E", fontWeight: 600 }} />
                        ) : "-"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!days.length && (
              <EmptyState message={patterns.length ? "No classes this month." : "No classes yet — set this batch's weekly schedule from the Batches page."} />
            )}
          </Paper>
        </>
      )}

      {leaveDialogSession && (
        <LeaveRequestDialog
          session={leaveDialogSession}
          onClose={() => setLeaveDialogSession(null)}
          onSave={async (data) => {
            try {
              await api.createLeaveRequest({ session_id: leaveDialogSession.id, ...data });
              showToast("Leave request submitted");
              setLeaveDialogSession(null);
              loadCalendar();
            } catch (err) {
              showToast(apiErrorMessage(err), "error");
            }
          }}
        />
      )}

      {holidayDialog && (
        <HolidayDialog
          branchId={branchId}
          batchId={batchId}
          onClose={() => setHolidayDialog(false)}
          onSave={async (data) => {
            try {
              await api.createHoliday(data);
              showToast("Holiday marked");
              setHolidayDialog(false);
              loadCalendar();
            } catch (err) {
              showToast(apiErrorMessage(err), "error");
            }
          }}
        />
      )}

      {compDialog && (
        <CompensationDialog
          onClose={() => setCompDialog(false)}
          onSave={async (data) => {
            try {
              await api.createCompensation({ ...data, batch_id: Number(batchId) });
              showToast("Compensation class added");
              setCompDialog(false);
              loadCalendar();
            } catch (err) {
              showToast(apiErrorMessage(err), "error");
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteSession}
        title="Remove from Calendar"
        message="Remove this entry from the calendar?"
        onCancel={() => setConfirmDeleteSession(null)}
        onConfirm={handleDeleteSession}
      />
      {ToastElement}
    </Box>
  );
}

function HolidayDialog({ branchId, batchId, onClose, onSave }) {
  const [scope, setScope] = useState("batch"); // "batch" | "branch"
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = scope === "branch" ? { branch_id: Number(branchId), date, notes } : { batch_id: Number(batchId), date, notes };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark Holiday</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <RadioGroup row value={scope} onChange={(e) => setScope(e.target.value)}>
            <FormControlLabel value="batch" control={<Radio />} label="This batch only" />
            <FormControlLabel value="branch" control={<Radio />} label="Entire branch" />
          </RadioGroup>
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Mark Holiday"}</Button>
      </DialogActions>
    </Dialog>
  );
}

function CompensationDialog({ onClose, onSave }) {
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [teacher, setTeacher] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ date, start_time: startTime, end_time: endTime, teacher, notes });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Compensation Class</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Start Time</InputLabel>
            <Select label="Start Time" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
              {TIME_OPTIONS.map((t) => <MenuItem key={t} value={t}>{formatTime(t)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>End Time</InputLabel>
            <Select label="End Time" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
              {TIME_OPTIONS.map((t) => <MenuItem key={t} value={t}>{formatTime(t)}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} fullWidth />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
      </DialogActions>
    </Dialog>
  );
}

function LeaveRequestDialog({ session, onClose, onSave }) {
  const [reasonCategory, setReasonCategory] = useState(LEAVE_REASON_CATEGORIES[0]);
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ reason_category: reasonCategory, custom_reason: reasonCategory === "Other" ? customReason : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Apply for Leave</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {formatDate(session.date)} · {formatTime(session.start_time)} - {formatTime(session.end_time)}
          </Typography>
          <FormControl fullWidth required>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
              {LEAVE_REASON_CATEGORIES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          {reasonCategory === "Other" && (
            <TextField label="Please specify" value={customReason} onChange={(e) => setCustomReason(e.target.value)} required multiline minRows={2} fullWidth />
          )}
          <Typography variant="caption" color="text.secondary">
            This lets your teacher know in advance — it's recorded as a leave, not an absence.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || (reasonCategory === "Other" && !customReason)}>
          {saving ? "Submitting..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============================================================
   FEES PAGE
   - Admin: filters by Branch → Batch (avoids one giant list), fees
     grouped by billing month, logs records directly, and reviews
     (approve/reject) payments students submitted themselves.
   - Student: submits a payment for a chosen month (cash needs remarks;
     UPI/bank take a receipt) and sees history grouped by month, so it's
     easy to check which months are paid.
   ============================================================ */
export function FeesPage() {
  const { role } = useAuth();
  if (role === "student") return <StudentFeesView />;
  return <AdminFeesView />;
}

function groupByMonth(fees) {
  const groups = {};
  fees.forEach((f) => {
    const key = f.billing_month || "Unspecified";
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function AdminFeesView() {
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { showToast, ToastElement } = useToast();

  useEffect(() => { api.getBranches().then(setBranches); }, []);
  useEffect(() => {
    if (branchId) api.getBatches(branchId).then(setBatches);
    else setBatches([]);
    setBatchId("");
  }, [branchId]);

  const load = () => {
    if (!batchId) { setFees([]); return; }
    api.getFees({ batch_id: batchId }).then(setFees);
    api.getStudents(batchId).then(setStudents);
  };
  useEffect(() => { load(); }, [batchId]);

  const studentName = (id) => students.find((s) => s.id === id)?.name || `#${id}`;

  const handleSave = async (form) => {
    try {
      const payload = { ...form, student_id: Number(form.student_id), amount: Number(form.amount) };
      if (dialog.mode === "edit") await api.updateFee(dialog.data.id, payload);
      else await api.createFee(payload);
      showToast(dialog.mode === "edit" ? "Fee updated" : "Fee record created");
      setDialog(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteFee(confirmDelete.id);
      showToast("Fee record deleted");
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const handleReview = async (fee, status) => {
    try {
      await api.reviewFee(fee.id, status);
      showToast(status === "approved" ? "Payment approved" : "Payment rejected");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="section-gap" flexWrap="wrap" gap={1}>
        <Typography variant="h5" className="page-title" sx={{ mb: 0 }}>Fees</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          disabled={!students.length}
          onClick={() => setDialog({ mode: "create", data: { student_id: students[0]?.id || "", amount: "", billing_month: currentBillingMonth(), status: "pending", payment_method: "cash", remarks: "" } })}
        >
          Add Fee Record
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Branch</InputLabel>
          <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!branchId}>
          <InputLabel>Batch</InputLabel>
          <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {!batchId ? (
        <EmptyState message="Select a branch and batch to view its fee records." />
      ) : (
        <Stack spacing={2}>
          {groupByMonth(fees).map(([month, monthFees]) => (
            <Paper key={month} elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "hidden" }}>
              <Box sx={{ px: 2, py: 1.5, bgcolor: "#F6F8FC", borderBottom: "1px solid #E3E9F2" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {month === "Unspecified" ? month : formatBillingMonth(month)}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {monthFees.length} record{monthFees.length !== 1 ? "s" : ""}
                  </Typography>
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthFees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{studentName(f.student_id)}</TableCell>
                      <TableCell>{formatCurrency(f.amount)}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>{f.payment_method?.replace("_", " ") || "-"}</TableCell>
                      <TableCell><StatusChip status={f.status} /></TableCell>
                      <TableCell>
                        {f.receipt_path ? (
                          <a href={`/uploads/${f.receipt_path}`} target="_blank" rel="noreferrer">View</a>
                        ) : "-"}
                      </TableCell>
                      <TableCell align="right">
                        {f.status === "pending" && f.payment_method && (
                          <>
                            <IconButton size="small" color="success" onClick={() => handleReview(f, "approved")}><ThumbUpIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleReview(f, "rejected")}><ThumbDownIcon fontSize="small" /></IconButton>
                          </>
                        )}
                        <IconButton size="small" onClick={() => setDialog({ mode: "edit", data: f })}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => setConfirmDelete(f)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ))}
          {!fees.length && <EmptyState message="No fee records for this batch yet." />}
        </Stack>
      )}

      {dialog && (
        <FormDialog
          title={dialog.mode === "edit" ? "Edit Fee Record" : "Add Fee Record"}
          initial={dialog.data}
          fields={[
            { name: "student_id", label: "Student", select: true, options: students.map((s) => ({ value: s.id, label: `${s.name} (${s.student_code})` })), required: true, disabledIf: dialog.mode === "edit" },
            { name: "amount", label: "Amount (₹)", type: "number", required: true },
            { name: "billing_month", label: "Billing Month", select: true, options: recentBillingMonths(18).map((m) => ({ value: m, label: formatBillingMonth(m) })), required: true },
            { name: "payment_method", label: "Payment Method", select: true, options: [{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "bank_transfer", label: "Bank Transfer" }] },
            { name: "status", label: "Status", select: true, options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] },
            { name: "payment_date", label: "Payment Date", type: "date" },
            { name: "remarks", label: "Remarks", multiline: true },
          ]}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Fee Record"
        message="Delete this fee record permanently?"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
      {ToastElement}
    </Box>
  );
}

function StudentFeesView() {
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState({ amount: "", billing_month: currentBillingMonth(), payment_method: "cash", remarks: "" });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast, ToastElement } = useToast();

  const load = () => api.getMyFees().then(setFees);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.payment_method === "cash" && !form.remarks.trim()) {
      showToast("Remarks are required when paying by cash", "error");
      return;
    }
    setSubmitting(true);
    try {
      const fee = await api.submitMyFee({
        amount: Number(form.amount), billing_month: form.billing_month,
        payment_method: form.payment_method, remarks: form.remarks || undefined,
      });
      if (form.payment_method !== "cash" && file) {
        await api.uploadMyReceipt(fee.id, file);
      }
      showToast("Payment submitted for review");
      setForm({ amount: "", billing_month: currentBillingMonth(), payment_method: "cash", remarks: "" });
      setFile(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" className="page-title">My Fees</Typography>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2", mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Submit a Payment</Typography>
        <form onSubmit={submit}>
          <Stack spacing={2} sx={{ maxWidth: 420 }}>
            <FormControl fullWidth required>
              <InputLabel>Billing Month</InputLabel>
              <Select label="Billing Month" value={form.billing_month} onChange={(e) => setForm((f) => ({ ...f, billing_month: e.target.value }))}>
                {recentBillingMonths(12).map((m) => <MenuItem key={m} value={m}>{formatBillingMonth(m)}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Amount (₹)" type="number" required
              value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <FormControl>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>Payment Method</Typography>
              <RadioGroup
                row value={form.payment_method}
                onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              >
                <FormControlLabel value="cash" control={<Radio />} label="Cash" />
                <FormControlLabel value="upi" control={<Radio />} label="UPI" />
                <FormControlLabel value="bank_transfer" control={<Radio />} label="Bank Transfer" />
              </RadioGroup>
            </FormControl>
            {form.payment_method === "cash" ? (
              <TextField
                label="Remarks" required multiline minRows={2} placeholder="e.g. Paid in Cash to Teacher"
                value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              />
            ) : (
              <Button component="label" variant="outlined">
                {file ? file.name : "Upload Receipt (JPG, PNG, or PDF)"}
                <input type="file" hidden accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Stack spacing={2}>
        {groupByMonth(fees).map(([month, monthFees]) => (
          <Paper key={month} elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: "#F6F8FC", borderBottom: "1px solid #E3E9F2" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {month === "Unspecified" ? month : formatBillingMonth(month)}
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Amount</TableCell><TableCell>Method</TableCell><TableCell>Status</TableCell><TableCell>Remarks</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {monthFees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{formatCurrency(f.amount)}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>{f.payment_method?.replace("_", " ") || "-"}</TableCell>
                    <TableCell><StatusChip status={f.status} /></TableCell>
                    <TableCell>{f.remarks || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))}
        {!fees.length && <EmptyState message="No fee records yet." />}
      </Stack>
      {ToastElement}
    </Box>
  );
}

/* ============================================================
   ANNOUNCEMENTS PAGE
   ============================================================ */
export function AnnouncementsPage() {
  const { role, profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [branches, setBranches] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { showToast, ToastElement } = useToast();

  const scopeBatchId = role === "admin" ? undefined : profile?.batch_id;

  const load = () => {
    api.getAnnouncements(scopeBatchId).then(setAnnouncements);
    if (role === "admin") api.getBranches().then(setBranches);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      await api.createAnnouncement(form);
      showToast("Announcement posted");
      setDialogOpen(false);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  };

  const scopeLabel = (a) => {
    if (a.batch_id) return null; // resolved to a name in the dialog's branch list is overkill here; keep it simple
    if (a.branch_id) return "Branch-wide";
    return "Everyone";
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="section-gap">
        <Typography variant="h5" className="page-title" sx={{ mb: 0 }}>Announcements</Typography>
        {role === "admin" && (
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
            New Announcement
          </Button>
        )}
      </Stack>
      {announcements.length ? (
        <Stack spacing={2}>
          {announcements.map((a) => (
            <Card key={a.id} elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                  {role === "admin" && scopeLabel(a) && (
                    <Chip size="small" label={scopeLabel(a)} sx={{ bgcolor: "#EAF0FC", color: "#1651B6", fontWeight: 600 }} />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ my: 1 }}>{a.message}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDateTime(a.created_at)}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <EmptyState message="No announcements yet." />
      )}

      {dialogOpen && (
        <AnnouncementDialog branches={branches} onClose={() => setDialogOpen(false)} onSave={handleSave} />
      )}
      {ToastElement}
    </Box>
  );
}

function AnnouncementDialog({ branches, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [branchId, setBranchId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branchId) api.getBatches(branchId).then(setBatches);
    else setBatches([]);
    setBatchId("");
  }, [branchId]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        title, message,
        branch_id: branchId ? Number(branchId) : null,
        batch_id: batchId ? Number(batchId) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Announcement</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
          <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} required multiline minRows={3} fullWidth />
          <Divider>Target Audience</Divider>
          <FormControl fullWidth>
            <InputLabel>Branch</InputLabel>
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <MenuItem value="">All Branches</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth disabled={!branchId}>
            <InputLabel>Batch</InputLabel>
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <MenuItem value="">All Batches{branchId ? " in this branch" : ""}</MenuItem>
              {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {!branchId && "This will be sent to every branch and every batch."}
            {branchId && !batchId && "This will be sent to every batch in the selected branch."}
            {branchId && batchId && "This will be sent to the selected batch only."}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !title || !message}>{saving ? "Posting..." : "Post"}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============================================================
   CHAT PAGE (batch-wise)
   ============================================================ */
export function ChatPage() {
  const { role, profile } = useAuth();
  const isAdmin = role === "admin";
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]); // for labeling batch names in the aggregated view
  const [branchId, setBranchId] = useState("");
  const [batchId, setBatchId] = useState(isAdmin ? "" : profile?.batch_id || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (isAdmin) {
      api.getBranches().then(setBranches);
      api.getBatches().then(setAllBatches);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (branchId) api.getBatches(branchId).then(setBatches);
    else setBatches([]);
    setBatchId("");
  }, [branchId, isAdmin]);

  const isAggregated = isAdmin && !batchId; // "All Batches" (within a branch, or globally)

  const load = () => {
    if (isAdmin) {
      if (batchId) api.getChatMessages(batchId).then(setMessages);
      else api.getChatScoped(branchId ? { branch_id: branchId } : {}).then(setMessages);
    } else if (batchId) {
      api.getChatMessages(batchId).then(setMessages);
    }
  };
  useEffect(() => {
    if (!isAdmin && !batchId) return;
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [batchId, branchId, isAdmin]);

  const send = async () => {
    if (!text.trim()) return;
    if (isAggregated) {
      await api.broadcastChatMessage({ message: text.trim(), branch_id: branchId || undefined });
    } else if (batchId) {
      await api.postChatMessage({ batch_id: batchId, message: text.trim() });
    } else {
      return;
    }
    setText("");
    load();
  };

  const batchName = (id) => allBatches.find((b) => b.id === id)?.name || `Batch #${id}`;

  return (
    <Box>
      <Typography variant="h5" className="page-title">Chat</Typography>
      {isAdmin && (
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Branch</InputLabel>
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <MenuItem value="">All Branches</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!branchId}>
            <InputLabel>Batch</InputLabel>
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <MenuItem value="">All Batches</MenuItem>
              {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      )}
      {!isAdmin && !batchId ? (
        <EmptyState message="No batch assigned yet." />
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E3E9F2", p: 2, display: "flex", flexDirection: "column", height: "60vh" }}>
          {isAggregated && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Viewing {branchId ? "every batch in this branch" : "every branch and batch"} — messages shown here are read-only history from each batch's own chat; sending broadcasts one message to all of them at once.
            </Alert>
          )}
          <Box sx={{ flexGrow: 1, overflowY: "auto", mb: 2 }}>
            {messages.length ? (
              messages.map((m) => (
                <Box key={m.id} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#1651B6" }}>
                    {m.sender_name}{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({m.sender_role}{isAggregated ? ` · ${batchName(m.batch_id)}` : ""})
                    </Typography>
                  </Typography>
                  <Typography variant="body2">{m.message}</Typography>
                </Box>
              ))
            ) : (
              <EmptyState message="No messages yet. Say hello!" />
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder={isAggregated ? "Broadcast a message to this scope..." : "Type a message..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <IconButton color="primary" onClick={send}><SendIcon /></IconButton>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

/* ============================================================
   SETTINGS PAGE (admin)
   ============================================================ */
/* ============================================================
   REPORTS PAGE (student) — Monthly Reports: pick a month, view the
   finalized attendance report, download it. Only shown once every
   class scheduled for that month has actually happened.
   ============================================================ */
export function ReportsPage() {
  const months = recentMonths(12);
  const [selected, setSelected] = useState(`${months[0].year}-${months[0].month}`);
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const { showToast, ToastElement } = useToast();

  const [year, month] = selected.split("-").map(Number);

  useEffect(() => {
    api.getMonthlyReport(year, month).then(setReport).catch(() => setReport(null));
  }, [year, month]);

  const download = async () => {
    setDownloading(true);
    try {
      await api.downloadMonthlyReport(year, month);
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" className="page-title">Monthly Reports</Typography>

      <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
        <InputLabel>Month</InputLabel>
        <Select label="Month" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {months.map((m) => <MenuItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</MenuItem>)}
        </Select>
      </FormControl>

      {!report ? (
        <LoadingScreen />
      ) : !report.is_finalized ? (
        <EmptyState message={`${report.month_label} is still in progress — the report finalizes once every scheduled class this month has happened.`} />
      ) : (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{report.month_label} Attendance Report</Typography>
            <StarIndicator star={report.star} percentage={report.attendance_percentage} />
          </Stack>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}><StatCard label="Total Scheduled" value={report.total_scheduled} icon={<ViewModuleIcon />} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Attended" value={report.attended} icon={<CheckIcon />} color="#22c55e" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Missed" value={report.missed} icon={<CloseIcon />} color="#ef4444" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Prior Leaves" value={report.prior_leaves} icon={<EventAvailableIcon />} color="#eab308" /></Grid>
          </Grid>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Student: {report.student_name} ({report.student_code}) · {report.branch_name} · {report.batch_name}
          </Typography>
          <Button variant="contained" onClick={download} disabled={downloading}>
            {downloading ? "Downloading..." : "Download Report (Excel)"}
          </Button>
        </Paper>
      )}
      {ToastElement}
    </Box>
  );
}

export function SettingsPage() {
  const [about, setAbout] = useState(null);

  useEffect(() => { api.getPublicConfig().then((c) => setAbout(c.about)); }, []);

  return (
    <Box>
      <Typography variant="h5" className="page-title">Settings</Typography>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E3E9F2" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>About {ACADEMY_NAME}</Typography>
        {about ? (
          about.split("\n\n").map((para, i) => (
            <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: i < about.split("\n\n").length - 1 ? 1.5 : 0 }}>
              {para}
            </Typography>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">Loading...</Typography>
        )}
      </Paper>
    </Box>
  );
}

/* ============================================================
   Shared generic form dialog used by the CRUD pages above
   ============================================================ */
function FormDialog({ title, initial, fields, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map((f) =>
            f.select ? (
              <FormControl key={f.name} fullWidth required={f.required} disabled={f.disabledIf}>
                <InputLabel>{f.label}</InputLabel>
                <Select
                  label={f.label}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                >
                  {!f.required && <MenuItem value="">None</MenuItem>}
                  {f.options.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                key={f.name}
                label={f.label}
                type={f.type || "text"}
                required={f.required}
                multiline={f.multiline}
                minRows={f.multiline ? 2 : undefined}
                fullWidth
                value={form[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
                InputLabelProps={f.type === "date" || f.type === "time" ? { shrink: true } : undefined}
              />
            )
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
