import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { UserFormModal } from './pages/admin/UserFormModal';

export default function ModalHost() {
  const [visible, setVisible] = useState(false);
  const [initial, setInitial] = useState(null);
  const [role, setRole] = useState('student');

  useEffect(() => {
    const open = (e) => {
      const d = (e && e.detail) || {};
      setInitial(d.initial || null);
      setRole(d.role || 'student');
      setVisible(true);
    };
    const close = () => {
      setVisible(false);
      setInitial(null);
      setRole('student');
    };
    window.addEventListener('open-user-modal', open);
    window.addEventListener('close-user-modal', close);
    return () => {
      window.removeEventListener('open-user-modal', open);
      window.removeEventListener('close-user-modal', close);
    };
  }, []);

  const handleSave = async (payload, isEdit) => {
    try {
      let res = null;
      if (isEdit && payload.id) {
        res = await axios.put(`/api/admin/users/${payload.id}`, payload);
      } else {
        res = await axios.post('/api/admin/users', payload);
      }
      console.log('[ModalHost] Save response:', res && res.data);
      // Notify components to reload their user lists
      try {
        const createdId = (res && res.data && res.data.user && res.data.user.id) ? res.data.user.id : null;
        window.dispatchEvent(new CustomEvent('admin:user-created', { detail: createdId ? { id: createdId } : {} }));
        window.dispatchEvent(new CustomEvent('admin:users-changed')); // Force reload
      } catch(e){}
      return res.data;
    } catch (err) {
      // normalize error to match previous shape
      if (err && err.response && err.response.data) {
        const d = err.response.data;
        const e = new Error(d.message || 'Save failed');
        e.response = err.response;
        return Promise.reject(e);
      }
      return Promise.reject(err);
    }
  };

  const handleClose = (source) => {
    setVisible(false);
  };

  if (!document) return null;
  let root = document.getElementById('global-modal-host');
  if (!root) {
    root = document.createElement('div');
    root.id = 'global-modal-host';
    document.body.appendChild(root);
  }

  return createPortal(
    React.createElement(UserFormModal, { visible, initial, role, onClose: handleClose, onSave: handleSave }),
    root
  );
}
