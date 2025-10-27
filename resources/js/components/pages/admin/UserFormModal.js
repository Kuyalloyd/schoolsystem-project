import React, { useState, useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBook, FiAward } from 'react-icons/fi';

export function UserFormModal({ visible = true, initial, onClose, onSave, role = 'student', bare = false, simple = false }) {
  const componentMountedRef = useRef(true);
  const allowCloseRef = useRef(false);
  
  // Protected onClose - only allows close when explicitly allowed
  const protectedOnClose = (source) => {
    console.log('[UserFormModal] protectedOnClose called, source:', source);
    console.log('[UserFormModal] allowCloseRef.current:', allowCloseRef.current);
    
    // Only allow close for these specific sources
    const allowedSources = ['save-success', 'cancel-button', 'close-button'];
    
    if (!allowedSources.includes(source)) {
      console.error('[UserFormModal] ⛔ BLOCKED onClose - source not allowed:', source);
      return;
    }
    
    console.log('[UserFormModal] ✓ Allowing close, source:', source);
    allowCloseRef.current = true;
    if (onClose) {
      onClose(source);
    }
  };
  
  const [form, setForm] = useState({
    name: "",
    first_name: '',
    student_id: "",
    last_name: '',
    date_of_birth: "",
    enrollment_date: "",
    email: "",
    phone_number: "",
    major: "",
    academic_year: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    status: "Active",
    role: role || 'student',
    sex: '',
    password: '',
    // teacher fields
    faculty_id: '',
    position: '',
    department: '',
    courses_handled: '',
    fillup_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const watchdogRef = React.useRef(null);
  const mountTimeRef = React.useRef(Date.now());
  const shouldStayMountedRef = React.useRef(true);

  // Ensure the internal form.role always reflects the `role` prop passed by the
  // parent. Some callers render this modal for 'teacher' and expect the form to
  // initialize with that role; if the prop changes we should keep the form in
  // sync so the conditional fields and submit payload are correct.
  useEffect(() => {
    setForm(f => ({ ...f, role: role || f.role || 'student' }));
  }, [role]);

  useEffect(() => {
    if (initial) {
      setForm((f) => ({
        ...f,
          name: initial.name || (initial.first_name ? `${initial.first_name} ${initial.last_name || ''}`.trim() : ''),
          first_name: initial.first_name || (initial.name ? (initial.name.split(' ')[0] || '') : ''),
          last_name: initial.last_name || (initial.name ? (initial.name.split(' ').slice(1).join(' ') || '') : ''),
        student_id: initial.student?.student_id || initial.student_id || '',
  date_of_birth: initial.date_of_birth || initial.student?.date_of_birth || '',
  enrollment_date: initial.student?.enrollment_date || initial.enrollment_date || '',
        email: initial.email || '',
        phone_number: initial.phone_number || initial.student?.phone_number || '',
        major: initial.student?.course || '',
        academic_year: initial.student?.year_level || '',
        address: initial.student?.address || '',
        emergency_contact: initial.student?.emergency_contact || '',
        emergency_phone: initial.student?.emergency_phone || '',
  status: initial.student?.status || initial.status || 'Active',
  faculty_id: initial.teacher?.teacher_id || initial.teacher?.faculty_id || initial.faculty_id || '',
        position: initial.teacher?.position || initial.position || '',
  department: initial.student?.department || initial.teacher?.department || initial.department || '',
        courses_handled: Array.isArray(initial.teacher?.courses_handled) ? initial.teacher.courses_handled.join(', ') : (initial.teacher?.courses_handled || ''),
        role: initial.role || f.role || role || 'student',
        // optionally set sex if provided on profile
        sex: initial.student?.sex || initial.teacher?.sex || initial.sex || f.sex || '',
        fillup_date: initial.teacher?.fillup_date || initial.fillup_date || ''
      }));
    }
  }, [initial]);

  useEffect(() => {
    // set a minimal global flag so parent can detect mount if needed
    try {
      if (typeof window !== 'undefined') {
        window.__adminUserModalMounted = true;
        window.__adminUserModalRole = role;
        shouldStayMountedRef.current = true;
        console.log('[UserFormModal] ✅✅✅ MOUNTED for role:', role, 'initial:', initial ? 'edit mode' : 'create mode');
        console.log('[UserFormModal] Mount time:', new Date().toISOString());
      }
    } catch(e){
      console.error('[UserFormModal] mount error:', e);
    }
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.__adminUserModalMounted = false;
          console.error('[UserFormModal] ❌❌❌ UNMOUNTED for role:', role);
          console.error('[UserFormModal] Unmount time:', new Date().toISOString());
          console.error('[UserFormModal] shouldStayMountedRef was:', shouldStayMountedRef.current);
          console.trace('[UserFormModal] UNMOUNT STACK TRACE:');
        }
      } catch(e){}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: removed on-page push of debug messages to avoid showing any badge or 'unmounted' text.

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      try {
        // keep `name` in sync with first_name/last_name when either changes
        if (name === 'first_name') {
          next.name = `${value || ''} ${next.last_name || ''}`.trim();
        } else if (name === 'last_name') {
          next.name = `${next.first_name || ''} ${value || ''}`.trim();
        } else if (name === 'name') {
          // if user edits full name directly, attempt to split into first/last
          const parts = (value || '').trim().split(/\s+/);
          if (parts.length) {
            next.first_name = parts[0] || '';
            next.last_name = parts.slice(1).join(' ') || '';
          }
        }
      } catch (e) { /* ignore sync errors */ }
      return next;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    // minimal client-side validation
    const err = {};
    // Ensure roleVal is defined before use
    const roleVal = form.role || role || 'student';
    // Require first and last names for students and teachers
    if ((roleVal === 'student') || (roleVal === 'teacher')) {
      if (!form.first_name || !form.first_name.trim()) err.first_name = 'First name is required';
      if (!form.last_name || !form.last_name.trim()) err.last_name = 'Last name is required';
    } else {
      if (!form.name || !form.name.trim()) err.name = 'Full name is required';
    }
    // student fields are optional on the client; backend will generate or validate as needed
    if (!form.email || !form.email.trim()) err.email = 'Email is required';
    // simple email pattern
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Enter a valid email';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    setSubmitMessage('');
    // watchdog: if request takes too long, reset UI and inform the user
    try { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; } } catch(_){}
    watchdogRef.current = setTimeout(() => {
      try { setSubmitting(false); } catch(_e){}
      try { setSubmitMessage('Taking longer than expected. Please check your connection or try again.'); } catch(_e){}
    }, 15000);
  // assemble payload matching ERD fields (roleVal already defined above)

    // split name into first_name / last_name for backend compatibility
  // prefer explicit first_name/last_name when present, otherwise split 'name'
  const nameParts = (form.name || '').trim().split(/\s+/);
  const first_name = form.first_name || (nameParts.length ? nameParts[0] : '');
  const last_name = form.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

    const base = {
      name: form.name,
      first_name,
      last_name,
      email: form.email,
      role: roleVal,
    };

    // include password only when creating a new user
    // password handling removed — creation doesn't require a password from the admin UI

    if (roleVal === 'teacher') {
      const payload = {
        ...base,
        faculty_id: form.faculty_id || undefined,
        teacher_id: form.teacher_id || form.faculty_id || undefined,
        first_name: first_name || form.first_name || 'Teacher',
        last_name: last_name || form.last_name || 'Account',
        sex: form.sex || undefined,
        email: form.email,
        date_of_birth: form.date_of_birth || undefined,
        phone_number: form.phone_number || undefined,
        address: form.address || undefined,
        department: form.department || undefined,
        status: form.status || 'Active',
        courses_handled: form.courses_handled || undefined,
        fillup_date: form.fillup_date || undefined,
        position: form.position || undefined,
      };
      if (initial && initial.id) payload.id = initial.id;
      // include password for new user creation
      if (!(initial && initial.id)) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
        // strip empty values so the server doesn't receive blank strings that overwrite required columns
        const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));
        
        console.log('[UserFormModal] 📤 Sending STUDENT payload:', payloadFiltered);
        console.log('[UserFormModal] Role: student, isEdit:', !!initial);
        
        Promise.resolve(onSave(payloadFiltered, !!initial)).then((res) => {
        console.log('[UserFormModal] ✅ Student save successful!', res);
        // on success, clear errors and close immediately
        try { setErrors({}); } catch(e){}
  try { protectedOnClose('save-success'); } catch(e){}
      }).catch((err) => {
        console.error('[UserFormModal] ❌ Student save failed:', err);
        console.error('[UserFormModal] Error response:', err.response);
        
        // Show detailed error
        if (err && err.response && err.response.data) {
          const data = err.response.data;
          console.error('[UserFormModal] Server error data:', data);
          
          // Handle validation errors
          if (data.errors && typeof data.errors === 'object') {
            setErrors(data.errors);
            const errorMsg = Object.values(data.errors).flat().join('\n');
            alert('Validation failed:\n\n' + errorMsg);
            return;
          }
          
          // Handle other error messages
          if (data.message) {
            alert('Error: ' + data.message);
            return;
          }
        }
        
        // if the caller attached field errors, surface them inline
        if (err && err.fields && typeof err.fields === 'object') {
          setErrors(err.fields);
          const errorMsg = Object.values(err.fields).flat().join('\n');
          alert('Validation failed:\n\n' + errorMsg);
          return;
        }
        // show server response for debugging
        try {
          if (err && err.response) {
            const s = err.response.status;
            const d = err.response.data;
            console.warn('UserFormModal save error', s, d);
            if (d && d.errors) setErrors(Object.keys(d.errors).reduce((acc,k)=> ({ ...acc, [k]: d.errors[k].join(' ') }), {}));
            return;
          }
        } catch(e) { console.error('error showing save error', e); }
        if (err && err.message) { alert('Error: ' + err.message); return; }
        alert('Failed to save student. Check console for details.');
      }).finally(() => { try { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; } } catch(_e){} try { setSubmitting(false); } catch(_e){} });
      return;
    }

    // student payload (map major -> course, academic_year -> year_level)
    const payload = {
      ...base,
      student_id: form.student_id,
      first_name,
      last_name,
      date_of_birth: form.date_of_birth,
      date_of_enrollment: form.enrollment_date,
      phone_number: form.phone_number,
      course: form.major,
      year_level: form.academic_year,
      address: form.address,
      emergency_contact: form.emergency_contact,
      emergency_phone: form.emergency_phone,
      sex: form.sex,
      department: form.department,
      status: form.status,
    };
  if (initial && initial.id) payload.id = initial.id;
  if (!(initial && initial.id)) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
  const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));
  
  console.log('[UserFormModal] 📤 Sending payload:', payloadFiltered);
  console.log('[UserFormModal] Role:', role, 'isEdit:', !!initial);
  
  Promise.resolve(onSave(payloadFiltered, !!initial)).then((res) => {
    console.log('[UserFormModal] ✅ Save successful!', res);
    try { setErrors({}); } catch(e){}
    try { protectedOnClose('save-success'); } catch(e){}
  }).catch((err) => {
    console.error('[UserFormModal] ❌ Save failed:', err);
    console.error('[UserFormModal] Error response:', err.response);
    
    // Show detailed error
    if (err && err.response && err.response.data) {
      const data = err.response.data;
      console.error('[UserFormModal] Server error data:', data);
      
      // Handle validation errors
      if (data.errors && typeof data.errors === 'object') {
        setErrors(data.errors);
        const errorMsg = Object.values(data.errors).flat().join('\n');
        alert('Validation failed:\n\n' + errorMsg);
        return;
      }
      
      // Handle other error messages
      if (data.message) {
        alert('Error: ' + data.message);
        return;
      }
    }
    
    if (err && err.fields && typeof err.fields === 'object') {
      setErrors(err.fields);
      const errorMsg = Object.values(err.fields).flat().join('\n');
      alert('Validation failed:\n\n' + errorMsg);
      return;
    }
    
    if (err && err.message) {
      alert('Error: ' + err.message);
      return;
    }
    
    alert('Failed to save teacher. Check console for details.');
  }).finally(() => { 
    try { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; } } catch(_e){} 
    try { setSubmitting(false); } catch(_e){} 
  });
  };
  // build role-specific fragments to keep the JSX (createElement) tree simple and parser-friendly
  const studentTopLeft = simple ? React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Student ID'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiAward, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'student_id', value: form.student_id, onChange: handleChange, placeholder: 'ST2024001' })
      ),
      errors.student_id ? React.createElement('div', { className: 'input-error' }, errors.student_id) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Course *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiBook, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'major', value: form.major, onChange: handleChange, placeholder: 'Select course' })
      ),
      errors.major ? React.createElement('div', { className: 'input-error' }, errors.major) : null
    )
  ) : React.createElement(React.Fragment, null,
    // explicit first/last name for students
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'First Name *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiUser, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'first_name', value: form.first_name, onChange: handleChange, placeholder: 'John' })
      ),
      errors.first_name ? React.createElement('div', { className: 'input-error' }, errors.first_name) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Last Name *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiUser, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'last_name', value: form.last_name, onChange: handleChange, placeholder: 'Doe' })
      ),
      errors.last_name ? React.createElement('div', { className: 'input-error' }, errors.last_name) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Student ID'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiAward, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'student_id', value: form.student_id, onChange: handleChange, placeholder: 'ST2024001' })
      ),
      errors.student_id ? React.createElement('div', { className: 'input-error' }, errors.student_id) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Email *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiMail, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'email', type: 'email', value: form.email, onChange: handleChange, placeholder: 'student@school.edu' })
      ),
      errors.email ? React.createElement('div', { className: 'input-error' }, errors.email) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Major *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiBook, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'major', value: form.major, onChange: handleChange, placeholder: 'Select major' })
      ),
      errors.major ? React.createElement('div', { className: 'input-error' }, errors.major) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Phone *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiPhone, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'phone_number', value: form.phone_number, onChange: handleChange, placeholder: '(555) 123-4567' })
      )
    )
  );

  const teacherTopLeft = React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'First Name *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiUser, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'first_name', value: form.first_name, onChange: handleChange, placeholder: 'John', required: true })
      ),
      errors.first_name ? React.createElement('div', { className: 'input-error' }, errors.first_name) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Last Name *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiUser, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'last_name', value: form.last_name, onChange: handleChange, placeholder: 'Doe', required: true })
      ),
      errors.last_name ? React.createElement('div', { className: 'input-error' }, errors.last_name) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Faculty ID'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiAward, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'faculty_id', value: form.faculty_id, onChange: handleChange, placeholder: 'FAC2024001' })
      )
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Fillup Date'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiCalendar, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'fillup_date', type: 'date', value: form.fillup_date, onChange: handleChange })
      )
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Email *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiMail, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'email', type: 'email', value: form.email, onChange: handleChange, placeholder: 'teacher@school.edu' })
      )
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Position'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiBook, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'position', value: form.position, onChange: handleChange, placeholder: 'Professor / Lecturer' })
      )
    ),
    // Phone moved to right column for teachers to balance form height
  );

  const topLeft = React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Full Name *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiUser, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'name', value: form.name, onChange: handleChange, placeholder: 'John Doe', required: true })
      )
    ),
    (form.role === 'student' ? studentTopLeft : teacherTopLeft)
  );

  const topRight = simple ? React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Date of Enrollment'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiCalendar, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'enrollment_date', type: 'date', value: form.enrollment_date, onChange: handleChange })
      )
    )
  ) : React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Date of Birth *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiCalendar, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'date_of_birth', type: 'date', value: form.date_of_birth, onChange: handleChange })
      )
    ),
    // Sex field for both students and teachers
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Sex'),
      React.createElement('select', { name: 'sex', value: form.sex, onChange: handleChange, className: 'select-modern' },
        React.createElement('option', { value: '' }, 'Prefer not to say'),
        React.createElement('option', { value: 'Male' }, 'Male'),
        React.createElement('option', { value: 'Female' }, 'Female'),
        React.createElement('option', { value: 'Other' }, 'Other')
      )
    ),
    // Enrollment Date for students only
    (role === 'student' ? React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Enrollment Date'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiCalendar, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'enrollment_date', type: 'date', value: form.enrollment_date, onChange: handleChange })
      )
    ) : null),
    // For teachers (non-students), include Phone in the right column to balance the form
    (form.role === 'teacher' ? React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Phone *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiPhone, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'phone_number', value: form.phone_number, onChange: handleChange, placeholder: '(555) 123-4567' })
      )
    ) : null),
    React.createElement('div', { className: 'form-group-modern' },
      (form.role === 'student' ? React.createElement('label', null, 'Academic Year') : React.createElement('label', null, 'Department')),
      (form.role === 'student'
        ? React.createElement('select', { name: 'academic_year', value: form.academic_year, onChange: handleChange, className: 'select-modern' }, 
          React.createElement('option', { value: '' }, 'Select year'), 
          React.createElement('option', { value: 'Freshman' }, 'Freshman'), 
          React.createElement('option', { value: 'Sophomore' }, 'Sophomore'), 
          React.createElement('option', { value: 'Junior' }, 'Junior'), 
          React.createElement('option', { value: 'Senior' }, 'Senior')
        )
        : React.createElement('div', { className: 'input-with-icon' },
          React.createElement(FiBook, { className: 'input-icon', size: 18 }),
          React.createElement('input', { name: 'department', value: form.department, onChange: handleChange, placeholder: 'Enter department' })
        )
      )
    )
  );

  const middleLeftStudent = React.createElement('div', { className: 'form-group-modern' },
    React.createElement('label', null, 'Emergency Contact'),
    React.createElement('div', { className: 'input-with-icon' },
      React.createElement(FiUser, { className: 'input-icon', size: 18 }),
      React.createElement('input', { name: 'emergency_contact', value: form.emergency_contact, onChange: handleChange, placeholder: 'Name (Relationship)' })
    )
  );

  const middleLeftTeacher = React.createElement('div', { className: 'form-group-modern' },
    React.createElement('label', null, 'Courses Handled (comma separated)'),
    React.createElement('div', { className: 'input-with-icon' },
      React.createElement(FiBook, { className: 'input-icon', size: 18 }),
      React.createElement('input', { name: 'courses_handled', value: form.courses_handled, onChange: handleChange, placeholder: 'Course A, Course B' })
    )
  );

  const middleLeft = React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Address'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiMapPin, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'address', value: form.address, onChange: handleChange, placeholder: '123 Main St, City, State ZIP' })
      )
    ),
    (form.role === 'student' ? middleLeftStudent : middleLeftTeacher)
  );

  // no live preview — removed per request

  const middleRight = React.createElement('div', { className: 'col-modern' },
    (form.role === 'student' ? React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Emergency Phone'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiPhone, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'emergency_phone', value: form.emergency_phone, onChange: handleChange, placeholder: '(555) 000-0000' })
      )
    ) : null),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Status *'),
      (form.role === 'student'
        ? React.createElement('select', { name: 'status', value: form.status, onChange: handleChange, className: 'select-modern' }, 
          React.createElement('option', { value: 'Active' }, 'Active'), 
          React.createElement('option', { value: 'Suspended' }, 'Suspended'), 
          React.createElement('option', { value: 'Graduated' }, 'Graduated'), 
          React.createElement('option', { value: 'Locked' }, 'Locked')
        )
        : React.createElement('select', { name: 'status', value: form.status, onChange: handleChange, className: 'select-modern' }, 
          React.createElement('option', { value: 'Active' }, 'Active'), 
          React.createElement('option', { value: 'Sabbatical' }, 'Sabbatical'), 
          React.createElement('option', { value: 'Retired' }, 'Retired'), 
          React.createElement('option', { value: 'Locked' }, 'Locked')
        )
      )
    ),
    // (No duplicate Courses Handled on right column — it's rendered in middleLeftTeacher)
    null
  );

  const isTeacher = (form.role || role) === 'teacher';

  const modalInner = React.createElement(
    'div',
    { className: 'modal modal-wide modal-modern', 'data-admin-user-modal': '1', style: { maxWidth: '960px', width: '100%', boxSizing: 'border-box', margin: '0 auto', position: 'relative' } },
    React.createElement(
      'header',
      { className: 'modal-header-modern' },
      React.createElement('div', { className: 'modal-header-content' },
        React.createElement('div', { className: 'modal-icon' },
          React.createElement(FiUser, { size: 24 })
        ),
        React.createElement('div', null,
          React.createElement('h3', null, initial ? (isTeacher ? 'Edit Teacher' : 'Edit Student') : (isTeacher ? 'Add New Teacher' : 'Add New Student')),
          React.createElement('p', { className: 'modal-subtitle' }, 
            initial ? 'Update the information below' : 'Fill in the information to create a new ' + (isTeacher ? 'teacher' : 'student')
          )
        )
      ),
      React.createElement('button', { 
        className: 'modal-close-btn', 
        onClick: (e) => { 
          e.preventDefault(); 
          e.stopPropagation();
          console.log('[UserFormModal] X button clicked - calling protectedOnClose');
          // Set a flag on window so parent knows user intentionally clicked X
          try { window.__userClickedCloseButton = true; } catch(e){}
          protectedOnClose('close-button'); 
        }, 
        type: 'button' 
      },
        React.createElement(FiX, { size: 20 })
      )
    ),
    React.createElement(
      'form',
      { onSubmit: submit, className: 'modal-body-modern' },
      React.createElement('div', { className: 'modal-grid-modern' }, topLeft, topRight),
      (!simple ? React.createElement('div', { className: 'modal-grid-modern full' }, middleLeft, middleRight) : null),
      (submitMessage ? React.createElement('div', { className: 'submit-message', style: { marginTop: 8, color: '#92400e', background: '#fff7ed', border: '1px solid #fed7aa', padding: 10, borderRadius: 8 } }, submitMessage) : null),
      React.createElement(
        'footer',
        { className: 'modal-footer-modern' },
        React.createElement('button', { 
          type: 'button', 
          className: 'btn-cancel-modern', 
          onClick: (e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            console.log('[UserFormModal] Cancel button clicked - calling protectedOnClose');
            // Set a flag on window so parent knows user intentionally clicked Cancel
            try { window.__userClickedCloseButton = true; } catch(e){}
            protectedOnClose('cancel-button'); 
          }, 
          disabled: submitting 
        }, 'Cancel'),
        React.createElement('button', { type: 'submit', className: 'btn-save-modern', disabled: submitting }, 
          submitting ? (
            React.createElement('span', null, 
              React.createElement('span', { className: 'spinner-modern' }),
              'Saving...'
            )
          ) : (initial ? 'Save Changes' : (isTeacher ? 'Add Teacher' : 'Add Student'))
        )
      )
    )
  );

  // When bare=true, return the inner modal content only. Parent is responsible for overlay.
  if (bare) return modalInner;

  // Render into a top-level portal so this modal is never hidden behind other overlays
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      let root = document.getElementById('admin-modal-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'admin-modal-root';
        // keep the root simple; z-index is applied on the overlay element below
        document.body.appendChild(root);
      }
      const overlay = React.createElement(
        'div',
        { 
          className: 'modal-overlay', 
          style: { zIndex: 10000, position: 'fixed', inset: 0, display: visible ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          onMouseDown: (e) => {
            // DISABLED: Backdrop clicks no longer close the modal
            // Users must use X button or Cancel button
            if (e.target === e.currentTarget) {
              console.log('[UserFormModal] Backdrop mouseDown detected - IGNORING (use X or Cancel button)');
              e.preventDefault();
              e.stopPropagation();
            }
          },
          onClick: (e) => {
            // Prevent any click events from bubbling
            if (e.target === e.currentTarget) {
              console.log('[UserFormModal] Backdrop click detected - IGNORING');
              e.preventDefault();
              e.stopPropagation();
            }
          }
        },
        // ensure the modal is scrollable on small viewports and centered
        React.cloneElement(modalInner, { 
          style: Object.assign({}, modalInner.props && modalInner.props.style || {}, { maxHeight: '90vh', overflowY: 'auto', margin: '0 auto', alignSelf: 'center', position: 'relative', left: 'initial', transform: 'none' }),
          onClick: (e) => e.stopPropagation() // prevent clicks inside modal from bubbling to overlay
        })
      );
      return createPortal(overlay, root);
    }
  } catch (e) { /* fall through to inline */ }
  return React.createElement('div', { className: 'modal-overlay', style: { zIndex: 10000, position: 'fixed', inset: 0, display: visible ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' } }, React.cloneElement(modalInner, { style: Object.assign({}, modalInner.props && modalInner.props.style || {}, { maxHeight: '90vh', overflowY: 'auto', margin: '0 auto', alignSelf: 'center', position: 'relative', left: 'initial', transform: 'none' }) }));
}
