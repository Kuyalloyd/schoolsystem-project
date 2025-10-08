import React from "react";
import "../../sass/Navbar.scss"; //

export default function Navbar({ title, onLogout }) {
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  return (
    <header className="navbar">
      <h1>{title}</h1>
      <div className="nav-right">
        <span className="user-name">{user?.name ?? "Admin"}</span>
        <button onClick={onLogout} className="logout-small">Logout</button>
      </div>
    </header>
  );
}
