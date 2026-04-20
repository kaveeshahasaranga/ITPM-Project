import { useState } from "react";
import { apiFetch } from "../api.js";
import { Link } from "react-router-dom";

export default function Recover() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!newPassword.trim()) {
      setError("New password is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase, and digits");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/auth/recover", {
        method: "POST",
        body: JSON.stringify({ 
          email: email.trim(), 
          newPassword 
        })
      });
      setSuccess(res.message || "Password reset successful!");
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>🔐 Reset Password</h1>
          <p>Enter your email and new password to reset</p>
        </div>

 