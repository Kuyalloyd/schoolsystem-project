import React, { useState, useEffect } from "react";
import axios from "../../axios";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [editing, setEditing] = useState(null);
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  const loadUsers = () => {
    const query = filterRole === "all" ? "" : `?role=${filterRole}`;
    axios.get(`/api/admin/users${query}`).then((res) => setUsers(res.data));
  };

  const submitForm = (e) => {
    e.preventDefault();
    if (editing) {
      axios.put(`/api/admin/users/${editing.id}`, form).then(() => {
        loadUsers();
        setForm({ name: "", email: "", password: "", role: "student" });
        setEditing(null);
      });
    } else {
      axios.post("/api/admin/users", form).then(() => {
        loadUsers();
        setForm({ name: "", email: "", password: "", role: "student" });
      });
    }
  };

  const deleteUser = (id) => axios.delete(`/api/admin/users/${id}`).then(loadUsers);
  const restoreUser = (id) => axios.post(`/api/admin/users/${id}/restore`).then(loadUsers);
  const toggleLock = (id) => axios.post(`/api/admin/users/${id}/toggle-lock`).then(loadUsers);
  const editUser = (user) => setEditing(user) || setForm(user);

  return (
    <div className="admin-users">
      <h2>Manage Users</h2>

      {/* Role Filter */}
      <div className="filter">
        <label>Filter by Role:</label>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">All</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Add/Edit User Form */}
      <form onSubmit={submitForm} className="user-form">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">{editing ? "Update User" : "Add User"}</button>
      </form>

      {/* User Table */}
      <table className="users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id}>
              <td>{i + 1}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.is_locked ? "🔒 Locked" : "✅ Active"}</td>
              <td>
                <button onClick={() => editUser(u)}>✏️</button>
                <button onClick={() => deleteUser(u.id)}>🗑️</button>
                <button onClick={() => toggleLock(u.id)}>
                  {u.is_locked ? "Unlock" : "Lock"}
                </button>
                <button onClick={() => restoreUser(u.id)}>♻️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
