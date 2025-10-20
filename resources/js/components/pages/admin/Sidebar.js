import React, { useEffect, useState } from "react";
import { roleLabels } from './labels';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiHome,
  FiUsers,
  FiBookOpen,
  FiBarChart2,
  FiFileText,
  FiCalendar,
  FiSettings,
  FiMenu,
  FiLogOut,
} from "react-icons/fi";

import "./../../../../sass/Sidebar.scss";

export default function Sidebar({ activePage, onNavigate }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({});

  const items = [
    { id: "dashboard", label: "Dashboard", icon: React.createElement(FiHome) },
  { id: "students", label: roleLabels.student.plural, icon: React.createElement(FiUsers) },
  { id: "teachers", label: roleLabels.teacher.plural, icon: React.createElement(FiUsers) },
    { id: "courses", label: "Course Management", icon: React.createElement(FiBookOpen) },
    { id: "reports", label: "Reports", icon: React.createElement(FiBarChart2) },
    { id: "documents", label: "Documents", icon: React.createElement(FiFileText) },
    { id: "settings", label: "Settings", icon: React.createElement(FiSettings) },
  ];


  // Persist collapsed state between page reloads
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) setCollapsed(saved === '1');
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0'); } catch(e){}
  }, [collapsed]);

  // Keep main area margin synced with sidebar width to prevent overlap
  useEffect(() => {
    const adjust = () => {
      try {
        const main = document.querySelector('.admin-main');
        const sidebarEl = document.querySelector('.sidebar');
        if (!main || !sidebarEl) return;
        const mq = window.matchMedia('(max-width: 900px)');
        if (mq.matches) {
          // on small screens let layout be natural
          main.style.marginLeft = '';
        } else {
          // set margin to sidebar width (handles collapsed state)
          main.style.marginLeft = sidebarEl.offsetWidth + 'px';
        }
      } catch (e) {
        // noop
      }
    };

    // initial adjust
    adjust();
    window.addEventListener('resize', adjust);
    return () => {
      window.removeEventListener('resize', adjust);
      const main = document.querySelector('.admin-main');
      if (main) main.style.marginLeft = '';
    };
  }, [collapsed]);

  // close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [activePage]);

  // Fetch small dashboard stats
  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/admin/dashboard');
        if (!mounted) return;
        const data = res.data || {};
        // if server returned an empty object or all zeros, try one quick retry
        const hasAny = Object.keys(data).some(k => { try { return Number(data[k]) || data[k]; } catch(e){ return false; } });
        if (!hasAny) {
          // retry once after a short delay
          setTimeout(async () => {
            try {
              const r2 = await axios.get('/api/admin/dashboard');
              if (mounted) setStats(r2.data || {});
            } catch (e) { /* ignore */ }
          }, 200);
        }
        setStats(data);
      } catch (e) {
        // ignore errors
      }
    };
    fetchStats();
    return () => (mounted = false);
  }, []);

  // Update sidebar stats when admin actions occur elsewhere in the UI
  useEffect(() => {
    const handler = (e) => {
      try {
        const d = e && e.detail ? e.detail : null;
        if (d) setStats((s) => ({ ...s, ...d }));
      } catch (err) {
        console.warn('sidebar admin:user-created handler', err);
      }
    };
    window.addEventListener('admin:user-created', handler);
    return () => window.removeEventListener('admin:user-created', handler);
  }, []);

  const handleClick = (item) => {
    // Always use route navigation for standalone pages (courses, reports, documents, settings)
    const standalonePages = ['courses', 'reports', 'documents', 'settings'];
    if (standalonePages.includes(item.id)) {
      switch (item.id) {
        case 'courses':
          return navigate('/admin/courses');
        case 'reports':
          return navigate('/admin/reports');
        case 'documents':
          return navigate('/admin/documents');
        case 'settings':
          return navigate('/admin/settings');
        default:
          return;
      }
    }

    // If caller provided an onNavigate callback (single-page), use it for dashboard pages.
    if (typeof onNavigate === 'function') {
      onNavigate(item.id);
      return;
    }

    // Otherwise fall back to route navigation for common admin pages
    switch (item.id) {
      case 'dashboard':
        return navigate('/admin/dashboard');
      case 'students':
        // route Students to the admin dashboard view as requested
        return navigate('/admin/dashboard');
      case 'teachers':
        // route Teachers to the admin dashboard view as requested
        return navigate('/admin/dashboard');
      default:
        return;
    }
  };

  // ✅ Improved Logout Handler
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    const logoutBtn = document.querySelector(".logout-btn");
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";

    try {
      // ✅ Use web route, not API route
      await axios.post("/logout", {}, { withCredentials: true });

      // Redirect to login
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      const msg =
        err.response?.data?.message || "Logout failed. Please try again.";
      alert(msg);
    } finally {
      logoutBtn.disabled = false;
      logoutBtn.textContent = "Logout";
    }
  };

  return React.createElement(
    "aside",
    { className: "sidebar" + (collapsed ? " collapsed" : "") + (mobileOpen ? ' mobile-open' : '') },
    // mobile overlay when open
    mobileOpen ? React.createElement('div', { className: 'sidebar-overlay', onClick: () => setMobileOpen(false) }) : null,

    // Top section
    React.createElement(
      "div",
      { className: "sidebar-top" },
      // logo + title
      React.createElement('div', { className: 'logo' },
        React.createElement('div', { className: 'logo-icon' }, React.createElement(FiBookOpen)),
        !collapsed && React.createElement('div', { className: 'logo-text' }, React.createElement('div', { className: 'site-title' }, 'School Admin'), React.createElement('div', { className: 'site-sub muted' }, 'Management System'))
      ),
      // collapse toggle
      React.createElement(
        "div",
        { style: { display: 'flex', justifyContent: 'flex-end' } },
        React.createElement('button', { className: 'collapse-btn', onClick: () => setCollapsed(c => !c), title: collapsed ? 'Expand sidebar' : 'Collapse sidebar' }, React.createElement(FiMenu))
      ),

      // Top view selector (compact)
      React.createElement(
        "div",
        { className: "sidebar-view" },
        !collapsed &&
          React.createElement(
            "select",
            { className: "view-select", defaultValue: "admin" },
            React.createElement("option", { value: "admin" }, "Admin View")
          ),
        collapsed && React.createElement("div", { className: "view-icon" }, React.createElement(FiHome)),
        // mobile open button
        React.createElement('button', { className: 'mobile-open-btn', onClick: () => setMobileOpen(m => !m), title: 'Toggle sidebar' }, React.createElement(FiMenu))
      ),

        // Small user panel
      React.createElement(
        "div",
        { className: "sidebar-user" },
        React.createElement(
          "div",
          { className: "avatar" },
          React.createElement("div", { className: "avatar-initials" }, "AD")
        ),
        !collapsed &&
          React.createElement(
            "div",
            { className: "user-meta" },
            React.createElement("div", { className: "name" }, "Admin User"),
            React.createElement("div", { className: "email" }, "admin@school.local")
          )
      )
    ),
    // Navigation
    React.createElement(
      "nav",
      { className: "sidebar-nav", "aria-label": "Main navigation" },
      // section label
      React.createElement('div', { className: 'nav-section-label' }, 'Administration'),
      React.createElement(
        "ul",
        null,
        items.map(function (item) {
          const isActive = item.id === activePage;
          return React.createElement(
            "li",
            { key: item.id, className: isActive ? "active" : "", role: 'none' },
            React.createElement(
              "button",
              {
                onClick: () => handleClick(item),
                title: collapsed ? item.label : undefined,
                'aria-current': isActive ? 'page' : undefined,
              },
              React.createElement("span", { className: "icon" }, item.icon),
              !collapsed && React.createElement("span", { className: "label" }, item.label),
              !collapsed && (item.id === "users" && stats.total_users ? React.createElement("span", { className: "badge" }, stats.total_users) : null)
            ),
            null
          );
        })
      )
    ),

    // Footer (avatar + user)
    React.createElement(
      "div",
      { className: "sidebar-footer" },
      React.createElement(
        "div",
        { className: "footer-meta" },
        React.createElement('div', { className: 'avatar' }, React.createElement('div', { className: 'avatar-initials' }, 'AD')),
        !collapsed && React.createElement('div', { className: 'footer-text' }, React.createElement('div', { className: 'name' }, 'Admin User'), React.createElement('div', { className: 'muted' }, 'admin@school.edu')),
        !collapsed && React.createElement('div', { style: { marginLeft: 'auto' } }, React.createElement('button', { className: 'logout-btn', onClick: handleLogout, title: 'Logout' }, React.createElement(FiLogOut), React.createElement('span', { style: { marginLeft: 8 } }, 'Logout')))
      )
    )
  );
}
