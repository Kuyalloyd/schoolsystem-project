import React, { useState } from "react";
import axios from "axios";
import "../../sass/Register.scss";


export default function Register() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "student", // default role

    // Student-specific fields
    school_id: "",
    course: "",
    school_name: "",
    department: "",

    // Faculty-specific fields
    status: "",
    courses_handled: "",
    position: "",
    highest_degree: "",
    specialization: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      // Send POST request to Laravel
      const res = await axios.post("http://127.0.0.1:8000/api/register", form, {
        headers: { "Content-Type": "application/json" },
      });

      alert(res.data.message || "✅ Registration successful!");
      window.location.href = "/login"; // redirect to login page
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "❌ Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Return to login page
  const goBackToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="register-container">
      <h2>Create Account</h2>

      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Basic Info */}
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={form.first_name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={form.last_name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

        {/* Role Selection */}
        <label>
          Role:{" "}
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </label>

        {/* Student Fields */}
        {form.role === "student" && (
          <>
            <input
              type="text"
              name="school_id"
              placeholder="School ID"
              value={form.school_id}
              onChange={handleChange}
            />
            <input
              type="text"
              name="course"
              placeholder="Course"
              value={form.course}
              onChange={handleChange}
            />
            <input
              type="text"
              name="school_name"
              placeholder="School Name"
              value={form.school_name}
              onChange={handleChange}
            />
            <input
              type="text"
              name="department"
              placeholder="Department"
              value={form.department}
              onChange={handleChange}
            />
          </>
        )}

        {/* Faculty Fields */}
        {form.role === "faculty" && (
          <>
            <input
              type="text"
              name="department"
              placeholder="Department"
              value={form.department}
              onChange={handleChange}
            />
            <input
              type="text"
              name="status"
              placeholder="Status"
              value={form.status}
              onChange={handleChange}
            />
            <input
              type="text"
              name="courses_handled"
              placeholder="Courses Handled"
              value={form.courses_handled}
              onChange={handleChange}
            />
            <input
              type="text"
              name="position"
              placeholder="Position"
              value={form.position}
              onChange={handleChange}
            />
            <input
              type="text"
              name="highest_degree"
              placeholder="Highest Degree"
              value={form.highest_degree}
              onChange={handleChange}
            />
            <input
              type="text"
              name="specialization"
              placeholder="Specialization"
              value={form.specialization}
              onChange={handleChange}
            />
          </>
        )}

        {/* Buttons */}
        <div className="button-group">
          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
          <button type="button" onClick={goBackToLogin}>
            Back to Login
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
