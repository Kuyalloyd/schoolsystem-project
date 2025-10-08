import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import UserFormModal from "./UserFormModal";
import "../../../../sass/AdminDashboard.scss";

const API = "http://127.0.0.1:8000/api/admin";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // ✅ Fetch dashboard + users safely
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        fetch(API + "/users"),
        fetch(API + "/dashboard"),
      ]);

      // Check both API responses
      if (!usersResponse.ok) {
        throw new Error("Users API error: " + usersResponse.status);
      }
      if (!statsResponse.ok) {
        throw new Error("Dashboard API error: " + statsResponse.status);
      }

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();

      // Validate JSON data
      if (!Array.isArray(usersData)) throw new Error("Users data invalid");
      if (typeof statsData !== "object") throw new Error("Stats data invalid");

      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      console.error("⚠️ AdminDashboard load error:", err);
      // Show a clean message instead of "Failed to load"
      alert("⚠️ Cannot connect to API. Please start your Laravel backend (php artisan serve).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // === CRUD ===
  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setShowModal(true);
  };

  const onSave = async (payload, isEdit) => {
    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? API + "/users/" + payload.id : API + "/users";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed (" + res.status + ")");
      alert(isEdit ? "✅ User updated successfully!" : "✅ User added successfully!");
      setShowModal(false);
      fetchAll();
    } catch (err) {
      console.error("Save error:", err);
      alert("⚠️ Failed to save user. Check console for details.");
    }
  };

  const remove = async (id) => {
    if (!confirm("Are you sure you want to archive this user?")) return;
    await fetch(API + "/users/" + id, { method: "DELETE" });
    fetchAll();
  };

  const restore = async (id) => {
    await fetch(API + "/users/" + id + "/restore", { method: "POST" });
    fetchAll();
  };

  const toggleLock = async (id) => {
    await fetch(API + "/users/" + id + "/toggle-lock", { method: "POST" });
    fetchAll();
  };

  // === Components ===
  const renderDashboard = () => {
    return React.createElement(
      "div",
      { className: "dashboard-section" },
      React.createElement("h2", null, "Admin Dashboard"),
      React.createElement(
        "div",
        { className: "stats-grid" },
        ["Students", "Teachers", "Locked Accounts", "Archived Accounts"].map((label, i) =>
          React.createElement(
            "div",
            { key: i, className: "stat-card" },
            label,
            " ",
            React.createElement(
              "strong",
              null,
              label === "Students"
                ? stats.total_students || 0
                : label === "Teachers"
                ? stats.total_teachers || 0
                : label === "Locked Accounts"
                ? stats.locked_accounts || 0
                : stats.archived_accounts || 0
            )
          )
        )
      ),
      React.createElement(
        "p",
        { className: "note" },
        "You have full control over all system users."
      )
    );
  };

  const renderTable = (role) => {
    const filtered =
      role === "archived"
        ? users.filter((u) => u.deleted_at)
        : users.filter((u) => u.role === role);

    const tableRows =
      filtered.length === 0
        ? React.createElement(
            "tr",
            null,
            React.createElement("td", { colSpan: "5" }, "No users found")
          )
        : filtered.map((u) =>
            React.createElement(
              "tr",
              { key: u.id },
              React.createElement("td", null, u.id),
              React.createElement(
                "td",
                null,
                React.createElement("div", { className: "uname" }, u.name),
                React.createElement("small", null, u.email)
              ),
              React.createElement("td", null, u.role),
              React.createElement(
                "td",
                null,
                u.deleted_at
                  ? React.createElement("span", { className: "badge archived" }, "Archived")
                  : u.is_locked
                  ? React.createElement("span", { className: "badge locked" }, "Locked")
                  : React.createElement("span", { className: "badge active" }, "Active")
              ),
              React.createElement(
                "td",
                null,
                !u.deleted_at
                  ? [
                      React.createElement(
                        "button",
                        { key: "edit", onClick: () => openEdit(u) },
                        "Edit"
                      ),
                      React.createElement(
                        "button",
                        { key: "lock", onClick: () => toggleLock(u.id) },
                        u.is_locked ? "Unlock" : "Lock"
                      ),
                      React.createElement(
                        "button",
                        { key: "archive", onClick: () => remove(u.id) },
                        "Archive"
                      ),
                    ]
                  : React.createElement(
                      "button",
                      { onClick: () => restore(u.id) },
                      "Restore"
                    )
              )
            )
          );

    return React.createElement(
      "section",
      { className: "user-table card" },
      React.createElement(
        "header",
        { className: "adm-controls" },
        React.createElement("button", { onClick: openAdd }, "+ Add"),
        React.createElement("button", { onClick: fetchAll }, "Refresh")
      ),
      loading
        ? React.createElement("p", null, "Loading...")
        : React.createElement(
            "table",
            { className: "users" },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", null, "ID"),
                React.createElement("th", null, "User"),
                React.createElement("th", null, "Role"),
                React.createElement("th", null, "Status"),
                React.createElement("th", null, "Actions")
              )
            ),
            React.createElement("tbody", null, tableRows)
          )
    );
  };

  const Placeholder = (props) =>
    React.createElement(
      "div",
      { className: "placeholder card" },
      React.createElement("h2", null, props.title),
      React.createElement("p", null, "This section is under development.")
    );

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return renderDashboard();
      case "students":
        return renderTable("student");
      case "teachers":
        return renderTable("teacher");
      case "archive":
        return renderTable("archived");
      case "courses":
        return React.createElement(Placeholder, { title: "Course Management" });
      case "reports":
        return React.createElement(Placeholder, { title: "Reports" });
      case "documents":
        return React.createElement(Placeholder, { title: "Documents" });
      case "calendar":
        return React.createElement(Placeholder, { title: "Calendar" });
      case "messages":
        return React.createElement(Placeholder, { title: "Messages" });
      case "settings":
        return React.createElement(Placeholder, { title: "System Settings" });
      default:
        return React.createElement(
          "div",
          { className: "placeholder card" },
          React.createElement("h2", null, "Unknown Section")
        );
    }
  };

  // === MAIN RENDER ===
  return React.createElement(
    "div",
    { className: "admin-dashboard-layout" },
    React.createElement(Sidebar, { activePage, onNavigate: setActivePage }),
    React.createElement("main", { className: "admin-main" }, renderContent()),
    showModal
      ? React.createElement(UserFormModal, {
          initial: editing,
          onClose: () => setShowModal(false),
          onSave,
        })
      : null
  );
}
