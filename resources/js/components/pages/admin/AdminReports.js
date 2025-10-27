import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiFileText, FiPieChart, FiTrendingUp, FiDownload, FiBarChart } from 'react-icons/fi';
import { Bar, Line } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import "../../../../sass/AdminDashboard.scss";

export default function AdminReports() {
  const [activePage, setActivePage] = useState('reports');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [reportType, setReportType] = useState('Enrollment');
  const [department, setDepartment] = useState('All Departments');
  const [format, setFormat] = useState('PDF');
  const [semester, setSemester] = useState('All Semesters');
  const [status, setStatus] = useState('All Status');
  const [departments, setDepartments] = useState([]);
  
  // CSV Export function
  const exportToCSV = (reportName, data) => {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName.replace(/\s+/g, '_')}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export function for individual reports
  const handleExport = (reportName) => {
    // Sample data for each report type
    const sampleData = {
      'Student Enrollment': [
        ['Student ID', 'Name', 'Course', 'Year Level', 'Status', 'Enrollment Date'],
        ['ST2024001', 'John Doe', 'Computer Science', 'Freshman', 'Active', '2024-09-01'],
        ['ST2024002', 'Jane Smith', 'Engineering', 'Sophomore', 'Active', '2024-09-01'],
        ['ST2024003', 'Bob Johnson', 'Business', 'Junior', 'Active', '2024-09-01'],
      ],
      'Academic Performance': [
        ['Department', 'Average Score', 'Passing Rate %', 'Total Students'],
        ['Computer Science', '85', '95', '120'],
        ['Engineering', '78', '88', '95'],
        ['Business', '82', '92', '110'],
        ['Arts', '88', '98', '80'],
      ],
      'Course Distribution': [
        ['Course', 'Department', 'Enrolled Students', 'Capacity', 'Percentage'],
        ['Introduction to Programming', 'Computer Science', '45', '50', '90%'],
        ['Data Structures', 'Computer Science', '38', '40', '95%'],
        ['Mechanical Engineering', 'Engineering', '42', '45', '93%'],
        ['Business Management', 'Business', '50', '55', '91%'],
      ],
      'Attendance': [
        ['Month', 'Total Students', 'Present', 'Absent', 'Attendance Rate %'],
        ['September', '405', '373', '32', '92%'],
        ['October', '405', '361', '44', '89%'],
        ['November', '405', '369', '36', '91%'],
        ['December', '405', '352', '53', '87%'],
      ]
    };

    const data = sampleData[reportName] || [['No data available']];
    exportToCSV(reportName, data);
  };

  // Generate custom report
  const handleGenerateReport = () => {
    const customData = [
      ['Report Type', reportType],
      ['Department', department],
      ['Academic Year', selectedYear],
      ['Semester', semester],
      ['Status', status],
      ['Format', format],
      ['Generated On', new Date().toLocaleDateString()],
      [''],
      ['Data will be populated based on selected criteria']
    ];
    
    exportToCSV(`Custom_${reportType}_Report`, customData);
  };
  
  // Department Performance Chart Data
  const departmentData = {
    labels: ['CS', 'ENG', 'BUS', 'ART'],
    datasets: [
      {
        label: 'Average Score',
        data: [85, 78, 82, 88],
        backgroundColor: '#6366f1',
        borderRadius: 6,
        barThickness: 40,
      },
      {
        label: 'Passing Rate %',
        data: [95, 88, 92, 98],
        backgroundColor: '#10b981',
        borderRadius: 6,
        barThickness: 40,
      }
    ]
  };

  // Attendance Trends Chart Data
  const attendanceData = {
    labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
    datasets: [{
      data: [92, 89, 91, 87, 90, 93],
      borderColor: '#8b5cf6',
      backgroundColor: 'transparent',
      tension: 0.4,
      pointBackgroundColor: '#8b5cf6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    }]
  };

  const departmentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
          pointStyle: 'rect',
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { font: { size: 11 }, color: '#9ca3af' },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      x: {
        ticks: { font: { size: 11 }, color: '#9ca3af' },
        grid: { display: false }
      }
    }
  };

  useEffect(() => {
    // derive department list from courses so Reports filters reflect newly created departments
    const loadDepartments = async () => {
      try {
        const res = await axios.get('/api/admin/courses');
        const fetched = res.data.courses || [];
        const deps = Array.from(new Set((fetched || []).map(c => (c.department || '').toString().trim()).filter(Boolean))).sort();
        setDepartments(deps);
      } catch (e) {
        setDepartments([]);
      }
    };
    loadDepartments();
  }, []);

  const attendanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        min: 80,
        max: 100,
        ticks: { font: { size: 11 }, color: '#9ca3af' },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      x: {
        ticks: { font: { size: 11 }, color: '#9ca3af' },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} />
      <main className="admin-main">
        <div style={{ padding: '28px 40px', background: '#f8f9fa', minHeight: '100vh' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Reports</h1>
              <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#6b7280' }}>Generate and view academic reports</p>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ 
                padding: '8px 32px 8px 12px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                fontSize: 14, 
                color: '#374151', 
                background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', 
                appearance: 'none', 
                cursor: 'pointer' 
              }}
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
              <option value="2028-2029">2028-2029</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
              <option value="2021-2022">2021-2022</option>
              <option value="2020-2021">2020-2021</option>
            </select>
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{ 
                padding: '8px 32px 8px 12px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                fontSize: 13, 
                color: '#374151', 
                background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', 
                appearance: 'none', 
                cursor: 'pointer',
                minWidth: '140px'
              }}
            >
              <option value="All Semesters">All Semesters</option>
              <option value="First Semester">First Semester</option>
              <option value="Second Semester">Second Semester</option>
              <option value="Summer">Summer</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ 
                padding: '8px 32px 8px 12px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                fontSize: 13, 
                color: '#374151', 
                background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', 
                appearance: 'none', 
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
              <option value="Suspended">Suspended</option>
            </select>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ 
                padding: '8px 32px 8px 12px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                fontSize: 13, 
                color: '#374151', 
                background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', 
                appearance: 'none', 
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="All Departments">All Departments</option>
              {(departments || []).map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          {/* Report Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20, marginBottom: 32 }}>
            
            {/* Student Enrollment Report */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiFileText size={20} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Student Enrollment Report</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>Complete list of enrolled students</p>
                </div>
              </div>
              <button 
                onClick={() => handleExport('Student Enrollment')}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
              >
                <FiDownload size={15} /> Export
              </button>
            </div>

            {/* Academic Performance */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiBarChart size={20} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Academic Performance</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>Department-wise performance metrics</p>
                </div>
              </div>
              <button 
                onClick={() => handleExport('Academic Performance')}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
              >
                <FiDownload size={15} /> Export
              </button>
            </div>

            {/* Course Distribution */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiPieChart size={20} color="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Course Distribution</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>Enrollment by course and department</p>
                </div>
              </div>
              <button 
                onClick={() => handleExport('Course Distribution')}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
              >
                <FiDownload size={15} /> Export
              </button>
            </div>

            {/* Attendance Report */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiTrendingUp size={20} color="#8b5cf6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Attendance Report</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>Student attendance statistics</p>
                </div>
              </div>
              <button 
                onClick={() => handleExport('Attendance')}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
              >
                <FiDownload size={15} /> Export
              </button>
            </div>

          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            
            {/* Department Performance Chart */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Department Performance</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Average scores and passing rates by department</p>
              <div style={{ height: 280 }}>
                <Bar data={departmentData} options={departmentChartOptions} />
              </div>
            </div>

            {/* Attendance Trends Chart */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Attendance Trends</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Monthly attendance rate percentage</p>
              <div style={{ height: 280 }}>
                <Line data={attendanceData} options={attendanceChartOptions} />
              </div>
            </div>

          </div>

          {/* Custom Report Generator */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', border: '1px solid #f3f4f6' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Custom Report Generator</h3>
            <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Create customized reports based on specific criteria</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
              
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 14, color: '#111827', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="Enrollment">Enrollment</option>
                  <option value="Performance">Performance</option>
                  <option value="Attendance">Attendance</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 14, color: '#111827', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All Departments">All Departments</option>
                  {(departments || []).map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 14, color: '#111827', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All Semesters">All Semesters</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 14, color: '#111827', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 14, color: '#111827', background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 8px center/16px', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="PDF">PDF</option>
                  <option value="Excel">Excel</option>
                  <option value="CSV">CSV</option>
                </select>
              </div>

            </div>

            <button 
              onClick={handleGenerateReport}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FiDownload size={16} /> Generate Report
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
