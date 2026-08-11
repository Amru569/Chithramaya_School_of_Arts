/**
 * services.js
 * Every call to the FastAPI backend lives here. Uses a shared axios
 * instance with credentials so the session cookie is always sent.
 */
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ---------- Public config (academy name + logo + about text) ----------
export const getPublicConfig = () => api.get("/config").then((r) => r.data);

// ---------- Auth ----------
export const loginStaff = (username, password) =>
  api.post("/auth/login/staff", { username, password }).then((r) => r.data);

export const loginStudent = (mobile, student_code) =>
  api.post("/auth/login/student", { mobile, student_code }).then((r) => r.data);

/** Self-registration is multipart so an optional photo can go in the
 * same request, before the student ever logs in. Pass a plain object;
 * this builds the FormData (including the file, if present). */
export const registerStudent = (fields, photoFile) => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") form.append(k, v);
  });
  if (photoFile) form.append("photo", photoFile);
  return api.post("/students/register", form).then((r) => r.data);
};

export const logout = () => api.post("/auth/logout").then((r) => r.data);

export const getMe = () => api.get("/auth/me").then((r) => r.data);

// ---------- Branches ----------
export const getBranches = () => api.get("/branches").then((r) => r.data);
export const createBranch = (data) => api.post("/branches", data).then((r) => r.data);
export const updateBranch = (id, data) => api.put(`/branches/${id}`, data).then((r) => r.data);
export const deleteBranch = (id) => api.delete(`/branches/${id}`).then((r) => r.data);

// ---------- Batches ----------
export const getBatches = (branchId) =>
  api.get("/batches", { params: branchId ? { branch_id: branchId } : {} }).then((r) => r.data);
export const createBatch = (data) => api.post("/batches", data).then((r) => r.data);
export const updateBatch = (id, data) => api.put(`/batches/${id}`, data).then((r) => r.data);
export const deleteBatch = (id) => api.delete(`/batches/${id}`).then((r) => r.data);

// ---------- Students ----------
export const getStudents = (batchId) =>
  api.get("/students", { params: batchId ? { batch_id: batchId } : {} }).then((r) => r.data);
export const createStudent = (data) => api.post("/students", data).then((r) => r.data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then((r) => r.data);
export const deleteStudent = (id) => api.delete(`/students/${id}`).then((r) => r.data);
export const uploadStudentPhoto = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/students/${id}/photo`, form).then((r) => r.data);
};
export const getStudentsExportJson = (params = {}) => api.get("/students/export", { params: { ...params, format: "json" } }).then((r) => r.data);

/** Downloads a binary file (xlsx, etc.) from an authenticated endpoint
 * and triggers a browser save — axios needs responseType 'blob' for
 * this, and the filename comes from the response headers. */
async function downloadFile(url, params, fallbackName) {
  const res = await api.get(url, { params, responseType: "blob" });
  const disposition = res.headers["content-disposition"] || "";
  const match = disposition.match(/filename=([^;]+)/);
  const filename = match ? match[1].trim() : fallbackName;
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
export const downloadStudentsExport = (params = {}) => downloadFile("/students/export", { ...params, format: "xlsx" }, "students.xlsx");
export const downloadMonthlyReport = (year, month, studentId) =>
  downloadFile(studentId ? `/reports/monthly/${studentId}` : "/reports/monthly/mine", { year, month, format: "xlsx" }, `report-${year}-${month}.xlsx`);

// ---------- Weekly recurring class patterns ----------
export const getPatterns = (batchId) =>
  api.get("/schedule-patterns", { params: batchId ? { batch_id: batchId } : {} }).then((r) => r.data);
export const createPattern = (data) => api.post("/schedule-patterns", data).then((r) => r.data);
export const deletePattern = (id) => api.delete(`/schedule-patterns/${id}`).then((r) => r.data);
/** Sets a batch's full weekly schedule (one or more day/time slots) in
 * one call — this is what the Batches form uses so the calendar stays
 * automatically in sync with no separate "add weekly slot" step. */
export const replaceBatchPatterns = (batchId, patterns) =>
  api.put(`/batches/${batchId}/patterns`, { patterns }).then((r) => r.data);

// ---------- Calendar (generated sessions) ----------
export const getCalendar = (batchId, year, month) =>
  api.get("/calendar", { params: { batch_id: batchId, year, month } }).then((r) => r.data);
export const createHoliday = (data) => api.post("/calendar/holiday", data).then((r) => r.data);
export const createCompensation = (data) => api.post("/calendar/compensation", data).then((r) => r.data);
export const deleteSession = (id) => api.delete(`/calendar/session/${id}`).then((r) => r.data);

// ---------- Attendance ----------
export const getSessions = (params = {}) => api.get("/sessions", { params }).then((r) => r.data);
export const getMySessions = () => api.get("/sessions/mine").then((r) => r.data);
export const getSessionAttendance = (sessionId) => api.get(`/attendance/session/${sessionId}`).then((r) => r.data);
export const saveAttendance = (data) => api.post("/attendance", data).then((r) => r.data);
export const getAttendance = (batchId) =>
  api.get("/attendance", { params: batchId ? { batch_id: batchId } : {} }).then((r) => r.data);
export const getMyAttendance = () => api.get("/attendance/mine").then((r) => r.data);
export const getMonthlyAttendance = (year, month, studentId) =>
  api.get("/attendance/monthly", { params: studentId ? { year, month, student_id: studentId } : { year, month } }).then((r) => r.data);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`).then((r) => r.data);
