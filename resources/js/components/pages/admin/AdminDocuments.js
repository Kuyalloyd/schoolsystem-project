import React, { useState, useEffect } from 'react';
import { FiUpload, FiDownload, FiEye, FiTrash2, FiFileText, FiFile, FiCalendar, FiSearch } from 'react-icons/fi';
import Sidebar from './Sidebar';
import axios from 'axios';
import "../../../../sass/AdminDashboard.scss";

export default function AdminDocuments() {
  const [activePage, setActivePage] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Policy',
    file: null
  });

  // Sample documents data
  const sampleDocuments = [
    // Policy
    { id: 1, title: 'Student Handbook 2024-2025', category: 'Policy', size: '2.4 MB', date: '2024-09-01', type: 'pdf' },
    { id: 2, title: 'Code of Conduct', category: 'Policy', size: '892 KB', date: '2024-08-10', type: 'pdf' },
    // Academic
    { id: 3, title: 'Curriculum Guidelines', category: 'Academic', size: '1.8 MB', date: '2024-08-15', type: 'pdf' },
    // Administrative
    { id: 4, title: 'Staff Directory', category: 'Administrative', size: '156 KB', date: '2024-09-05', type: 'xlsx' },
    // Facilities
    { id: 5, title: 'Campus Map', category: 'Facilities', size: '3.2 MB', date: '2024-08-20', type: 'pdf' },
    // Safety
    { id: 6, title: 'Emergency Procedures', category: 'Safety', size: '1.1 MB', date: '2024-09-01', type: 'pdf' },
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // Try to load from API
      const res = await axios.get('/api/admin/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.log('Using sample data');
      // Use sample data if API fails
      setDocuments(sampleDocuments);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('file', uploadForm.file);
      
      await axios.post('/api/admin/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setShowUploadModal(false);
      setUploadForm({ title: '', category: 'Policy', file: null });
      loadDocuments();
    } catch (err) {
      console.error('Failed to upload document', err);
      alert('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`/api/admin/documents/${docId}`);
      loadDocuments();
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Failed to delete document');
    }
  };

  const handleDownloadDocument = (doc) => {
    console.log('Downloading:', doc.title);
    alert(`Downloading ${doc.title}...`);
  };

  const handleViewDocument = (doc) => {
    console.log('Viewing:', doc.title);
    alert(`Opening ${doc.title}...`);
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    return (doc.title || '').toLowerCase().includes(searchLower) ||
           (doc.category || '').toLowerCase().includes(searchLower);
  });

  // Group documents by category
  const categories = ['Policy', 'Academic', 'Administrative', 'Facilities', 'Safety'];
  const groupedDocuments = categories.reduce((acc, category) => {
    acc[category] = filteredDocuments.filter(doc => doc.category === category);
    return acc;
  }, {});

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return { icon: FiFileText, color: '#ef4444' };
      case 'xlsx': case 'xls': return { icon: FiFile, color: '#10b981' };
      case 'docx': case 'doc': return { icon: FiFileText, color: '#3b82f6' };
      default: return { icon: FiFile, color: '#6b7280' };
    }
  };

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} />
      <main className="admin-main">
        <div style={{ padding: '24px 32px', background: '#f8f9fa', minHeight: '100vh' }}>
          
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Documents</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>Manage academic and administrative documents</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiCalendar size={20} color="#9ca3af" />
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
                    cursor: 'pointer', 
                    outline: 'none' 
                  }}
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2022-2023">2022-2023</option>
                </select>
              </div>
            </div>

            {/* Search and Upload */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
                <input 
                  type="text"
                  placeholder="Search documents..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px 12px 44px', 
                    borderRadius: 10, 
                    background: '#fff', 
                    border: '1px solid #e5e7eb', 
                    fontSize: 14, 
                    outline: 'none', 
                    transition: 'border 0.2s' 
                  }} 
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <button 
                onClick={() => setShowUploadModal(true)}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: 10, 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                  color: '#fff', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <FiUpload size={16} /> Upload Document
              </button>
            </div>
          </div>

          {/* Document Categories Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>Loading documents...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
              {categories.map(category => (
                <div key={category} style={{ 
                  background: '#fff', 
                  borderRadius: 12, 
                  padding: '24px 28px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #f3f4f6'
                }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                    {category}
                  </h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#9ca3af' }}>
                    {groupedDocuments[category].length} document{groupedDocuments[category].length !== 1 ? 's' : ''}
                  </p>

                  {groupedDocuments[category].length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
                      No documents in this category
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {groupedDocuments[category].map(doc => {
                        const fileInfo = getFileIcon(doc.type);
                        return (
                          <div 
                            key={doc.id} 
                            style={{ 
                              background: '#f9fafb', 
                              borderRadius: 10, 
                              padding: '14px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              transition: 'all 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => { 
                              e.currentTarget.style.background = '#f3f4f6'; 
                              e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => { 
                              e.currentTarget.style.background = '#f9fafb'; 
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                            onClick={() => handleViewDocument(doc)}
                          >
                            {/* File Icon */}
                            <div style={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: 8, 
                              background: `${fileInfo.color}15`, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <fileInfo.icon size={20} color={fileInfo.color} />
                            </div>

                            {/* Document Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {doc.title}
                              </div>
                              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                {doc.size} • {doc.date}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc); }}
                                title="Download"
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: 6, 
                                  border: 'none', 
                                  background: '#fff', 
                                  color: '#6b7280', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  cursor: 'pointer', 
                                  transition: 'all 0.2s' 
                                }} 
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#3b82f6'; }} 
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
                              >
                                <FiDownload size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                                title="Delete"
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: 6, 
                                  border: 'none', 
                                  background: '#fff', 
                                  color: '#6b7280', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  cursor: 'pointer', 
                                  transition: 'all 0.2s' 
                                }} 
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }} 
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload Modal */}
          {showUploadModal && (
            <div 
              style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'rgba(0, 0, 0, 0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 1000,
                padding: 20
              }}
              onClick={() => setShowUploadModal(false)}
            >
              <div 
                style={{ 
                  background: '#fff', 
                  borderRadius: 16, 
                  padding: 32, 
                  maxWidth: 500, 
                  width: '100%',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700, color: '#111827' }}>
                  Upload Document
                </h2>
                <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280' }}>
                  Add a new document to the library
                </p>

                <form onSubmit={handleUploadDocument}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Document Title *
                    </label>
                    <input 
                      type="text"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Enter document title"
                      required
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb', 
                        fontSize: 14, 
                        outline: 'none' 
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Category *
                    </label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      style={{ 
                        width: '100%',
                        padding: '10px 40px 10px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb', 
                        fontSize: 14, 
                        color: '#374151', 
                        background: '#fff url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 12px center/16px', 
                        appearance: 'none', 
                        cursor: 'pointer', 
                        outline: 'none'
                      }}
                    >
                      <option value="Policy">Policy</option>
                      <option value="Academic">Academic</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Facilities">Facilities</option>
                      <option value="Safety">Safety</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      File *
                    </label>
                    <input 
                      type="file"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                      required
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb', 
                        fontSize: 14, 
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button 
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      style={{ 
                        padding: '10px 20px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb', 
                        background: '#fff', 
                        color: '#374151', 
                        fontSize: 14, 
                        fontWeight: 600, 
                        cursor: 'pointer' 
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      style={{ 
                        padding: '10px 20px', 
                        borderRadius: 8, 
                        border: 'none', 
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                        color: '#fff', 
                        fontSize: 14, 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      Upload
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
