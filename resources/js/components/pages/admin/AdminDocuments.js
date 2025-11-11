import React, { useState, useEffect } from 'react';
import { FiUpload, FiDownload, FiEye, FiTrash2, FiFileText, FiFile, FiSearch, FiFilter, FiGrid, FiList, FiFolder, FiStar, FiShare2, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import Sidebar from './Sidebar';
import axios from 'axios';
import "../../../../sass/AdminDashboard.scss";

export default function AdminDocuments() {
  const [activePage, setActivePage] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCategory, setSelectedCategory] = useState('All Documents');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('Academic');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('Admin');
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareDoc, setCurrentShareDoc] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    fileType: 'all',
    dateRange: 'all',
    starred: false
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/admin/documents');
        // Ensure we always get an array
        const docs = Array.isArray(res.data) ? res.data : (res.data.documents || []);
        setDocuments(Array.isArray(docs) ? docs : []);
      } catch (e) {
        console.error('Error loading documents:', e);
        setDocuments([]);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // Ensure displayDocuments is always an array
  const displayDocuments = Array.isArray(documents) ? documents : [];

  // Calculate category counts dynamically
  const getCategoryCounts = () => {
    // Ensure we're working with an array
    const docs = Array.isArray(displayDocuments) ? displayDocuments : [];
    
    if (docs.length === 0) {
      return {
        'all': 0,
        'academic': 0,
        'administrative': 0,
        'financial': 0,
        'hr': 0,
        'legal': 0,
      };
    }
    
    const counts = {
      'all': docs.length,
      'academic': docs.filter(d => d && d.category === 'Academic').length,
      'administrative': docs.filter(d => d && d.category === 'Administrative').length,
      'financial': docs.filter(d => d && d.category === 'Financial').length,
      'hr': docs.filter(d => d && d.category === 'HR Documents').length,
      'legal': docs.filter(d => d && d.category === 'Legal & Compliance').length,
    };
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  const categories = [
    { id: 'all', name: 'All Documents', icon: FiFolder, color: '#3b82f6', count: categoryCounts.all },
    { id: 'academic', name: 'Academic', icon: FiFileText, color: '#3b82f6', count: categoryCounts.academic },
    { id: 'administrative', name: 'Administrative', icon: FiFileText, color: '#8b5cf6', count: categoryCounts.administrative },
    { id: 'financial', name: 'Financial', icon: FiFileText, color: '#10b981', count: categoryCounts.financial },
    { id: 'hr', name: 'HR Documents', icon: FiFileText, color: '#f97316', count: categoryCounts.hr },
    { id: 'legal', name: 'Legal & Compliance', icon: FiFileText, color: '#ef4444', count: categoryCounts.legal },
  ];

  const toggleStar = async (doc, e) => {
    if (e) e.stopPropagation();
    
    const newStarredStatus = !doc.starred;
    
    // Update UI immediately (optimistic update)
    setDocuments(prev => prev.map(d => 
      d.id === doc.id ? { ...d, starred: newStarredStatus } : d
    ));
    
    // Update backend
    try {
      await axios.put(`/api/admin/documents/${doc.id}`, {
        starred: newStarredStatus
      });
    } catch (e) {
      console.error('Failed to update starred status:', e);
      // Revert on error
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, starred: doc.starred } : d
      ));
      alert('Failed to update starred status');
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedDocuments(new Set());
    }
  };

  const toggleSelectDocument = (id) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  const handleExport = () => {
    const docsToExport = selectMode && selectedDocuments.size > 0
      ? filteredDocuments.filter(d => selectedDocuments.has(d.id))
      : filteredDocuments;

    if (docsToExport.length === 0) {
      alert('No documents to export');
      return;
    }

    // Create CSV content
    const headers = ['ID', 'Title', 'Category', 'Type', 'Size', 'Author', 'Date', 'Description'];
    const csvContent = [
      headers.join(','),
      ...docsToExport.map(doc => [
        doc.id,
        `"${(doc.title || '').replace(/"/g, '""')}"`,
        `"${(doc.category || '').replace(/"/g, '""')}"`,
        doc.type || '',
        doc.size || '',
        `"${(doc.author || '').replace(/"/g, '""')}"`,
        doc.date || '',
        `"${(doc.description || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `documents_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${docsToExport.length} document(s) successfully!`);
  };

  const filteredDocuments = (Array.isArray(displayDocuments) ? displayDocuments : []).filter(doc => {
    if (!doc) return false;
    
    // Search filter
    const matchesSearch = doc.title && doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = filters.category === 'all' || doc.category === filters.category;
    
    // File type filter
    let matchesFileType = true;
    if (filters.fileType !== 'all') {
      const ext = doc.file_name ? doc.file_name.split('.').pop().toLowerCase() : '';
      if (filters.fileType === 'pdf') matchesFileType = ext === 'pdf';
      else if (filters.fileType === 'doc') matchesFileType = ['doc', 'docx'].includes(ext);
      else if (filters.fileType === 'image') matchesFileType = ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
      else if (filters.fileType === 'excel') matchesFileType = ['xls', 'xlsx'].includes(ext);
      else if (filters.fileType === 'other') matchesFileType = !['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'xls', 'xlsx'].includes(ext);
    }
    
    // Date range filter
    let matchesDate = true;
    if (filters.dateRange !== 'all' && doc.created_at) {
      const docDate = new Date(doc.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));
      
      if (filters.dateRange === 'today') matchesDate = daysDiff === 0;
      else if (filters.dateRange === 'week') matchesDate = daysDiff <= 7;
      else if (filters.dateRange === 'month') matchesDate = daysDiff <= 30;
      else if (filters.dateRange === 'year') matchesDate = daysDiff <= 365;
    }
    
    // Starred filter
    const matchesStarred = !filters.starred || doc.starred;
    
    return matchesSearch && matchesCategory && matchesFileType && matchesDate && matchesStarred;
  });

  // Calculate shared documents (documents with share_token)
  const sharedCount = displayDocuments.filter(d => d && d.share_token).length;
  const starredCount = displayDocuments.filter(d => d && d.starred).length;
  
  const stats = {
    total: displayDocuments.length,
    shared: sharedCount,
    starred: starredCount,
    totalGrowth: displayDocuments.length > 0 ? 12 : 0,
    sharedGrowth: sharedCount > 0 ? 8 : 0,
    starredGrowth: starredCount > 0 ? 5 : 0
  };

  const grouped = (docs) => {
    const map = {};
    (docs || []).forEach(d => {
      const cat = d.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(d);
    });
    return map;
  };

  const getFileIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf' || t.includes('pdf')) return { icon: '📄', color: '#ef4444', bg: '#fee2e2' };
    if (t === 'folder') return { icon: '📁', color: '#f59e0b', bg: '#fef3c7' };
    if (t === 'excel' || t.includes('sheet') || t.includes('xls')) return { icon: '📊', color: '#10b981', bg: '#d1fae5' };
    if (t === 'word' || t.includes('doc')) return { icon: '📝', color: '#3b82f6', bg: '#dbeafe' };
    return { icon: '📄', color: '#6b7280', bg: '#f3f4f6' };
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }
    try {
      const formData = new FormData();
      for (const f of uploadFiles) formData.append('files[]', f);
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription);
      formData.append('author', uploadAuthor);
      const res = await axios.post('/api/admin/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadCategory('Academic');
      setUploadDescription('');
      setUploadAuthor('Admin');
      setDocuments(prev => [ ...(res.data.documents || []), ...prev ]);
      alert('Documents uploaded successfully!');
    } catch (err) {
      alert('Upload failed. Check console for details.');
      console.error('Upload error', err);
    }
  };

  const handleDownloadDocument = (doc) => {
    window.open(doc.url || `/storage/${doc.path}`,'_blank');
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await axios.delete(`/api/admin/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id));
      alert('Document deleted successfully!');
    } catch (e) { console.error(e); alert('Delete failed'); }
  };

  const toggleShare = async (doc, e) => {
    if (e) e.stopPropagation();
    if (selectMode) return; // Don't toggle share in select mode
    
    // Open share modal to generate link
    setCurrentShareDoc(doc);
    setShareLink('');
    setShowShareModal(true);
    
    // Generate share link if not already generated
    try {
      const res = await axios.post(`/api/admin/documents/${doc.id}/share`);
      setShareLink(res.data.share_link);
      
      // Update document with share token
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, share_token: res.data.share_token, visibility: 'Public' } : d
      ));
    } catch (e) {
      console.error('Failed to generate share link:', e);
      alert('Failed to generate share link');
      setShowShareModal(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard!');
    } catch (e) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Share link copied to clipboard!');
    }
  };

  const revokeShareLink = async () => {
    if (!confirm('Are you sure you want to revoke this share link? The link will no longer work.')) return;
    
    try {
      await axios.post(`/api/admin/documents/${currentShareDoc.id}/unshare`);
      
      // Update document
      setDocuments(prev => prev.map(d => 
        d.id === currentShareDoc.id ? { ...d, share_token: null, visibility: 'Private' } : d
      ));
      
      setShowShareModal(false);
      alert('Share link revoked successfully!');
    } catch (e) {
      console.error('Failed to revoke share link:', e);
      alert('Failed to revoke share link');
    }
  };

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="admin-main">
        <div style={{ display: 'flex', height: '100vh', background: '#f8f9fa' }}>
          {/* Left Sidebar */}
          <div style={{ width: 320, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
            {/* Storage Section */}
            <div style={{ padding: '24px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <FiFolder size={18} color="#6b7280" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Storage</h3>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>45.2 GB of 100 GB used</div>
                <div style={{ width: '100%', height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '45%', height: '100%', background: '#111827' }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Documents</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>28.4 GB</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Images</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>12.1 GB</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}></div>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Other</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>4.7 GB</span>
                </div>
              </div>
            </div>

            {/* Categories Section */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', paddingLeft: 4 }}>Categories</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: selectedCategory === cat.name ? '#f0f9ff' : 'transparent',
                      color: selectedCategory === cat.name ? '#0284c7' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 6, 
                      background: selectedCategory === cat.name ? cat.color + '15' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {React.createElement(cat.icon, { size: 16, color: selectedCategory === cat.name ? cat.color : '#6b7280' })}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: selectedCategory === cat.name ? 600 : 500 }}>{cat.name}</span>
                    <span style={{ 
                      fontSize: 12, 
                      fontWeight: 500, 
                      color: '#9ca3af',
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: selectedCategory === cat.name ? '#e0f2fe' : '#f3f4f6'
                    }}>{categoryCounts[cat.id] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiFolder size={24} color="#fff" />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Document Management</h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>Organize and manage school documents</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={toggleSelectMode}
                    style={{ 
                      padding: '10px 16px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb', 
                      background: selectMode ? '#eff6ff' : '#fff', 
                      color: selectMode ? '#3b82f6' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                    <FiCheck size={16} /> {selectMode ? `Selected (${selectedDocuments.size})` : 'Select'}
                  </button>
                  <button 
                    onClick={handleExport}
                    style={{ 
                      padding: '10px 16px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb', 
                      background: '#fff', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}>
                    <FiDownload size={16} /> Export
                  </button>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: '#3b82f6', 
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <FiUpload size={16} /> Upload Document
                  </button>
                  <button 
                    onClick={() => setShowFolderModal(true)}
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: '#fff', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <FiPlus size={16} /> New Folder
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ padding: '20px', borderRadius: 12, background: '#eff6ff', border: '1px solid #dbeafe' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Total Documents</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{stats.total}</div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiFileText size={24} color="#3b82f6" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>↗ {stats.totalGrowth}% from last month</span>
                  </div>
                </div>

                <div style={{ padding: '20px', borderRadius: 12, background: '#faf5ff', border: '1px solid #f3e8ff' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Shared Documents</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{stats.shared}</div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiShare2 size={24} color="#8b5cf6" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>↗ {stats.sharedGrowth}% from last month</span>
                  </div>
                </div>

                <div style={{ padding: '20px', borderRadius: 12, background: '#fefce8', border: '1px solid #fef3c7' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Starred Items</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{stats.starred}</div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiStar size={24} color="#f59e0b" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>↗ {stats.starredGrowth}% from last month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 250, maxWidth: 450 }}>
                  <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
                  <input 
                    type="text" 
                    placeholder="Search documents..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                      width: '100%',
                      padding: '10px 14px 10px 42px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                {selectMode && (
                  <button 
                    onClick={selectAllDocuments}
                    style={{ 
                      padding: '10px 16px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb', 
                      background: selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0 ? '#eff6ff' : '#fff',
                      color: selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0 ? '#3b82f6' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <FiCheck size={16} /> {selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                <button 
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  style={{ 
                    padding: '10px 16px', 
                    borderRadius: 8, 
                    border: '1px solid #e5e7eb', 
                    background: showFilterPanel ? '#eff6ff' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    fontSize: 14,
                    fontWeight: 500,
                    color: showFilterPanel ? '#3b82f6' : '#374151'
                  }}
                >
                  <FiFilter size={16} /> Filter
                </button>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button 
                    onClick={() => setViewMode('grid')}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb', 
                      background: viewMode === 'grid' ? '#f3f4f6' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <FiGrid size={18} color={viewMode === 'grid' ? '#111827' : '#6b7280'} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb', 
                      background: viewMode === 'list' ? '#f3f4f6' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <FiList size={18} color={viewMode === 'list' ? '#111827' : '#6b7280'} />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
              <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  {/* Category Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Category
                    </label>
                    <select 
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                      style={{ 
                        width: '100%',
                        padding: '8px 12px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Categories</option>
                      <option value="Academic">Academic</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Financial">Financial</option>
                      <option value="HR Documents">HR Documents</option>
                      <option value="Legal & Compliance">Legal & Compliance</option>
                    </select>
                  </div>

                  {/* File Type Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      File Type
                    </label>
                    <select 
                      value={filters.fileType}
                      onChange={(e) => setFilters({...filters, fileType: e.target.value})}
                      style={{ 
                        width: '100%',
                        padding: '8px 12px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Types</option>
                      <option value="pdf">PDF</option>
                      <option value="doc">Word Documents</option>
                      <option value="excel">Excel Sheets</option>
                      <option value="image">Images</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Date Range
                    </label>
                    <select 
                      value={filters.dateRange}
                      onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                      style={{ 
                        width: '100%',
                        padding: '8px 12px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>

                  {/* Starred Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Status
                    </label>
                    <button
                      onClick={() => setFilters({...filters, starred: !filters.starred})}
                      style={{ 
                        width: '100%',
                        padding: '8px 12px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        fontSize: 14,
                        background: filters.starred ? '#fef3c7' : '#fff',
                        color: filters.starred ? '#92400e' : '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontWeight: 500
                      }}
                    >
                      <FiStar size={16} color={filters.starred ? '#f59e0b' : '#9ca3af'} />
                      {filters.starred ? 'Starred Only' : 'All Documents'}
                    </button>
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setFilters({ category: 'all', fileType: 'all', dateRange: 'all', starred: false })}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      fontSize: 13,
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}

            {/* Breadcrumb */}
            <div style={{ padding: '16px 32px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
              <FiFolder size={16} />
              <span style={{ color: '#3b82f6', cursor: 'pointer' }}>Home</span>
              <span>›</span>
              <span style={{ color: '#3b82f6', cursor: 'pointer' }}>{selectedCategory}</span>
            </div>

            {/* Documents Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#f9fafb' }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  {selectedCategory} 
                  <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
                    {filteredDocuments.length} items
                  </span>
                </h2>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>Loading documents...</div>
              ) : filteredDocuments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>No documents yet</h3>
                  <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280' }}>
                    {selectedCategory === 'All Documents' 
                      ? 'Upload your first document to get started'
                      : `No documents in ${selectedCategory} category`
                    }
                  </p>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    style={{ 
                      padding: '12px 24px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: '#3b82f6', 
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <FiUpload size={16} /> Upload Document
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 16 }}>
                  {filteredDocuments.map(doc => {
                    const fileInfo = getFileIcon(doc.type);
                    const isStarred = doc.starred === true;
                    const isSelected = selectedDocuments.has(doc.id);
                    const isShared = doc.visibility === 'Public' || doc.visibility === 'Shared';
                    
                    return (
                      <div 
                        key={doc.id} 
                        onClick={() => selectMode && toggleSelectDocument(doc.id)}
                        style={{ 
                          background: '#fff', 
                          borderRadius: 12, 
                          padding: '20px', 
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
                        }}
                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.boxShadow = 'none')}
                      >
                        {selectMode && (
                          <div style={{ 
                            position: 'absolute', 
                            top: 12, 
                            right: 12, 
                            width: 24, 
                            height: 24, 
                            borderRadius: 6, 
                            border: isSelected ? '2px solid #3b82f6' : '2px solid #d1d5db',
                            background: isSelected ? '#3b82f6' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}>
                            {isSelected && <FiCheck size={16} color="#fff" />}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ 
                            width: 48, 
                            height: 48, 
                            borderRadius: 10, 
                            background: fileInfo.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                            flexShrink: 0
                          }}>
                            {fileInfo.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <h3 style={{ 
                                    margin: 0, 
                                    fontSize: 15, 
                                    fontWeight: 600, 
                                    color: '#111827',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>{doc.title}</h3>
                                  {doc.share_token && (
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      background: '#dbeafe',
                                      color: '#1e40af',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      flexShrink: 0
                                    }}>🔗 Shared</span>
                                  )}
                                </div>
                                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                                  {doc.size && `${doc.size} • `}{doc.date}
                                </p>
                              </div>
                              {!selectMode && (
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  <button
                                    onClick={(e) => {
                                      toggleShare(doc, e);
                                    }}
                                    title="Generate Share Link"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 4
                                    }}
                                  >
                                    <FiShare2 
                                      size={18} 
                                      color={doc.share_token ? '#3b82f6' : '#d1d5db'}
                                    />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      toggleStar(doc, e);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 4
                                    }}
                                  >
                                    <FiStar 
                                      size={18} 
                                      color={isStarred ? '#f59e0b' : '#d1d5db'}
                                      fill={isStarred ? '#f59e0b' : 'none'}
                                    />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                              By {doc.author}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.5)', 
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
                maxWidth: 600, 
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700 }}>Upload Documents</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Add files to the document library</p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8
                  }}
                >
                  <FiX size={20} color="#6b7280" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Files *</label>
                  <input 
                    type="file" 
                    multiple 
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                    style={{ 
                      width: '100%', 
                      padding: '12px',
                      borderRadius: 8,
                      border: '2px dashed #e5e7eb',
                      background: '#f9fafb'
                    }} 
                  />
                  {uploadFiles.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                      {uploadFiles.length} file(s) selected
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Category *</label>
                  <select 
                    value={uploadCategory} 
                    onChange={(e) => setUploadCategory(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14
                    }}
                  >
                    <option value="Academic">Academic</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Financial">Financial</option>
                    <option value="HR Documents">HR Documents</option>
                    <option value="Legal & Compliance">Legal & Compliance</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Author</label>
                  <input 
                    type="text"
                    value={uploadAuthor}
                    onChange={(e) => setUploadAuthor(e.target.value)}
                    placeholder="Enter author name"
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Description (optional)</label>
                  <textarea 
                    value={uploadDescription} 
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={4}
                    placeholder="Enter document description..."
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      resize: 'vertical'
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
                      background: '#3b82f6', 
                      color: '#fff', 
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Upload Documents
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {showFolderModal && (
          <div 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 1000,
              padding: 20 
            }} 
            onClick={() => setShowFolderModal(false)}
          >
            <div 
              style={{ 
                background: '#fff', 
                borderRadius: 16, 
                padding: 32, 
                maxWidth: 500, 
                width: '100%'
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700 }}>Create New Folder</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Organize your documents</p>
                </div>
                <button 
                  onClick={() => setShowFolderModal(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8
                  }}
                >
                  <FiX size={20} color="#6b7280" />
                </button>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Folder Name *</label>
                <input 
                  type="text"
                  placeholder="Enter folder name..."
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowFolderModal(false)}
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
                  type="button"
                  onClick={() => {
                    alert('Folder creation functionality to be implemented');
                    setShowFolderModal(false);
                  }}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#3b82f6', 
                    color: '#fff', 
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Link Modal */}
        {showShareModal && currentShareDoc && (
          <div 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 1000,
              padding: 20 
            }} 
            onClick={() => setShowShareModal(false)}
          >
            <div 
              style={{ 
                background: '#fff', 
                borderRadius: 16, 
                padding: 32, 
                maxWidth: 600, 
                width: '100%'
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700 }}>Share Document</h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Anyone with this link can view and download</p>
                </div>
                <button 
                  onClick={() => setShowShareModal(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8
                  }}
                >
                  <FiX size={20} color="#6b7280" />
                </button>
              </div>

              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: 12, 
                padding: 20,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 10, 
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}>
                    📄
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 15, 
                      fontWeight: 600, 
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {currentShareDoc.title}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
                      {currentShareDoc.size} • {currentShareDoc.category}
                    </p>
                  </div>
                </div>
              </div>

              {shareLink ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                      Share Link
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text"
                        value={shareLink}
                        readOnly
                        style={{ 
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          fontSize: 14,
                          background: '#f9fafb',
                          color: '#6b7280'
                        }}
                      />
                      <button 
                        onClick={copyShareLink}
                        style={{ 
                          padding: '12px 20px',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          color: '#374151',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#6b7280' }}>
                      💡 Share this link with anyone. They can view and download without logging in.
                    </p>
                  </div>

                  <div style={{ 
                    background: '#fef3c7', 
                    border: '1px solid #fbbf24',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 500 }}>
                      ⚠️ Anyone with this link can access this document. Make sure you only share it with trusted people.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={revokeShareLink}
                      style={{ 
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: '1px solid #ef4444',
                        background: '#fff',
                        color: '#ef4444',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Revoke Link
                    </button>
                    <button 
                      onClick={() => setShowShareModal(false)}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#3b82f6', 
                        color: '#fff', 
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: '#6b7280', fontSize: 14 }}>Generating share link...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
