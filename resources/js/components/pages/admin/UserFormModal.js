import React, { useState, useEffect } from "react";

export default function UserFormModal({ initial, onClose, onSave, role = 'student', bare = false }) {
  const [form, setForm] = useState({
    name: "",
    student_id: "",
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm((f) => ({
        ...f,
        name: initial.name || (initial.first_name ? `${initial.first_name} ${initial.last_name || ''}`.trim() : ''),
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
        faculty_id: initial.teacher?.faculty_id || initial.faculty_id || '',
        position: initial.teacher?.position || initial.position || '',
  department: initial.student?.department || initial.teacher?.department || initial.department || '',
        courses_handled: Array.isArray(initial.teacher?.courses_handled) ? initial.teacher.courses_handled.join(', ') : (initial.teacher?.courses_handled || ''),
        role: initial.role || f.role || role || 'student',
        // optionally set sex if provided on profile
        sex: initial.student?.sex || initial.teacher?.sex || initial.sex || f.sex || '',
      }));
    }
  }, [initial]);

  useEffect(() => {
    // debug logging to trace modal lifecycle
    try { console.log('UserFormModal mounted', { initial, role }); } catch(e){}
    return () => { try { console.log('UserFormModal unmounted'); } catch(e){} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // push to on-page debug panel if available
  useEffect(() => {
    try { if (window && typeof window.__pushModalDebug === 'function') window.__pushModalDebug(`UserFormModal mounted role=${role} initial=${initial ? initial.id : 'null'}`); } catch(e){}
    return () => { try { if (window && typeof window.__pushModalDebug === 'function') window.__pushModalDebug('UserFormModal unmounted'); } catch(e){} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    // minimal client-side validation
    const err = {};
    if (!form.name || !form.name.trim()) err.name = 'Full name is required';
    // student fields are optional on the client; backend will generate or validate as needed
    if (!form.email || !form.email.trim()) err.email = 'Email is required';
    // simple email pattern
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Enter a valid email';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    // assemble payload matching ERD fields
    const roleVal = form.role || role || 'student';

    // split name into first_name / last_name for backend compatibility
    const parts = (form.name || '').trim().split(/\s+/);
    const first_name = parts.length ? parts[0] : '';
    const last_name = parts.length > 1 ? parts.slice(1).join(' ') : '';

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
        faculty_id: form.faculty_id,
        first_name,
        last_name,
        sex: form.sex,
        email: form.email,
        date_of_birth: form.date_of_birth,
        phone_number: form.phone_number,
        address: form.address,
        course: form.major || form.course || '',
        department: form.department,
        status: form.status,
        courses_handled: form.courses_handled,
        position: form.position,
      };
      if (initial && initial.id) payload.id = initial.id;
      // include password for new user creation
      if (!(initial && initial.id)) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
        // strip empty values so the server doesn't receive blank strings that overwrite required columns
        const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));
        Promise.resolve(onSave(payloadFiltered, !!initial)).then(() => { setSubmitting(false); onClose(); }).catch((err) => {
        setSubmitting(false);
        // if the caller attached field errors, surface them inline
        if (err && err.fields && typeof err.fields === 'object') {
          setErrors(err.fields);
          return;
        }
        if (err && err.message) {
          alert(err.message);
          return;
        }
        alert('Failed to save user');
      });
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
  Promise.resolve(onSave(payloadFiltered, !!initial)).then(() => { setSubmitting(false); onClose(); }).catch((err) => {
    setSubmitting(false);
    if (err && err.fields && typeof err.fields === 'object') {
      setErrors(err.fields);
      return;
    }
    if (err && err.message) {
      alert(err.message);
      return;
    }
    alert('Failed to save user');
  });
  };
  // build role-specific fragments to keep the JSX (createElement) tree simple and parser-friendly
  const studentTopLeft = React.createElement(React.Fragment, null,
    React.createElement('label', null, 'Student ID'),
    React.createElement('input', { name: 'student_id', value: form.student_id, onChange: handleChange, placeholder: 'ST2024001', style: { width: '100%' } }),
    errors.student_id ? React.createElement('div', { className: 'input-error' }, errors.student_id) : null,
    React.createElement('label', null, 'Email *'),
    React.createElement('input', { name: 'email', type: 'email', value: form.email, onChange: handleChange, placeholder: 'student@school.edu' }),
    errors.email ? React.createElement('div', { className: 'input-error' }, errors.email) : null,
    // password removed from student form
    React.createElement('label', null, 'Major *'),
    React.createElement('input', { name: 'major', value: form.major, onChange: handleChange, placeholder: 'Select major' }),
    errors.major ? React.createElement('div', { className: 'input-error' }, errors.major) : null
  );

  const teacherTopLeft = React.createElement(React.Fragment, null,
    React.createElement('label', null, 'Faculty ID'),
    React.createElement('input', { name: 'faculty_id', value: form.faculty_id, onChange: handleChange, placeholder: 'FAC2024001' }),
    React.createElement('label', null, 'Email *'),
    React.createElement('input', { name: 'email', type: 'email', value: form.email, onChange: handleChange, placeholder: 'teacher@school.edu' }),
    React.createElement('label', null, 'Password *'),
    React.createElement('input', { name: 'password', type: 'password', value: form.password, onChange: handleChange, placeholder: 'Enter a password', required: true }),
    React.createElement('label', null, 'Position'),
    React.createElement('input', { name: 'position', value: form.position, onChange: handleChange, placeholder: 'Professor / Lecturer' })
  );

  const topLeft = React.createElement('div', { className: 'col' },
    React.createElement('label', null, 'Full Name *'),
    React.createElement('input', { name: 'name', value: form.name, onChange: handleChange, placeholder: 'John Doe', required: true }),
    (form.role === 'student' ? studentTopLeft : teacherTopLeft)
  );

  const topRight = React.createElement('div', { className: 'col' },
    React.createElement('label', null, 'Date of Birth *'),
    React.createElement('input', { name: 'date_of_birth', type: 'date', value: form.date_of_birth, onChange: handleChange }),
    React.createElement('label', null, 'Enrollment Date'),
    React.createElement('input', { name: 'enrollment_date', type: 'date', value: form.enrollment_date, onChange: handleChange }),
    React.createElement('label', null, 'Phone *'),
    React.createElement('input', { name: 'phone_number', value: form.phone_number, onChange: handleChange, placeholder: '(555) 123-4567' }),
  (form.role === 'student' ? React.createElement('label', null, 'Academic Year') : React.createElement('label', null, 'Department')),
    (form.role === 'student'
      ? React.createElement('select', { name: 'academic_year', value: form.academic_year, onChange: handleChange }, React.createElement('option', { value: '' }, 'Select year'), React.createElement('option', { value: 'Freshman' }, 'Freshman'), React.createElement('option', { value: 'Sophomore' }, 'Sophomore'), React.createElement('option', { value: 'Junior' }, 'Junior'), React.createElement('option', { value: 'Senior' }, 'Senior'))
      : React.createElement('input', { name: 'department', value: form.department, onChange: handleChange })
    )
  );

  const middleLeftStudent = React.createElement(React.Fragment, null,
    React.createElement('label', null, 'Emergency Contact'),
    React.createElement('input', { name: 'emergency_contact', value: form.emergency_contact, onChange: handleChange, placeholder: 'Name (Relationship)' })
  );

  const middleLeftTeacher = React.createElement(React.Fragment, null,
    React.createElement('label', null, 'Courses Handled (comma separated)'),
    React.createElement('input', { name: 'courses_handled', value: form.courses_handled, onChange: handleChange, placeholder: 'Course A, Course B' })
  );

  const middleLeft = React.createElement('div', { className: 'col' },
    React.createElement('label', null, 'Address'),
    React.createElement('input', { name: 'address', value: form.address, onChange: handleChange, placeholder: '123 Main St, City, State ZIP' }),
    (form.role === 'student' ? middleLeftStudent : middleLeftTeacher)
  );

  // no live preview — removed per request

  const middleRight = React.createElement('div', { className: 'col' },
    (form.role === 'student' ? React.createElement(React.Fragment, null,
      React.createElement('label', null, 'Emergency Phone'),
      React.createElement('input', { name: 'emergency_phone', value: form.emergency_phone, onChange: handleChange, placeholder: '(555) 000-0000' })
    ) : null),
    React.createElement('label', null, 'Status *'),
    (form.role === 'student'
      ? React.createElement('select', { name: 'status', value: form.status, onChange: handleChange }, React.createElement('option', { value: 'Active' }, 'Active'), React.createElement('option', { value: 'Suspended' }, 'Suspended'), React.createElement('option', { value: 'Graduated' }, 'Graduated'), React.createElement('option', { value: 'Locked' }, 'Locked'))
      : React.createElement('select', { name: 'status', value: form.status, onChange: handleChange }, React.createElement('option', { value: 'Active' }, 'Active'), React.createElement('option', { value: 'Sabbatical' }, 'Sabbatical'), React.createElement('option', { value: 'Retired' }, 'Retired'), React.createElement('option', { value: 'Locked' }, 'Locked'))
    )
  );

  const isTeacher = (form.role || role) === 'teacher';

  const modalInner = React.createElement(
    'div',
    { className: 'modal modal-wide' },
    React.createElement(
      'header',
      { className: 'modal-header' },
      React.createElement('h3', null, initial ? (isTeacher ? 'Edit Teacher' : 'Edit Student') : (isTeacher ? 'Add New Teacher' : 'Add New Student')),
      React.createElement('button', { className: 'close', onClick: onClose }, '×')
    ),
    React.createElement(
      'form',
      { onSubmit: submit, className: 'modal-body' },
      React.createElement('div', { className: 'modal-grid' }, topLeft, topRight),
      React.createElement('div', { className: 'modal-grid full' }, middleLeft, middleRight),
      React.createElement(
        'footer',
        { className: 'modal-footer' },
        React.createElement('button', { type: 'button', onClick: onClose, disabled: submitting }, 'Cancel'),
        React.createElement('button', { type: 'submit', className: 'primary', disabled: submitting }, submitting ? 'Saving...' : (initial ? 'Save Changes' : (isTeacher ? 'Add Teacher' : 'Add Student')))
      )
    )
  );

  if (bare) return modalInner;

  return React.createElement(
    'div',
    { className: 'modal-overlay' },
    modalInner
  );
}
