import React, { useState, useEffect } from "react";

export default function UserFormModal({ initial, onClose, onSave, role }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    role: role || "student",
    password: "",
  });

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.email) return alert("Name and email required");
    onSave(form, !!initial);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{initial ? "Edit User" : "Add User"}</h2>
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
        />
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        {!initial && (
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
        )}
        <div className="modal-actions">
          <button onClick={handleSubmit}>Save</button>
          <button className="secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
