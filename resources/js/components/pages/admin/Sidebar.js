import React from "react";

export default function Sidebar({ activePage, onNavigate }) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "students", label: "Students" },
    { id: "teachers", label: "Teachers" },
    { id: "archive", label: "Archived" },
    { id: "courses", label: "Courses" },
    { id: "reports", label: "Reports" },
    { id: "documents", label: "Documents" },
    { id: "calendar", label: "Calendar" },
    { id: "messages", label: "Messages" },
    { id: "settings", label: "Settings" },
  ];

  // === Sidebar Header ===
  const header = React.createElement(
    "div",
    { className: "sidebar-header" },
    React.createElement("h1", null, "Admin Panel")
  );

  // === Sidebar Menu ===
  const menu = React.createElement(
    "ul",
    { className: "sidebar-menu" },
    items.map((item) =>
      React.createElement(
        "li",
        {
          key: item.id,
          className: item.id === activePage ? "active" : "",
          onClick: function () {
            onNavigate(item.id);
          },
        },
        item.label
      )
    )
  );

  // === Logout Button ===
  const logoutButton = React.createElement(
    "button",
    {
      className: "logout-btn",
      onClick: async function () {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/logout", {
            method: "POST",
          });
          if (!res.ok) throw new Error("Logout failed");
          alert("✅ Logged out successfully!");
          window.location.href = "/"; // redirect to login page
        } catch (err) {
          console.error(err);
          alert("⚠️ Logout failed. Check your API connection.");
        }
      },
    },
    "Logout"
  );

  // === Footer ===
  const footer = React.createElement(
    "div",
    { className: "sidebar-footer" },
    logoutButton,
    React.createElement("p", null, "© 2025 School System")
  );

  // === Full Sidebar Layout ===
  return React.createElement(
    "aside",
    { className: "sidebar" },
    header,
    menu,
    footer
  );
}
