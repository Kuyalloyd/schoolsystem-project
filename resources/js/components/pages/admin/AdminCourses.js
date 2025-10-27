import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiBook, FiCalendar, FiClock, FiSearch, FiUserPlus, FiX, FiCheck, FiEye, FiStar, FiDownload, FiUpload } from 'react-icons/fi';
import Sidebar from './Sidebar';
import "../../../../sass/AdminDashboard.scss";

export default function AdminCourses() {
  const [activePage, setActivePage] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [creditsFilter, setCreditsFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  
  // Course Modal State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    department: '',
    semester: '',
    max_students: ''
  });

  // Enrollment Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [allEnrolledStudentIds, setAllEnrolledStudentIds] = useState(new Set());

  // Load data on mount
  useEffect(() => {
    loadCourses();
    loadStudents();
    loadTeachers();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/courses');
      const fetched = res.data.courses || [];
      setCourses(fetched);
      // derive departments from fetched courses so the filter options include newly added departments
      try {
        const deps = Array.from(new Set((fetched || []).map(c => (c.department || '').toString().trim()).filter(Boolean))).sort();
        setDepartments(deps);
      } catch (e) {
        setDepartments([]);
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await axios.get('/api/admin/users?role=student');
      const users = res.data.users || res.data || [];
      // Map returned users to student profile objects (use students.id from student relation)
      const studentsList = (users || []).map(u => {
        // if user has a related student profile, use that id and profile fields
        if (u && u.student) {
          return {
            id: u.student.id,
            student_id: u.student.student_id || null,
            first_name: u.student.first_name || (u.first_name || ''),
            last_name: u.student.last_name || (u.last_name || ''),
            name: (u.student.first_name || u.first_name || '') + ' ' + (u.student.last_name || u.last_name || ''),
            email: u.student.email || u.email || '',
            user_id: u.id || null,
          };
        }
        // fallback: construct a lightweight student-like object from the user row
        return {
          id: null,
          student_id: null,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          name: u.name || u.email || `User ${u.id}`,
          email: u.email || '',
          user_id: u.id || null,
        };
      });
      setStudents(studentsList);
    } catch (err) {
      console.error('Failed to load students', err);
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await axios.get('/api/admin/users?role=teacher');
      setTeachers(res.data.users || res.data || []);
    } catch (err) {
      console.error('Failed to load teachers', err);
    }
  };

  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      name: '',
      code: '',
      description: '',
      credits: '',
      department: '',
      semester: '',
      max_students: ''
    });
    setShowCourseModal(true);
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name || '',
      code: course.code || '',
      description: course.description || '',
      credits: course.credits || '',
      department: course.department || '',
      semester: course.semester || '',
      max_students: course.max_students || ''
    });
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await axios.put(`/api/admin/courses/${editingCourse.id}`, courseForm);
      } else {
        await axios.post('/api/admin/courses', courseForm);
      }
      setShowCourseModal(false);
      await loadCourses();
      try { window.dispatchEvent(new CustomEvent('admin:courses-changed', { detail: { active_courses: courses.length } })); } catch(e){}
    } catch (err) {
      console.error('Failed to save course', err);
      alert(err.response?.data?.message || 'Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await axios.delete(`/api/admin/courses/${courseId}`);
      await loadCourses();
      try { window.dispatchEvent(new CustomEvent('admin:courses-changed', { detail: { active_courses: courses.length } })); } catch(e){}
    } catch (err) {
      console.error('Failed to delete course', err);
      alert('Failed to delete course');
    }
  };

  const openEnrollModal = async (course) => {
    setSelectedCourse(course);
    try {
      // Load enrolled students for this course
      const enrollRes = await axios.get(`/api/admin/courses/${course.id}/enrollments`);
      const enrolled = enrollRes.data.students || enrollRes.data.enrollments || [];
      setEnrolledStudents(enrolled);
      
      // Filter available students (not enrolled)
      const enrolledIds = enrolled.map(s => s.id || s.student_id);
      const available = students.filter(s => !enrolledIds.includes(s.id));
      setAvailableStudents(available);
      
      // Also fetch students that are already enrolled in any course so we can disable them
      try {
        const allEnrolledRes = await axios.get('/api/admin/students/enrolled');
        const enrolledIdsAny = allEnrolledRes.data.student_ids || [];
        // store on state in a lightweight set for fast lookup
        setAllEnrolledStudentIds(new Set(enrolledIdsAny));
      } catch (e) {
        setAllEnrolledStudentIds(new Set());
      }

      setShowEnrollModal(true);
    } catch (err) {
      console.error('Failed to load enrollments', err);
      setEnrolledStudents([]);
      setAvailableStudents(students);
      setShowEnrollModal(true);
    }
  };

  const handleEnrollStudent = async (studentId) => {
    try {
      await axios.post(`/api/admin/courses/${selectedCourse.id}/enroll`, {
        student_id: studentId
      });
      // Refresh enrollment data and courses list
      await loadCourses();
      openEnrollModal(selectedCourse);
    } catch (err) {
      console.error('Failed to enroll student', err);
      alert(err.response?.data?.message || 'Failed to enroll student');
    }
  };

  const handleUnenrollStudent = async (studentId) => {
    if (!confirm('Remove this student from the course?')) return;
    try {
      await axios.post(`/api/admin/courses/${selectedCourse.id}/unenroll`, {
        student_id: studentId
      });
      // Refresh enrollment data and courses list
      await loadCourses();
      openEnrollModal(selectedCourse);
    } catch (err) {
      console.error('Failed to unenroll student', err);
      alert('Failed to remove student');
    }
  };

  const filteredCourses = courses.filter(course => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      (course.name || '').toLowerCase().includes(searchLower) ||
      (course.code || '').toLowerCase().includes(searchLower) ||
      (course.department || '').toLowerCase().includes(searchLower) ||
      (course.teacher_name || '').toLowerCase().includes(searchLower)
    );
    
    const matchesStatus = statusFilter === 'all' || (course.status || 'active').toLowerCase() === statusFilter.toLowerCase();
    const matchesSemester = semesterFilter === 'all' || course.semester === semesterFilter;
    const matchesDepartment = departmentFilter === 'all' || ((course.department || '').toString().toLowerCase() === (departmentFilter || '').toString().toLowerCase());
    const matchesCredits = creditsFilter === 'all' || course.credits === creditsFilter;
    return matchesSearch && matchesStatus && matchesSemester && matchesCredits && matchesDepartment;
  });

  const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0);
  const activeCourses = courses.filter(c => (c.status || 'active') === 'active').length;
  const inactiveCourses = courses.filter(c => c.status === 'inactive').length;
  const avgEnrollment = courses.length > 0 ? Math.round(totalEnrollments / courses.length) : 0;
  const atCapacity = courses.filter(c => c.enrollment_count >= c.max_students && c.max_students > 0).length;

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} />
      <main className="admin-main">
        <div className="admin-courses-page" style={{ padding: '24px 32px', background: '#f8f9fa', minHeight: '100vh' }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              Course Management
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#f59e0b', fontSize: 14, fontWeight: 600, padding: '4px 12px', borderRadius: 12 }}>
                {courses.length} courses
              </span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#9ca3af' }}>Manage courses and curriculum</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#9ca3af"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} /><line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} /><line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} /><line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} /></svg>
            <select
              style={{ padding: '6px 32px 6px 8px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, color: '#6b7280', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
              <option value="2028-2029">2028-2029</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#f3f4f6', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters:
          </div>
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ padding: '6px 28px 6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'#6b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 6px center/14px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Departments</option>
            {(departments || []).map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
          {/* Calendar filters removed */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 28px 6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, color: '#374151', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'#6b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 6px center/14px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', maxWidth: '400px', minWidth: '200px', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text"
              placeholder="Search courses..." 
              value={searchTerm} 
              onChange={(e)=>setSearchTerm(e.target.value)} 
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', transition: 'border 0.2s' }} 
              onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button 
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <FiDownload size={16} /> Export
            </button>
            <button 
              onClick={openAddCourse} 
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FiPlus size={18} /> Add Course
            </button>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>Loading courses...</div>
      ) : filteredCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <FiBook size={48} color="#d1d5db" />
          <h3 style={{ margin: '16px 0 8px', color: '#374151' }}>No courses found</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Try adjusting your filters or add a new course</p>
          <button onClick={openAddCourse} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FiPlus size={16} /> Add Course
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}>
          {filteredCourses.map(course => {
            const enrollmentPercent = course.max_students > 0 ? ((course.enrollment_count || 0) / course.max_students * 100) : 0;
            const gradientColor = course.department === 'Computer Science' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 
                                  course.department === 'Engineering' ? 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' :
                                  'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)';
            
            return (
              <div key={course.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}>
                {/* Top gradient border */}
                <div style={{ height: 4, background: gradientColor }}></div>
                
                <div style={{ padding: 24 }}>
                  {/* Course Title */}
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>{course.name}</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#6b7280' }}>{course.code}</p>
                  
                  <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{course.description || 'No description available'}</p>
                  
                  {/* Course Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiBook size={16} color="#6b7280" />
                      <span style={{ fontSize: 13, color: '#374151' }}>{course.department || 'General'}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#dbeafe', color: '#1d4ed8', marginLeft: 'auto' }}>
                        {course.credits || 3} Credits
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiUsers size={16} color="#6b7280" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{course.enrollment_count || 0} / {course.max_students || 50} Students</div>
                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: gradientColor, width: `${Math.min(enrollmentPercent, 100)}%`, transition: 'width 0.3s' }}></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Schedule removed from course card */}
                  </div>
                  
                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{course.teacher_name || ''}</div>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        fontSize: 12, 
                        fontWeight: 500,
                        background: course.status === 'active' ? '#d1fae5' : '#f3f4f6',
                        color: course.status === 'active' ? '#065f46' : '#6b7280'
                      }}>
                        {course.status || 'active'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => openEnrollModal(course)}
                        title="Enroll Student"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', color: '#fff', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.95; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
                      >
                        <FiUserPlus size={14} /> Enroll Student
                      </button>
                      <button 
                        onClick={() => openEditCourse(course)}
                        title="Edit" 
                        style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#f59e0b'; }} 
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCourse(course.id)}
                        title="Delete" 
                        style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#991b1b'; }} 
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal modal-modern modal-course" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <div className="modal-header-content">
                <div className="modal-icon">
                  <FiBook size={24} />
                </div>
                <div>
                  <h3>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                  <p className="modal-subtitle">
                    {editingCourse ? 'Update course information' : 'Create a new course'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCourseModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="modal-body-modern course-form-box">
              <div className="form-section-box">
                <div className="form-section-head">
                  <strong>Basic Information</strong>
                </div>
                <div className="modal-grid-modern">
                  <div className="form-group-modern">
                    <label>Course Name *</label>
                    <input
                      type="text"
                      placeholder="Introduction to Computer Science"
                      value={courseForm.name}
                      onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Course Code *</label>
                    <input
                      type="text"
                      placeholder="CS101"
                      value={courseForm.code}
                      onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-modern">
                  <label>Description</label>
                  <textarea
                    placeholder="Brief description of the course..."
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-section-box">
                <div className="form-section-head">
                  <strong>Capacity & Schedule</strong>
                </div>
                <div className="modal-grid-modern">
                  <div className="form-group-modern">
                    <label>Credits</label>
                    <input
                      type="number"
                      placeholder="3"
                      value={courseForm.credits}
                      onChange={(e) => setCourseForm({ ...courseForm, credits: e.target.value })}
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Max Students</label>
                    <input
                      type="number"
                      placeholder="30"
                      value={courseForm.max_students}
                      onChange={(e) => setCourseForm({ ...courseForm, max_students: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-grid-modern">
                  <div className="form-group-modern">
                    <label>Department</label>
                    <input
                      type="text"
                      placeholder="Computer Science"
                      value={courseForm.department}
                      onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Year</label>
                    <select
                      value={courseForm.semester}
                      onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                      className="select-modern"
                    >
                      <option value="">2024-2025</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2027-2028">2027-2028</option>
                      <option value="2028-2029">2028-2029</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status & Instructor section removed per user request */}

              <div className="modal-footer-modern">
                <button type="button" className="btn-cancel-modern" onClick={() => setShowCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-modern">
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {showEnrollModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal modal-modern modal-enroll-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <div className="modal-header-content">
                <div className="modal-icon">
                  <FiUsers size={24} />
                </div>
                <div>
                  <h3>Manage Course Enrollments</h3>
                  <p className="modal-subtitle">{selectedCourse.name} ({selectedCourse.code})</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEnrollModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <div className="modal-body-modern enrollment-body-large">
              <div className="enrollment-layout">
                {/* Left Side - Enrolled Students */}
                <div className="enrollment-column">
                  <div className="enrollment-header">
                    <h4>
                      <FiCheck size={18} />
                      Enrolled Students ({enrolledStudents.length})
                    </h4>
                    <span className="capacity-info">
                      {selectedCourse.max_students ? `${enrolledStudents.length} / ${selectedCourse.max_students}` : 'Unlimited'}
                    </span>
                  </div>
                  
                  {enrolledStudents.length === 0 ? (
                    <div className="empty-enrollment">
                      <FiUsers size={32} />
                      <p>No students enrolled yet</p>
                      <span>Select students from the available list to enroll</span>
                    </div>
                  ) : (
                    <div className="students-table-container">
                      <table className="enrollment-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrolledStudents.map(student => (
                            <tr key={student.id}>
                              <td>
                                <div className="student-cell">
                                  <div className="student-avatar-small">
                                    {(student.name || student.first_name || 'S')[0].toUpperCase()}
                                  </div>
                                  <span className="student-name-text">
                                    {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="student-id-badge">
                                  {student.student_id || '-'}
                                </span>
                              </td>
                              <td className="email-cell">{student.email || '-'}</td>
                              <td>
                                <button
                                  className="btn-table-action remove"
                                  onClick={() => handleUnenrollStudent(student.id)}
                                  title="Remove from course"
                                >
                                  <FiX size={14} /> Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right Side - Available Students */}
                <div className="enrollment-column">
                  <div className="enrollment-header">
                    <h4>
                      <FiUserPlus size={18} />
                      Available Students ({availableStudents.length})
                    </h4>
                  </div>
                  
                  {availableStudents.length === 0 ? (
                    <div className="empty-enrollment">
                      <FiCheck size={32} />
                      <p>All students are enrolled</p>
                      <span>There are no more students available to enroll</span>
                    </div>
                  ) : (
                    <div className="students-table-container">
                      <table className="enrollment-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableStudents.map(student => (
                            <tr key={student.id}>
                              <td>
                                <div className="student-cell">
                                  <div className="student-avatar-small">
                                    {(student.name || student.first_name || 'S')[0].toUpperCase()}
                                  </div>
                                  <span className="student-name-text">
                                    {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="student-id-badge">
                                  {student.student_id || '-'}
                                </span>
                              </td>
                              <td className="email-cell">{student.email || '-'}</td>
                              <td>
                                <button
                                  className="btn-table-action add"
                                  onClick={() => handleEnrollStudent(student.id)}
                                  title="Add to course"
                                  disabled={
                                    (selectedCourse.max_students && enrolledStudents.length >= selectedCourse.max_students)
                                    || (student.id && allEnrolledStudentIds && allEnrolledStudentIds.has(student.id))
                                  }
                                >
                                  <FiPlus size={14} /> Add
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer-modern">
              <button className="btn-cancel-modern" onClick={() => setShowEnrollModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