export const getMonthlyReport = (year, month, studentId) =>
  api.get(studentId ? `/reports/monthly/${studentId}` : "/reports/monthly/mine", { params: { year, month } }).then((r) => r.data);

// ---------- Prior leave requests (kept separate from Chat) ----------
export const createLeaveRequest = (data) => api.post("/leave-requests", data).then((r) => r.data);
export const getMyLeaveRequests = () => api.get("/leave-requests/mine").then((r) => r.data);
export const getSessionLeaveRequests = (sessionId) => api.get(`/leave-requests/session/${sessionId}`).then((r) => r.data);

// ---------- Fees ----------
export const getFees = (params = {}) => api.get("/fees", { params }).then((r) => r.data);
export const createFee = (data) => api.post("/fees", data).then((r) => r.data);
export const updateFee = (id, data) => api.put(`/fees/${id}`, data).then((r) => r.data);
export const deleteFee = (id) => api.delete(`/fees/${id}`).then((r) => r.data);
export const uploadReceipt = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/fees/${id}/receipt`, form).then((r) => r.data);
};
export const getMyFees = () => api.get("/fees/mine").then((r) => r.data);
export const submitMyFee = (data) => api.post("/fees/mine", data).then((r) => r.data);
export const uploadMyReceipt = (feeId, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/fees/${feeId}/receipt/mine`, form).then((r) => r.data);
};
export const reviewFee = (feeId, status) => api.put(`/fees/${feeId}/review`, { status }).then((r) => r.data);

// ---------- Announcements ----------
export const getAnnouncements = (batchId) =>
  api.get("/announcements", { params: batchId ? { batch_id: batchId } : {} }).then((r) => r.data);
export const createAnnouncement = (data) => api.post("/announcements", data).then((r) => r.data);

// ---------- Notifications (in-app banner, polling-based) ----------
export const pollNotifications = (since) => api.get("/notifications/poll", { params: { since } }).then((r) => r.data);

// ---------- Chat ----------
export const getChatMessages = (batchId) => api.get(`/chat/${batchId}`).then((r) => r.data);
export const postChatMessage = (data) => api.post("/chat", data).then((r) => r.data);
export const broadcastChatMessage = (data) => api.post("/chat/broadcast", data).then((r) => r.data);
export const getChatScoped = (params = {}) => api.get("/chat", { params }).then((r) => r.data);

// ---------- Dashboards ----------
export const getAdminDashboard = () => api.get("/dashboard/admin").then((r) => r.data);
export const getAdminDashboardHierarchy = () => api.get("/dashboard/admin/hierarchy").then((r) => r.data);
export const getAssistantDashboard = () => api.get("/dashboard/assistant").then((r) => r.data);
export const getStudentDashboard = () => api.get("/dashboard/student").then((r) => r.data);

export default api;
