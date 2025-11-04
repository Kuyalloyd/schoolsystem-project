import React, { useState } from "react";
import axios from "axios";
import "../../sass/Register.scss";


export function RegisterForm({ onClose }) {
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

    // Faculty-specific fields
    status: "",
    courses_handled: "",
    position: "",
    highest_degree: "",
    specialization: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  // ✅ Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // clear server validation for this field when user types
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      // Send POST request to Laravel
      // compose payload to match backend expectation: name, email, password, role
      const payload = {
        name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        password: form.password,
        // backend expects 'teacher' not 'faculty'
    role: form.role === 'faculty' ? 'teacher' : form.role,
    // include profile fields for student/teacher
    school_id: form.school_id || undefined,
    course: form.course || undefined,
    school_name: form.school_name || undefined,
        status: form.status || undefined,
        courses_handled: form.courses_handled || undefined,
        position: form.position || undefined,
        highest_degree: form.highest_degree || undefined,
        specialization: form.specialization || undefined,
      };

      const res = await axios.post(`/api/register`, payload);

      alert(res.data.message || "Registration successful!");
      window.location.href = "/login";
    } catch (err) {
      console.error("Registration error:", err);
      // If Laravel validation errors (422) provide detailed errors
      if (err.response?.status === 422 && err.response.data?.errors) {
        setErrors(err.response.data.errors || {});
        setError('Please check the highlighted fields.');
      } else {
        setError(err.response?.data?.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Return to login page
  const goBackToLogin = () => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }

    window.location.href = "/login";
  };

  // Add body class so Register.scss background rules apply, and set inline background as fallback
  React.useEffect(() => {
    return () => {};
  }, []);

  return (
    <div className="login-card register-card">
      <h2>Create Account</h2>
      <p className="subtitle">Register for SJIT School System</p>

      <form onSubmit={handleSubmit} autoComplete="off" className="register-form">
        {/* Basic Info grouped for grid layout */}
        <div className="form-field area-first">
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            placeholder="Enter your first name"
            value={form.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field area-last">
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            placeholder="Enter your last name"
            value={form.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field full area-email">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
          />
          {errors.email && <div className="field-error">{errors.email[0]}</div>}
        </div>

        <div className="form-field full area-password">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            required
          />
          {errors.password && <div className="field-error">{errors.password[0]}</div>}
        </div>

        <div className="form-field area-role">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={form.role} onChange={handleChange}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>

        {/* Student Fields */}
        {form.role === "student" && (
          <>
            <div className="form-field area-school-id">
              <label htmlFor="school_id">School ID</label>
              <input
                id="school_id"
                type="text"
                name="school_id"
                placeholder="Enter your school ID"
                value={form.school_id}
                onChange={handleChange}
              />
            </div>

            <div className="form-field area-course">
              <label htmlFor="course">Course</label>
              <input
                id="course"
                type="text"
                name="course"
                placeholder="Enter your course"
                value={form.course}
                onChange={handleChange}
              />
            </div>

            <div className="form-field area-school-name">
              <label htmlFor="school_name">School Name</label>
              <input
                id="school_name"
                type="text"
                name="school_name"
                placeholder="Enter school name"
                value={form.school_name}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        {/* Faculty Fields */}
        {form.role === "faculty" && (
          <>
            {/* Department removed for faculty as well */}

            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="">-- Select Status --</option>
                <option value="Active">Active</option>
                <option value="On Sabbatical">On Sabbatical</option>
                <option value="Retired">Retired</option>
              </select>
              {errors.status && <div className="field-error">{errors.status[0]}</div>}
            </div>

            <div className="form-field">
              <label htmlFor="courses_handled">Courses Handled</label>
              <input
                id="courses_handled"
                type="text"
                name="courses_handled"
                placeholder="Enter courses handled"
                value={form.courses_handled}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="position">Position</label>
              <input
                id="position"
                type="text"
                name="position"
                placeholder="Enter position"
                value={form.position}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="highest_degree">Highest Degree</label>
              <input
                id="highest_degree"
                type="text"
                name="highest_degree"
                placeholder="Enter highest degree"
                value={form.highest_degree}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="specialization">Specialization</label>
              <input
                id="specialization"
                type="text"
                name="specialization"
                placeholder="Enter specialization"
                value={form.specialization}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="form-field full form-actions area-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
          <button type="button" onClick={goBackToLogin} className="btn-secondary" tabIndex={0}>
            Back to Login
          </button>
        </div>

        {error && <p className="error full">{error}</p>}
          </form>
    </div>
  );
}

// Default export keeps the original page behavior (full-screen register page)
export default function Register() {
  // Render the register page with a centered modal overlay for a formal, focused UX.
  // `RegisterForm` accepts `onClose` to return to login or close the modal.
  const handleClose = () => {
    // fallback navigation to /login when modal closed
    window.location.href = '/login';
  };

  return (
    <div className="login-page fade-in">
      {/* background slideshow (pure CSS driven) */}
      <div className="bg-slideshow" aria-hidden="true">
        <div className="slide" style={{ backgroundImage: "url('/images/main-campus.webp')" }} />
        <div className="slide" style={{ backgroundImage: "url('/images/sjit-cta-group-a-1168x657.webp')" }} />
        <div className="slide" style={{ backgroundImage: "url('/images/SJIT_Sample_Cover_Photo_2.original.png')" }} />
      </div>

      {/* Modal overlay */}
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-content">
          <button className="modal-close" aria-label="Close register" onClick={handleClose}>
            ×
          </button>

          <RegisterForm onClose={handleClose} />
        </div>
      </div>
    </div>
  );
}
