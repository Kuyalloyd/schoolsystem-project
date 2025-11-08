import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

export default function CourseFormModal({ initial = null, onClose, onSave, allCourses = [] }) {
  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    description: '',
    semester: '',
    prerequisites: '',
    credits: '',
    max_students: '',
    department: '',
    department_head: '',
    year: '',
    type: '', 
    teacher: '', 
    schedule: '', 
    status: 'Active' 
  });

  // State for prerequisite course selection
  const [prerequisiteSearch, setPrerequisiteSearch] = useState('');
  const [showPrerequisiteDropdown, setShowPrerequisiteDropdown] = useState(false);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState([]);
  
  useEffect(() => {
    if (initial) {
      // normalize status field - it may be called 'active' or 'status'
      const statusVal = initial.status || initial.active || 'Active';
      const normalizedStatus = typeof statusVal === 'boolean' 
        ? (statusVal ? 'Active' : 'Inactive') 
        : (statusVal.charAt(0).toUpperCase() + statusVal.slice(1).toLowerCase());
      
      setForm((s) => ({ 
        ...s, 
        name: initial.name || '',
        code: initial.code || '',
        description: initial.description || '',
        semester: initial.semester || '',
        prerequisites: initial.prerequisites || '',
        credits: initial.credits || '',
        max_students: initial.max_students || '',
        department: initial.department || '',
        department_head: initial.department_head || '',
        year: initial.year || '',
        type: initial.type || '',
        teacher: initial.teacher || '',
        schedule: initial.schedule || '',
        status: normalizedStatus
      }));

      // Parse prerequisites string into array of course objects
      if (initial.prerequisites) {
        const prereqNames = initial.prerequisites.split(',').map(s => s.trim()).filter(Boolean);
        const prereqCourses = prereqNames.map(name => {
          const found = allCourses.find(c => c.name === name || c.code === name);
          return found || { id: name, name: name };
        });
        setSelectedPrerequisites(prereqCourses);
      } else {
        setSelectedPrerequisites([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  
  const submit = () => {
    if (!form.name || !form.code) return alert('Please provide course name and code');
    
    // Convert selected prerequisites to comma-separated string
    const prerequisitesString = selectedPrerequisites.map(c => c.name).join(', ');
    const formData = { ...form, prerequisites: prerequisitesString };
    
    onSave && onSave(formData);
  };

  const addPrerequisite = (course) => {
    if (!selectedPrerequisites.find(c => c.id === course.id)) {
      setSelectedPrerequisites([...selectedPrerequisites, course]);
    }
    setPrerequisiteSearch('');
    setShowPrerequisiteDropdown(false);
  };

  const removePrerequisite = (courseId) => {
    setSelectedPrerequisites(selectedPrerequisites.filter(c => c.id !== courseId));
  };

  const filteredPrerequisites = allCourses.filter(course => 
    course.name?.toLowerCase().includes(prerequisiteSearch.toLowerCase()) &&
    !selectedPrerequisites.find(c => c.id === course.id)
  );

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide course-modal">
        <div className="modal-header">
          <h3>{initial ? 'Edit Department' : 'Add Department'}</h3>
          <div className="modal-sub">Manage course details, schedule and status</div>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Course Name *</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Business Administration Program" />
            </div>

            <div className="form-group">
              <label>Course Code *</label>
              <input value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="e.g. BAP 105" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea 
                value={form.description} 
                onChange={(e) => update('description', e.target.value)} 
                placeholder="Concentrates on business management, marketing, entrepreneurship, and organizational leadership..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label>Semester</label>
              <select value={form.semester} onChange={(e) => update('semester', e.target.value)}>
                <option value="">Select semester</option>
                <option value="Fall">Fall</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Prerequisites (Select Courses)</label>
              <div style={{ position: 'relative' }}>
                {/* Selected Prerequisites Tags */}
                {selectedPrerequisites.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {selectedPrerequisites.map((course) => (
                      <div 
                        key={course.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          padding: '6px 10px', 
                          background: '#dbeafe', 
                          color: '#1e40af', 
                          borderRadius: 6, 
                          fontSize: 13, 
                          fontWeight: 500 
                        }}
                      >
                        <span>{course.name}</span>
                        <button
                          type="button"
                          onClick={() => removePrerequisite(course.id)}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#1e40af', 
                            cursor: 'pointer', 
                            padding: 0, 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Search Input */}
                <input 
                  type="text"
                  value={prerequisiteSearch} 
                  onChange={(e) => {
                    setPrerequisiteSearch(e.target.value);
                    setShowPrerequisiteDropdown(true);
                  }}
                  onFocus={() => setShowPrerequisiteDropdown(true)}
                  placeholder="Search and select prerequisite courses..." 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                />
                
                {/* Dropdown */}
                {showPrerequisiteDropdown && prerequisiteSearch && filteredPrerequisites.length > 0 && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      background: '#fff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: 8, 
                      marginTop: 4, 
                      maxHeight: 200, 
                      overflowY: 'auto', 
                      zIndex: 1000, 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                    }}
                  >
                    {filteredPrerequisites.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => addPrerequisite(course)}
                        style={{ 
                          padding: '10px 12px', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: 14 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        <div style={{ fontWeight: 600, color: '#111827' }}>{course.name}</div>
                        {course.code && (
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{course.code}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Credits</label>
              <input 
                type="number" 
                value={form.credits} 
                onChange={(e) => update('credits', e.target.value)} 
                placeholder="e.g. 5000" 
              />
            </div>

            <div className="form-group">
              <label>Max Students</label>
              <input 
                type="number" 
                value={form.max_students} 
                onChange={(e) => update('max_students', e.target.value)} 
                placeholder="e.g. 50000" 
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <select value={form.department} onChange={(e) => update('department', e.target.value)}>
                <option value="">Select department</option>
                <option value="BAP">Business Administration Program</option>
                <option value="CSP">Computer Studies Program</option>
                <option value="ICJEEP">Institute of Criminal Justice Education Program</option>
                <option value="ETP">Engineering & Technology Program</option>
                <option value="AP">Accountancy Program</option>
                <option value="NP">Nursing Program</option>
                <option value="ASP">Arts and Sciences Program</option>
                <option value="THMP">Tourism and Hospitality Management Program</option>
              </select>
            </div>

            <div className="form-group">
              <label>Department Head</label>
              <input 
                value={form.department_head} 
                onChange={(e) => update('department_head', e.target.value)} 
                placeholder="Enter department head name" 
              />
            </div>

            <div className="form-group">
              <label>Year</label>
              <select value={form.year} onChange={(e) => update('year', e.target.value)}>
                <option value="">Select year</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

            <div className="form-group" id="course-status">
              <label htmlFor="course-status">Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} data-testid="course-status-box">
                <button
                  type="button"
                  onClick={() => update('status', form.status === 'Active' ? 'Inactive' : 'Active')}
                  style={{
                    position: 'relative',
                    width: 56,
                    height: 28,
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: form.status === 'Active' ? '#10b981' : '#d1d5db',
                    outline: 'none',
                    flexShrink: 0
                  }}
                  title={`Click to ${form.status === 'Active' ? 'deactivate' : 'activate'}`}
                >
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: form.status === 'Active' ? 30 : 2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}></div>
                </button>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '6px 14px', 
                  borderRadius: 12, 
                  fontSize: 13, 
                  fontWeight: 600, 
                  background: form.status === 'Active' ? '#d1fae5' : '#f3f4f6', 
                  color: form.status === 'Active' ? '#065f46' : '#6b7280',
                  minWidth: 70,
                  textAlign: 'center'
                }}>
                  {form.status}
                </span>
              </div>
              {/* explicit select so admins can choose status easily */}
              <div style={{ marginTop: 8 }}>
                <select id="course-status-select" value={form.status} onChange={(e) => update('status', e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6eef8' }}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="">Select type</option>
                <option value="Lecture">Lecture</option>
                <option value="Lab">Lab</option>
                <option value="Seminar">Seminar</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>

            <div className="form-group">
              <label>Teacher</label>
              <input value={form.teacher} onChange={(e) => update('teacher', e.target.value)} placeholder="Instructor name" />
            </div>

            <div className="form-group">
              <label>Schedule</label>
              <input value={form.schedule} onChange={(e) => update('schedule', e.target.value)} placeholder="e.g. Mon, Wed 10:00-11:30" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary" onClick={submit}>{initial ? 'Update Department' : 'Add Department'}</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
