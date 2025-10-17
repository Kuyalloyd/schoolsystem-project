import React, { useEffect, useState, useRef } from "react";
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
// Plain data object (Chart component expects an object). Use a static
// translucent background color instead of calculating a canvas gradient.
const enrollmentData = {
  labels: enrollmentLabels,
  datasets: [
    {
      label: 'Students',
      data: [1020, 1080, 1130, 1170, 1190, 1210],
      fill: true,
      // fallback gradient color as a static value
      backgroundColor: 'rgba(59,130,246,0.12)',
      tension: 0.3,
      pointRadius: 0,
    },
    {
      label: 'Teachers',
      data: [45, 46, 47, 48, 48, 49],
      fill: false,
      tension: 0.3,
      pointRadius: 0,
    }
  ]
};

const enrollmentOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true } } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#6b7280' } },
    y: { grid: { color: '#eef4fb' }, ticks: { color: '#6b7280' }, beginAtZero: true }
  }
};

// Attendance bar chart (right) sample data/options
const attendanceLabels = ['Mon','Tue','Wed','Thu','Fri'];
const attendanceData = {
  labels: attendanceLabels,
  datasets: [
    {
      label: 'present',
      data: [1100, 1120, 1115, 1130, 1125],
      borderRadius: 6,
      barThickness: 36,
    },
    {
      label: 'absent',
      data: [40, 35, 38, 30, 45],
      borderRadius: 6,
      barThickness: 36,
    }
  ]
};

const attendanceOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom' } },
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
  const [activities, setActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalRole, setModalRole] = useState("student");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [coursesList, setCoursesList] = useState([]);
  const [docModal, setDocModal] = useState(null);
  const openDocModal = (data) => setDocModal(data);
  const closeDocModal = () => setDocModal(null);
  const pollRef = useRef(null);
  const POLL_INTERVAL = 15000; // ms - poll every 15s as a safe default
  // chart removed per design

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

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      window.removeEventListener('admin:users-changed', onUsersChanged);
      window.removeEventListener('admin:activities-changed', onActivitiesChanged);
    };
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
      setStats(statsRes.data || {});
    } catch (e) {
      console.error(e);
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

  // derive archived users from users list for dashboard pages
  const archivedUsers = (users || []).filter(u => !!u.deleted_at);

  // chart data removed

  const Dashboard = () => (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Real-time overview of your school management system</p>
      </div>

      {/* Top metrics removed per user request */}

      {/* Middle section intentionally removed per user request */}

      {/* Performance summary cards (four metrics) */}
      <div className="performance-cards">
        <PerformanceCards />
      </div>

      <div className="dashboard-summary">
        <div className="top-metrics">
          <div className="metric-card card metric-blue">
            <div className="metric-left">
              <div className="label">Total Students</div>
              <div className="value">{Number(stats.total_students) || 0}</div>
              <div className="meta small-muted">{stats.students_change_label || '+0% from last month'}</div>
            </div>
            <div className="metric-icon"><span className="icon-box color-blue">🎓</span></div>
          </div>

          <div className="metric-card card metric-purple">
            <div className="metric-left">
              <div className="label">Total Teachers</div>
              <div className="value">{Number(stats.total_teachers) || 0}</div>
              <div className="meta small-muted">{stats.teachers_change_label || '+0% from last month'}</div>
            </div>
            <div className="metric-icon"><span className="icon-box color-violet">👥</span></div>
          </div>

          <div className="metric-card card metric-cyan">
            <div className="metric-left">
              <div className="label">Active Courses</div>
              <div className="value">{Number(stats.active_courses) || 0}</div>
              <div className="meta small-muted">{stats.courses_change_label || '+0% from last month'}</div>
            </div>
            <div className="metric-icon"><span className="icon-box color-cyan">📚</span></div>
          </div>

          <div className="metric-card card metric-orange">
            <div className="metric-left">
              <div className="label">Enrollment Rate</div>
              <div className="value">{(Number(stats.enrollment_rate) || 0) + '%'}</div>
              <div className="meta small-muted">{stats.enrollment_change_label || '+0% from last month'}</div>
            </div>
            <div className="metric-icon"><span className="icon-box color-orange">📈</span></div>
          </div>
        </div>

        <div className="summary-bottom">
          <div className="recent-activities card">
            <h3>Recent Activities</h3>
            <div className="activity-list">
              {(activities && activities.length ? activities : [
                { title: 'New student enrolled', desc: 'Emma Wilson', time: '5 minutes ago' },
                { title: 'Teacher account locked', desc: 'Dr. James Smith', time: '15 minutes ago' },
                { title: 'Course updated', desc: 'Advanced Mathematics', time: '1 hour ago' },
                { title: 'Student archived', desc: 'Michael Brown', time: '2 hours ago' },
                { title: 'Teacher unlocked', desc: 'Sarah Johnson', time: '3 hours ago' },
              ]).map((it, i) => (
                <div key={i} className="activity-item">
                  <div className="dot" />
                  <div className="activity-body">
                    <div className="activity-title">{it.title}</div>
                    <div className="activity-desc small-muted">{it.desc}</div>
                  </div>
                  <div className="activity-time small-muted">{it.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="system-stats card">
            <h3>System Statistics</h3>
            <div className="stat-list">
              <div className="stat-row"><div className="stat-label">Active Students</div><div className="stat-value">{Number(stats.total_students) || 0}</div></div>
              <div className="stat-row"><div className="stat-label">Archived Students</div><div className="stat-value">{Number(stats.archived_students) || 0}</div></div>
              <div className="stat-row"><div className="stat-label">Locked Accounts</div><div className="stat-value">{Number(stats.locked_accounts) || 0}</div></div>
              <div className="stat-row"><div className="stat-label">Unlocked Accounts</div><div className="stat-value">{Number(stats.unlocked_accounts) || 0}</div></div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom charts row: Enrollment Growth + Weekly Attendance */}
      <div className="charts-row">
        <div className="chart-card enrollment-area card">
          <div className="card-head">
            <h4>Enrollment Growth</h4>
            <div className="subtitle small-muted">Students vs Teachers over months</div>
          </div>
            <div className="enrollment-chart-wrap">
            <Line data={enrollmentData} options={enrollmentOptions} />
          </div>
        </div>

        <div className="chart-card attendance-compact card">
          <div className="card-head">
            <h4>Weekly Attendance</h4>
          </div>
            <div className="attendance-chart-wrap">
            <Bar data={attendanceData} options={attendanceOptions} />
          </div>
          <div className="legend">
            <div className="legend-item"><span className="legend-swatch absent" /> <span className="small-muted">absent</span></div>
            <div className="legend-item"><span className="legend-swatch present" /> <span className="small-muted">present</span></div>
          </div>
          <div className="attendance-stats">
            <div className="stat"><div className="small-muted">Average Present</div><div className="stat-val">1,127</div></div>
            <div className="stat"><div className="small-muted">Average Absent</div><div className="stat-val">37</div></div>
          </div>
        </div>
      </div>
    </div>
  );

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

  
  

  const TeachersPage = () => {
    const [searchT, setSearchT] = useState('');
    const [filterStatusT, setFilterStatusT] = useState('all');
    const [filterDeptT, setFilterDeptT] = useState('');
    const [filterPosT, setFilterPosT] = useState('');
    const [importPreviewT, setImportPreviewT] = useState(null);
    const teachersAll = users.filter((u) => u.role === 'teacher');

    // derive lists for selects
    const departmentsList = Array.from(new Set(teachersAll.map(t => (t.teacher?.department || t.department || '').toString()).filter(Boolean))).sort();
    const positionsList = Array.from(new Set(teachersAll.map(t => (t.teacher?.position || t.position || '').toString()).filter(Boolean))).sort();

    const visible = teachersAll.filter(t => {
      if (showArchived) return !!t.deleted_at;
      return !t.deleted_at;
    });

    const filtered = visible.filter(t => {
      const q = (searchT || '').toLowerCase().trim();
      if (q) {
        const hay = ((t.name || '') + ' ' + (t.email || '') + ' ' + (t.teacher?.faculty_id || '') + ' ' + (t.teacher?.course || '') + ' ' + (t.teacher?.department || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterStatusT && filterStatusT !== 'all') {
        const st = (t.teacher?.status || t.status || '').toLowerCase();
        if (filterStatusT === 'locked') { if (!t.is_locked) return false; }
        else if (st !== filterStatusT.toLowerCase()) return false;
      }
      if (filterDeptT) {
        const dept = (t.teacher?.department || t.department || '').toString().toLowerCase();
        if (!dept.includes(filterDeptT.toLowerCase())) return false;
      }
      if (filterPosT) {
        const pos = (t.teacher?.position || t.position || '').toString().toLowerCase();
        if (!pos.includes(filterPosT.toLowerCase())) return false;
      }
      return true;
    });

    // derived counts for the chips (mirrors students UI)
    const totalTeachers = teachersAll.length;
    const activeCountT = teachersAll.filter(t => !t.deleted_at && !t.is_locked).length;
    const archivedCountT = teachersAll.filter(t => !!t.deleted_at).length;
    const lockedCountT = teachersAll.filter(t => !!t.is_locked).length;

    const handleTeacherExport = () => {
      const rows = filtered.map(u => {
        const t = u.teacher || {};
        return {
          faculty_id: t.faculty_id || u.faculty_id || `EMP${String(u.id).padStart(6,'0')}`,
          first_name: t.first_name || u.first_name || (u.name ? u.name.split(' ')[0] : ''),
          last_name: t.last_name || u.last_name || (u.name ? u.name.split(' ').slice(1).join(' ') : ''),
          sex: t.sex || u.sex || '',
          email: u.email || '',
          date_of_birth: t.date_of_birth || u.date_of_birth || '',
          phone_number: t.phone_number || u.phone_number || '',
          address: t.address || u.address || '',
          course: t.course || t.major || u.course || '',
          department: t.department || u.department || '',
          status: t.status || u.status || '',
          courses_handled: Array.isArray(t.courses_handled) ? t.courses_handled.join(', ') : (t.courses_handled || ''),
          position: t.position || u.position || ''
        };
      });
      const csv = [Object.keys(rows[0] || {}).join(',')].concat(rows.map(r => Object.values(r).map(v => '"'+String(v||'').replace(/"/g,'""')+'"').join(','))).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'teachers-export.csv'; a.click(); URL.revokeObjectURL(url);
    };

    const handleTeacherImportFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (!lines.length) return alert('Empty file');
        const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
        const data = lines.slice(1, 200).map(l => {
          const cols = l.split(',').map(c => c.replace(/^\s*"|"\s*$/g,'').trim());
          const obj = {};
          headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
          return obj;
        });
        if (!confirm(`Import ${data.length} rows as teachers?`)) return;
        (async () => {
          for (const r of data) {
            try {
              const payload = {
                role: 'teacher',
                faculty_id: r.faculty_id || r.teacher_id || '',
                first_name: r.first_name || '',
                last_name: r.last_name || '',
                sex: r.sex || '',
                email: r.email || '',
                date_of_birth: r.date_of_birth || '',
                phone_number: r.phone_number || r.phone || '',
                address: r.address || '',
                course: r.course || r.major || '',
                department: r.department || '',
                status: r.status || 'Active',
                courses_handled: r.courses_handled || r.courses || '',
                position: r.position || ''
              };
              if (!payload.name) payload.name = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
              if (!payload.password) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
              await axios.post('/api/admin/users', payload).catch(e => { console.warn('teacher import failed', e); return null; });
              try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch (e) { }
            } catch (err) { console.error('Row import error', err); }
          }
          await fetchAll();
          alert('Import completed');
        })();
      };
      reader.readAsText(file);
    };

    const archiveTeacher = async (id) => {
      if (!confirm('Archive this faculty member?')) return;
      try {
        await axios.delete(`/api/admin/users/${id}`);
        await fetchAll();
        // notify other admin components and activities list
        try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
        try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){}
        alert('Archived');
      } catch(e){ console.error(e); alert('Failed'); }
    };

    const restoreTeacher = async (id) => {
      try {
        await axios.post(`/api/admin/users/${id}/restore`);
        await fetchAll();
        try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
        try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){}
        alert('Restored');
      } catch(e){ console.error(e); alert('Failed'); }
    };

    const toggleLockTeacher = async (id, locked) => {
      try {
        await axios.post(`/api/admin/users/${id}/${locked ? 'unlock' : 'lock'}`);
        await fetchAll();
        try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
        try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){}
      } catch(e){ console.error(e); alert('Failed'); }
    };

    const deleteTeacher = async (id) => {
      if (!confirm('Permanently delete this faculty member?')) return;
      try {
        await axios.delete(`/api/admin/users/${id}?force=1`);
        await fetchAll();
        try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
        try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){}
        alert('Deleted');
      } catch(e){ console.error(e); alert('Failed'); }
    };

  // fire activity change events so Recent Activities updates
  const _notifyActivities = () => { try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){} };


    return (
      <div className="page teachers-page">
        <div className="hero-banner">
          <div className="hero-inner">
            <div className="hero-left">
              <h1>Teacher Management</h1>
              <p>Manage faculty records and accounts</p>
              <div className="hero-cards">
                <div className="hero-card">
                  <div className="card-title">Today</div>
                  <div className="card-sub">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
            <div className="hero-right">
              {/* header actions moved into the Teachers panel to avoid duplication */}
            </div>
          </div>
        </div>

        <div className="card students-panel" style={{ padding: 20, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <FiUsers />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Teachers</div>
                  <div className="small-muted">View and manage faculty information</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                <button
                  type="button"
                  className={`chip ${(filterStatusT === 'all' && !showArchived) ? 'active' : ''}`}
                  onClick={() => { setFilterStatusT('all'); setShowArchived(false); }}
                  aria-pressed={(filterStatusT === 'all' && !showArchived)}
                >
                  All Teachers <span className="chip-count">{totalTeachers}</span>
                </button>

                <button
                  type="button"
                  className={`chip ${(filterStatusT === 'active' && !showArchived) ? 'active' : ''}`}
                  onClick={() => { setFilterStatusT('active'); setShowArchived(false); }}
                  aria-pressed={(filterStatusT === 'active' && !showArchived)}
                >
                  Active <span className="chip-count">{activeCountT}</span>
                </button>

                <button
                  type="button"
                  className={`chip ${(showArchived || filterStatusT === 'archived') ? 'active' : ''}`}
                  onClick={() => { setFilterStatusT('archived'); setShowArchived(true); }}
                  aria-pressed={(showArchived || filterStatusT === 'archived')}
                >
                  Archived <span className="chip-count">{archivedCountT}</span>
                </button>

                <button
                  type="button"
                  className={`chip ${(filterStatusT === 'locked' && !showArchived) ? 'active' : ''}`}
                  onClick={() => { setFilterStatusT('locked'); setShowArchived(false); }}
                  aria-pressed={(filterStatusT === 'locked' && !showArchived)}
                >
                  Locked <span className="chip-count">{lockedCountT}</span>
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <input className="student-search" placeholder="Search teachers..." value={searchT} onChange={(e)=>setSearchT(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#f3f4f6', border: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="primary" onClick={() => { setModalRole('teacher'); setShowModal(true); }} style={{ padding: '10px 16px' }}>+ Add Teacher</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="students-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Subject</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Department</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 20 }}>No teachers found</td></tr>
                ) : filtered.map((t) => {
                  const teacher = t.teacher || {};
                  const fullName = t.name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
                  const email = t.email || '';
                  const subject = teacher.specialization || teacher.course || t.subject || '—';
                  const department = teacher.department || teacher.department || '';
                  const statusVal = (teacher.status || t.status || 'Active').toString();

                  return (
                    <tr key={t.id} className={`${t.deleted_at ? 'archived-row' : ''}`}>
                      <td style={{ padding: '12px 8px' }}>{fullName}</td>
                      <td style={{ padding: '12px 8px' }}>{email}</td>
                      <td style={{ padding: '12px 8px' }}>{subject}</td>
                      <td style={{ padding: '12px 8px' }}>{department}</td>
                      <td style={{ padding: '12px 8px' }}><span className={`status-pill ${(statusVal||'').toLowerCase()}`}>{statusVal}</span></td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div className="actions" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {!t.deleted_at ? (
                          <>
                            <button type="button" className="action-icon view-button" title="View" onClick={() => setSelectedUser(t)}>
                              <FiEye />
                            </button>
                            <button type="button" className="action-icon" title="Edit" onClick={() => { setEditing(t); setModalRole('teacher'); setShowModal(true); }}><FiEdit2 /></button>
                            <button type="button" className="action-icon" title={t.is_locked ? 'Unlock' : 'Lock'} onClick={() => toggleLockTeacher(t.id, t.is_locked)}><FiLock /></button>
                            <button type="button" className="action-icon text-danger" title="Archive" onClick={() => archiveTeacher(t.id)}><FiArchive /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="action-icon" title="Restore" onClick={() => restoreTeacher(t.id)}>♻️</button>
                            <button type="button" className="action-icon text-danger" title="Delete Permanently" onClick={() => deleteTeacher(t.id)}><FiTrash2 /></button>
                          </>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const CoursesPage = () => {
    const [courseSearch, setCourseSearch] = useState('');
  const [filterStatusC, setFilterStatusC] = useState('all');
  const [filterSemesterC, setFilterSemesterC] = useState('all');
  const [filterCreditsC, setFilterCreditsC] = useState('all');

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
        <div className="page-header">
          <div>
            <div className="breadcrumb">School System &nbsp; &gt; &nbsp; <strong>Course Management</strong></div>
            <h2>Course Management</h2>
            <p className="page-sub">Manage courses, schedules, and enrollment across all departments</p>
          </div>

          <div className="header-actions">
            <div className="header-buttons">
              <input id="courses-import" type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleCourseImportFile(e.target.files && e.target.files[0])} />
              <button className="icon-box import" onClick={() => document.getElementById('courses-import')?.click()}><FiUpload /> <span style={{ marginLeft: 8 }}>Import</span></button>
              <button className="icon-box export" onClick={handleCourseExport}><FiDownload /> <span style={{ marginLeft: 8 }}>Export</span></button>
              <button className="primary" onClick={() => setShowCourseModal(true)}><FiPlus /> <span style={{ marginLeft: 8 }}>Add Course</span></button>
            </div>
          </div>
        </div>

        <div className="courses-top">
          <div className="courses-metrics">
            <div className="metric card total"><div className="label">Total Courses</div><div className="value">{courses.length}</div></div>
            <div className="metric card active"><div className="label">Active</div><div className="value">{courses.filter(c => (c.status||'').toLowerCase() === 'active').length}</div></div>
            <div className="metric card inactive"><div className="label">Inactive</div><div className="value">{courses.filter(c => (c.status||'').toLowerCase() === 'inactive').length}</div></div>
            <div className="metric card students"><div className="label">Total Students</div><div className="value">{derivedTotalStudents}</div></div>
            <div className="metric card enrollment"><div className="label">Avg. Enrollment</div><div className="value">{
              (() => {
                if (!courses || !courses.length) return 0;
                const sum = courses.reduce((s, c) => {
                  const parts = (c.enrolled || '').split('/');
                  const n = parseInt(parts[0] || '0', 10);
                  return s + (Number.isFinite(n) ? n : 0);
                }, 0);
                return Math.round(sum / courses.length) || 0;
              })()
            }</div></div>
            <div className="metric card capacity"><div className="label">At Capacity</div><div className="value">{courses.filter(c => { const parts = (c.enrolled||'').split('/'); return parts.length===2 && Number(parts[0])>=Number(parts[1]); }).length}</div></div>
          </div>
        </div>

        <div className="courses-controls">
          <input className="course-search" placeholder="Search by course name, code, teacher, or department..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
          <div className="filters">
            <select value={filterStatusC} onChange={(e) => setFilterStatusC(e.target.value)} className="filter-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Departments filter removed per user request */}

            <select value={filterSemesterC} onChange={(e) => setFilterSemesterC(e.target.value)} className="filter-select">
              <option value="all">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={filterCreditsC} onChange={(e) => setFilterCreditsC(e.target.value)} className="filter-select">
              <option value="all">All Credits</option>
              {credits.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="courses-table card">
          <table className="courses-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Department</th>
                <th>Teacher</th>
                <th>Enrollment</th>
                <th>Schedule</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i}>
                  <td><strong>{c.name}</strong><div className="small-muted">{c.code}</div></td>
                  <td>{c.department}</td>
                  <td>{c.teacher}</td>
                  <td>{c.enrolled}</td>
                  <td>{c.schedule}</td>
                  <td>{c.credits}</td>
                  <td><span className={`status-pill ${((c.status||'').toLowerCase())}`}>{c.status}</span></td>
                  <td>
                    <button className="action-icon" title="View">👁️</button>
                    <button className="action-icon" title="Edit">✎</button>
                    <button className="action-icon text-danger" title="Delete">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

    const areaData = {
      labels: months,
      datasets: [
        {
          label: 'Students',
          data: studentsSeries,
          backgroundColor: 'rgba(37,99,235,0.12)',
          borderColor: 'rgba(37,99,235,0.95)',
          pointBackgroundColor: 'rgba(37,99,235,1)',
          pointBorderColor: '#fff',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          borderRadius: 6
        },
        {
          label: 'Faculty',
          data: facultySeries,
          backgroundColor: 'rgba(16,185,129,0.08)',
          borderColor: 'rgba(16,185,129,0.95)',
          pointBackgroundColor: 'rgba(16,185,129,1)',
          pointBorderColor: '#fff',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          borderRadius: 6
        },
        {
          label: 'Courses',
          data: coursesSeries,
          backgroundColor: 'rgba(249,115,22,0.08)',
          borderColor: 'rgba(249,115,22,0.95)',
          pointBackgroundColor: 'rgba(249,115,22,1)',
          pointBorderColor: '#fff',
          borderWidth: 2,
          fill: false,
          tension: 0.35,
          borderRadius: 6
        },
      ]
    };

    const areaOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { beginAtZero: true } } };

    return (
      <div className="page reports-page">
        <div className="reports-header">
          <div className="breadcrumb">School System &nbsp; &gt; &nbsp; <strong>Reports</strong></div>
          <h2>Reports & Analytics</h2>
          <p className="page-sub">Comprehensive insights and data visualization</p>
        </div>

        <div className="reports-metrics">
          {cards.map((c, i) => (
            <div key={i} className={`report-metric card ${c.color}`}>
              <div className="metric-left">
                <div className="metric-title">{c.title}</div>
                <div className="metric-value">{c.value}</div>
                <div className="metric-sub small-muted">from last semester <span className="metric-change">{c.change}</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="card chart-card">
          <h3>Enrollment Trends</h3>
          <p className="small-muted">Student, faculty, and course growth over time</p>
          <div style={{ height: 280 }}>
            <Bar data={areaData} options={areaOptions} />
          </div>
        </div>

        <div className="reports-bottom">
            <div className="small-card card">
              <div className="card-title">New Students (30d)</div>
              <div className="card-value">+{newStudents30}</div>
              <div className="progress"><div className="fill" style={{ width: `${Math.min(100, newStudents30 * 5)}%` }} /></div>
              <div className="small-muted">{Math.min(100, newStudents30 ? Math.round((newStudents30 / Math.max(1, totalStudents)) * 100) : 0)}% of enrollment target</div>
            </div>

            <div className="small-card card">
              <div className="card-title">New Faculty (30d)</div>
              <div className="card-value">+{newFaculty30}</div>
              <div className="progress"><div className="fill green" style={{ width: `${Math.min(100, newFaculty30 * 10)}%` }} /></div>
              <div className="small-muted">{Math.min(100, newFaculty30 ? Math.round((newFaculty30 / Math.max(1, facultyMembers)) * 100) : 0)}% of hiring target</div>
            </div>

            <div className="small-card card">
              <div className="card-title">New Courses (30d)</div>
              <div className="card-value">+{newCourses30}</div>
              <div className="progress"><div className="fill purple" style={{ width: `${Math.min(100, newCourses30 * 5)}%` }} /></div>
              <div className="small-muted">{Math.min(100, newCourses30 ? Math.round((newCourses30 / Math.max(1, (coursesList||[]).length)) * 100) : 0)}% of course expansion goal</div>
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
