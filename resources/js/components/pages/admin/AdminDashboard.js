import React, { useEffect, useState, useRef } from "react";
import { roleLabels } from './labels';
import axios from 'axios';
import Sidebar from "./Sidebar";
import {
  FiUser,
  FiBook,
  FiUsers,
  FiFileText,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUpload,
  FiDownload,
  FiEye,
  FiCopy,
  FiCheckCircle,
  FiAward,
  FiAlertTriangle,
  FiLock,
  FiArchive,
  FiUserPlus,
  FiSearch,
  FiCalendar,
  FiActivity,
  FiClock,
} from "react-icons/fi";
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import UserFormModal from "./UserFormModal";
import CourseFormModal from "./CourseFormModal";
import UserDetailModal from "./UserDetailModal";
import AdminUsers from "./AdminUsers";
import "../../../../sass/AdminDashboard.scss";


const API = "/api/admin";

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);


// Enrollment area chart (left) sample data/options
const enrollmentLabels = ['Jan','Feb','Mar','Apr','May','Jun'];

// Helper: read CSS variables for chart colors (defined in SCSS). This keeps
// color values out of JS source code and centralizes them in stylesheets.
const getChartColors = () => {
  try {
    const s = getComputedStyle(document.documentElement);
    const students = s.getPropertyValue('--chart-students') || '';
    const studentsFill = s.getPropertyValue('--chart-students-fill') || '';
    const teachers = s.getPropertyValue('--chart-teachers') || '';
    const teachersFill = s.getPropertyValue('--chart-teachers-fill') || '';
    return {
      students: students.trim() || undefined,
      studentsFill: studentsFill.trim() || undefined,
      teachers: teachers.trim() || undefined,
      teachersFill: teachersFill.trim() || undefined,
    };
  } catch (e) {
    return {};
  }
};

// Factory to create enrollment chart data from stats or defaults. This is
// intentionally a pure function so the chart data can be produced on demand
// and only when we want it to update (for example, after a user is added).
const makeEnrollmentData = (statsData = {}) => {
  const colors = (typeof window !== 'undefined') ? getChartColors() : {};
  // Prefer server-provided series if present, otherwise fall back to sensible
  // sample data so the chart always has values to render.
  const studentsSeries = Array.isArray(statsData.students_series) && statsData.students_series.length ? statsData.students_series : [1020, 1080, 1130, 1170, 1190, 1210];
  const teachersSeries = Array.isArray(statsData.teachers_series) && statsData.teachers_series.length ? statsData.teachers_series : [45, 46, 47, 48, 48, 49];

  return {
    labels: enrollmentLabels,
    datasets: [
      {
        label: 'Students',
        data: studentsSeries,
        fill: true,
        backgroundColor: colors.studentsFill || undefined,
        borderColor: colors.students || undefined,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: colors.students || undefined,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#fff',
      },
      {
        label: 'Teachers',
        data: teachersSeries,
        fill: false,
        borderColor: colors.teachers || undefined,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: colors.teachers || undefined,
        pointHoverRadius: 6,
      }
    ]
  };
};

const enrollmentOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { usePointStyle: true } },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0,0,0,0.75)',
      callbacks: {
        // hide the title so the month label (e.g. 'Apr') is not shown in the tooltip
        title: () => ''
      }
    }
  },
  interaction: { mode: 'nearest', intersect: false },
  animation: { duration: 700, easing: 'easeOutCubic' },
  scales: {
    x: { grid: { display: false }, ticks: { display: false } },
    y: { grid: { color: '#eef4fb' }, ticks: { color: '#6b7280' }, beginAtZero: true }
  }
};

// Attendance bar chart (right) sample data/options
const attendanceLabels = ['Mon','Tue','Wed','Thu','Fri'];

const makeAttendanceData = (presentSeries = [], absentSeries = []) => {
  const colors = (typeof window !== 'undefined') ? getChartColors() : {};
  const presentColor = colors.attendancePresent || getComputedStyle(document.documentElement).getPropertyValue('--chart-attendance-present').trim();
  const presentFill = colors.attendancePresentFill || getComputedStyle(document.documentElement).getPropertyValue('--chart-attendance-present-fill').trim();
  const absentColor = colors.attendanceAbsent || getComputedStyle(document.documentElement).getPropertyValue('--chart-attendance-absent').trim();
  const absentFill = colors.attendanceAbsentFill || getComputedStyle(document.documentElement).getPropertyValue('--chart-attendance-absent-fill').trim();

  return {
    labels: attendanceLabels,
    datasets: [
      {
        label: 'present',
        data: presentSeries.length ? presentSeries : [0,0,0,0,0],
        /* scriptable background so we can draw a nice gradient using the chart canvas */
        backgroundColor: (context) => {
          try {
            const chart = context.chart;
            const ctx = chart.ctx;
            const h = chart.height || 240;
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, presentColor || presentFill || 'rgba(37,99,235,0.8)');
            g.addColorStop(1, presentFill || (presentColor + '22') || 'rgba(59,130,246,0.12)');
            return g;
          } catch (e) {
            return presentColor || presentFill;
          }
        },
        borderColor: presentColor || undefined,
        borderRadius: 8,
        barThickness: 32,
      },
      {
        label: 'absent',
        data: absentSeries.length ? absentSeries : [0,0,0,0,0],
        backgroundColor: (context) => {
          try {
            const chart = context.chart;
            const ctx = chart.ctx;
            const h = chart.height || 240;
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, absentColor || absentFill || 'rgba(239,68,68,0.9)');
            g.addColorStop(1, absentFill || (absentColor + '22') || 'rgba(239,68,68,0.12)');
            return g;
          } catch (e) {
            return absentColor || absentFill;
          }
        },
        borderColor: absentColor || undefined,
        borderRadius: 8,
        barThickness: 32,
      }
    ]
  };
};

// Try to extract weekly attendance series arrays from server-provided `stats`.
// We accept multiple possible key shapes to be tolerant to backend changes.
const getWeeklyAttendanceFromStats = (s) => {
  const labelsLen = attendanceLabels.length || 5;
  if (!s || typeof s !== 'object') return { present: Array(labelsLen).fill(0), absent: Array(labelsLen).fill(0) };

  const tryGet = (obj, key) => {
    try {
      if (!obj) return undefined;
      const v = obj[key];
      if (Array.isArray(v)) return v;
      return undefined;
    } catch (e) { return undefined; }
  };

  let present = tryGet(s, 'weekly_present') || tryGet(s, 'attendance_week_present') || tryGet(s, 'weeklyAttendancePresent') || undefined;
  let absent = tryGet(s, 'weekly_absent') || tryGet(s, 'attendance_week_absent') || tryGet(s, 'weeklyAttendanceAbsent') || undefined;

  // support nested object like s.attendance_week = { present: [...], absent: [...] }
  if ((!present || !absent) && s.attendance_week && typeof s.attendance_week === 'object') {
    present = present || (Array.isArray(s.attendance_week.present) ? s.attendance_week.present : undefined);
    absent = absent || (Array.isArray(s.attendance_week.absent) ? s.attendance_week.absent : undefined);
  }

  // Normalize to numbers and ensure length matches labels; pad with zeros if needed
  const toNumArr = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(v => { const n = Number(v); return Number.isFinite(n) ? n : 0; });
  };

  present = toNumArr(present);
  absent = toNumArr(absent);

  // If both empty, try fallback: some APIs provide a single 'attendances' array
  if ((!present || !present.length) && Array.isArray(s.attendances)) {
    // assume attendances alternates present values or maps to present only
    present = s.attendances.slice(0, labelsLen).map(v => Number(v) || 0);
  }

  // pad/slice
  while (present.length < labelsLen) present.push(0);
  while (absent.length < labelsLen) absent.push(0);
  if (present.length > labelsLen) present = present.slice(0, labelsLen);
  if (absent.length > labelsLen) absent = absent.slice(0, labelsLen);

  return { present, absent };
};

const attendanceOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom' }, tooltip: { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-tooltip-bg') || 'rgba(0,0,0,0.75)' } },
  scales: { x: { grid: { display: false }, ticks: { color: '#6b7280' } }, y: { grid: { color: '#eef4fb' }, ticks: { color: '#6b7280' }, beginAtZero: true } }
};
const MetricCard = ({ icon: Icon, title, value, color, onClick }) => (
  <div className={`metric-card ${color}`} onClick={onClick}>
    <div className="icon-box">
      <Icon />
    </div>
    <div className="metric-info">
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  </div>
);

export default function AdminDashboard({ initialPage = null }) {
  const [activePage, setActivePage] = useState(initialPage || "dashboard");
  const [users, setUsers] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [stats, setStats] = useState({});
  const [enrollmentChartData, setEnrollmentChartData] = useState(() => makeEnrollmentData({}));
  const enrollmentInitedRef = useRef(false);
  const [activities, setActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalRole, setModalRole] = useState("student");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [coursesList, setCoursesList] = useState([]);
  const [docModal, setDocModal] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2024-2025");
  const openDocModal = (data) => setDocModal(data);
  const closeDocModal = () => setDocModal(null);
  const pollRef = useRef(null);
  const POLL_INTERVAL = 15000; // ms - poll every 15s as a safe default

  // Update enrollment chart whenever stats change
  useEffect(() => {
    if (stats && Object.keys(stats).length > 0) {
      setEnrollmentChartData(makeEnrollmentData(stats));
    }
  }, [stats]);

  useEffect(() => {
    fetchAll();
    // try to fetch activities as well on mount
    fetchActivities().catch(() => {});

    // setup polling as a fallback (in case broadcasting/Echo isn't configured)
    pollRef.current = setInterval(() => {
      fetchAll();
      fetchActivities().catch(() => {});
    }, POLL_INTERVAL);

    // listen for in-app events emitted by other admin pages/components
    const onUsersChanged = () => { fetchAll().catch(() => {}); };
    const onActivitiesChanged = () => { fetchActivities().catch(() => {}); };
    window.addEventListener('admin:users-changed', onUsersChanged);
    window.addEventListener('admin:activities-changed', onActivitiesChanged);

    // Update enrollment chart when a new user is created
    const onUserCreated = async (ev) => {
      try {
        // refetch stats and users to keep dashboard accurate
        const result = await fetchAll();
        // compute new chart data from fresh stats (backend can return series)
        const newStats = result && result.stats ? result.stats : {};
        setEnrollmentChartData(makeEnrollmentData(newStats));
      } catch (e) { console.warn('onUserCreated handler failed', e); }
    };
    window.addEventListener('admin:user-created', onUserCreated);

    // Also listen for a more generic 'admin:users-changed' event and refresh the
    // chart if the event carries detail that suggests an add operation occurred.
    const onUsersChangedDetail = async (ev) => {
      try {
        const d = ev && ev.detail;
        // common shapes: { added: n } or { action: 'added', id: 123 } or { type: 'created' }
        const added = d && (d.added || (d.action && d.action === 'added') || (d.type && d.type === 'created'));
        if (added) {
          const result = await fetchAll();
          const newStats = result && result.stats ? result.stats : {};
          setEnrollmentChartData(makeEnrollmentData(newStats));
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('admin:users-changed', onUsersChangedDetail);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      window.removeEventListener('admin:users-changed', onUsersChanged);
      window.removeEventListener('admin:activities-changed', onActivitiesChanged);
      window.removeEventListener('admin:user-created', onUserCreated);
      window.removeEventListener('admin:users-changed', onUsersChangedDetail);
    };

    // NOTE: helper functions for extracting user ids and finding users
    // were accidentally placed here inside the useEffect scope which made
    // them unavailable to the component render. They have been moved into
    // the RecentActivitiesWidget where they're used.
  }, []);

  // Derived/fallback stats: if the server /dashboard endpoint fails or returns empty,
  // compute sensible defaults from the fetched `users` and `coursesList` so the
  // UI still shows accurate counts.
  const derivedTotalStudents = Number(stats.total_students) || (Array.isArray(users) ? users.filter(u => (u.role || 'student') === 'student').length : 0);
  const derivedTotalTeachers = Number(stats.total_teachers) || (Array.isArray(users) ? users.filter(u => u.role === 'teacher').length : 0);
  const derivedActiveCourses = Number(stats.active_courses) || (Array.isArray(coursesList) ? coursesList.length : 0);
  const derivedActiveUsers = Number(stats.active_users) || (Array.isArray(users) ? users.filter(u => !u.deleted_at && !u.is_locked).length : 0);

  // Generic save handler for UserFormModal so AdminDashboard can create/update users
  const saveUserFromModal = async (payload, isEdit) => {
    try {
      let res = null;
      if (isEdit && payload && payload.id) {
        res = await axios.put(`/api/admin/users/${payload.id}`, payload);
      } else {
        // ensure name and password exist for server validation
        if (!payload.name) payload.name = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
        if (!payload.password) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
        res = await axios.post('/api/admin/users', payload);
      }

      await fetchAll();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      // Notify activities listeners so Recent Activities refreshes
      try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){}

      // If a new user was created, emit an event with the new id so other components
      // (e.g. AdminUsers) can highlight or navigate to it.
      try {
        if (res && res.data && res.data.user && res.data.user.id) {
          try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: { id: res.data.user.id } })); } catch(e){}
        }
      } catch(e) { /* ignore */ }
      return Promise.resolve(res && res.data ? res.data : {});
    } catch (e) {
      console.error('Save from modal failed', e);
      return Promise.reject(e);
    }
  };

  async function fetchAll() {
    try {
      // include archived users when the admin toggles the archived view
      const usersUrl = API + "/users" + (showArchived ? "?archived=1" : "");
      const [usersRes, statsRes] = await Promise.all([
        axios.get(usersUrl).catch(() => ({ data: [] })),
        axios.get(API + "/dashboard").catch(() => ({ data: {} })),
      ]);
      setUsers(usersRes.data || []);
      const statsData = statsRes.data || {};
      setStats(statsData);
      
      // Always update the enrollment chart with fresh stats data
      // This ensures the chart reflects current student/teacher counts
      try {
        setEnrollmentChartData(makeEnrollmentData(statsData));
        enrollmentInitedRef.current = true;
      } catch (e) { 
        console.warn('Failed to update enrollment chart', e);
      }
      
      return { users: usersRes.data || [], stats: statsData };
    } catch (e) {
      console.error(e);
      return { users: [], stats: {} };
    }
  }

  // re-fetch users whenever the archived toggle changes so the server can return trashed rows
  useEffect(() => {
    // fetch immediately when the toggle changes
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // fetch recent activities from server if endpoint exists
  async function fetchActivities() {
    try {
      const res = await axios.get(API + '/activities').catch(() => ({ data: [] }));
      // expect an array of { title, desc, time }
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load activities', e);
      setActivities([]);
    }
  }

  // Fetch a single user by id from the server and set it as selectedUser
  const fetchUserById = async (id) => {
    if (!id) return null;
    try {
      const res = await axios.get(`${API}/users/${id}`).catch(() => ({ data: null }));
      if (res && res.data) {
        // merge into users cache (non-destructive) so future lookups find it
        setUsers(prev => {
          try {
            const exists = (prev || []).some(u => String(u.id) === String(res.data.id));
            if (exists) return prev;
            return [(res.data)].concat(prev || []);
          } catch(e) { return prev; }
        });
        setSelectedUser(res.data);
        setShowModal(true);
        return res.data;
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch user by id', id, e);
      return null;
    }
  };

  // derive archived users from users list for dashboard pages
  const archivedUsers = (users || []).filter(u => !!u.deleted_at);

  // Redesigned Recent Activities widget: scrollable compact list (no "Show N more").
  // It shows actor (avatar/initials), actor name, action + subject text, optional
  // details, and relative time. Keeps backward compatibility with older activity
  // shapes ({ title, desc, time }).
  const RecentActivitiesWidget = ({ activities = [], maxItems = 200, maxVisible = null }) => {
    const [highlightKey, setHighlightKey] = useState(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const prevLenRef = useRef((activities || []).length);

    useEffect(() => {
      if ((activities || []).length > prevLenRef.current) {
        // new activity arrived -> briefly highlight the top item
        setHighlightKey(Date.now());
        setTimeout(() => setHighlightKey(null), 6000);
      }
      prevLenRef.current = (activities || []).length;
    }, [activities]);

    const renderAvatar = (actor) => {
      // Use a clear 'system' avatar when there's no actor or no name; avoid ambiguous single-letter fallbacks.
      if (!actor) return <div className="avatar avatar-system" title="System">⚙️</div>;
      if (actor.avatar_url) return <img src={actor.avatar_url} alt={actor.name || 'avatar'} className="avatar" />;
      const name = (actor.name || actor.email || '').toString().trim();
      if (!name) return <div className="avatar avatar-system" title="System">⚙️</div>;
      const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
      return <div className="avatar avatar-initials" title={name}>{initials}</div>;
    };

    const capitalizeWords = (s) => {
      return (s || '').toString().split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ').trim();
    };

    const sanitizeLabel = (s) => {
      if (!s) return '';
      // remove occurrences like 'id=18', 'user id=18', 'id:18' (case-insensitive)
      let out = s.toString().replace(/\b(?:user\s*)?id\s*[:=]?\s*\d+\b/ig, '');
      // remove stray hashes like '#18'
      out = out.replace(/#\s*\d+\b/g, '');
      // collapse multiple spaces and trim
      out = out.replace(/[\s\-–:_]{2,}/g, ' ').trim();
      return out;
    };

    const relativeTime = (input) => {
      if (!input) return '';
      const now = Date.now();
      const then = (new Date(input)).getTime ? new Date(input).getTime() : NaN;
      if (isNaN(then)) return input;
      const sec = Math.round((now - then) / 1000);
      if (sec < 10) return 'just now';
      if (sec < 60) return `${sec}s ago`;
      const min = Math.round(sec / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.round(min / 60);
      if (hr < 24) return `${hr}h ago`;
      const days = Math.round(hr / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.round(days / 30);
      if (months < 12) return `${months}mo ago`;
      const years = Math.round(months / 12);
      return `${years}y ago`;
    };

    const extractUserIdFromText = (text) => {
      if (!text) return null;
      const m = text.match(/user\s*id\s*[:=]?\s*(\d+)/i) || text.match(/id\s*[:=]?\s*(\d+)/i) || text.match(/#\s*(\d+)\b/);
      return m ? Number(m[1]) : null;
    };

    const findUserById = (id) => {
      if (!id) return null;
      return (users || []).find(u => Number(u.id) === Number(id) || String(u.id) === String(id)) || null;
    };

  // limit to most recent `maxItems` entries
  const list = (activities || []).slice(0, maxItems);

  // compute preview list (collapsed) vs. full list (overlay)
  const previewCount = maxVisible || 6;
  const previewList = (list || []).slice(0, previewCount);
  const extraCount = Math.max(0, (list || []).length - previewCount);

  // if maxVisible is provided, compute an approximate maxHeight so the container
  // becomes scrollable instead of extending the page. We assume ~64px per item
  // in compact mode; CSS can still enforce exact values.
  const maxHeightStyle = maxVisible ? { maxHeight: Math.max(120, previewCount * 64) + 'px' } : undefined;

    return (
      <div className="recent-list-wrapper">
        <div className="recent-list compact scrollable" style={maxHeightStyle}>
          {previewList.map((it, i) => {
          // activity can be in several shapes; normalize fields for rendering
          const actor = it.actor || it.user || it.performed_by || null;
          const time = it.time || it.created_at || it.timestamp || '';
          const desc = it.desc || it.details || it.description || '';
          // create a cleaned version of the description for display (remove id fragments)
          const cleanedDesc = sanitizeLabel(desc || '');

          // try to determine action and subject
          const rawTitle = (it.title || it.type || '').toString();
          const action = sanitizeLabel(it.action || rawTitle || '').toString();
          const subjectRaw = it.subject || it.target || '';

          // If activity mentions a user id (eg. "user id=18"), resolve that user's name from `users`
          const scanText = `${rawTitle} ${desc} ${subjectRaw}`;
          const mentionedUserId = extractUserIdFromText(scanText);
          const mentionedUser = mentionedUserId ? findUserById(mentionedUserId) : null;

          // show only the user's name/email (or a concise fallback) — avoid repeating `(id=NN)` in the UI
          const subjectLabel = mentionedUser ? (mentionedUser.name || mentionedUser.email || `User #${mentionedUserId}`) : sanitizeLabel(subjectRaw || cleanedDesc || '').toString();
          const shortDesc = cleanedDesc ? (cleanedDesc.length > 70 ? cleanedDesc.slice(0,67) + '...' : cleanedDesc) : '';

          // actor display name
          const actorDisplay = (actor && (actor.name || actor.email)) || (it.actor_name || it.performed_by_name) || 'System';

          // choose badge class and title-case text based on action keyword
          const actionKey = (action || '').toString().toLowerCase();
          let badgeClass = 'system';
          if (actionKey.includes('create') || actionKey.includes('created')) badgeClass = 'created';
          else if (actionKey.includes('delete') || actionKey.includes('deleted')) badgeClass = 'deleted';
          else if (actionKey.includes('archive') || actionKey.includes('archived')) badgeClass = 'archived';
          else if (actionKey.includes('restore') || actionKey.includes('restored')) badgeClass = 'restored';

          return (
            <div key={i} className={`recent-item ${highlightKey && i === 0 ? 'new' : ''}`}>
              <div className="recent-left" onClick={() => { if (mentionedUser) setSelectedUser(mentionedUser); else if (mentionedUserId) fetchUserById(mentionedUserId); }} style={{ cursor: mentionedUser || mentionedUserId ? 'pointer' : 'default' }}>{renderAvatar(actor)}</div>
              <div className="recent-body">
                <div className="recent-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={`action-badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center' }}>{capitalizeWords(actionKey.replace(/_/g, ' ') || 'Action')}</div>
                    <div className="actor-name" onClick={() => { if (mentionedUser) setSelectedUser(mentionedUser); else if (mentionedUserId) fetchUserById(mentionedUserId); }} style={{ cursor: mentionedUser || mentionedUserId ? 'pointer' : 'default' }}>{actorDisplay}</div>
                  </div>
                  <div className="action-text small-muted" style={{ marginTop: 2 }} title={desc || ''}>
                    {subjectLabel ? (
                      <span className="subject-link" onClick={() => { if (mentionedUser) setSelectedUser(mentionedUser); else if (mentionedUserId) fetchUserById(mentionedUserId); }} style={{ cursor: mentionedUser || mentionedUserId ? 'pointer' : 'default', textDecoration: mentionedUser ? 'underline' : 'none' }}>{subjectLabel}</span>
                    ) : null}
                    {shortDesc ? <span style={{ marginLeft: 8 }} className="recent-desc">{shortDesc}</span> : null}
                  </div>
                </div>
              </div>
              <div className="recent-time small-muted">{relativeTime(time)}</div>
            </div>
          );
          })}
        </div>

        {/* Overlay: full activity history (dense) */}
        {overlayVisible ? (
          <div className="activities-overlay">
            <div className="overlay-inner card">
              <div className="overlay-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>All Activities</h3>
                <div>
                  <button className="action-icon" onClick={() => setOverlayVisible(false)} title="Close">✕</button>
                </div>
              </div>
              <div className="overlay-list scrollable" style={{ maxHeight: '60vh', marginTop: 12 }}>
                {(list || []).map((it, i) => {
                  const actor = it.actor || it.user || it.performed_by || null;
                  const time = it.time || it.created_at || it.timestamp || '';
                  const desc = it.desc || it.details || it.description || '';
                  const rawTitle = (it.title || it.type || '').toString();
                  const action = sanitizeLabel(it.action || rawTitle || '').toString();
                  const subjectRaw = it.subject || it.target || '';
                  const scanText = `${rawTitle} ${desc} ${subjectRaw}`;
                  const mentionedUserId = extractUserIdFromText(scanText);
                  const mentionedUser = mentionedUserId ? findUserById(mentionedUserId) : null;
                  const subjectLabel = mentionedUser ? (mentionedUser.name || mentionedUser.email || `User #${mentionedUserId}`) : sanitizeLabel(subjectRaw || desc || '').toString();

                  return (
                    <div key={i} className={`recent-item dense ${i === 0 ? 'new' : ''}`}>
                      <div className="recent-left" onClick={() => { if (mentionedUser) setSelectedUser(mentionedUser); else if (mentionedUserId) fetchUserById(mentionedUserId); }} style={{ cursor: mentionedUser || mentionedUserId ? 'pointer' : 'default' }}>{renderAvatar(actor)}</div>
                      <div className="recent-body">
                        <div className="recent-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`action-badge small`}>{capitalizeWords((action || '').toString().replace(/_/g,' ') || 'Action')}</div>
                            <div className="actor-name" style={{ fontSize: 13 }}>{(actor && (actor.name || actor.email)) || (it.actor_name || it.performed_by_name) || 'System'}</div>
                          </div>
                          <div className="action-text small-muted" style={{ marginTop: 4 }}>
                            <span className="subject-link" onClick={() => { if (mentionedUser) setSelectedUser(mentionedUser); else if (mentionedUserId) fetchUserById(mentionedUserId); }} style={{ cursor: mentionedUser || mentionedUserId ? 'pointer' : 'default', textDecoration: mentionedUser ? 'underline' : 'none' }}>{subjectLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="recent-time small-muted">{relativeTime(time)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button className="primary" onClick={() => setOverlayVisible(false)}>Close</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // chart data removed

  const Dashboard = () => {
    // Calculate metrics with change percentages
    const studentGrowth = Number(stats.student_growth) || Number(stats.new_students_30) || 2;
    const studentGrowthChange = stats.student_growth_change || '+5%';
    
    const courseCompletion = Number(stats.course_completion_percent) || 0;
    const courseCompletionChange = stats.course_completion_change || '+2.5%';
    
    const studentSatisfaction = Number(stats.student_satisfaction) || 0;
    const studentSatisfactionChange = stats.student_satisfaction_change || '-3%';
    
    const avgGPA = Number(stats.avg_gpa) || 0;
    const avgGPAChange = stats.avg_gpa_change || '+0.2';
    
    const totalStudents = Number(stats.total_students) || 1248;
    const totalStudentsChange = stats.total_students_change || '+7%';
    
  const totalTeachers = Number(stats.total_teachers) || 0;
  const totalTeachersChange = stats.total_teachers_change || '+0%';
    
  const activeCourses = Number(stats.active_courses) || 0;
  const activeCoursesChange = stats.active_courses_change || '+0%';
    
    const enrollmentRate = Number(stats.enrollment_rate) || 94;
    const enrollmentRateChange = stats.enrollment_rate_change || '+4%';

    return (
      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Dashboard</h1>
            <p className="subtitle">Welcome back, Admin</p>
          </div>
          <div className="header-actions">
            <select className="year-selector" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
            <button className="btn-enroll-modern" onClick={() => setShowModal(true)}>
              <FiUserPlus size={16} />
              <span>Enroll Student</span>
            </button>
          </div>
        </div>

        {/* Top 8 Metric Cards Grid */}
        <div className="top-metrics-grid">
          <div className="metric-card-modern blue">
            <div className="metric-icon-box">
              <span className="metric-emoji">📈</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Student Growth</div>
              <div className="metric-value">{studentGrowth}</div>
              <div className="metric-change positive">{studentGrowthChange}</div>
            </div>
          </div>

          <div className="metric-card-modern green">
            <div className="metric-icon-box">
              <span className="metric-emoji">✅</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Course Completion</div>
              <div className="metric-value">{courseCompletion}%</div>
              <div className="metric-change positive">{courseCompletionChange}</div>
            </div>
          </div>

          <div className="metric-card-modern purple">
            <div className="metric-icon-box">
              <span className="metric-emoji">⭐</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Student Satisfaction</div>
              <div className="metric-value">{studentSatisfaction}%</div>
              <div className="metric-change negative">{studentSatisfactionChange}</div>
            </div>
          </div>

          <div className="metric-card-modern cyan">
            <div className="metric-icon-box">
              <span className="metric-emoji">🎯</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Average GPA</div>
              <div className="metric-value">{avgGPA}</div>
              <div className="metric-change positive">{avgGPAChange}</div>
            </div>
          </div>

          <div className="metric-card-modern blue-light">
            <div className="metric-icon-box">
              <span className="metric-emoji">👨‍🎓</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Students</div>
              <div className="metric-value">{totalStudents.toLocaleString()}</div>
              <div className="metric-change positive">{totalStudentsChange}</div>
            </div>
          </div>

          <div className="metric-card-modern violet">
            <div className="metric-icon-box">
              <span className="metric-emoji">�‍🏫</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Teachers</div>
              <div className="metric-value">{totalTeachers}</div>
              <div className="metric-change positive">{totalTeachersChange}</div>
            </div>
          </div>

          <div className="metric-card-modern teal">
            <div className="metric-icon-box">
              <span className="metric-emoji">📚</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Active Courses</div>
              <div className="metric-value">{activeCourses}</div>
              <div className="metric-change positive">{activeCoursesChange}</div>
            </div>
          </div>

          <div className="metric-card-modern orange">
            <div className="metric-icon-box">
              <span className="metric-emoji">🔥</span>
            </div>
            <div className="metric-content">
              <div className="metric-label">Enrollment Rate</div>
              <div className="metric-value">{enrollmentRate}%</div>
              <div className="metric-change positive">{enrollmentRateChange}</div>
            </div>
          </div>
        </div>

        {/* Middle Row: Enrollment Overview + Upcoming Events */}
        <div className="dashboard-middle-grid">
          {/* Enrollment Overview */}
          <div className="chart-card-modern enrollment">
            <div className="chart-header">
              <div className="chart-title-group">
                <h4>Enrollment Overview</h4>
              </div>
            </div>
            <div className="chart-wrapper">
              <Line data={enrollmentChartData} options={enrollmentOptions} />
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="upcoming-events-card">
            <div className="section-header">
              <FiCalendar className="calendar-icon" />
              <h3>Upcoming Events</h3>
            </div>
            <div className="event-item event-yellow">
              <div className="event-date">
                <div className="month">Oct</div>
                <div className="day">25</div>
              </div>
              <div className="event-details">
                <div className="event-title">Parent-Teacher Meeting</div>
                <div className="event-time">2:00 PM</div>
              </div>
            </div>
            <div className="event-item event-blue">
              <div className="event-date">
                <div className="month">Nov</div>
                <div className="day">5</div>
              </div>
              <div className="event-details">
                <div className="event-title">Semester Exams Begin</div>
                <div className="event-time">9:00 AM</div>
              </div>
            </div>
            <div className="event-item event-green">
              <div className="event-date">
                <div className="month">Nov</div>
                <div className="day">12</div>
              </div>
              <div className="event-details">
                <div className="event-title">Sports Day</div>
                <div className="event-time">10:00 AM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Activity (Horizontal) */}
        <div className="recent-activity-horizontal">
          <div className="recent-activity-card">
            <div className="section-header">
              <FiActivity className="activity-icon" />
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-list-horizontal">
              {activities.length > 0 ? (
                activities.slice(0, 4).map((activity, index) => {
                  // Determine icon and class based on activity type
                  let icon = <FiActivity />;
                  let activityClass = 'activity-user';
                  
                  if (activity.title?.toLowerCase().includes('course')) {
                    icon = <FiBook />;
                    activityClass = 'activity-course';
                  } else if (activity.title?.toLowerCase().includes('schedule') || activity.title?.toLowerCase().includes('updated')) {
                    icon = <FiClock />;
                    activityClass = 'activity-clock';
                  } else if (activity.title?.toLowerCase().includes('result') || activity.title?.toLowerCase().includes('published')) {
                    icon = <FiCheckCircle />;
                    activityClass = 'activity-bell';
                  } else if (activity.title?.toLowerCase().includes('enrolled') || activity.title?.toLowerCase().includes('student') || activity.title?.toLowerCase().includes('teacher')) {
                    icon = <FiUser />;
                    activityClass = 'activity-user';
                  }
                  
                  return (
                    <div key={index} className={`activity-item ${activityClass}`}>
                      <div className="activity-icon-box">
                        {icon}
                      </div>
                      <div className="activity-content">
                        <div className="activity-text" dangerouslySetInnerHTML={{ __html: activity.title || activity.desc || 'Activity update' }} />
                        <div className="activity-time">{activity.time || 'Just now'}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="activity-item activity-user">
                  <div className="activity-icon-box">
                    <FiActivity />
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">No recent activity</div>
                    <div className="activity-time">-</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals scoped to CoursesPage */}

      </div>
    );
  };

  // Small helper components for the dashboard
  // RecentActivity removed per user request

  const PerformanceCards = () => {
    const s = Number(stats.total_students) || 0;
    const prevS = Number(stats.prev_total_students) || 0;
    const studentChange = prevS ? `${(((s - prevS) / prevS) * 100).toFixed(1)}%` : '+0%';

    const course = Number(stats.course_completion_percent) || 0;
    const prevCourse = Number(stats.prev_course_completion_percent) || 0;
    const courseChange = prevCourse ? `${(((course - prevCourse) / prevCourse) * 100).toFixed(1)}%` : '+0%';

    const ts = Number(stats.teacher_satisfaction) || 0;
    const prevTs = Number(stats.prev_teacher_satisfaction) || 0;
    const tsChange = prevTs ? `${(((ts - prevTs) / prevTs) * 100).toFixed(1)}%` : '+0%';

    const gpa = Number(stats.avg_gpa) || 0;
    const prevGpa = Number(stats.prev_avg_gpa) || 0;
    const gpaChange = prevGpa ? `${(((gpa - prevGpa) / prevGpa) * 100).toFixed(1)}%` : '+0%';

    // If all metrics are zero-ish, don't render the grid (keeps dashboard clean)
    const anyNonZero = (s > 0) || (course > 0) || (ts > 0) || (gpa > 0);
    if (!anyNonZero) return null;

    const cards = [
      { title: 'Student Growth', value: s, sub: `vs ${prevS}`, change: studentChange, color: 'blue' },
      { title: 'Course Completion', value: `${course}%`, sub: `vs ${prevCourse}%`, change: courseChange, color: 'green' },
      { title: 'Teacher Satisfaction', value: `${ts}/5`, sub: `vs ${prevTs}/5`, change: tsChange, color: 'purple' },
      { title: 'Average GPA', value: `${gpa}`, sub: `vs ${prevGpa}`, change: gpaChange, color: 'cyan' },
    ];

    return (
      <div className="perf-grid">
        {cards.map((c, i) => (
          <div className={`perf-card ${c.color}`} key={i}>
            <div className="perf-title">{c.title}</div>
            <div className="perf-value">{c.value}</div>
            <div className="perf-sub">{c.sub}</div>
            <div className="perf-change">{c.change}</div>
          </div>
        ))}
      </div>
    );
  };

  // MiniCalendar removed per design request

  
  

  // Render the existing AdminUsers component configured for teachers so the UI
  // is identical to the Students view. AdminUsers handles searching, filters,
  // archived view, modals and export/import features already.
  const TeachersPage = () => {
    return <AdminUsers role="teacher" />;
  };

  const CoursesPage = () => {
    // NOTE: Course modals are scoped inside CoursesPage. Do not render them at AdminDashboard root
    // or you'll get ReferenceError on state variables and flicker due to overlay stacking.
    const [courseSearch, setCourseSearch] = useState('');
  const [filterStatusC, setFilterStatusC] = useState('all');
  const [filterSemesterC, setFilterSemesterC] = useState('all');
  const [filterCreditsC, setFilterCreditsC] = useState('all');
  const [showCourseAddModal, setShowCourseAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCourse, setEnrollCourse] = useState(null);

    // programs (departments) provided by the user
    const programs = [
      { code: 'ICJEEP', name: 'Institute of Criminal Justice Education Program' },
      { code: 'CSP', name: 'Computer Studies Program' },
      { code: 'ETP', name: 'Engineering & Technology Program' },
      { code: 'AP', name: 'Accountancy Program' },
      { code: 'NP', name: 'Nursing Program' },
      { code: 'BAP', name: 'Business Administration Program' },
      { code: 'ASP', name: 'Arts and Sciences Program' },
      { code: 'THMP', name: 'Tourism and Hospitality Management Program' }
    ];

    // use existing coursesList (populated elsewhere) or a local sample
    // Use the provided `programs` list to display rows in the courses table.
    // These entries represent the programs (ICJEEP, CSP, etc.) as course-like rows
    // for display purposes. The department/program dropdown is still derived from `programs`.
    const sampleCourses = programs.map(p => ({
      code: p.code,
      name: p.name,
      department: p.name,
      teacher: '',
      enrolled: '',
      schedule: '',
      credits: '',
      status: 'Active'
    }));

    const courses = (coursesList && coursesList.length) ? coursesList : sampleCourses;

  // prefer real departments derived from programs list so the dropdown contains the program names
  // derive semesters and credits from courses data (or provide sensible defaults)
  const semestersSet = new Set((courses || []).map(c => (c.semester || '').toString()).filter(Boolean));
  const semesters = semestersSet.size ? Array.from(semestersSet).sort() : ['Fall', 'Spring', 'Summer'];
  const creditsSet = new Set((courses || []).map(c => (c.credits || '').toString()).filter(Boolean));
  const credits = creditsSet.size ? Array.from(creditsSet).sort((a,b)=> Number(a)-Number(b)) : ['1','2','3','4','5'];

    const filtered = courses.filter(c => {
      const q = (courseSearch || '').toLowerCase().trim();
      if (q) {
        if (!(`${c.name} ${c.code} ${c.teacher} ${c.department}`.toLowerCase()).includes(q)) return false;
      }
      if (filterStatusC && filterStatusC !== 'all') {
        if ((c.status || '').toLowerCase() !== filterStatusC) return false;
      }
      // department filter removed by user request
      if (filterSemesterC && filterSemesterC !== 'all') {
        if (((c.semester || '').toString().toLowerCase()) !== filterSemesterC.toLowerCase()) return false;
      }
      if (filterCreditsC && filterCreditsC !== 'all') {
        if (((c.credits || '').toString()) !== filterCreditsC.toString()) return false;
      }
      return true;
    });

    const handleCourseExport = () => {
      const rows = filtered.map(r => ({ code: r.code || '', name: r.name || '', department: r.department || '', teacher: r.teacher || '', enrolled: r.enrolled || '', schedule: r.schedule || '', credits: r.credits || '', status: r.status || '' }));
      if (!rows.length) return alert('No courses to export');
      const csv = [Object.keys(rows[0]).join(',')].concat(rows.map(r => Object.values(r).map(v => '"'+String(v||'').replace(/"/g,'""')+'"').join(','))).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'courses-export.csv'; a.click(); URL.revokeObjectURL(url);
    };

    const handleCourseImportFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (!lines.length) return alert('Empty file');
        const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
        const data = lines.slice(1, 200).map(l => {
          const cols = l.split(',').map(c => c.replace(/^\s*"|"\s*$/g,'').trim());
          const obj = {}; headers.forEach((h,i)=> obj[h]=cols[i]||''); return obj;
        });
        if (!confirm(`Import ${data.length} courses? This will only prepare the data locally.`)) return;
        // For now we don't have a server import endpoint for courses; show preview count
        console.log('Parsed courses import (preview)', data.slice(0,10));
        alert(`Parsed ${data.length} rows. Server import not configured.`);
      };
      reader.readAsText(file);
    };

    return (
  <div className="page courses-page">
        <div className="modern-management-card" style={{ background: '#fff', borderRadius: 16, padding: 0, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {/* Header Section */}
          <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '24px 28px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                <FiBook size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Course Management</h2>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Manage courses, schedules, and enrollment across all departments</p>
              </div>
            </div>
          </div>

          {/* Filter Chips & Search Section */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterStatusC('all')} style={{ padding: '8px 16px', borderRadius: 20, border: filterStatusC === 'all' ? '2px solid #f59e0b' : '1px solid #e5e7eb', background: filterStatusC === 'all' ? '#fff7ed' : '#fff', color: filterStatusC === 'all' ? '#f59e0b' : '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                All Courses <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{courses.length}</span>
              </button>
              <button onClick={() => setFilterStatusC('active')} style={{ padding: '8px 16px', borderRadius: 20, border: filterStatusC === 'active' ? '2px solid #10b981' : '1px solid #e5e7eb', background: filterStatusC === 'active' ? '#ecfdf5' : '#fff', color: filterStatusC === 'active' ? '#10b981' : '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                Active <span style={{ background: '#10b981', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{courses.filter(c => (c.status||'').toLowerCase() === 'active').length}</span>
              </button>
              <button onClick={() => setFilterStatusC('inactive')} style={{ padding: '8px 16px', borderRadius: 20, border: filterStatusC === 'inactive' ? '2px solid #6b7280' : '1px solid #e5e7eb', background: filterStatusC === 'inactive' ? '#f3f4f6' : '#fff', color: filterStatusC === 'inactive' ? '#6b7280' : '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                Inactive <span style={{ background: '#6b7280', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{courses.filter(c => (c.status||'').toLowerCase() === 'inactive').length}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 18 }} />
                <input 
                  type="text" 
                  placeholder="Search by course name, code, teacher, or department..." 
                  value={courseSearch} 
                  onChange={(e) => setCourseSearch(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', transition: 'all 0.2s' }} 
                  onFocus={(e) => e.target.style.borderColor = '#f59e0b'} 
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} 
                />
              </div>

              <select value={filterSemesterC} onChange={(e) => setFilterSemesterC(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                <option value="all">All Semesters</option>
                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select value={filterCreditsC} onChange={(e) => setFilterCreditsC(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                <option value="all">All Credits</option>
                {credits.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <button onClick={() => setShowCourseAddModal(true)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(245,158,11,0.2)' }}>
                <FiPlus size={18} /> Add Course
              </button>
            </div>
          </div>

          {/* Modern Table Section */}
          <div style={{ padding: 28 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrollment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credits</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fffbeb'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.code}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#6b7280' }}>{c.department}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#6b7280' }}>{c.teacher}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#6b7280' }}>{c.enrolled}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#6b7280' }}>{c.schedule}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#6b7280' }}>{c.credits}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: (c.status||'').toLowerCase() === 'active' ? '#d1fae5' : '#f3f4f6', color: (c.status||'').toLowerCase() === 'active' ? '#065f46' : '#6b7280' }}>{c.status}</span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }} title="View">
                            <FiEye size={16} />
                          </button>
                          <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }} title="Edit" onClick={() => { setEditingCourse(c); setShowCourseAddModal(true); }}>
                            <FiEdit2 size={16} />
                          </button>
                          <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }} title="Enroll Students" onClick={() => { setEnrollCourse(c); setShowEnrollModal(true); }}>
                            <FiUserPlus size={16} />
                          </button>
                          <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#ef4444'; }} title="Delete">
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DocumentsPage = () => {
    // metrics default to zero until admin uploads documents
    const metrics = {
      total_files: Number(stats.total_files) || 0,
      public: Number(stats.public_files) || 0,
      private: Number(stats.private_files) || 0,
      downloads: Number(stats.total_downloads) || 0,
      views: Number(stats.total_views) || 0,
      favorites: Number(stats.total_favorites) || 0,
      week: Number(stats.files_this_week) || 0,
    };

  // documents state (server-backed list)
  const [docsState, setDocsState] = useState([]);

  // load persisted documents from server on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(API + '/documents');
        if (mounted && Array.isArray(res.data)) {
          setDocsState(res.data.map(d => ({
            id: d.id,
            title: d.title,
            description: d.description,
            url: d.url,
            size: d.size,
            visibility: d.visibility
          })));
        }
      } catch (e) {
        console.warn('Failed to fetch documents', e);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const [docsView, setDocsView] = useState('grid');
  const [filterFav, setFilterFav] = useState(false);
  const [filterVisibility, setFilterVisibility] = useState('all');

    // file input ref handler
    const fileInputRef = useRef(null);

  const openUpload = () => fileInputRef.current?.click();

    const handleFiles = async (files) => {
        if (!files || !files.length) return;
        const form = new FormData();
        Array.from(files).forEach(f => form.append('files[]', f));

        try {
          const res = await axios.post(API + '/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
          const uploaded = (res.data && res.data.uploaded) ? res.data.uploaded : [];
          if (uploaded.length) {
            // prepend to list
            setDocsState(s => [...uploaded.map(u => ({ id: u.id, title: u.title, description: u.description, url: u.url, size: u.size, visibility: u.visibility })), ...s]);
            try { window.dispatchEvent(new CustomEvent('admin:documents-changed', { detail: { added: uploaded.length } })); } catch(e){}
          }
        } catch (e) {
          console.error('Upload failed', e);
          alert('Upload failed. Check console for details.');
        } finally {
          // clear input so selecting same file again works
          try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch(e){}
        }
      };

    return (
  <div className="page documents-page">
        <div className="page-header">
          <div>
            <div className="breadcrumb">School System &nbsp; &gt; &nbsp; <strong>Documents</strong></div>
            <h2>Documents Management</h2>
            <p className="page-sub">Centralized document library and file management</p>
          </div>

          <div className="header-actions">
            <div className="header-buttons">
              <button className="icon-box import" title="Bulk Upload" onClick={() => openUpload()}><FiUpload /> <span style={{ marginLeft: 8 }}>Bulk Upload</span></button>
              <button className="primary" title="Upload Document" onClick={() => openUpload()}><FiPlus /> <span style={{ marginLeft: 8 }}>Upload Document</span></button>
              <input ref={fileInputRef} type="file" accept="*/*" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
            </div>
          </div>
        </div>

        <div className="documents-top">
          <div className="docs-metrics">
            <div className="doc-metric card blue">
              <div className="doc-metric-left"><div className="metric-icon">📄</div></div>
              <div className="doc-metric-right"><div className="label">Total Files</div><div className="value">{metrics.total_files}</div></div>
            </div>

            <div className="doc-metric card green">
              <div className="doc-metric-left"><div className="metric-icon">🌐</div></div>
              <div className="doc-metric-right"><div className="label">Public</div><div className="value">{metrics.public}</div></div>
            </div>

            <div className="doc-metric card purple">
              <div className="doc-metric-left"><div className="metric-icon">🔒</div></div>
              <div className="doc-metric-right"><div className="label">Private</div><div className="value">{metrics.private}</div></div>
            </div>

            <div className="doc-metric card orange">
              <div className="doc-metric-left"><div className="metric-icon">⬇️</div></div>
              <div className="doc-metric-right"><div className="label">Downloads</div><div className="value">{metrics.downloads}</div></div>
            </div>

            <div className="doc-metric card cyan">
              <div className="doc-metric-left"><div className="metric-icon">👁️</div></div>
              <div className="doc-metric-right"><div className="label">Views</div><div className="value">{metrics.views}</div></div>
            </div>

            <div className="doc-metric card yellow">
              <div className="doc-metric-left"><div className="metric-icon">⭐</div></div>
              <div className="doc-metric-right"><div className="label">Favorites</div><div className="value">{metrics.favorites}</div></div>
            </div>

            <div className="doc-metric card teal">
              <div className="doc-metric-left"><div className="metric-icon">📅</div></div>
              <div className="doc-metric-right"><div className="label">This Week</div><div className="value">{metrics.week}</div></div>
            </div>
          </div>

          <div className="documents-controls">
            <input className="doc-search" placeholder="Search documents, authors, or tags..." />
            <div className="filters">
              <div className="quick-chips">
                <button className={`chip ${filterFav ? 'on' : ''}`} onClick={() => setFilterFav(s => !s)}>★ Favorites</button>
                <button className={`chip ${filterVisibility==='all' ? 'on' : ''}`} onClick={() => setFilterVisibility('all')}>All</button>
                <button className={`chip ${filterVisibility==='public' ? 'on' : ''}`} onClick={() => setFilterVisibility('public')}>Public</button>
                <button className={`chip ${filterVisibility==='private' ? 'on' : ''}`} onClick={() => setFilterVisibility('private')}>Private</button>
              </div>

              <select><option>All Categories</option></select>
              <select><option>All Types</option></select>
              <select><option>Latest First</option></select>

              <div className="view-toggle docs-view">
                <button title="Grid view" className={docsView === 'grid' ? 'active' : ''} onClick={() => setDocsView('grid')}>▦</button>
                <button title="List view" className={docsView === 'list' ? 'active' : ''} onClick={() => setDocsView('list')}>☰</button>
              </div>
            </div>
          </div>
        </div>

        <div className={docsView === 'grid' ? 'documents-grid' : 'documents-list'}>
          {docsState.length === 0 ? null : docsState.map((d, i) => (
            <div key={d.id} className={`doc-card card ${d.visibility === 'Private' ? 'is-private' : ''}`}>
              <div className="doc-top" style={{ background: `linear-gradient(135deg, ${['#ff7aa2','#7c3aed','#06b6d4','#f97316','#34d399'][i%5]}, #ff7aa2)` }} />
              <div className="doc-body">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h4 style={{margin:0}}>{d.title}</h4>
                  <div className="doc-badges"><span className="badge small">{d.visibility}</span></div>
                </div>
                <p className="small-muted">{d.description}</p>
              </div>
              <div className="doc-actions">
                <button className="action-icon" title="View" onClick={async () => {
                  try {
                    const res = await axios.get(API + '/documents/' + d.id);
                    openDocModal(res.data);
                  } catch (e) { console.error('Failed to load document', e); alert('Failed to load document details'); }
                }}><FiEye /></button>
                <button className="action-icon" title="Download" onClick={() => {
                  try {
                    const downloadUrl = API + '/documents/' + d.id + '/download';
                    const a = document.createElement('a'); a.href = downloadUrl; a.target = '_blank'; a.rel = 'noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  } catch (e) { console.error('Download failed', e); alert('Download failed'); }
                }}><FiDownload /></button>
                <button className="action-icon" title="Copy link" onClick={async () => { try { const link = d.url || (window.location.origin + API + '/documents/' + d.id + '/download'); await navigator.clipboard.writeText(link); alert('Link copied to clipboard'); } catch(e) { prompt('Copy this link', d.url || (window.location.origin + API + '/documents/' + d.id + '/download')); } }}><FiCopy /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ReportsPage = () => {
    // sample metrics - in a real app these come from `stats` or an API
    // Use server-provided stats when available; default to zero so the dashboard is accurate
  const totalStudents = Number(stats.total_students) || 0;
  const completionRate = (Number(stats.course_completion_percent) || 0);
  const avgGpa = (Number(stats.avg_gpa) || 0);
  const facultyMembers = Number(stats.total_teachers) || 0;

  // recent activity badges (last 30 days) provided by server
  const newStudents30 = Number(stats.new_students_30) || 0;
  const newFaculty30 = Number(stats.new_faculty_30) || 0;
  const newCourses30 = Number(stats.new_courses_30) || 0;

    const cards = [
      { title: 'Total Students', value: totalStudents, change: (stats.prev_total_students ? (`+${Math.round(((totalStudents - Number(stats.prev_total_students)) / Math.max(1, Number(stats.prev_total_students))) * 100)}%`) : '+0%'), color: 'blue' },
      { title: 'Completion Rate', value: `${completionRate}%`, change: (stats.prev_course_completion_percent ? (`+${completionRate - Number(stats.prev_course_completion_percent)}%`) : '+0%'), color: 'green' },
      { title: 'Average GPA', value: `${avgGpa}`, change: (stats.prev_avg_gpa ? (`+${(avgGpa - Number(stats.prev_avg_gpa)).toFixed(2)}`) : '+0'), color: 'purple' },
      { title: 'Faculty Members', value: facultyMembers, change: (stats.prev_total_teachers ? (`+${facultyMembers - Number(stats.prev_total_teachers)}`) : '+0'), color: 'orange' },
    ];

    // sample chart data mimicking the screenshot
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
    const studentsSeries = [420, 440, 460, 450, 470, 485, 495, 510];
    const facultySeries = [40, 42, 43, 46, 47, 48, 49, 50];
    const coursesSeries = [80, 82, 85, 89, 90, 92, 94, 95];
    const colors = (typeof window !== 'undefined') ? getChartColors() : {};

    const areaData = {
      labels: months,
      datasets: [
        {
          label: 'Students',
          data: studentsSeries,
          backgroundColor: colors.studentsFill || undefined,
          borderColor: colors.students || undefined,
          pointBackgroundColor: colors.students || undefined,
          pointBorderColor: '#fff',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          borderRadius: 6
        },
        {
          label: 'Faculty',
          data: facultySeries,
          backgroundColor: colors.facultyFill || undefined,
          borderColor: colors.faculty || undefined,
          pointBackgroundColor: colors.faculty || undefined,
          pointBorderColor: '#fff',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          borderRadius: 6
        },
        {
          label: 'Courses',
          data: coursesSeries,
          backgroundColor: colors.coursesFill || undefined,
          borderColor: colors.courses || undefined,
          pointBackgroundColor: colors.courses || undefined,
          pointBorderColor: '#fff',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          borderRadius: 6
        },
      ]
    };

    const areaOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: (getChartColors() && getChartColors().tooltip) || undefined } }, scales: { y: { beginAtZero: true } } };

    return (
      <div className="page reports-page">
        <div className="modern-management-card" style={{ background: '#fff', borderRadius: 16, padding: 0, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {/* Header Section */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '24px 28px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                <FiFileText size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Reports & Analytics</h2>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Comprehensive insights and data visualization</p>
              </div>
            </div>
          </div>

          {/* Metrics Section */}
          <div style={{ padding: '28px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {cards.map((c, i) => (
                <div key={i} style={{ 
                  background: c.color === 'blue' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                              c.color === 'green' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                              c.color === 'purple' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                              'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: 12,
                  padding: 20,
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{c.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>from last semester</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{c.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Section */}
          <div style={{ padding: 28, borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Enrollment Trends</h3>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Student, faculty, and course growth over time</p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 20 }}>
              <div style={{ height: 280 }}>
                <Bar data={areaData} options={areaOptions} />
              </div>
            </div>
          </div>

          {/* Bottom Cards Section */}
          <div style={{ padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Recent Activity (30 Days)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 12, padding: 20, border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>New Students</span>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                    <FiUsers size={20} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>+{newStudents30}</div>
                <div style={{ background: '#e0e7ff', borderRadius: 8, height: 8, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)', height: '100%', width: `${Math.min(100, newStudents30 * 5)}%`, transition: 'width 0.5s', borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: '#3730a3' }}>{Math.min(100, newStudents30 ? Math.round((newStudents30 / Math.max(1, totalStudents)) * 100) : 0)}% of enrollment target</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', borderRadius: 12, padding: 20, border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>New Faculty</span>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                    <FiUser size={20} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#064e3b', marginBottom: 8 }}>+{newFaculty30}</div>
                <div style={{ background: '#d1fae5', borderRadius: 8, height: 8, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', height: '100%', width: `${Math.min(100, newFaculty30 * 10)}%`, transition: 'width 0.5s', borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: '#047857' }}>{Math.min(100, newFaculty30 ? Math.round((newFaculty30 / Math.max(1, facultyMembers)) * 100) : 0)}% of hiring target</div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', borderRadius: 12, padding: 20, border: '1px solid #e9d5ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#6b21a8' }}>New Courses</span>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                    <FiBook size={20} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#581c87', marginBottom: 8 }}>+{newCourses30}</div>
                <div style={{ background: '#e9d5ff', borderRadius: 8, height: 8, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)', height: '100%', width: `${Math.min(100, newCourses30 * 5)}%`, transition: 'width 0.5s', borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 12, color: '#6b21a8' }}>{Math.min(100, newCourses30 ? Math.round((newCourses30 / Math.max(1, (coursesList||[]).length)) * 100) : 0)}% of course expansion goal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CalendarPage = () => {
    // sample counts come from stats where available
    const totalEvents = Number(stats.total_events) || 0;
    const thisMonth = Number(stats.events_this_month) || 0;
    const upcoming = Number(stats.events_upcoming) || 0;
    const highPriority = Number(stats.events_high_priority) || 0;
    const withReminders = Number(stats.events_with_reminders) || 0;
    const publicEvents = Number(stats.events_public) || 0;

    const categories = [
      { title: 'Academic', count: 1 },
      { title: 'Administrative', count: 2 },
      { title: 'Social', count: 1 },
      { title: 'Deadline', count: 2 },
      { title: 'Exam', count: 1 },
    ];

    return (
      <div className="page calendar-page">
        <div className="page-header">
          <div>
            <div className="breadcrumb">School System &nbsp; &gt; &nbsp; <strong>Calendar</strong></div>
            <h2>Calendar Management</h2>
            <p className="page-sub">Manage school events and important dates</p>
          </div>
          <div className="header-actions">
            <div className="header-buttons">
              <button className="icon-box export" onClick={() => alert('Export not configured')}><FiDownload /> <span style={{ marginLeft: 8 }}>Export</span></button>
              <button className="primary" onClick={() => alert('Add event (not implemented)')}><FiPlus /> <span style={{ marginLeft: 8 }}>Add Event</span></button>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card blue"><div className="icon-box">📅</div><div className="metric-info"><h3>{totalEvents}</h3><p>Total Events</p></div></div>
          <div className="metric-card purple"><div className="icon-box">🕒</div><div className="metric-info"><h3>{thisMonth}</h3><p>This Month</p></div></div>
          <div className="metric-card green"><div className="icon-box">📈</div><div className="metric-info"><h3>{upcoming}</h3><p>Upcoming</p></div></div>
          <div className="metric-card orange"><div className="icon-box">⚠️</div><div className="metric-info"><h3>{highPriority}</h3><p>High Priority</p></div></div>
          <div className="metric-card yellow"><div className="icon-box">🔔</div><div className="metric-info"><h3>{withReminders}</h3><p>With Reminders</p></div></div>
          <div className="metric-card cyan"><div className="icon-box">👥</div><div className="metric-info"><h3>{publicEvents}</h3><p>Public Events</p></div></div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3>Events by Category</h3>
          <p className="small-muted">Distribution across event types</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 12 }}>
            {categories.map((c, i) => (
              <div key={i} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{c.title}</div>
                    <div className="small-muted" style={{ marginTop: 6 }}>14% of total</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 20 }}>{c.count}</div>
                </div>
                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 6, marginTop: 12 }}>
                  <div style={{ width: `${(c.count / Math.max(1, totalEvents)) * 100}%`, height: '100%', background: '#111827', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="icon-box">◀</button>
                <div style={{ fontWeight: 800 }}>October 2025</div>
                <button className="icon-box">▶</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="small-muted">Filter:</div>
                <select><option>All Events</option></select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "documents":
        return <DocumentsPage />;
      case "users":
        return <AdminUsers />;
      case "students":
        return <AdminUsers />;
      case "teachers":
        // Use the dedicated TeachersPage component so the Teachers view shows
        // the correct headers, filters, and actions (fixes Students/Teachers mismatch).
        return <TeachersPage />;
      case "courses":
        return <CoursesPage />;
    case "reports":
      return <ReportsPage />;
      default:
        return <div>Under development</div>;
    }
  };

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="admin-main">{renderContent()}</main>

      {showModal && (
        <UserFormModal
          initial={editing}
          role={modalRole}
          onClose={() => setShowModal(false)}
          onSave={saveUserFromModal}
        />
      )}
      {showCourseModal && (
        <CourseFormModal onClose={() => setShowCourseModal(false)} />
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          type={(selectedUser && (selectedUser.role === 'teacher' || selectedUser.teacher)) ? 'teacher' : 'student'}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {docModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="doc-detail-modal card">
            <button className="modal-close" onClick={closeDocModal}>✕</button>
            <div className="doc-head">
              <div className="doc-icon">📄</div>
              <div className="doc-title">
                <h3>{docModal.title}</h3>
                <p className="small-muted">{docModal.description}</p>
              </div>
            </div>

            <div className="doc-grid">
              <div className="doc-card-meta card">
                <div className="meta-row"><div className="meta-col"><div className="meta-label">Category</div><div className="meta-value">Administrative</div></div>
                <div className="meta-col"><div className="meta-label">Uploaded By</div><div className="meta-value">{docModal.uploaded_by || 'Admin'}</div></div></div>
                <div className="meta-row"><div className="meta-col"><div className="meta-label">Size</div><div className="meta-value">{docModal.size ? Math.round(docModal.size/1024) + ' KB' : '—'}</div></div>
                <div className="meta-col"><div className="meta-label">Upload Date</div><div className="meta-value">{docModal.created_at}</div></div></div>
                <div className="meta-row"><div className="meta-col"><div className="meta-label">Visibility</div><div className="meta-value">{docModal.visibility}</div></div>
                <div className="meta-col"><div className="meta-label">Last Modified</div><div className="meta-value">{docModal.created_at}</div></div></div>
              </div>

              <div className="doc-card-stats card">
                <h4>Statistics</h4>
                <div className="stats-grid">
                  <div className="stat card stat-downloads"><div className="stat-value">{docModal.downloads || '0'}</div><div className="stat-label">Downloads</div></div>
                  <div className="stat card stat-views"><div className="stat-value">{docModal.views || '0'}</div><div className="stat-label">Views</div></div>
                  <div className="stat card stat-access"><div className="stat-value">{docModal.visibility === 'Public' ? 'Yes' : 'No'}</div><div className="stat-label">Public Access</div></div>
                </div>
              </div>

              <div className="doc-card-tags card">
                <h4>Tags</h4>
                <div className="tags">
                  <span className="tag">meeting</span>
                  <span className="tag">faculty</span>
                  <span className="tag">notes</span>
                </div>
              </div>
            </div>

            <div className="doc-modal-actions">
              <button className="btn" onClick={closeDocModal}>Close</button>
              <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(docModal.url || (window.location.origin + '/api/admin/documents/' + docModal.id + '/download')); alert('Link copied'); } catch(e){ prompt('Copy link', docModal.url || (window.location.origin + '/api/admin/documents/' + docModal.id + '/download')); } }}>Copy Link</button>
              <a className="btn primary" href={API + '/documents/' + docModal.id + '/download'} target="_blank" rel="noopener">Download</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Department overview removed per user request
