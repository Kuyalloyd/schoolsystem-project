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
  const [viewMode, setViewMode] = useState('departments'); // 'departments' or 'all-courses'
  
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
    max_students: '',
    related_courses: []
  });

  // Department View Modal State
  const [showDepartmentView, setShowDepartmentView] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isAddingCourses, setIsAddingCourses] = useState(false);
  const [tempRelatedCourses, setTempRelatedCourses] = useState([]);

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
        const deps = Array.from(new Set((fetched || []).map(c => (c.name || c.code || c.department || '').toString().trim()).filter(Boolean))).sort();
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
      max_students: '',
      related_courses: []
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
      max_students: course.max_students || '',
      related_courses: course.related_courses || []
    });
    setShowCourseModal(true);
  };

  const addRelatedCourse = () => {
    setCourseForm({
      ...courseForm,
      related_courses: [...(courseForm.related_courses || []), { name: '', code: '' }]
    });
  };

  const updateRelatedCourse = (index, field, value) => {
    const updated = [...(courseForm.related_courses || [])];
    updated[index] = { ...updated[index], [field]: value };
    setCourseForm({ ...courseForm, related_courses: updated });
  };

  const removeRelatedCourse = (index) => {
    const updated = [...(courseForm.related_courses || [])];
    updated.splice(index, 1);
    setCourseForm({ ...courseForm, related_courses: updated });
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

  const viewDepartmentDetails = (course) => {
    console.log('Department Details:', course);
    console.log('Prerequisites:', course.prerequisites);
    console.log('Department Head:', course.department_head);
    console.log('Semester:', course.semester);
    setSelectedDepartment(course);
    setTempRelatedCourses(course.related_courses || []);
    setIsAddingCourses(false);
    setShowDepartmentView(true);
  };

  const startAddingCourses = () => {
    setIsAddingCourses(true);
  };

  const addCourseToTemp = () => {
    setTempRelatedCourses([...tempRelatedCourses, { name: '', code: '' }]);
  };

  const updateTempCourse = (index, field, value) => {
    const updated = [...tempRelatedCourses];
    updated[index] = { ...updated[index], [field]: value };
    setTempRelatedCourses(updated);
  };

  const removeTempCourse = (index) => {
    const updated = [...tempRelatedCourses];
    updated.splice(index, 1);
    setTempRelatedCourses(updated);
  };

  const saveRelatedCourses = async () => {
    try {
      await axios.put(`/api/admin/courses/${selectedDepartment.id}`, {
        ...selectedDepartment,
        related_courses: tempRelatedCourses
      });
      await loadCourses();
      setIsAddingCourses(false);
      setShowDepartmentView(false);
      alert('Related courses saved successfully!');
    } catch (err) {
      console.error('Failed to save related courses', err);
      alert('Failed to save related courses');
    }
  };

  const cancelAddingCourses = () => {
    setTempRelatedCourses(selectedDepartment.related_courses || []);
    setIsAddingCourses(false);
  };

  const deleteCourseFromDepartment = async (index) => {
    if (!confirm('Are you sure you want to remove this course?')) return;
    
    try {
      const updatedCourses = [...(selectedDepartment.related_courses || [])];
      updatedCourses.splice(index, 1);
      
      await axios.put(`/api/admin/courses/${selectedDepartment.id}`, {
        ...selectedDepartment,
        related_courses: updatedCourses
      });
      
      // Update local state
      setSelectedDepartment({
        ...selectedDepartment,
        related_courses: updatedCourses
      });
      
      await loadCourses();
      alert('Course removed successfully!');
    } catch (err) {
      console.error('Failed to remove course', err);
      alert('Failed to remove course');
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

  // Export courses to CSV
  const handleExportCourses = () => {
    console.log('🚀 [EXPORT] Starting course export...');
    
    try {
      let rows = [];
      let filename = '';
      
      // If filtering by a specific department, export all courses in that department
      if (departmentFilter !== 'all') {
        console.log('📋 [EXPORT] Exporting courses for department:', departmentFilter);
        
        // Find the department
        const dept = filteredCourses.find(c => 
          (c.name || c.code) === departmentFilter
        );
        
        if (!dept || !dept.related_courses || dept.related_courses.length === 0) {
          alert('No courses found in this department to export');
          return;
        }
        
        // Export all courses in this department
        rows = dept.related_courses.map((course, index) => ({
          'No.': index + 1,
          'Course Name': course.name || '',
          'Department': dept.name || dept.code || ''
        }));
        
        filename = `${departmentFilter}-courses-${new Date().toISOString().slice(0, 10)}.csv`;
        
      } else {
        // Export all departments with their basic info
        console.log('📋 [EXPORT] Exporting all departments...');
        
        if (!filteredCourses || filteredCourses.length === 0) {
          alert('No courses to export');
          return;
        }
        
        rows = filteredCourses.map(course => ({
          Code: course.code || '',
          Name: course.name || '',
          Department: course.department || '',
          Credits: course.credits || '',
          Semester: course.semester || '',
          Teacher: course.teacher_name || '',
          'Max Students': course.max_students || '',
          Enrolled: course.enrollment_count || 0,
          'Number of Courses': (course.related_courses || []).length,
          Status: course.status || 'active'
        }));
        
        filename = `departments-export-${new Date().toISOString().slice(0, 10)}.csv`;
      }
      
      // Build CSV
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(',')]
        .concat(rows.map(row => 
          headers.map(header => '"' + String(row[header] || '').replace(/"/g, '""') + '"').join(',')
        ))
        .join('\n');
      
      console.log('✅ [EXPORT] CSV generated, rows:', rows.length);
      
      // Create and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      
      console.log('✅ [EXPORT] Triggering download...');
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ [EXPORT] Complete!');
      }, 500);
      
      alert(`✅ Export successful!\n\nFile: ${filename}\nRows: ${rows.length}\n\nCheck your Downloads folder.`);
      
    } catch (error) {
      console.error('❌ [EXPORT] Failed:', error);
      alert('Export failed: ' + error.message);
    }
  };

  // Flatten all courses from all departments
  const allIndividualCourses = [];
  courses.forEach(dept => {
    if (dept.related_courses && dept.related_courses.length > 0) {
      dept.related_courses.forEach(course => {
        const deptName = dept.name || dept.code || '';
        allIndividualCourses.push({
          ...course,
          departmentName: deptName,
          departmentId: dept.id
        });
      });
    }
  });

  // Debug: Log to help troubleshoot
  if (allIndividualCourses.length > 0 && departmentFilter !== 'all') {
    console.log('Department Filter:', departmentFilter);
    console.log('Sample Course:', allIndividualCourses[0]);
    console.log('All department names:', allIndividualCourses.map(c => c.departmentName));
  }

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
    const courseDeptName = (course.name || course.code || course.department || '').toString().toLowerCase().trim();
    const matchesDepartment = departmentFilter === 'all' || courseDeptName === (departmentFilter || '').toString().toLowerCase().trim();
    const matchesCredits = creditsFilter === 'all' || course.credits === creditsFilter;
    return matchesSearch && matchesStatus && matchesSemester && matchesCredits && matchesDepartment;
  });

  const filteredIndividualCourses = allIndividualCourses.filter(course => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      (course.name || '').toLowerCase().includes(searchLower) ||
      (course.departmentName || '').toLowerCase().includes(searchLower)
    );
    
    if (departmentFilter === 'all') {
      return matchesSearch;
    }
    
    // Direct string comparison - both should be from the same source
    const courseDepName = (course.departmentName || '').toString().trim();
    const filterValue = (departmentFilter || '').toString().trim();
    const matchesDepartment = courseDepName === filterValue;
    
    return matchesSearch && matchesDepartment;
  });

  const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0);
  const activeCourses = courses.filter(c => (c.status || 'active') === 'active').length;
  const inactiveCourses = courses.filter(c => c.status === 'inactive').length;
  const avgEnrollment = courses.length > 0 ? Math.round(totalEnrollments / courses.length) : 0;
  const atCapacity = courses.filter(c => c.enrollment_count >= c.max_students && c.max_students > 0).length;

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="admin-main">
        <div className="admin-courses-page" style={{ padding: '24px 32px', background: '#f8f9fa', minHeight: '100vh' }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              Department Management
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#f59e0b', fontSize: 14, fontWeight: 600, padding: '4px 12px', borderRadius: 12 }}>
                {courses.length} courses
              </span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#9ca3af' }}>Manage courses and curriculum</p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setViewMode('departments')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: viewMode === 'departments' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
            background: viewMode === 'departments' ? '#fef3c7' : '#fff',
            color: viewMode === 'departments' ? '#f59e0b' : '#6b7280',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
        >
          <FiBook size={16} /> View by Departments
        </button>
        <button
          onClick={() => setViewMode('all-courses')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: viewMode === 'all-courses' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
            background: viewMode === 'all-courses' ? '#fef3c7' : '#fff',
            color: viewMode === 'all-courses' ? '#f59e0b' : '#6b7280',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
        >
          <FiBook size={16} /> View All Courses
        </button>
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
              onClick={handleExportCourses}
              style={{ padding: '10px 16px', borderRadius: 8, border: '2px solid #10b981', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <FiDownload size={16} /> Export
            </button>
            <button 
              onClick={openAddCourse} 
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FiPlus size={18} /> Add Department
            </button>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>Loading courses...</div>
      ) : viewMode === 'all-courses' && filteredIndividualCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <FiBook size={48} color="#d1d5db" />
          <h3 style={{ margin: '16px 0 8px', color: '#374151' }}>No courses found</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Try adjusting your filters</p>
        </div>
      ) : viewMode === 'departments' && filteredCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <FiBook size={48} color="#d1d5db" />
          <h3 style={{ margin: '16px 0 8px', color: '#374151' }}>No courses found</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Try adjusting your filters or add a new course</p>
          <button onClick={openAddCourse} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FiPlus size={16} /> Add Department
          </button>
        </div>
      ) : viewMode === 'all-courses' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {filteredIndividualCourses.map((course, idx) => (
            <div key={idx} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid #f3f4f6' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiBook size={20} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{course.name}</h4>
                  <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiBook size={12} />
                    <span>{course.departmentName}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredCourses.map(course => {
            const enrollmentPercent = course.max_students > 0 ? ((course.enrollment_count || 0) / course.max_students * 100) : 0;
            const courseCount = (course.related_courses || []).length;
            
            return (
              <div 
                key={course.id} 
                style={{ 
                  background: '#fff',
                  borderRadius: 12,
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                  position: 'relative',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column'
                }} 
                onClick={() => viewDepartmentDetails(course)} 
                onMouseEnter={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-4px)'; 
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(245,158,11,0.2)'; 
                  e.currentTarget.style.borderColor = '#f59e0b'; 
                }} 
                onMouseLeave={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0)'; 
                  e.currentTarget.style.boxShadow = 'none'; 
                  e.currentTarget.style.borderColor = '#e5e7eb'; 
                }}
              >
                {/* Folder Tab */}
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '20px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  borderRadius: '8px 8px 0 0',
                  padding: '6px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  boxShadow: '0 -2px 8px rgba(245,158,11,0.2)'
                }}>
                  📁 Department
                </div>
                
                {/* Folder Icon */}
                <div style={{
                  textAlign: 'center',
                  marginTop: '30px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: 56,
                    marginBottom: 8,
                    filter: 'drop-shadow(0 4px 8px rgba(245,158,11,0.2))'
                  }}>
                    📂
                  </div>
                </div>

                {/* Department Name */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: 16, 
                    fontWeight: 700, 
                    color: '#111827',
                    textAlign: 'center',
                    lineHeight: 1.3
                  }}>
                    {course.name}
                  </h3>
                  
                  {course.code && (
                    <p style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: 13, 
                      color: '#f59e0b',
                      textAlign: 'center',
                      fontWeight: 600
                    }}>
                      {course.code}
                    </p>
                  )}

                  {/* Course Count */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: 8,
                    margin: '12px 0'
                  }}>
                    <FiBook size={14} color="#f59e0b" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
                      {courseCount} Course{courseCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: 6, 
                  marginTop: 'auto',
                  paddingTop: 12,
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditCourse(course); }}
                    title="Edit Department" 
                    style={{ 
                      flex: 1,
                      padding: '8px',
                      borderRadius: 6, 
                      border: 'none', 
                      background: '#fef3c7', 
                      color: '#f59e0b', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 4,
                      cursor: 'pointer', 
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.2s' 
                    }} 
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fde68a'; }} 
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
                  >
                    <FiEdit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                    title="Delete Department" 
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: 6, 
                      border: 'none', 
                      background: '#fee2e2', 
                      color: '#dc2626', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s' 
                    }} 
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; }} 
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal" style={{ maxWidth: '700px', borderRadius: 20, overflow: 'hidden', background: '#fff' }} onClick={(e) => e.stopPropagation()}>
            {/* Header with Folder Design */}
            <div style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              padding: '32px 32px 24px',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(245,158,11,0.2)'
            }}>
              <button 
                onClick={() => setShowCourseModal(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <FiX size={20} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32
                }}>
                  📂
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>
                    {editingCourse ? 'Edit Department' : 'Create New Department'}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                    {editingCourse ? 'Update department information and courses' : 'Set up a new department folder'}
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSaveCourse} style={{ padding: 0 }}>
              {/* Form Content */}
              <div style={{ padding: '32px', maxHeight: '500px', overflowY: 'auto' }}>
                {/* Basic Information Card */}
                <div style={{
                  background: '#fff',
                  border: '2px solid #fef3c7',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 16
                    }}>
                      📋
                    </div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Basic Information</h4>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Department Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Computer Studies Program"
                        value={courseForm.name}
                        onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Department Code *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., CSP-001"
                        value={courseForm.code}
                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Description
                    </label>
                    <textarea
                      placeholder="Brief description of the department..."
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                {/* Department Details Card */}
                <div style={{
                  background: '#fff',
                  border: '2px solid #dbeafe',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 16
                    }}>
                      ⚙️
                    </div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Department Details</h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Credits
                      </label>
                      <input
                        type="number"
                        placeholder="3"
                        value={courseForm.credits}
                        onChange={(e) => setCourseForm({ ...courseForm, credits: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Max Students
                      </label>
                      <input
                        type="number"
                        placeholder="30"
                        value={courseForm.max_students}
                        onChange={(e) => setCourseForm({ ...courseForm, max_students: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Department Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Computer Science"
                        value={courseForm.department}
                        onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Semester
                      </label>
                      <select
                        value={courseForm.semester}
                        onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          fontSize: 14,
                          outline: 'none',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'border 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <option value="">Select semester</option>
                        <option value="Fall">Fall</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Department Head
                    </label>
                    <input
                      type="text"
                      placeholder="Enter department head name"
                      value={courseForm.department_head}
                      onChange={(e) => setCourseForm({ ...courseForm, department_head: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Prerequisites
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Introduction to Computing, Basic Mathematics"
                      value={courseForm.prerequisites}
                      onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <small style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'block' }}>
                      Separate multiple prerequisites with commas
                    </small>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '20px 32px',
                borderTop: '2px solid #f3f4f6',
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end'
              }}>
                <button 
                  type="button" 
                  onClick={() => setShowCourseModal(false)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    color: '#6b7280',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '10px 32px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {editingCourse ? '✓ Update Department' : '+ Create Department'}
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

      {/* Department View Modal */}
      {showDepartmentView && selectedDepartment && (
        <div className="modal-overlay" onClick={() => setShowDepartmentView(false)}>
          <div className="modal modal-modern modal-course" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <div className="modal-header-content">
                <div className="modal-icon">
                  <FiBook size={24} />
                </div>
                <div>
                  <h3>{selectedDepartment.name}</h3>
                  <p className="modal-subtitle">{selectedDepartment.code} - {selectedDepartment.department}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDepartmentView(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <div className="modal-body-modern" style={{ padding: '24px' }}>
              {/* Department Info */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#111827' }}>Department Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Department Head</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{selectedDepartment.department_head || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Semester</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{selectedDepartment.semester || 'Not specified'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Credits</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{selectedDepartment.credits || 3}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Max Students</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{selectedDepartment.max_students || 50}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Enrolled</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{selectedDepartment.enrollment_count || 0} students</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Status</div>
                    <div>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        fontSize: 12, 
                        fontWeight: 500,
                        background: selectedDepartment.status === 'active' ? '#d1fae5' : '#f3f4f6',
                        color: selectedDepartment.status === 'active' ? '#065f46' : '#6b7280'
                      }}>
                        {selectedDepartment.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Prerequisites</div>
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                    {selectedDepartment.prerequisites || (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>None specified</span>
                    )}
                  </div>
                </div>
                {selectedDepartment.description && (
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{selectedDepartment.description}</div>
                  </div>
                )}
              </div>

              {/* Courses */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiBook size={18} /> Courses
                  <span style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    padding: '2px 8px', 
                    borderRadius: 12, 
                    background: '#f0f9ff', 
                    color: '#0369a1' 
                  }}>
                    {(isAddingCourses ? tempRelatedCourses : selectedDepartment.related_courses)?.length || 0}
                  </span>
                </h4>
                
                {isAddingCourses ? (
                  // Course Adding Interface
                  <div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={addCourseToTemp}
                        style={{ 
                          padding: '6px 12px', 
                          borderRadius: 6, 
                          border: 'none', 
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                          color: '#fff', 
                          fontSize: 13, 
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4 
                        }}
                      >
                        <FiPlus size={14} /> Add Course
                      </button>
                    </div>
                    
                    {tempRelatedCourses && tempRelatedCourses.length > 0 ? (
                      <div 
                        className="custom-scrollbar"
                        style={{ 
                          maxHeight: '400px', 
                          overflowY: 'scroll', 
                          padding: '4px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 12,
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          paddingRight: 8
                        }}>
                        {tempRelatedCourses.map((relCourse, index) => (
                          <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Enter course name (e.g., Macro Perspective of Tourism & Hospitality)"
                                value={relCourse.name || ''}
                                onChange={(e) => updateTempCourse(index, 'name', e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14 }}
                              />
                            </div>
                            <button
                              onClick={() => removeTempCourse(index)}
                              style={{ 
                                padding: '8px', 
                                borderRadius: 6, 
                                border: 'none', 
                                background: '#fee2e2', 
                                color: '#dc2626', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>No courses added yet. Click "Add Course" to add courses.</p>
                    )}
                  </div>
                ) : (
                  // View Mode
                  selectedDepartment.related_courses && selectedDepartment.related_courses.length > 0 ? (
                    <>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={startAddingCourses}
                          style={{ 
                            padding: '6px 12px', 
                            borderRadius: 6, 
                            border: 'none', 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                            color: '#fff', 
                            fontSize: 13, 
                            fontWeight: 600, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 4,
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <FiPlus size={14} /> Add More Courses
                        </button>
                      </div>
                      <div 
                        className="custom-scrollbar"
                        style={{ 
                          maxHeight: '400px', 
                          overflowY: 'scroll', 
                          padding: '4px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 8,
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          paddingRight: 8
                        }}>
                        {selectedDepartment.related_courses.map((relCourse, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '12px 16px', 
                            background: '#f9fafb', 
                            borderRadius: 8, 
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                          }}
                        >
                          <div style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            flexShrink: 0
                          }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                              {relCourse.name}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteCourseFromDepartment(idx)}
                            style={{ 
                              padding: '6px', 
                              borderRadius: 6, 
                              border: 'none', 
                              background: '#fee2e2', 
                              color: '#dc2626', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                            title="Remove course"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ 
                      padding: '32px', 
                      textAlign: 'center', 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      border: '1px dashed #e5e7eb'
                    }}>
                      <FiBook size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
                      <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#6b7280' }}>No courses added to this department yet.</p>
                      <button 
                        onClick={startAddingCourses}
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: 6, 
                          border: 'none', 
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                          color: '#fff', 
                          fontSize: 13, 
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 6,
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <FiPlus size={14} /> Add Courses
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="modal-footer-modern">
              {isAddingCourses ? (
                <>
                  <button className="btn-cancel-modern" onClick={cancelAddingCourses}>
                    Cancel
                  </button>
                  <button className="btn-save-modern" onClick={saveRelatedCourses}>
                    Save Courses
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-cancel-modern" onClick={() => setShowDepartmentView(false)}>
                    Close
                  </button>
                  <button 
                    className="btn-save-modern" 
                    onClick={(e) => { e.stopPropagation(); setShowDepartmentView(false); openEditCourse(selectedDepartment); }}
                  >
                    Edit Department
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
