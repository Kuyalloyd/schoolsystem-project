import React, { useState, useEffect } from 'react';

export default function CourseFormModal({ initial = null, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', code: '', type: '', teacher: '', schedule: '', active: 'Active' });
  useEffect(() => {
    if (initial) {
      // normalize initial.active which may be boolean or string
      const activeVal = typeof initial.active === 'boolean' ? (initial.active ? 'Active' : 'Inactive') : (initial.active || 'Active');
      setForm((s) => ({ ...s, ...initial, active: activeVal }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const submit = () => {
    if (!form.name || !form.code) return alert('Please provide course name and code');
    onSave && onSave(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide course-modal">
        <div className="modal-header">
          <h3>{initial ? 'Edit Course' : 'Add Course'}</h3>
          <div className="modal-sub">Manage course details, schedule and status</div>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Advanced Mathematics" />
            </div>

            <div className="form-group">
              <label>Course Code</label>
              <input value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="e.g. MATH-401" />
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

            <div className="form-group status-box">
              <label>Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className={`status-select ${form.active === 'Active' ? 'is-active' : 'is-inactive'}`}
                  value={form.active}
                  onChange={(e) => update('active', e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="small-muted">Toggle to mark course active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary" onClick={submit}>Save</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
