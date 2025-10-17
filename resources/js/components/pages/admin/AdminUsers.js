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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [modalRole, setModalRole] = useState('student');
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
  const [showInlineForm, setShowInlineForm] = useState(false);

  // simple inline form state (fallback)
  const [inlineForm, setInlineForm] = useState({ name: '', student_id: '', email: '' });
  const [inlineErrors, setInlineErrors] = useState({});

  // load users (non-archived students)
  const loadUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users?role=student');
      const u = Array.isArray(res.data) ? res.data : [];
      setUsers(u);
      try { console.debug('loadUsers: fetched', u.length, 'students', u.map(x => ({ id: x.id, email: x.email, deleted_at: x.deleted_at || (x.student && x.student.deleted_at) || null }))); } catch(e){}
      } catch (err) {
        console.error('Failed to load users', err);
        setUsers([]);
      }

  };

  // load archived (trashed) users separately
  const loadArchivedUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users?role=student&archived=1');
      const a = Array.isArray(res.data) ? res.data : [];
      setArchivedUsers(a);
      try { console.debug('loadArchivedUsers: fetched', a.length, 'archived students', a.map(x => ({ id: x.id, email: x.email, deleted_at: x.deleted_at || (x.student && x.student.deleted_at) || null }))); } catch(e){}
    } catch (err) {
      console.error('Failed to load archived users', err);
      setArchivedUsers([]);
    }
  };

  const archiveUser = async (id) => {
    if (!confirm('Archive this student?')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      await loadUsers(); await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      alert('Student archived');
    } catch (err) { console.error('Archive failed', err); alert('Failed to archive student'); }
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
      alert('Student restored');
    } catch (err) {
      console.error('Restore failed', err);
      alert('Failed to restore student');
    }
  };

  const permanentDeleteUser = async (id) => {
    if (!confirm('Permanently delete this student? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/admin/users/${id}?force=1`);
      await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      alert('Student permanently deleted');
    } catch (err) {
      console.error('Permanent delete failed', err);
      alert('Failed to permanently delete student');
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
    loadUsers();
    loadArchivedUsers().catch(() => {});

    // listen for global events
    const onUsersChanged = () => { loadUsers().catch(()=>{}); loadArchivedUsers().catch(()=>{}); };
    window.addEventListener('admin:users-changed', onUsersChanged);
    return () => { window.removeEventListener('admin:users-changed', onUsersChanged); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // Keep the current time updated and trigger a morning/day change refresh.
  useEffect(() => {
    const lastHourRef = { hour: now.getHours(), date: now.toDateString() };
    const tick = () => {
      try {
        const n = new Date();
        setNow(n);
        // if date changed (midnight) -> refresh
        if (n.toDateString() !== lastHourRef.date) {
          lastHourRef.date = n.toDateString();
          loadUsers().catch(() => {});
          loadArchivedUsers().catch(() => {});
        }
        // if we crossed into morning (before 6 -> >=6) trigger a refresh
        if (lastHourRef.hour < 6 && n.getHours() >= 6) {
          try { loadUsers().catch(() => {}); loadArchivedUsers().catch(() => {}); } catch(e){}
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

  const openAdd = (roleParam = 'student') => {
    console.log('openAdd called');
    try { prevGlobalOverlaysRef.current = Array.from(document.querySelectorAll('.modal-overlay')); } catch(e) { prevGlobalOverlaysRef.current = []; }
    setModalInitial(null);
    setModalRole(roleParam || 'student');
    // open the modal form
    setShowInlineForm(false);
    setModalForm({ first_name: '', last_name: '', student_id: '', email: '', sex: '', date_of_birth: '', date_of_enrollment: '', phone_number: '', department: '', address: '', course: '', status: 'Active', year_level: '' });
    setShowModal(true);
  };

  // modal form state for built-in modal
  const [modalForm, setModalForm] = useState({ first_name: '', last_name: '', student_id: '', email: '', date_of_birth: '', date_of_enrollment: '', phone_number: '', department: '', address: '', course: '', status: 'Active', year_level: '', sex: '' });
  const [modalErrors, setModalErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const fallbackTimerRef = useRef(null);
  const prevGlobalOverlaysRef = useRef([]);

  const handleModalChange = (k, v) => setModalForm(f => ({ ...f, [k]: v }));

  const handleModalSave = async () => {
  const errs = {};
  if (!modalForm.first_name) errs.first_name = 'First name is required';
  if (!modalForm.last_name) errs.last_name = 'Last name is required';
  // student_id is optional; backend will generate if missing
  if (modalForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalForm.email)) errs.email = 'Valid email required';
    setModalErrors(errs); if (Object.keys(errs).length) return;
    setModalSubmitting(true);
    try {
      const payload = {
        role: 'student',
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
        payload.password = gen();
      }
      // strip empty values so backend doesn't receive blank strings
      const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));

      let res = null;
      if (modalInitial && modalInitial.id) {
        res = await axios.put(`/api/admin/users/${modalInitial.id}`, payloadFiltered);
      } else {
        res = await axios.post('/api/admin/users', payloadFiltered);
      }
      setShowModal(false); setModalInitial(null); setShowInlineForm(false); setShowFallbackModal(false);
      await loadUsers(); await loadArchivedUsers();
      try { window.dispatchEvent(new CustomEvent('admin:users-changed', { detail: (res && res.data && res.data.stats) ? res.data.stats : {} })); } catch(e){}
      try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: (res && res.data && res.data.stats) ? res.data.stats : {} })); } catch(e){}
    } catch (e) {
      console.error('Save failed', e);
      // try to map server-side validation errors (Laravel 422) into modalErrors
      if (e && e.response && e.response.status === 422 && e.response.data && typeof e.response.data === 'object') {
        const data = e.response.data;
        // Laravel usually returns { message: '', errors: { field: [msgs] } }
        if (data.errors) {
          const fieldErrs = {};
          Object.keys(data.errors).forEach(k => { fieldErrs[k] = data.errors[k].join(' '); });
          setModalErrors(fieldErrs);
          setModalSubmitting(false);
          return;
        }
        if (data.message) alert(data.message);
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
          setHighlightNewId(id);
          // clear highlight after a few seconds
          setTimeout(() => setHighlightNewId(null), 6000);
          // refresh lists in case other page created it
          loadUsers().catch(() => {});
          loadArchivedUsers().catch(() => {});
        }
      } catch (e) { console.error('user-created handler failed', e); }
    };
    window.addEventListener('admin:user-created', onUserCreated);
    return () => window.removeEventListener('admin:user-created', onUserCreated);
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
    const a = document.createElement('a'); a.href = url; a.download = 'students-export.csv'; a.click(); URL.revokeObjectURL(url);
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
                role: 'student',
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
    setShowModal(true);
  };

  useEffect(() => {
    try { console.log('AdminUsers showModal changed', { showModal, modalInitial, modalRole }); } catch(e){}
  }, [showModal, modalInitial, modalRole]);

  // If the standard modal fails to appear (overlay missing), show a safe fallback form
  useEffect(() => {
    // clear any previous timer
    try { if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; } } catch(e){}
    if (!showModal) {
      setShowFallbackModal(false);
      setShowInlineForm(false);
      return;
    }
    // wait briefly for any other modal to mount, then check DOM
    fallbackTimerRef.current = setTimeout(() => {
      try {
        const hasVisibleModal = !!document.querySelector('.modal-overlay .modal, .modal.modal-wide');
        if (!hasVisibleModal) {
          console.warn('No modal detected — showing fallback form');
          setShowFallbackModal(true);
          setShowInlineForm(true);
        } else {
          setShowFallbackModal(false);
          setShowInlineForm(false);
        }
      } catch (e) { console.warn('fallback detection failed', e); setShowFallbackModal(true); }
    }, 300);
    return () => { try { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); } catch(e){} };
  }, [showModal]);

  // Workaround: hide only overlays that existed before opening our modal so we don't hide the modal we created.
  useEffect(() => {
    if (!showModal) return;
    const els = prevGlobalOverlaysRef.current || [];
    try {
      els.forEach(el => {
        if (!el) return;
        el.__prevDisplay = el.style.display;
        el.__prevBg = el.style.background;
        el.style.display = 'none';
      });
      return () => {
        try {
          (els || []).forEach(el => {
            if (!el) return;
            el.style.display = el.__prevDisplay || '';
            el.style.background = el.__prevBg || '';
            delete el.__prevDisplay; delete el.__prevBg;
          });
        } catch (e) { console.warn('restore overlays failed', e); }
      };
    } catch (e) { console.warn('overlay hide failed', e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  

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
    <div className="admin-users students-page">
      <div className="hero-banner">
        <div className="hero-inner">
          <div className="hero-left">
            <h1>Student Management</h1>
            <p>Manage student records and accounts</p>
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

      {showInlineForm && (
        <div className="card" style={{ padding: 14, margin: '12px 0' }}>
          <h3 style={{ marginTop: 0 }}>Add Student (fallback)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input placeholder="Full name" value={inlineForm.name} onChange={e => setInlineForm(f => ({ ...f, name: e.target.value }))} />
            <input placeholder="Student ID" value={inlineForm.student_id} onChange={e => setInlineForm(f => ({ ...f, student_id: e.target.value }))} />
            <input placeholder="Email" value={inlineForm.email} onChange={e => setInlineForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button className="primary" onClick={async () => {
              const errs = {};
              if (!inlineForm.name) errs.name = 'Name required';
              // student_id optional for import/fallback
              if (!inlineForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inlineForm.email)) errs.email = 'Valid email required';
              setInlineErrors(errs); if (Object.keys(errs).length) return;
              try {
                const payload = { role: 'student', name: inlineForm.name, student_id: inlineForm.student_id, email: inlineForm.email };
                const res = await axios.post('/api/admin/users', payload);
                if (res && res.data && res.data.id) {
                  alert('Student added'); setShowInlineForm(false); setInlineForm({ name: '', student_id: '', email: '' }); await loadUsers();
                  try { window.dispatchEvent(new CustomEvent('admin:users-changed', { detail: (res && res.data && res.data.stats) ? res.data.stats : {} })); } catch(e){}
                  try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: (res && res.data && res.data.stats) ? res.data.stats : {} })); } catch(e){}
                }
              } catch (e) {
                console.error('Inline add failed', e);
                if (e && e.response && e.response.status === 422 && e.response.data) {
                  const resp = e.response.data;
                  if (resp.errors) {
                    setInlineErrors(Object.keys(resp.errors).reduce((acc,k) => ({ ...acc, [k]: resp.errors[k].join(' ') }), {}));
                    return;
                  }
                  if (resp.message) alert(resp.message);
                  return;
                }
                alert((e && e.message) ? e.message : 'Failed to add student');
              }
            }}>Save</button>
            <button onClick={() => setShowInlineForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* students metrics removed per design */}

      <div className="card students-panel" style={{ padding: 20, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <FiUsers />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Students</div>
                <div className="small-muted">View and manage student information</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <button
                className={`chip ${(filterStatus === 'all' && !showArchived) ? 'active' : ''}`}
                type="button"
                onClick={() => { setFilterStatus('all'); setShowArchived(false); }}
                aria-pressed={(filterStatus === 'all' && !showArchived)}
              >
                All Students <span className="chip-count">{totalStudents}</span>
              </button>

              <button
                className={`chip ${(filterStatus === 'active' && !showArchived) ? 'active' : ''}`}
                type="button"
                onClick={() => { setFilterStatus('active'); setShowArchived(false); }}
                aria-pressed={(filterStatus === 'active' && !showArchived)}
              >
                Active <span className="chip-count">{activeCount}</span>
              </button>

              <button
                className={`chip ${(showArchived || filterStatus === 'archived') ? 'active' : ''}`}
                type="button"
                onClick={() => { setFilterStatus('archived'); setShowArchived(true); }}
                aria-pressed={(showArchived || filterStatus === 'archived')}
              >
                Archived <span className="chip-count">{archivedUsers.length}</span>
              </button>

              <button
                className={`chip ${(filterStatus === 'locked' && !showArchived) ? 'active' : ''}`}
                type="button"
                onClick={() => { setFilterStatus('locked'); setShowArchived(false); }}
                aria-pressed={(filterStatus === 'locked' && !showArchived)}
              >
                Locked <span className="chip-count">{lockedCount}</span>
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <input className="student-search" placeholder="Search students..." value={search} onChange={(e)=>setSearch(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#f3f4f6', border: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="primary" onClick={() => openAdd('student')} style={{ padding: '10px 16px' }}>+ Add Student</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="students-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Grade</th>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Enrollment Date</th>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '12px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20 }}>No students found</td></tr>
              ) : filteredList.map((u) => {
                const student = u.student || {};
                const fullName = u.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
                const email = u.email || '';
                const grade = student.year_level || u.year_level || '—';
                const enrollment = student.date_of_enrollment || student.enrollment_date || u.date_of_enrollment || u.enrollment_date || '';
                const statusVal = (student.status || u.status || 'Active').toString();
                const enrollmentText = enrollment ? (new Date(enrollment)).toLocaleDateString() : '—';
                return (
                  <tr key={u.id} className={`${u.deleted_at ? 'archived-row' : ''} ${highlightNewId === u.id ? 'new-highlight' : ''}`}>
                    <td style={{ padding: '12px 8px' }}>{fullName}</td>
                    <td style={{ padding: '12px 8px' }}>{email}</td>
                    <td style={{ padding: '12px 8px' }}>{grade}</td>
                    <td style={{ padding: '12px 8px' }}>{enrollmentText}</td>
                    <td style={{ padding: '12px 8px' }}><span className={`status-pill ${(statusVal||'').toLowerCase()}`}>{statusVal}</span></td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div className="actions" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {!u.deleted_at ? (
                        <>
                          <button type="button" className="action-icon view-button" title="View" onClick={() => { setDetailUser(u); setShowDetail(true); }}>
                            <FiEye />
                          </button>
                          <button type="button" className="action-icon" title="Edit" onClick={() => openEdit(u)}><FiEdit2 /></button>
                          <button type="button" className="action-icon" title={u.is_locked ? 'Unlock' : 'Lock'} onClick={() => toggleLock(u.id, u.is_locked)}><FiLock /></button>
                          <button type="button" className="action-icon text-danger" title="Archive" onClick={() => archiveUser(u.id)}><FiArchive /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="action-icon" title="Restore" onClick={() => restoreUser(u.id)}>♻️</button>
                          <button type="button" className="action-icon text-danger" title="Delete Permanently" onClick={() => permanentDeleteUser(u.id)}><FiTrash2 /></button>
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

  {showModal && (modalRole === 'student' ? (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-wide" style={{ maxWidth: 820 }}>
        <header className="modal-header">
          <h3>{modalInitial && modalInitial.id ? 'Edit Student' : 'Add New Student'}</h3>
          <button className="close" onClick={() => { setShowModal(false); setModalInitial(null); }}>{'×'}</button>
        </header>
        <form className="modal-body" onSubmit={e => { e.preventDefault(); handleModalSave(); }}>
          <div className="modal-grid">
            <div className="col">
              <label>First Name *</label>
              <input name="first_name" value={modalForm.first_name} onChange={e => handleModalChange('first_name', e.target.value)} placeholder="John" required />
              {modalErrors.first_name && <div className="field-error" style={{ color: '#b91c1c', marginTop: 6 }}>{modalErrors.first_name}</div>}
              <label>Last Name *</label>
              <input name="last_name" value={modalForm.last_name} onChange={e => handleModalChange('last_name', e.target.value)} placeholder="Doe" required />
              {modalErrors.last_name && <div className="field-error" style={{ color: '#b91c1c', marginTop: 6 }}>{modalErrors.last_name}</div>}
              <label>Student ID</label>
              <input name="student_id" value={modalForm.student_id} onChange={e => handleModalChange('student_id', e.target.value)} placeholder="ST2024001" />
              <label>Email *</label>
              <input name="email" type="email" value={modalForm.email} onChange={e => handleModalChange('email', e.target.value)} placeholder="student@school.edu" required />
              {modalErrors.email && <div className="field-error" style={{ color: '#b91c1c', marginTop: 6 }}>{modalErrors.email}</div>}
              <label>Sex</label>
              <select value={modalForm.sex} onChange={e => handleModalChange('sex', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col">
              <label>Date of Birth</label>
              <input name="date_of_birth" type="date" value={modalForm.date_of_birth} onChange={e => handleModalChange('date_of_birth', e.target.value)} />
              <label>Enrollment Date</label>
              <input name="date_of_enrollment" type="date" value={modalForm.date_of_enrollment} onChange={e => handleModalChange('date_of_enrollment', e.target.value)} />
              <label>Phone</label>
              <input name="phone_number" value={modalForm.phone_number} onChange={e => handleModalChange('phone_number', e.target.value)} placeholder="(555) 123-4567" />
              <label>Year Level</label>
              <input name="year_level" value={modalForm.year_level} onChange={e => handleModalChange('year_level', e.target.value)} placeholder="e.g. Freshman" />
            </div>
          </div>
          <div className="modal-grid full">
            <div className="col">
              <label>Address</label>
              <input name="address" value={modalForm.address} onChange={e => handleModalChange('address', e.target.value)} placeholder="123 Main St, City, State ZIP" />
            </div>
            <div className="col">
              <label>Department</label>
              <input name="department" value={modalForm.department} onChange={e => handleModalChange('department', e.target.value)} placeholder="Department name" />
              <label>Course</label>
              <input name="course" value={modalForm.course} onChange={e => handleModalChange('course', e.target.value)} placeholder="Course or major" />
            </div>
          </div>
          <footer className="modal-footer">
            <button type="button" onClick={() => { setShowModal(false); setModalInitial(null); }}>Cancel</button>
            <button type="button" className="primary" onClick={() => { console.log('Modal submit clicked'); handleModalSave(); }} disabled={modalSubmitting}>{modalInitial && modalInitial.id ? (modalSubmitting ? 'Saving...' : 'Save Changes') : (modalSubmitting ? 'Adding...' : 'Add Student')}</button>
          </footer>
        </form>
      </div>
    </div>
  ) : (
    React.createElement(UserFormModal, { initial: modalInitial, role: modalRole || ((modalInitial && modalInitial.role) ? modalInitial.role : 'student'), onClose: () => { setShowModal(false); setModalInitial(null); }, onSave: saveFromUserForm })
  ))}

  {showDetail && React.createElement(StudentDetailModal, { user: detailUser, onClose: () => { setShowDetail(false); setDetailUser(null); }, onSaved: async () => { setShowDetail(false); await loadUsers(); await loadArchivedUsers(); } })}
    </div>
  );
}
