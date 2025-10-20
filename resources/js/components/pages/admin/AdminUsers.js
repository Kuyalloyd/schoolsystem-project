import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiUpload, FiDownload, FiPlus, FiEye, FiEdit2, FiLock, FiTrash2, FiUsers, FiCheckCircle, FiAward, FiAlertTriangle, FiBook, FiArchive } from 'react-icons/fi';
import UserFormModal from './UserFormModal';
import StudentDetailModal from './StudentDetailModal';

  // Simple ErrorBoundary to catch render errors inside modal components
function ModalErrorBoundary({ children }) {
  class C extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
    static getDerivedStateFromError(err) { return { hasError: true, error: err }; }
  componentDidCatch(error, info) { try { console.error('Modal render error: ', error); } catch(e){}; this.setState({ info }); }
    render() {
      if (this.state.hasError) {
        return React.createElement('div', { style: { padding: 20, background: '#fff', borderRadius: 8 } }, React.createElement('h3', null, 'Modal failed to load'), React.createElement('pre', { style: { whiteSpace: 'pre-wrap', color: '#b91c1c' } }, this.state.error && this.state.error.toString()));
      }
      return this.props.children;
    }
  }
  return React.createElement(C, null, children);
}

export default function AdminUsers({ role = 'student' }) {
  const mountedRef = useRef(true);
  const highlightTimerRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [modalRole, setModalRole] = useState(role);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [majors, setMajors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterMajor, setFilterMajor] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [detailUser, setDetailUser] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [now, setNow] = useState(() => new Date());
  // selection removed
  const [importPreview, setImportPreview] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [highlightNewId, setHighlightNewId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // fallback inline form removed

  // Page-level labels derived from the `role` prop so the same component can
  // render Learners or Instructors pages without hard-coded strings.
  const pageType = (role === 'teacher') ? 'Instructor' : 'Learner';
  const pagePlural = pageType + 's';
  const pageLower = pageType.toLowerCase();

  // load users (non-archived students)
  const loadUsers = async () => {
    try {
      const res = await axios.get(`/api/admin/users?role=${role}`);
      const u = Array.isArray(res.data) ? res.data : [];
      if (!mountedRef.current) return; 
      setUsers(u);
  // debug logging removed to reduce console noise
  try { /* console.debug('loadUsers fetched', u.length); */ } catch(e){}
      } catch (err) {
        console.error('Failed to load users', err);
        if (!mountedRef.current) return;
        setUsers([]);
      }

  };

  // load archived (trashed) users separately
  const loadArchivedUsers = async () => {
    try {
      const res = await axios.get(`/api/admin/users?role=${role}&archived=1`);
      const a = Array.isArray(res.data) ? res.data : [];
      if (!mountedRef.current) return;
      setArchivedUsers(a);
  // debug logging removed to reduce console noise
  try { /* console.debug('loadArchivedUsers fetched', a.length); */ } catch(e){}
    } catch (err) {
      console.error('Failed to load archived users', err);
      if (!mountedRef.current) return;
      setArchivedUsers([]);
    }
  };

  const archiveUser = async (id) => {
    if (!confirm(`Archive this ${pageLower}?`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      await loadUsers(); await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      alert(`${pageType} archived`);
    } catch (err) { console.error('Archive failed', err); alert(`Failed to archive ${pageLower}`); }
  };

  // bulk actions removed (selection removed)

  // selection removed

  

  const updateStatusInline = async (userId, newStatus) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, { status: newStatus });
      await loadUsers(); await loadArchivedUsers();
    } catch (e) { console.error('Failed to update status', e); alert('Failed to update status'); }
  };

  const restoreUser = async (id) => {
    try {
      await axios.post(`/api/admin/users/${id}/restore`);
      await loadUsers();
      await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      alert(`${pageType} restored`);
    } catch (err) {
      console.error('Restore failed', err);
      alert(`Failed to restore ${pageLower}`);
    }
  };

  const permanentDeleteUser = async (id) => {
    if (!confirm(`Permanently delete this ${pageLower}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}?force=1`);
      await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      alert(`${pageType} permanently deleted`);
    } catch (err) {
      console.error('Permanent delete failed', err);
      alert(`Failed to permanently delete ${pageLower}`);
    }
  };

  const toggleLock = async (id, currentlyLocked) => {
    try {
      if (currentlyLocked) await axios.post(`/api/admin/users/${id}/unlock`);
      else await axios.post(`/api/admin/users/${id}/lock`);
      await loadUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
    } catch (err) {
      console.error('Lock toggle failed', err);
      alert('Failed to change lock status');
    }
  };

  // fetch users on mount and whenever archived toggle changes
  useEffect(() => {
    mountedRef.current = true;
    loadUsers();
    loadArchivedUsers().catch(() => {});

    // listen for global events
    const onUsersChanged = () => { loadUsers().catch(()=>{}); loadArchivedUsers().catch(()=>{}); };
    window.addEventListener('admin:users-changed', onUsersChanged);
    return () => { mountedRef.current = false; window.removeEventListener('admin:users-changed', onUsersChanged); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // Keep the current time updated and trigger a morning/day change refresh.
  useEffect(() => {
    const lastHourRef = { hour: now.getHours(), date: now.toDateString() };
    const tick = () => {
      try {
        const n = new Date();
        if (mountedRef.current) setNow(n);
        // if date changed (midnight) -> refresh
        if (n.toDateString() !== lastHourRef.date) {
          lastHourRef.date = n.toDateString();
          if (mountedRef.current) { loadUsers().catch(() => {}); loadArchivedUsers().catch(() => {}); }
        }
        // if we crossed into morning (before 6 -> >=6) trigger a refresh
        if (lastHourRef.hour < 6 && n.getHours() >= 6) {
          try { if (mountedRef.current) { loadUsers().catch(() => {}); loadArchivedUsers().catch(() => {}); } } catch(e){}
        }
        lastHourRef.hour = n.getHours();
      } catch (e) { console.warn('time tick failed', e); }
    };
    const id = setInterval(tick, 60 * 1000); // every minute
    // also run once immediately to pick up small differences
    tick();
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = (roleParam = role) => {
    try { prevGlobalOverlaysRef.current = Array.from(document.querySelectorAll('.modal-overlay')); } catch(e) { prevGlobalOverlaysRef.current = []; }
    setModalInitial(null);
    setModalRole(roleParam || 'student');
    // open the modal form
  setModalForm({ first_name: '', last_name: '', student_id: '', email: '', sex: '', date_of_birth: '', date_of_enrollment: '', phone_number: '', department: '', address: '', course: '', status: 'Active', year_level: '' });
    modalOpenTimeRef.current = Date.now();
    setShowModal(true);
  };

  // modal form state for built-in modal
  const [modalForm, setModalForm] = useState({ first_name: '', last_name: '', student_id: '', email: '', date_of_birth: '', date_of_enrollment: '', phone_number: '', department: '', address: '', course: '', status: 'Active', year_level: '', sex: '' });
  const [modalErrors, setModalErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalServerMessage, setModalServerMessage] = useState('');
  const firstErrorRef = useRef(null);
  // fallback modal removed
  const prevGlobalOverlaysRef = useRef([]);
  const modalOpenTimeRef = useRef(0);

  const handleModalClose = (source = 'unknown') => {
    try {
      const elapsed = modalOpenTimeRef.current ? Date.now() - modalOpenTimeRef.current : null;
      try { console.debug('[AdminUsers] handleModalClose', { source, elapsed }); } catch(e){}
    } catch(e){}
    setShowModal(false); setModalInitial(null);
  };

  const handleModalChange = (k, v) => setModalForm(f => ({ ...f, [k]: v }));

  const handleModalSave = async () => {
  const errs = {};
  if (!modalForm.first_name) errs.first_name = 'First name is required';
  if (!modalForm.last_name) errs.last_name = 'Last name is required';
  if (!modalForm.email) errs.email = 'Email is required';
  // student_id is optional; backend will generate if missing
  if (modalForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalForm.email)) errs.email = 'Valid email required';
    setModalErrors(errs); if (Object.keys(errs).length) return;
    // client-side duplicate checks to avoid server 422 for common cases
    try {
      const emailLower = (modalForm.email || '').toString().toLowerCase().trim();
      if (emailLower) {
        const allUsers = (users || []).concat(archivedUsers || []);
        const byEmail = allUsers.find(u => (u.email || '').toString().toLowerCase() === emailLower && !(modalInitial && modalInitial.id && String(u.id) === String(modalInitial.id)));
        if (byEmail) {
          setModalErrors({ email: 'This email is already used by another account' });
          try { const el = document.querySelector('.modal-body [name="email"]'); if (el && typeof el.focus === 'function') el.focus(); } catch(e){}
          return;
        }
      }
      const sid = (modalForm.student_id || '').toString().trim();
      if (sid) {
        const allUsers = (users || []).concat(archivedUsers || []);
        const bySid = allUsers.find(u => (u.student && u.student.student_id) === sid && !(modalInitial && modalInitial.id && String(u.id) === String(modalInitial.id)));
        if (bySid) {
          setModalErrors({ student_id: 'That Student ID is already linked to another account' });
          try { const el = document.querySelector('.modal-body [name="student_id"]'); if (el && typeof el.focus === 'function') el.focus(); } catch(e){}
          return;
        }
      }
    } catch(e) { console.warn('Duplicate check failed', e); }
  setModalServerMessage('');
  setModalSubmitting(true);
    try {
      const payload = {
        role: modalRole || role,
        student_id: modalForm.student_id,
        first_name: modalForm.first_name,
        last_name: modalForm.last_name,
        email: modalForm.email,
        // include name for backend validation
        name: `${modalForm.first_name} ${modalForm.last_name}`,
        sex: modalForm.sex || null,
        date_of_birth: modalForm.date_of_birth || null,
        phone_number: modalForm.phone_number || null,
        address: modalForm.address || null,
        course: modalForm.course || null,
        department: modalForm.department || null,
        status: modalForm.status || 'Active',
        date_of_enrollment: modalForm.date_of_enrollment || null,
        year_level: modalForm.year_level || null,
      };
      // when creating, include a temporary password so backend validation succeeds
      if (!(modalInitial && modalInitial.id)) {
        const gen = () => (Math.random().toString(36).slice(-8) + 'A1!');
        payload.password = payload.password || gen();
      }
      // strip empty values so backend doesn't receive blank strings
      const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));

      let res = null;
      if (modalInitial && modalInitial.id) {
        res = await axios.put(`/api/admin/users/${modalInitial.id}`, payloadFiltered);
      } else {
        res = await axios.post('/api/admin/users', payloadFiltered);
      }
  setShowModal(false); setModalInitial(null);
      await loadUsers(); await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed', { detail: (res && res.data && res.data.stats) ? res.data.stats : {} })); } catch(e){}
      try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: (res && res.data && res.data.stats) ? res.data.stats : {} })); } catch(e){}
    } catch (e) {
      console.error('Save failed', e);
      try { if (e && e.response && e.response.status === 422) console.warn('422 response body:', e.response.data); } catch(_) {}
      // try to map server-side validation errors (Laravel 422) into modalErrors
      if (e && e.response && e.response.status === 422 && e.response.data && typeof e.response.data === 'object') {
        const data = e.response.data;
        // Laravel usually returns { message: '', errors: { field: [msgs] } }
        if (data.errors) {
          const fieldErrs = {};
          Object.keys(data.errors).forEach(k => { fieldErrs[k] = data.errors[k].join(' '); });
          setModalErrors(fieldErrs);
          // also show server message if present
          if (data.message) setModalServerMessage(data.message);
          try {
            // focus first invalid field for faster correction
            const order = ['first_name','last_name','email','student_id','date_of_birth','phone_number','course','department','status','date_of_enrollment','year_level','address'];
            const firstKey = order.find(k => fieldErrs[k]);
            if (firstKey) {
              const el = document.querySelector(`.modal-body [name="${firstKey}"]`);
              if (el && typeof el.focus === 'function') el.focus();
            }
          } catch(_e) {}
          setModalSubmitting(false);
          return;
        }
        if (data.message) {
          setModalServerMessage(data.message || 'Validation failed');
        }
        setModalSubmitting(false);
        return;
      }
      // generic fallback
      alert((e && e.message) ? e.message : 'Failed to save student');
      setModalSubmitting(false);
    }
    setModalSubmitting(false);
  };

  // onSave handler for UserFormModal (receives payload from modal)
  const saveFromUserForm = async (payload, isEdit) => {
    try {
      if (isEdit && payload && payload.id) {
        const res = await axios.put(`/api/admin/users/${payload.id}`, payload);
        // refresh lists
        await loadUsers(); await loadArchivedUsers();
        try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
        return Promise.resolve(res && res.data ? res.data : {});
      } else {
        // ensure required fields: backend requires password on create
        if (!payload.password) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
        const res = await axios.post('/api/admin/users', payload);
        // refresh lists
        await loadUsers(); await loadArchivedUsers();
        try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
        // also dispatch a created event with id so other listeners can act
        try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: (res && res.data && res.data.user) ? { id: res.data.user.id } : {} })); } catch(e){}
        return Promise.resolve(res && res.data ? res.data : {});
      }
    } catch (e) {
      console.error('Save from UserForm failed', e);
      // propagate validation errors to caller (UserFormModal)
      if (e && e.response && e.response.status === 422 && e.response.data) {
        const resp = e.response.data;
        const errObj = {};
        if (resp.errors) {
          Object.keys(resp.errors).forEach(k => { errObj[k] = resp.errors[k].join(' '); });
        }
        // attach a readable message
        const err = new Error(resp.message || 'Validation failed');
        err.fields = errObj;
        return Promise.reject(err);
      }
      alert((e && e.message) ? e.message : 'Failed to save user');
      return Promise.reject(e);
    }
  };

  // listen for created users (from other parts of the UI) so we can highlight new rows
  useEffect(() => {
    const onUserCreated = (ev) => {
      try {
        const id = ev && ev.detail && ev.detail.id;
        if (id) {
          if (!mountedRef.current) return;
          setHighlightNewId(id);
          // clear highlight after a few seconds
          try { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); } catch(e){}
          highlightTimerRef.current = setTimeout(() => { if (mountedRef.current) setHighlightNewId(null); }, 6000);
          // refresh lists in case other page created it
          if (mountedRef.current) { loadUsers().catch(() => {}); loadArchivedUsers().catch(() => {}); }
        }
      } catch (e) { console.error('user-created handler failed', e); }
    };
    window.addEventListener('admin:user-created', onUserCreated);
    return () => { window.removeEventListener('admin:user-created', onUserCreated); try { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); } catch(e){} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  // CSV export of current filtered list
  const handleExport = () => {
    const rows = filteredList.map(u => {
      const s = u.student || {};
      return {
        student_id: s.student_id || u.student_id || u.id || '',
        first_name: u.first_name || (u.name ? u.name.split(' ')[0] : '') || s.first_name || '',
        last_name: u.last_name || (u.name ? u.name.split(' ').slice(1).join(' ') : '') || s.last_name || '',
        sex: s.sex || u.sex || '',
        email: u.email || '',
        date_of_birth: s.date_of_birth || u.date_of_birth || '',
        phone_number: s.phone_number || u.phone_number || '',
        address: s.address || u.address || '',
        course: s.course || s.major || u.course || '',
        status: s.status || u.status || '',
        department: s.department || u.department || '',
        year_level: s.year_level || s.academic_year || u.year_level || u.academic_year || ''
      };
    });
    const csv = [Object.keys(rows[0] || {}).join(',')].concat(rows.map(r => Object.values(r).map(v => '"'+String(v || '').replace(/"/g,'""')+'"').join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${pageLower}s-export.csv`; a.click(); URL.revokeObjectURL(url);
  };

  // CSV import: parse a CSV file (simple parser), show preview and allow import
  const handleImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return alert('Empty file');
      const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
      const data = lines.slice(1, 51).map(l => {
        const cols = l.split(',').map(c => c.replace(/^\s*"|"\s*$/g,'').trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
        return obj;
      });
      setImportPreview({ headers, count: lines.length - 1 });
      setImportRows(data);
      // show a confirm prompt to actually import
      if (confirm(`Preview ${data.length} rows (showing up to 50). Import now?`)) {
        // map rows to payloads and POST sequentially (safe)
        (async () => {
          for (const r of data) {
            try {
              const payload = {
                role: pageLower,
                student_id: r.student_id || r.id || '',
                first_name: r.first_name || r.first || '',
                last_name: r.last_name || r.surname || r.last || '',
                sex: r.sex || '',
                email: r.email || '',
                date_of_birth: r.date_of_birth || r.dob || '',
                phone_number: r.phone_number || r.phone || '',
                address: r.address || '',
                course: r.course || r.major || '',
                department: r.department || '',
                year_level: r.year_level || r.year || ''
              };
              if (!payload.name) payload.name = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
              if (!payload.password) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
              const res = await axios.post('/api/admin/users', payload).catch(e => { console.warn('Import row failed', e); return null; });
              try { window.dispatchEvent(new CustomEvent('admin:activities-changed')); } catch(e){}
              if (res && res.data && res.data.id) {
                setHighlightNewId(res.data.id);
                // clear highlight after 6s
                setTimeout(() => setHighlightNewId(null), 6000);
              }
            } catch (e) { console.error('Row import error', e); }
          }
          await loadUsers(); await loadArchivedUsers();
          alert('Import complete (attempted up to 50 rows)');
        })();
      }
    };
    reader.readAsText(file);
  };

  const openEdit = (user) => {
    console.log('openEdit called for user', user && user.id);
    setModalInitial(user);
    setModalRole(user && ((user.role) ? user.role : 'student'));
    // prefill modal form with existing values for a better edit experience
    try {
      const s = user && (user.student || {});
      setModalForm({
        first_name: (s.first_name || (user.name ? (user.name.split(' ')[0] || '') : '')),
        last_name: (s.last_name || (user.name ? (user.name.split(' ').slice(1).join(' ') || '') : '')),
        student_id: (s.student_id || ''),
        email: (user.email || s.email || ''),
        sex: (s.sex || ''),
        date_of_birth: (s.date_of_birth || ''),
        phone_number: (s.phone_number || ''),
        address: (s.address || ''),
        course: (s.course || ''),
        department: (s.department || ''),
        status: (s.status || 'Active'),
        date_of_enrollment: (s.date_of_enrollment || ''),
        year_level: (s.year_level || ''),
      });
    } catch(e) { /* ignore */ }
    setShowModal(true);
  };

  // debug effect removed to reduce log spam on modal toggles

  // Fallback detection removed entirely

  // All overlay/scroll effects disabled to prevent any interference with modal open/close

  

  // derived metrics
  const totalStudents = (users?.length || 0) + (archivedUsers?.length || 0);
  const activeCount = (users || []).filter(u => !u.deleted_at && !u.is_locked && (u.student?.status || 'active') !== 'suspended').length;
  const graduatedCount = (users || []).filter(u => (u.student?.status || '').toLowerCase() === 'graduated').length;
  const suspendedCount = (users || []).filter(u => (u.student?.status || '').toLowerCase() === 'suspended').length;
  const lockedCount = (users || []).filter(u => u.is_locked).length;
  const avgGpa = (() => {
    const vals = (users || []).map(u => typeof u.student?.gpa === 'number' ? u.student.gpa : null).filter(v => v !== null);
    if (!vals.length) return '-';
    return (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2);
  })();

  const visibleList = showArchived ? archivedUsers : users;
  const filteredList = visibleList.filter(u => {
    const q = (search || '').toLowerCase().trim();
    if (q) {
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || ((u.student && (u.student.student_id || '') ) || '').toLowerCase().includes(q);
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') return !u.deleted_at && !u.is_locked && (u.student?.status || '').toLowerCase() !== 'suspended';
      if (filterStatus === 'archived') return !!u.deleted_at;
      if (filterStatus === 'locked') return !!u.is_locked;
    }
    // filter by major/course
    if (filterMajor) {
      const course = (u.student?.course || u.course || '').toString().toLowerCase();
      if (!course.includes(filterMajor.toLowerCase())) return false;
    }
    // filter by department
    if (filterDepartment) {
      const dept = (u.student?.department || u.department || '').toString().toLowerCase();
      if (!dept.includes(filterDepartment.toLowerCase())) return false;
    }
    // filter by year
    if (filterYear) {
      const y = (u.student?.year_level || u.year_level || u.academic_year || '').toString().toLowerCase();
      if (!y.includes(filterYear.toLowerCase())) return false;
    }
    return true;
  });

  

  return (
    <div className={`admin-users ${pageLower}-page`}>
      <div className="hero-banner">
        <div className="hero-inner">
          <div className="hero-left">
            <h1>{pageType} Management</h1>
            <p>Manage {pageLower} records and accounts</p>
            <div className="hero-cards">
                <div className="hero-card">
                  <div className="card-title">Today</div>
                  <div className="card-sub">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
            </div>
          </div>
          <div className="hero-right">
            {/* header actions moved into the Students panel to avoid duplication */}
          </div>
        </div>
      </div>

      {/* fallback inline form removed */}

      {/* students metrics removed per design */}

      <div className="modern-management-card" style={{ background: '#fff', borderRadius: 16, padding: 0, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Header Section */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                {pagePlural}
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: role === 'teacher' ? '#ede9fe' : '#dbeafe', color: role === 'teacher' ? '#7c3aed' : '#6366f1', fontSize: 14, fontWeight: 600, padding: '4px 12px', borderRadius: 12 }}>
                  {totalStudents} {totalStudents === 1 ? pageLower : pageLower + 's'}
                </span>
              </h2>
              <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#6b7280' }}>Manage {pageLower} records and enrollment</p>
            </div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#6b7280', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6', background: '#fafbfc' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters:
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { 
                const val = e.target.value;
                setFilterStatus(val);
                setShowArchived(val === 'archived');
              }}
              style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text"
                placeholder={`Search ${pageLower}s...`} 
                value={search} 
                onChange={(e)=>setSearch(e.target.value)} 
                style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', transition: 'border 0.2s' }} 
                onFocus={(e) => e.target.style.borderColor = role === 'teacher' ? '#8b5cf6' : '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <button 
              onClick={() => exportToCSV()} 
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <FiDownload size={16} /> Export
            </button>
            <button 
              onClick={() => openAdd(pageLower)} 
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FiPlus size={18} /> Add {pageType}
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role === 'teacher' ? 'Faculty ID' : 'Student ID'}</th>
                <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role === 'teacher' ? 'Department' : 'Course'}</th>
                {role === 'teacher' && (
                  <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specialization</th>
                )}
                <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan={role === 'teacher' ? 7 : 6} style={{ padding: '40px 28px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No {pageLower}s found</td></tr>
              ) : filteredList.map((u) => {
                const student = u.student || {};
                const teacher = u.teacher || {};
                const profile = role === 'teacher' ? teacher : student;
                const fullName = u.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                const email = u.email || '';
                const studentId = profile.student_id || profile.faculty_id || u.student_id || '—';
                const courseOrDept = (role === 'teacher' ? profile.department : profile.course) || u.course || profile.major || '—';
                const specialization = profile.specialization || profile.position || profile.subject || '—';
                const statusVal = (profile.status || u.status || 'active').toString().toLowerCase();
                const enrollmentText = '';
                return (
                  <tr key={u.id} className={`${u.deleted_at ? 'archived-row' : ''} ${highlightNewId === u.id ? 'new-highlight' : ''}`} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                    <td style={{ padding: '16px 28px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{studentId}</td>
                    <td style={{ padding: '16px 28px', fontSize: 14, fontWeight: 500, color: '#111827' }}>{fullName}</td>
                    <td style={{ padding: '16px 28px', fontSize: 14, color: '#6366f1' }}>{email}</td>
                    <td style={{ padding: '16px 28px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        fontSize: 13, 
                        fontWeight: 500,
                        background: role === 'teacher' ? '#dbeafe' : '#dbeafe',
                        color: role === 'teacher' ? '#1d4ed8' : '#2563eb'
                      }}>
                        {courseOrDept}
                      </span>
                    </td>
                    {role === 'teacher' && (
                      <td style={{ padding: '16px 28px', fontSize: 14, color: '#6b7280' }}>{specialization}</td>
                    )}
                    <td style={{ padding: '16px 28px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        fontSize: 13, 
                        fontWeight: 500,
                        background: statusVal === 'active' ? '#d1fae5' : statusVal === 'locked' ? '#fee2e2' : '#f3f4f6',
                        color: statusVal === 'active' ? '#065f46' : statusVal === 'locked' ? '#991b1b' : '#6b7280'
                      }}>
                        {statusVal}
                      </span>
                    </td>
                    <td style={{ padding: '16px 28px', textAlign: 'center' }}>
                      <div className="actions" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      {!u.deleted_at ? (
                        <>
                          <button type="button" className="modern-action-btn" title="View" onClick={() => { setDetailUser(u); setShowDetail(true); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = role === 'teacher' ? '#ede9fe' : '#dbeafe'; e.currentTarget.style.color = role === 'teacher' ? '#7c3aed' : '#6366f1'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                            <FiEye size={14} />
                          </button>
                          <button type="button" className="modern-action-btn" title="Edit" onClick={() => openEdit(u)} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = role === 'teacher' ? '#ede9fe' : '#dbeafe'; e.currentTarget.style.color = role === 'teacher' ? '#7c3aed' : '#6366f1'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                            <FiEdit2 size={14} />
                          </button>
                          <button type="button" className="modern-action-btn" title={u.is_locked ? 'Unlock' : 'Lock'} onClick={() => toggleLock(u.id, u.is_locked)} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#92400e'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                            <FiLock size={14} />
                          </button>
                          <button type="button" className="modern-action-btn" title="Archive" onClick={() => archiveUser(u.id)} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                            <FiTrash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="modern-action-btn" title="Restore" onClick={() => restoreUser(u.id)} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>♻️</button>
                          <button type="button" className="modern-action-btn" title="Delete Permanently" onClick={() => permanentDeleteUser(u.id)} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <FiTrash2 size={14} />
                          </button>
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

  {showModal && (
    <UserFormModal 
      initial={modalInitial}
      role={modalRole || 'student'}
      onClose={(source) => { handleModalClose(source || 'modal'); }}
      onSave={saveFromUserForm}
    />
  )}

  {showDetail && React.createElement(StudentDetailModal, { user: detailUser, onClose: () => { setShowDetail(false); setDetailUser(null); }, onSaved: async () => { setShowDetail(false); await loadUsers(); await loadArchivedUsers(); } })}
    </div>
  );
}
