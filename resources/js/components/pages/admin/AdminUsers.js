import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiUpload, FiDownload, FiPlus, FiEye, FiEdit2, FiLock, FiTrash2, FiUsers, FiCheckCircle, FiAward, FiAlertTriangle, FiBook, FiArchive } from 'react-icons/fi';
import { UserFormModal } from './UserFormModal';
import StudentDetailModal from './StudentDetailModal';

export default function AdminUsers({ role = 'student' }) {
  const [showModal, setShowModalInternal] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [modalRole, setModalRole] = useState(role);
  // missing shared state/refs used across the component
  const [users, setUsers] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const mountedRef = useRef(false);
  const modalShouldStayOpenRef = useRef(false);
  const highlightTimerRef = useRef(null);
  
  // Protected setShowModal - only allows setting to false when explicitly allowed
  const setShowModal = (value) => {
    console.log('[AdminUsers] setShowModal called with:', value);
    console.log('[AdminUsers] modalShouldStayOpenRef.current:', modalShouldStayOpenRef.current);
    
    if (value === false && modalShouldStayOpenRef.current) {
      console.error('[AdminUsers] ⛔⛔⛔ BLOCKED setShowModal(false) - modalShouldStayOpenRef is TRUE');
      console.trace('[AdminUsers] BLOCKED setShowModal stack trace:');
      return; // BLOCK the close
    }
    
    console.log('[AdminUsers] ✓ Allowing setShowModal:', value);
    setShowModalInternal(value);
  };
  
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [majors, setMajors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterMajor, setFilterMajor] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [detailUser, setDetailUser] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionMessageType, setActionMessageType] = useState('success');
  const actionMessageTimerRef = useRef(null);
  const [actionHighlightId, setActionHighlightId] = useState(null);
  const actionHighlightTimerRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  // selection removed
  const [importPreview, setImportPreview] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [highlightNewId, setHighlightNewId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  // Monitor showModal changes
  useEffect(() => {
    console.log('[AdminUsers] 🔔 showModal changed to:', showModal);
    console.log('[AdminUsers] modalShouldStayOpenRef.current:', modalShouldStayOpenRef.current);
    if (!showModal && modalShouldStayOpenRef.current) {
      console.error('[AdminUsers] ❌❌❌ ERROR: showModal is FALSE but modalShouldStayOpenRef is TRUE!');
      console.error('[AdminUsers] This should never happen! Modal was forcefully closed somehow.');
      console.trace('[AdminUsers] showModal change stack trace:');
    }
  }, [showModal]);

  // fallback inline form removed

  // Page-level labels derived from the `role` prop so the same component can
  // render Learners or Instructors pages without hard-coded strings.
  const pageType = (role === 'teacher') ? 'Instructor' : 'Learner';
  const pagePlural = pageType + 's';
  const pageLower = pageType.toLowerCase();

  // load users (non-archived students)
  const loadUsers = async () => {
    try {
      console.log('[AdminUsers] 🔄 Loading users for role:', role);
      const res = await axios.get(`/api/admin/users?role=${role}`);
      const u = Array.isArray(res.data) ? res.data : [];
      if (!mountedRef.current) return; 
      console.log('[AdminUsers] ✅ Loaded', u.length, role, 'users');
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

  // load courses for the dropdown
  const loadCourses = async () => {
    try {
      const res = await axios.get('/api/admin/courses');
      const c = res.data?.courses || res.data || [];
      if (!mountedRef.current) return;
      setCourses(c);
    } catch (err) {
      console.error('Failed to load courses', err);
      if (!mountedRef.current) return;
      setCourses([]);
    }
  };

  // load departments for the filter dropdown
  const loadDepartments = async () => {
    try {
      // Load from courses since that's where your departments are stored
      const res = await axios.get('/api/admin/courses');
      const coursesData = res.data?.courses || res.data || [];
      if (!mountedRef.current) return;
      console.log('[AdminUsers] 📚 Loaded courses/departments:', coursesData);
      // Extract unique course names (which are your departments)
      const uniqueDepts = [...new Set(coursesData.map(c => c.course_name || c.name).filter(Boolean))];
      console.log('[AdminUsers] 📋 Unique department names:', uniqueDepts);
      setDepartments(uniqueDepts);
      
      // Also extract all related courses from each department
      const allRelatedCourses = [];
      coursesData.forEach(dept => {
        if (dept.related_courses && Array.isArray(dept.related_courses)) {
          dept.related_courses.forEach(rc => {
            if (rc.name) {
              allRelatedCourses.push({
                name: rc.name,
                code: rc.code,
                department: dept.course_name
              });
            }
          });
        }
      });
      console.log('[AdminUsers] 📖 All related courses:', allRelatedCourses);
      // Update courses state with the actual courses (not departments)
      setCourses(allRelatedCourses);
    } catch (err) {
      console.error('[AdminUsers] ❌ Failed to load departments', err);
      if (!mountedRef.current) return;
      setDepartments([]);
      setCourses([]);
    }
  };

  const archiveUser = async (id) => {
    if (!confirm(`Archive this ${pageLower}?`)) return;
    try {
      const res = await axios.delete(`/api/admin/users/${id}`);
      // optimistic in-memory update: move user to archived list or mark deleted_at
      const existing = users.find(u => String(u.id) === String(id)) || archivedUsers.find(u => String(u.id) === String(id));
      const timestamp = new Date().toISOString();
      if (existing) {
        const updated = { ...existing, deleted_at: timestamp };
        // remove from users (active list)
        setUsers(prev => prev.filter(u => String(u.id) !== String(id)));
        // ensure it's present at the top of archivedUsers
        setArchivedUsers(prev => {
          const exists = prev.find(x => String(x.id) === String(id));
          if (exists) return prev.map(x => (String(x.id) === String(id) ? updated : x));
          return [updated, ...prev];
        });
      } else {
        // fallback: refresh lists if we couldn't find the user locally
        await loadUsers(); await loadArchivedUsers();
      }
  // local optimistic update applied; avoid forcing a full reload to prevent UI flicker
      showActionMessage(`${pageType} archived successfully`, 'success');
      return res && res.data ? res.data : {};
    } catch (err) { console.error('Archive failed', err); showActionMessage(`Failed to archive ${pageLower}`, 'error'); return null; }
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
      const res = await axios.post(`/api/admin/users/${id}/restore`);
      // Optimistic in-memory restore: move from archivedUsers back into users
      const existing = archivedUsers.find(u => String(u.id) === String(id)) || users.find(u => String(u.id) === String(id));
      if (existing) {
        const updated = { ...existing, deleted_at: null };
        // remove from archivedUsers
        setArchivedUsers(prev => prev.filter(u => String(u.id) !== String(id)));
        // ensure user is in users list at top
        setUsers(prev => {
          const already = prev.find(u => String(u.id) === String(id));
          if (already) return prev.map(u => (String(u.id) === String(id) ? updated : u));
          return [updated, ...prev];
        });
      } else {
        // if we couldn't find the object locally, refresh lists
        await loadUsers(); await loadArchivedUsers();
      }
  // local optimistic restore applied; avoid forcing a full reload to prevent UI flicker
      showActionMessage(`${pageType} restored successfully`, 'success');
      return res && res.data ? res.data : {};
    } catch (err) { console.error('Restore failed', err); showActionMessage(`Failed to restore ${pageLower}`, 'error'); return null; }
  };

  const permanentDeleteUser = async (id) => {
    if (!confirm(`Permanently delete this ${pageLower}? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/admin/users/${id}?force=1`);
      setArchivedUsers(prev => prev.filter(u => String(u.id) !== String(id)));
      try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
      showActionMessage(`${pageType} permanently deleted`, 'success');
      return res && res.data ? res.data : {};
    } catch (err) { console.error('Permanent delete failed', err); showActionMessage(`Failed to permanently delete ${pageLower}`, 'error'); return null; }
  };

  const toggleLock = async (id, currentlyLocked) => {
    try {
      let res = null;
      if (currentlyLocked) res = await axios.post(`/api/admin/users/${id}/unlock`);
      else res = await axios.post(`/api/admin/users/${id}/lock`);
      // update both active and archived lists so the row remains visible regardless of filters
      setUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, is_locked: !currentlyLocked } : u)));
      setArchivedUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, is_locked: !currentlyLocked } : u)));
  // Optimistic lock state updated locally. Do not dispatch a global reload event.
  showActionMessage(currentlyLocked ? `${pageType} unlocked` : `${pageType} locked`, 'success');
      return res && res.data ? res.data : {};
    } catch (err) {
      // Improved diagnostics: log status and response body when available
      try {
        if (err && err.response) {
          console.error('Lock toggle failed - response status:', err.response.status, 'data:', err.response.data);
          const serverMsg = (err.response.data && (err.response.data.message || err.response.data.error)) ? (err.response.data.message || err.response.data.error) : null;
          showActionMessage(serverMsg ? `Failed to change lock status: ${serverMsg}` : 'Failed to change lock status', 'error');
          // If the direct lock/unlock endpoint failed (maybe due to routing/permission), try the toggle endpoint as a fallback
          try {
            const fallback = await axios.post(`/api/admin/users/${id}/toggle-lock`);
            // update UI to reflect toggled state from fallback on both lists
            setUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, is_locked: !currentlyLocked } : u)));
            setArchivedUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, is_locked: !currentlyLocked } : u)));
            try { window.dispatchEvent(new CustomEvent('admin:users-changed')); } catch(e){}
            showActionMessage(`${pageType} lock toggled (fallback)`, 'success');
            return fallback && fallback.data ? fallback.data : {};
          } catch (fbErr) {
            console.error('Fallback toggle-lock failed', fbErr);
          }
        } else {
          console.error('Lock toggle failed (no response available)', err);
        }
      } catch (logErr) { console.error('Error while handling lock toggle failure', logErr); }
      showActionMessage('Failed to change lock status', 'error');
      return null;
    }
  };

  const showActionMessage = (text, type = 'success', id = null) => {
    try { if (actionMessageTimerRef.current) clearTimeout(actionMessageTimerRef.current); } catch(e){}
    setActionMessage(text);
    setActionMessageType(type);
    // optionally highlight the affected row
    if (id) showActionHighlight(id);
    actionMessageTimerRef.current = setTimeout(() => { setActionMessage(''); }, 4500);
  };

  const showActionHighlight = (id) => {
    try { if (actionHighlightTimerRef.current) clearTimeout(actionHighlightTimerRef.current); } catch(e){}
    setActionHighlightId(id);
    actionHighlightTimerRef.current = setTimeout(() => { setActionHighlightId(null); }, 2200);
  };

  const exportToCSV = () => {
    const dataToExport = filteredList;
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    let csvContent = '';
    
    if (role === 'teacher') {
      // Headers for teachers
      csvContent = 'Faculty ID,Name,Email,Department,Specialization,Status\n';

      // Data rows
      dataToExport.forEach(u => {
        const teacher = u.teacher || {};
        const profile = teacher;
        const fullName = u.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        const email = u.email || '';
        // backend stores the id in `teacher_id` but older frontends used `faculty_id`
        const facultyId = profile.teacher_id || profile.faculty_id || (u.teacher && u.teacher.teacher_id) || u.student_id || '';
        const department = profile.department || '';
        const specialization = profile.specialization || profile.position || profile.subject || '';
        const statusVal = (profile.status || u.status || 'active').toString();

        csvContent += `"${facultyId}","${fullName}","${email}","${department}","${specialization}","${statusVal}"\n`;
      });
    } else {
      // Headers for students - remove DB ID column
      csvContent = 'User ID,Student ID,First Name,Last Name,Sex,Email,Course,Department,Status,Date of Enrollment,Year Level\n';
      
      // Data rows
      dataToExport.forEach(u => {
        const student = u.student || {};
        const profile = student;
        const userId = u.user_id || '';
        const studentId = profile.student_id || u.student_id || '';
        const firstName = profile.first_name || u.first_name || (u.name ? u.name.split(' ')[0] : '') || '';
        const lastName = profile.last_name || u.last_name || (u.name ? u.name.split(' ').slice(1).join(' ') : '') || '';
        const sex = profile.sex || u.sex || '';
        const email = u.email || '';
        const course = profile.course || u.course || profile.major || '';
        const department = profile.department || u.department || '';
        const statusVal = (profile.status || u.status || 'active').toString();
        const enrollmentDate = profile.date_of_enrollment || u.date_of_enrollment || (u.created_at ? new Date(u.created_at).toLocaleDateString() : '');
        const yearLevel = profile.year_level || u.year_level || '';
        
        csvContent += `"${userId}","${studentId}","${firstName}","${lastName}","${sex}","${email}","${course}","${department}","${statusVal}","${enrollmentDate}","${yearLevel}"\n`;
      });
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageType}s_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // fetch users on mount and whenever archived toggle changes
  useEffect(() => {
    mountedRef.current = true;
    console.log('[AdminUsers] 🔄 Component mounted/updated - loading users for role:', role);
    loadUsers();
    loadArchivedUsers().catch(() => {});
    loadCourses(); // Load courses for the dropdown
    loadDepartments(); // Load departments for the filter dropdown

    // listen for global events
    // If a modal is currently open and marked as "should stay open" we ignore
    // server-triggered reloads. This prevents the user list from flashing or
    // briefly becoming empty while the modal is active (save/edit flows use
    // optimistic local updates instead).
    const onUsersChanged = async () => {
      try {
        if (modalShouldStayOpenRef.current) {
          // modal is open and intentionally preventing closes/reloads — ignore
          console.log('[AdminUsers] Ignoring admin:users-changed while modal is open');
          return;
        }
        console.log('[AdminUsers] 🔄 Reloading users due to admin:users-changed event');
        await loadUsers().catch(() => {});
        await loadArchivedUsers().catch(() => {});
      } catch (e) { console.warn('onUsersChanged handler failed', e); }
    };

    window.addEventListener('admin:users-changed', onUsersChanged);
    return () => { mountedRef.current = false; window.removeEventListener('admin:users-changed', onUsersChanged); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, role]); // Added 'role' to dependencies to reload when switching between students/teachers

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
    console.log('[AdminUsers] ========== OPEN ADD START ==========');
    console.log('[AdminUsers] openAdd called for role:', roleParam || role);
    
    const actualRole = roleParam || role || 'student';
    
    // Set flags FIRST
    modalOpenTimeRef.current = Date.now();
    modalShouldStayOpenRef.current = true;
    console.log('[AdminUsers] modalShouldStayOpenRef set to TRUE');
    console.log('[AdminUsers] modalOpenTimeRef set to:', modalOpenTimeRef.current);
    
    // Update all state
    setModalInitial(null);
    setModalRole(actualRole);
    
    // Initialize form fields based on role
    if (actualRole === 'teacher') {
      setModalForm({ 
        first_name: '', 
        last_name: '', 
        faculty_id: '', 
        email: '', 
        sex: '', 
        date_of_birth: '', 
        phone_number: '', 
        department: '', 
        address: '', 
        position: '', 
        courses_handled: '',
        status: 'Active'
      });
    } else {
      setModalForm({ 
        first_name: '', 
        last_name: '', 
        student_id: '', 
        email: '', 
        sex: '', 
        date_of_birth: '', 
        date_of_enrollment: '', 
        phone_number: '', 
        department: '', 
        address: '', 
        course: '', 
        status: 'Active', 
        year_level: '' 
      });
    }
    
    // Open modal via global ModalHost so the modal stays mounted independently
    console.log('[AdminUsers] Dispatching open-user-modal event');
    try { window.dispatchEvent(new CustomEvent('open-user-modal', { detail: { role: actualRole, initial: null, courses: courses } })); } catch(e) { console.error('failed to dispatch open-user-modal', e); }
    console.log('[AdminUsers] ========== OPEN ADD END ==========');
  };

  // modal form state for built-in modal
  const [modalForm, setModalForm] = useState({ 
    first_name: '', 
    last_name: '', 
    student_id: '', 
    faculty_id: '',
    email: '', 
    date_of_birth: '', 
    date_of_enrollment: '', 
    phone_number: '', 
    department: '', 
    address: '', 
    course: '', 
    position: '',
    courses_handled: '',
    status: 'Active', 
    year_level: '', 
    sex: '' 
  });
  const [modalErrors, setModalErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalServerMessage, setModalServerMessage] = useState('');
  const firstErrorRef = useRef(null);
  // fallback modal removed
  const prevGlobalOverlaysRef = useRef([]);
  const modalOpenTimeRef = useRef(0);

  const handleModalClose = (source = 'unknown') => {
    console.log('[AdminUsers] ========================================');
    console.log('[AdminUsers] handleModalClose called - Source:', source);
    console.log('[AdminUsers] modalShouldStayOpenRef.current:', modalShouldStayOpenRef.current);
    console.log('[AdminUsers] ========================================');
    
    // ABSOLUTE PROTECTION: If ref says stay open, don't allow ANY close except explicit user actions
    if (modalShouldStayOpenRef.current) {
      const userClickedButton = window.__userClickedCloseButton;
      
      // Only these exact scenarios can close when modal should stay open:
      // 1. User explicitly clicked Cancel or X button
      if (userClickedButton && (source === 'cancel-button' || source === 'close-button')) {
        console.log('[AdminUsers] ✓ User clicked Cancel/X button - ALLOWED close');
        window.__userClickedCloseButton = false;
        modalShouldStayOpenRef.current = false;
        setShowModal(false); 
        setModalInitial(null);
        setModalRole(role);
        return;
      }
      
      // 2. Save was successful  
      if (source === 'save-success') {
        console.log('[AdminUsers] ✓ Save successful - ALLOWED close');
        modalShouldStayOpenRef.current = false;
        setShowModal(false); 
        setModalInitial(null);
        setModalRole(role);
        return;
      }
      
      // 3. EVERYTHING ELSE IS BLOCKED
      console.error('[AdminUsers] ⛔⛔⛔ BLOCKED CLOSE ATTEMPT ⛔⛔⛔');
      console.error('[AdminUsers] Source:', source);
      console.error('[AdminUsers] userClickedButton:', userClickedButton);
      console.error('[AdminUsers] Modal will stay open until Save or Cancel');
      // Do NOT close modal
      return;
    }
    
    // If we reach here, modalShouldStayOpenRef is false, allow close
    console.log('[AdminUsers] ✓ modalShouldStayOpenRef is false - closing');
    setShowModal(false); 
    setModalInitial(null);
    setModalRole(role);
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
      const actualRole = modalRole || role;
      const payload = {
        role: actualRole,
        first_name: modalForm.first_name,
        last_name: modalForm.last_name,
        email: modalForm.email,
        // include name for backend validation
        name: `${modalForm.first_name} ${modalForm.last_name}`,
        sex: modalForm.sex || null,
        date_of_birth: modalForm.date_of_birth || null,
        phone_number: modalForm.phone_number || null,
        address: modalForm.address || null,
        department: modalForm.department || null,
        status: modalForm.status || 'Active',
      };
      
      // Add role-specific fields
      if (actualRole === 'teacher') {
        payload.faculty_id = modalForm.faculty_id || null;
        payload.teacher_id = modalForm.faculty_id || null;
        payload.position = modalForm.position || null;
        payload.courses_handled = modalForm.courses_handled || null;
      } else {
        payload.student_id = modalForm.student_id;
        payload.course = modalForm.course || null;
        payload.date_of_enrollment = modalForm.date_of_enrollment || null;
        payload.year_level = modalForm.year_level || null;
      }
      
      // when creating, include a temporary password so backend validation succeeds
      if (!(modalInitial && modalInitial.id)) {
        const gen = () => (Math.random().toString(36).slice(-8) + 'A1!');
        payload.password = payload.password || gen();
      }
      // strip empty values so backend doesn't receive blank strings
      const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));

      let res = null;
      if (modalInitial && modalInitial.id) {
        // edit: send update and merge changes into local lists to avoid full reload
        res = await axios.put(`/api/admin/users/${modalInitial.id}`, payloadFiltered);
        // optimistic local merge: update both lists so row stays visible
        setUsers(prev => prev.map(u => (String(u.id) === String(modalInitial.id) ? { ...u, ...payloadFiltered } : u)));
        setArchivedUsers(prev => prev.map(u => (String(u.id) === String(modalInitial.id) ? { ...u, ...payloadFiltered } : u)));
        // Reload to ensure changes are reflected
        await loadUsers();
        await loadArchivedUsers();
      } else {
        // create: post new user
        res = await axios.post('/api/admin/users', payloadFiltered);
        const created = res && res.data && res.data.user ? res.data.user : null;
        
        // Small delay to ensure backend has committed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Always reload both lists to show the new user
        await loadUsers();
        await loadArchivedUsers();
        
        // Highlight the newly created user
        if (created && created.id) {
          setHighlightNewId(created.id);
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => { if (mountedRef.current) setHighlightNewId(null); }, 6000);
        }
      }

      // DO NOT close modal here - let the callback from UserFormModal handle it
      // This prevents premature closing before the save animation completes
  // Notify other components about the user change
  try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: (res && res.data && res.data.user) ? { id: res.data.user.id } : {} })); } catch(e){}
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
        // merge payload into local lists (avoid full reload)
        try {
          setUsers(prev => prev.map(u => (String(u.id) === String(payload.id) ? { ...u, ...payload } : u)));
          setArchivedUsers(prev => prev.map(u => (String(u.id) === String(payload.id) ? { ...u, ...payload } : u)));
        } catch (e) { console.warn('Failed to merge updated user locally', e); }
        // Reload lists to ensure changes are reflected
        await loadUsers();
        await loadArchivedUsers();
        return Promise.resolve(res && res.data ? res.data : {});
      } else {
        // ensure required fields: backend requires password on create
        if (!payload.password) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
        const res = await axios.post('/api/admin/users', payload);
        const created = res && res.data && res.data.user ? res.data.user : null;
        
        // Small delay to ensure backend has committed the transaction
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload both lists to ensure fresh data is displayed
        await loadUsers(); 
        await loadArchivedUsers();
        
        // Highlight the newly created user
        if (created && created.id) {
          setHighlightNewId(created.id);
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => { if (mountedRef.current) setHighlightNewId(null); }, 6000);
        }
        
        // Notify other listeners about the creation
        try { window.dispatchEvent(new CustomEvent('admin:user-created', { detail: created ? { id: created.id } : {} })); } catch(e){}
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
          // Do NOT reload lists here; rely on optimistic insertion where possible to avoid flash.
        }
      } catch (e) { console.error('user-created handler failed', e); }
    };
    
    const onUsersChanged = async () => {
      try {
        if (!mountedRef.current) return;
        console.log('[AdminUsers] 🔄 Reloading users list after change event');
        await loadUsers();
        await loadArchivedUsers();
      } catch (e) { console.error('users-changed handler failed', e); }
    };
    
    window.addEventListener('admin:user-created', onUserCreated);
    window.addEventListener('admin:users-changed', onUsersChanged);
    return () => { 
      window.removeEventListener('admin:user-created', onUserCreated); 
      window.removeEventListener('admin:users-changed', onUsersChanged);
      try { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); } catch(e){} 
    };
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
    console.log('[AdminUsers] ========== OPEN EDIT START ==========');
    console.log('[AdminUsers] openEdit called for user', user && user.id);
    
    // Set protection flags FIRST
    modalOpenTimeRef.current = Date.now();
    modalShouldStayOpenRef.current = true;
    console.log('[AdminUsers] modalShouldStayOpenRef set to TRUE');
    console.log('[AdminUsers] modalOpenTimeRef set to:', modalOpenTimeRef.current);
    
    setModalInitial(user);
    setModalRole(user && ((user.role) ? user.role : 'student'));
    // prefill modal form with existing values for a better edit experience
    try {
      // prefer the specific profile (student or teacher) when present
      const profile = user && (user.student || user.teacher || {});
      setModalForm({
        first_name: (profile.first_name || (user.name ? (user.name.split(' ')[0] || '') : '')),
        last_name: (profile.last_name || (user.name ? (user.name.split(' ').slice(1).join(' ') || '') : '')),
        student_id: (profile.student_id || ''),
        faculty_id: (profile.teacher_id || profile.faculty_id || ''),
        email: (user.email || profile.email || ''),
        sex: (profile.sex || ''),
        date_of_birth: (profile.date_of_birth || ''),
        phone_number: (profile.phone_number || ''),
        address: (profile.address || ''),
        course: (profile.course || ''),
        department: (profile.department || ''),
        status: (profile.status || 'Active'),
        date_of_enrollment: (profile.date_of_enrollment || ''),
        year_level: (profile.year_level || ''),
        position: (profile.position || ''),
        courses_handled: (profile.courses_handled || ''),
      });
    } catch(e) { /* ignore */ }
    
  console.log('[AdminUsers] Dispatching open-user-modal event for edit');
  try { window.dispatchEvent(new CustomEvent('open-user-modal', { detail: { role: modalRole || role, initial: user, courses: courses } })); } catch(e) { console.error('failed to dispatch open-user-modal', e); }
    console.log('[AdminUsers] ========== OPEN EDIT END ==========');
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
      const matchesSearch = (u.name || '').toLowerCase().includes(q) || 
                           (u.email || '').toLowerCase().includes(q) || 
                           ((u.student && (u.student.student_id || '')) || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && (u.deleted_at || u.is_locked || (u.student?.status || '').toLowerCase() === 'suspended')) return false;
      if (filterStatus === 'archived' && !u.deleted_at) return false;
      if (filterStatus === 'locked' && !u.is_locked) return false;
    }
    // filter by major/course
    if (filterMajor) {
      const course = (u.student?.course || u.teacher?.course || u.course || '').toString().toLowerCase();
      if (!course.includes(filterMajor.toLowerCase())) return false;
    }
    // filter by department - check multiple possible locations
    if (filterDepartment) {
      const dept = (u.student?.department || u.teacher?.department || u.department || '').toString().toLowerCase();
      if (!dept || !dept.includes(filterDepartment.toLowerCase())) return false;
    }
    // filter by course (specific course filter)
    if (filterCourse) {
      const course = (u.student?.course || u.teacher?.course || u.course || '').toString().toLowerCase();
      if (!course || !course.includes(filterCourse.toLowerCase())) return false;
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
      {/* Toast for action messages */}
      {actionMessage ? (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1100, pointerEvents: 'auto', transition: 'transform 240ms ease, opacity 240ms ease', transform: 'translateY(0)', opacity: 1 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 260, padding: '10px 14px', borderRadius: 10, boxShadow: '0 10px 30px rgba(2,6,23,0.12)', background: actionMessageType === 'success' ? '#ecfdf5' : '#fff1f2', color: actionMessageType === 'success' ? '#065f46' : '#7f1d1d', fontWeight: 700 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: actionMessageType === 'success' ? '#dcfce7' : '#fee2e2', color: actionMessageType === 'success' ? '#065f46' : '#7f1d1d' }}>
              {actionMessageType === 'success' ? <FiCheckCircle size={18} /> : <FiAlertTriangle size={18} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13 }}>{actionMessage}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      ) : null}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 auto' }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                {pagePlural}
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: role === 'teacher' ? '#ede9fe' : '#dbeafe', color: role === 'teacher' ? '#7c3aed' : '#6366f1', fontSize: 14, fontWeight: 600, padding: '4px 12px', borderRadius: 12 }}>
                  {totalStudents} {totalStudents === 1 ? pageLower : pageLower + 's'}
                </span>
              </h2>
              <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#6b7280' }}>Manage {pageLower} records and enrollment</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f3f4f6', background: '#fafbfc' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 14, fontWeight: 600, minWidth: '70px' }}>
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
              style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: '140px' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none', width: '200px', minWidth: '200px', maxWidth: '200px' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="course-filter-select"
              style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none', width: '200px', minWidth: '200px', maxWidth: '200px' }}
            >
              <option value="">All Courses</option>
              {courses.map((c, idx) => <option key={idx} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', maxWidth: '400px', minWidth: '200px', position: 'relative' }}>
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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button 
                onClick={() => exportToCSV()} 
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
              >
                <FiDownload size={16} /> Export
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAdd(role);
                }} 
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <FiPlus size={18} /> Add {pageType}
              </button>
            </div>
          </div>
        </div>

        {/* Table with constrained height and scroll */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 420px)', minHeight: '400px' }}>
          <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: role === 'student' ? '1400px' : '1200px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {role === 'student' ? (
                    <>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student ID</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>First Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sex</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrollment Date</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year Level</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </>
                ) : (
                  <>
                    <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faculty ID</th>
                    <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specialization</th>
                    <th style={{ textAlign: 'left', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '16px 28px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan={role === 'student' ? 12 : 7} style={{ padding: '40px 28px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No {pageLower}s found</td></tr>
              ) : filteredList.map((u) => {
                const student = u.student || {};
                const teacher = u.teacher || {};
                const profile = role === 'teacher' ? teacher : student;
                const fullName = u.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                const firstName = profile.first_name || u.first_name || '—';
                const lastName = profile.last_name || u.last_name || '—';
                const sex = profile.sex || u.sex || '—';
                const email = u.email || '';
                const studentId = profile.student_id || u.student_id || '—';
                // For teachers, the identifier is stored as teacher_id (legacy name faculty_id may exist)
                const facultyId = (role === 'teacher') ? (profile.teacher_id || profile.faculty_id || u.teacher_id || '—') : studentId;
                const dateOfBirth = profile.date_of_birth || u.date_of_birth || '—';
                const phoneNumber = profile.phone_number || u.phone_number || '—';
                const address = profile.address || u.address || '—';
                const course = profile.course || u.course || profile.major || '—';
                const department = profile.department || u.department || '—';
                const dateOfEnrollment = profile.date_of_enrollment || u.date_of_enrollment || u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';
                const yearLevel = profile.year_level || u.year_level || '—';
                const courseOrDept = (role === 'teacher' ? profile.department : profile.course) || u.course || profile.major || '—';
                const specialization = profile.specialization || profile.position || profile.subject || '—';
                const statusVal = (profile.status || u.status || 'active').toString().toLowerCase();
                const enrollmentText = '';
                return (
                  <tr key={u.id} className={`${u.deleted_at ? 'archived-row' : ''} ${highlightNewId === u.id ? 'new-highlight' : ''}`} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s', background: actionHighlightId === u.id ? 'linear-gradient(90deg, rgba(236,253,245,0.7), rgba(220,252,231,0.4))' : undefined }} onMouseEnter={(e) => e.currentTarget.style.background = actionHighlightId === u.id ? 'linear-gradient(90deg, rgba(236,253,245,0.9), rgba(220,252,231,0.8))' : '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = actionHighlightId === u.id ? 'linear-gradient(90deg, rgba(236,253,245,0.7), rgba(220,252,231,0.4))' : '#fff'}>
                    {role === 'student' ? (
                      <>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{studentId}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827' }}>{firstName}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827' }}>{lastName}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{sex}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6366f1' }}>{email}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#dbeafe', color: '#2563eb' }}>
                            {course}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{department}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: 6, 
                            fontSize: 12, 
                            fontWeight: 500,
                            background: statusVal === 'active' ? '#d1fae5' : statusVal === 'locked' ? '#fee2e2' : '#f3f4f6',
                            color: statusVal === 'active' ? '#065f46' : statusVal === 'locked' ? '#991b1b' : '#6b7280'
                          }}>
                            {statusVal}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{dateOfEnrollment}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{yearLevel}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div className="actions" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          {!u.deleted_at ? (
                            <>
                              <button type="button" className="modern-action-btn" title="View" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=view for user', u && u.id); setDetailUser(u); setShowDetail(true); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#6366f1'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                                <FiEye size={14} />
                              </button>
                              <button type="button" className="modern-action-btn" title="Edit" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=edit for user', u && u.id); openEdit(u); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#6366f1'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                                <FiEdit2 size={14} />
                              </button>
                              <button type="button" className="modern-action-btn" title={u.is_locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=toggleLock for user', u && u.id, 'currentlyLocked=', u && u.is_locked); toggleLock(u.id, u.is_locked); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: u.is_locked ? '#fee2e2' : '#f3f4f6', color: u.is_locked ? '#dc2626' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = u.is_locked ? '#fecaca' : '#fef3c7'; e.currentTarget.style.color = u.is_locked ? '#991b1b' : '#92400e'; }} onMouseLeave={(e) => { e.currentTarget.style.background = u.is_locked ? '#fee2e2' : '#f3f4f6'; e.currentTarget.style.color = u.is_locked ? '#dc2626' : '#6b7280'; }}>
                                <FiLock size={14} />
                              </button>
                              <button type="button" className="modern-action-btn" title="Archive" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=archive for user', u && u.id); archiveUser(u.id); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
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
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '16px 28px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{facultyId}</td>
                        <td style={{ padding: '16px 28px', fontSize: 14, fontWeight: 500, color: '#111827' }}>{fullName}</td>
                        <td style={{ padding: '16px 28px', fontSize: 14, color: '#6366f1' }}>{email}</td>
                        <td style={{ padding: '16px 28px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: 6, 
                            fontSize: 13, 
                            fontWeight: 500,
                            background: '#dbeafe',
                            color: '#1d4ed8'
                          }}>
                            {courseOrDept}
                          </span>
                        </td>
                        <td style={{ padding: '16px 28px', fontSize: 14, color: '#6b7280' }}>{specialization}</td>
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
                              <button type="button" className="modern-action-btn" title="View" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=view for user', u && u.id); setDetailUser(u); setShowDetail(true); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#7c3aed'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                                <FiEye size={14} />
                              </button>
                              <button type="button" className="modern-action-btn" title="Edit" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=edit for user', u && u.id); openEdit(u); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#7c3aed'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
                                <FiEdit2 size={14} />
                              </button>
                              <button type="button" className="modern-action-btn" title={u.is_locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=toggleLock for user', u && u.id, 'currentlyLocked=', u && u.is_locked); toggleLock(u.id, u.is_locked); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: u.is_locked ? '#fee2e2' : '#f3f4f6', color: u.is_locked ? '#dc2626' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = u.is_locked ? '#fecaca' : '#fef3c7'; e.currentTarget.style.color = u.is_locked ? '#991b1b' : '#92400e'; }} onMouseLeave={(e) => { e.currentTarget.style.background = u.is_locked ? '#fee2e2' : '#f3f4f6'; e.currentTarget.style.color = u.is_locked ? '#dc2626' : '#6b7280'; }}>
                                <FiLock size={14} />
                              </button>
                              <button type="button" className="modern-action-btn" title="Archive" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log('[AdminUsers] action=archive for user', u && u.id); archiveUser(u.id); }} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}>
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
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

  {/* Modal rendered by global ModalHost via events */}

  {showDetail && React.createElement(StudentDetailModal, { user: detailUser, onClose: () => { setShowDetail(false); setDetailUser(null); }, onSaved: async () => { setShowDetail(false); await loadUsers(); await loadArchivedUsers(); } })}
    </div>
  );
}
