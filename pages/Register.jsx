import { useState } from "react";
import { apiFetch } from "../api.js";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validateField = (key, value) => {
    switch (key) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (value.trim().length > 50) return "Name must not exceed 50 characters";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "Name must contain only letters and spaces";
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
        if (value.length > 100) return "Email must not exceed 100 characters";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        if (value.length > 50) return "Password must not exceed 50 characters";
        if (!/[a-z]/.test(value)) return "Password must contain lowercase letter";
        if (!/[A-Z]/.test(value)) return "Password must contain uppercase letter";
        if (!/\d/.test(value)) return "Password must contain a digit";
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm password";
        if (value !== form.password) return "Passwords do not match";
        return "";
      case "phone":
        if (!value) return "Phone number is required";
        if (!/^\d{10}$/.test(value)) return "Phone must be exactly 10 digits";
        return "";
      case "emergencyContactName":
        if (!value.trim()) return "Contact name is required";
        if (value.trim().length < 2) return "Contact name must be at least 2 characters";
        if (value.trim().length > 50) return "Contact name must not exceed 50 characters";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "Contact name must contain only letters and spaces";
        return "";
      case "emergencyContactPhone":
        if (!value) return "Contact phone is required";
        if (!/^\d{10}$/.test(value)) return "Contact phone must be exactly 10 digits";
        return "";
      default:
        return "";
    }
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(form).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) errors[key] = error;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone,
        emergencyContact: {
          name: form.emergencyContactName.trim(),
          phone: form.emergencyContactPhone
        }
      };
      
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setMessage("✓ Registration successful! Awaiting admin approval...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="brand-title">🏠 HostelMate</h1>
          <p className="brand-subtitle">Student Hostel Management</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <h2 className="form-title">Create Account</h2>
          
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {message && (
            <div className="alert alert-success">
              <span className="alert-icon">✓</span>
              {message}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={loading}
                className={fieldErrors.name ? "error-input" : ""}
                maxLength="50"
              />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={loading}
                className={fieldErrors.email ? "error-input" : ""}
              />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                placeholder="Min. 6 chars: uppercase, lowercase, digit"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                disabled={loading}
                className={fieldErrors.password ? "error-input" : ""}
                maxLength="50"
              />
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                disabled={loading}
                className={fieldErrors.confirmPassword ? "error-input" : ""}
                maxLength="50"
              />
              {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                id="phone"
                type="tel"
                placeholder="10 digits (e.g., 9876543210)"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className={fieldErrors.phone ? "error-input" : ""}
                maxLength="10"
              />
              {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
            </div>

            <div className="form-group form-group-divider">
              <label className="section-label">Emergency Contact</label>
            </div>

            <div className="form-group">
              <label htmlFor="emergencyName">Contact Name *</label>
              <input
                id="emergencyName"
                type="text"
                placeholder="Parent/Guardian name"
                value={form.emergencyContactName}
                onChange={(e) => update("emergencyContactName", e.target.value)}
                disabled={loading}
                className={fieldErrors.emergencyContactName ? "error-input" : ""}
                maxLength="50"
              />
              {fieldErrors.emergencyContactName && <p className="field-error">{fieldErrors.emergencyContactName}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="emergencyPhone">Contact Phone *</label>
              <input
                id="emergencyPhone"
                type="tel"
                placeholder="10 digits"
                value={form.emergencyContactPhone}
                onChange={(e) => update("emergencyContactPhone", e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className={fieldErrors.emergencyContactPhone ? "error-input" : ""}
                maxLength="10"
              />
              {fieldErrors.emergencyContactPhone && <p className="field-error">{fieldErrors.emergencyContactPhone}</p>}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>

          <div className="form-footer">
            <p>Already have an account? <Link to="/" className="link-primary">Sign In</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
