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
        department: form.department || undefined,
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
    window.location.href = "/login";
  };

  // Add body class so Register.scss background rules apply, and set inline background as fallback
  React.useEffect(() => {
    document.body.classList.add('register-page');
    return () => {
      document.body.classList.remove('register-page');
      document.body.style.backgroundImage = '';
    };
  }, []);

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

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          {errors.email && <div className="field-error">{errors.email[0]}</div>}
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          {errors.password && <div className="field-error">{errors.password[0]}</div>}
        </div>

        {/* Role Selection */}
        <label>
          Role: {" "}
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
            <label>
              Department:
              <select name="department" value={form.department} onChange={handleChange}>
                <option value="">-- Select Department --</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="History">History</option>
                <option value="Engineering">Engineering</option>
              </select>
              {errors.department && <div className="field-error">{errors.department[0]}</div>}
            </label>
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
            <label>
              Status:
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="">-- Select Status --</option>
                <option value="Active">Active</option>
                <option value="On Sabbatical">On Sabbatical</option>
                <option value="Retired">Retired</option>
              </select>
              {errors.status && <div className="field-error">{errors.status[0]}</div>}
            </label>
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
