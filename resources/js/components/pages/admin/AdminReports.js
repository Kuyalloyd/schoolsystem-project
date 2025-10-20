import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUsers, FiUserCheck, FiBook, FiAward, FiTrendingUp } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import "../../../../sass/AdminDashboard.scss";

export default function AdminReports() {
  const [activePage, setActivePage] = useState('reports');
  const [loading, setLoading] = useState(false);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalTeachersChange, setTotalTeachersChange] = useState('+0%');
  const [activeCourses, setActiveCourses] = useState(0);
  const API = '/api/admin';

  useEffect(() => {
    let mounted = true;
    const fetchDashboardStats = async () => {
      try {
        const res = await axios.get(API + '/dashboard').catch(() => ({ data: null }));
        if (!mounted) return;
        if (res && res.data) {
          setTotalTeachers(Number(res.data.total_teachers) || 0);
          setTotalTeachersChange(res.data.total_teachers_change || '+0%');
          // if backend later provides active courses in dashboard, use it
          if (typeof res.data.active_courses !== 'undefined') setActiveCourses(Number(res.data.active_courses) || 0);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard stats', e);
      }
    };

    // Do not fetch on mount - keep initial counts at 0 until an admin action occurs.
    // Rely on dispatched events to trigger updates so a fresh install shows zero.

    const onUsersChanged = (ev) => {
      try {
        // If event provided stats, apply them immediately; otherwise fetch from API
        const d = ev && ev.detail ? ev.detail : null;
        if (d && (typeof d.total_teachers !== 'undefined' || typeof d.total_students !== 'undefined')) {
          if (typeof d.total_teachers !== 'undefined') setTotalTeachers(Number(d.total_teachers) || 0);
          if (typeof d.total_teachers_change !== 'undefined') setTotalTeachersChange(d.total_teachers_change || '+0%');
        } else {
          fetchDashboardStats().catch(() => {});
        }
      } catch (e) { console.error(e); }
    };

    const onCoursesChanged = (ev) => {
      try {
        const d = ev && ev.detail ? ev.detail : null;
        if (d && typeof d.active_courses !== 'undefined') {
          setActiveCourses(Number(d.active_courses) || 0);
        } else {
          // fallback: fetch full dashboard stats
          fetchDashboardStats().catch(() => {});
        }
      } catch (e) { console.error(e); }
    };

    window.addEventListener('admin:users-changed', onUsersChanged);
    window.addEventListener('admin:courses-changed', onCoursesChanged);

    return () => {
      mounted = false;
      window.removeEventListener('admin:users-changed', onUsersChanged);
      window.removeEventListener('admin:courses-changed', onCoursesChanged);
    };
  }, []);
  
  // Sample data for enrollment trends chart
  const enrollmentTrendsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    datasets: [
      {
        label: 'Students',
        data: [420, 450, 480, 460, 490, 510, 520, 540],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 40,
      },
      {
        label: 'Faculty',
        data: [60, 80, 100, 90, 110, 120, 130, 140],
        backgroundColor: 'rgba(203, 213, 225, 0.5)',
        borderColor: 'rgba(203, 213, 225, 1)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 40,
      },
      {
        label: 'Courses',
        data: [50, 70, 90, 80, 100, 110, 120, 130],
        backgroundColor: 'rgba(203, 213, 225, 0.3)',
        borderColor: 'rgba(203, 213, 225, 1)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 40,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 600,
        ticks: {
          stepSize: 100,
          font: { size: 11 },
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        }
      },
      x: {
        ticks: {
          font: { size: 11 },
          color: '#9ca3af'
        },
        grid: {
          display: false,
        }
      }
    }
  };

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} />
      <main className="admin-main">
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
          
          {/* Purple Header Banner */}
          <div style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
            padding: '32px 40px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: 'rgba(255, 255, 255, 0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <FiTrendingUp size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#fff' }}>
                  Reports & Analytics
                </h1>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>
                  Comprehensive insights and data visualization
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 40px' }}>
            
            {/* Stats Cards Row */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: 20, 
              marginBottom: 32 
            }}>
              
              {/* Total Students Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                borderRadius: 16, 
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  filter: 'blur(30px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    TOTAL STUDENTS
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>13</div>
                  <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>from last semester</span>
                    <span style={{ 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11,
                      fontWeight: 600
                    }}>+0%</span>
                  </div>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                borderRadius: 16, 
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  filter: 'blur(30px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    COMPLETION RATE
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>0%</div>
                  <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>from last semester</span>
                    <span style={{ 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11,
                      fontWeight: 600
                    }}>+0%</span>
                  </div>
                </div>
              </div>

              {/* Average GPA Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                borderRadius: 16, 
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  filter: 'blur(30px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    AVERAGE GPA
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>0</div>
                  <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>from last semester</span>
                    <span style={{ 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11,
                      fontWeight: 600
                    }}>+0</span>
                  </div>
                </div>
              </div>

              {/* Total Teachers Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', 
                borderRadius: 16, 
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.18)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.06)',
                  filter: 'blur(30px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.95, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    TOTAL TEACHERS
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>{totalTeachers}</div>
                  <div style={{ fontSize: 12, opacity: 0.95, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>from last month</span>
                    <span style={{ 
                      background: 'rgba(255, 255, 255, 0.15)', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11,
                      fontWeight: 600
                    }}>{totalTeachersChange}</span>
                  </div>
                </div>
                <div style={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20,
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: 20 }} role="img" aria-label="books">📚</span>
                </div>
              </div>

              {/* Active Courses Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                borderRadius: 16, 
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.18)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.06)',
                  filter: 'blur(30px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.95, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ACTIVE COURSES
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>{activeCourses}</div>
                  <div style={{ fontSize: 12, opacity: 0.95, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>current semester</span>
                  </div>
                </div>
                <div style={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20,
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiBook size={20} color="#fff" />
                </div>
              </div>

              {/* Faculty Members Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                borderRadius: 16, 
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: -20, 
                  right: -20, 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  filter: 'blur(30px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    FACULTY MEMBERS
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>0</div>
                  <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>from last semester</span>
                    <span style={{ 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11,
                      fontWeight: 600
                    }}>+0</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Enrollment Trends Chart */}
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: '28px 32px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              marginBottom: 32
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                Enrollment Trends
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280' }}>
                Student, faculty, and course growth over time
              </p>
              <div style={{ height: 320 }}>
                <Bar data={enrollmentTrendsData} options={chartOptions} />
              </div>
            </div>

            {/* Recent Activity Cards */}
            <div>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                Recent Activity (30 Days)
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                gap: 20 
              }}>
                
                {/* New Students Card */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 16, 
                  padding: '24px 28px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: 20, 
                    right: 20,
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}>
                    <FiUsers size={24} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                    New Students
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                    +13
                  </div>
                  <div style={{ height: 6, background: 'rgba(59, 130, 246, 0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: '100%', background: '#3b82f6', borderRadius: 3 }}></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>
                    100% of enrollment target
                  </div>
                </div>

                {/* New Faculty Card */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 16, 
                  padding: '24px 28px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: 20, 
                    right: 20,
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}>
                    <FiUserCheck size={24} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                    New Faculty
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                    +0
                  </div>
                  <div style={{ height: 6, background: 'rgba(16, 185, 129, 0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: '0%', background: '#10b981', borderRadius: 3 }}></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                    0% of hiring target
                  </div>
                </div>

                {/* New Courses Card */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: 16, 
                  padding: '24px 28px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: 20, 
                    right: 20,
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}>
                    <FiBook size={24} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                    New Courses
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                    +0
                  </div>
                  <div style={{ height: 6, background: 'rgba(139, 92, 246, 0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: '0%', background: '#8b5cf6', borderRadius: 3 }}></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
                    0% of course expansion goal
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
