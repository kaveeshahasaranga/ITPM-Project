import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";
import { messageService } from "../services/messageService";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [visitorPasses, setVisitorPasses] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [submittingVisitor, setSubmittingVisitor] = useState(false);

  // Messaging State
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const data = await messageService.getMessages();
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadUser = async () => {
    try {
      const [data, exp, passes] = await Promise.all([
        apiFetch("/users/me"),
        apiFetch("/expenses"),
        apiFetch("/visitors/student/passes")
      ]);
      setUser(data);
      setExpenses(exp);
      setVisitorPasses(passes);
      await loadMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageBody.trim()) return;

    try {
      setSendingMessage(true);
      await messageService.sendMessage({ content: messageBody });
      setMessageBody("");
      setSuccess("Message sent to admin!");
      setTimeout(() => setSuccess(""), 3000);
      await loadMessages();
      setShowMessageForm(false);
    } catch (err) {
      setError("Failed to send message: " + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const formatAmount = (value) => {
    if (typeof value !== "number") return "LKR 0.00";
    return `LKR ${value.toFixed(2)}`;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const form = new FormData(e.target);
    const name = form.get("name")?.trim() || "";
    const emergencyName = form.get("emergencyContactName")?.trim() || "";

    // Strip non-digit characters from phone numbers
    const phone = form.get("phone")?.replace(/\D/g, "") || "";
    const emergency = form.get("emergencyContact")?.replace(/\D/g, "") || "";

    // Validate phone numbers are exactly 10 digits
    if (!phone || phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    if (!emergency || emergency.length !== 10) {
      setError("Emergency contact must be exactly 10 digits");
      return;
    }

    if (!name || name.length < 2) {
      setSaving(false);
      setError("Name must be at least 2 characters");
      return;
    }

    if (emergencyName && emergencyName.length < 2) {
      setSaving(false);
      setError("Emergency contact name must be at least 2 characters");
      return;
    }

    try {
      const payload = {
        name,
        phone,
        emergencyContact: emergency,
        emergencyContactName: emergencyName || undefined
      };

      const salaryRaw = form.get("monthlySalary");
      const salary = Number(salaryRaw);
      if (!Number.isNaN(salary) && salary >= 0) {
        payload.monthlySalary = salary;
      }

      const faculty = form.get("faculty")?.trim();
      if (faculty) {
        payload.faculty = faculty;
      }

      const year = form.get("year")?.trim();
      if (year) {
        payload.year = year;
      }

      const visitorNumber = form.get("visitorNumber")?.trim();
      if (visitorNumber) {
        payload.visitorNumber = visitorNumber;
      }

      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentUpdate = async (e) => {
    e.preventDefault();
    setPaymentError("");
    setPaymentSuccess("");
    setPaymentSaving(true);
    const form = new FormData(e.target);
    const walletBalanceRaw = String(form.get("walletBalance") || "");
    const walletBalance = Number(walletBalanceRaw.replace(/[^\d.]/g, ""));
    const cardHolder = form.get("paymentCardHolderName")?.trim() || "";
    const cardBrand = form.get("paymentCardBrand")?.trim() || "";
    const cardNumberRaw = form.get("paymentCardNumber")?.replace(/\D/g, "") || "";

    if (Number.isNaN(walletBalance) || walletBalance < 0) {
      setPaymentSaving(false);
      setPaymentError("Account amount must be a valid number");
      return;
    }

    try {
      const payload = { walletBalance };
      if (cardHolder) payload.paymentCardHolderName = cardHolder;
      if (cardBrand) payload.paymentCardBrand = cardBrand;
      if (cardNumberRaw) payload.paymentCardNumber = cardNumberRaw;

      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setPaymentSuccess("Payment details updated successfully!");
      setTimeout(() => setPaymentSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setPaymentError(err.message || "Failed to update payment details");
    } finally {
      setPaymentSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <div className="page-loading">User not found</div>;

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthlyExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const budget = user.monthlySalary || 0;
  const remaining = budget - totalSpent;

  const addExpense = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          amount: Number(form.get("amount")),
          category: form.get("category"),
          date: form.get("date") ? new Date(form.get("date")).toISOString() : undefined
        })
      });
      e.target.reset();
      await loadUser();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteExpense = async (id) => {
    try {
      await apiFetch(`/expenses/${id}`, { method: "DELETE" });
      await loadUser();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!confirm("Delete this message?")) return;
    try {
      await messageService.deleteMessage(id);
      await loadMessages();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="page">
      <Section title="🔗 Quick Navigation">
        <div className="profile-nav">
          <a href="#profile-overview">Overview</a>
          <a href="#profile-room">Room Info</a>
          <a href="#profile-edit">Edit Profile</a>
          {user.role !== "admin" && <a href="#profile-payment">Payment</a>}
          <a href="#profile-budget">Budget</a>
          <a href="#profile-expense-add">Add Expense</a>
          <a href="#profile-expense-history">Expense History</a>
          <a href="#profile-visitors">Visitor Requests</a>
          <a href="#profile-messages">Messages</a>
        </div>
      </Section>

      <div id="profile-overview">
        <Section title="👤 My Profile">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <div className="profile-card">
            <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <h2>{user.name}</h2>
              <p className="profile-email">{user.email}</p>
              <div className="profile-meta">
                <span className="meta-pill">Role: {user.role === "admin" ? "Admin" : "Student"}</span>
                <span className={`status-pill status-${user.status}`}>{user.status}</span>
              </div>
              {user.role !== "admin" && (
                <div className="profile-meta" style={{ marginTop: 10 }}>
                  <span className="meta-pill">Account: {formatAmount(user.walletBalance || 0)}</span>
                  {user.paymentCard?.last4 && (
                    <span className="meta-pill">Card: {user.paymentCard.brand || "Card"} **** {user.paymentCard.last4}</span>
                  )}
                </div>
              )}
            </div>
            <div className="profile-actions">
              <button className="btn-secondary" onClick={() => document.getElementById("profile-edit")?.scrollIntoView({ behavior: "smooth" })}>
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        </Section>
      </div>

      <div id="profile-room">
        <Section title="🏠 Room Information">
          <div className="room-info">
            <div className="info-item">
              <span className="label">Room:</span>
              <span className="value">{user.roomId?.roomNumber || "Not assigned"}</span>
            </div>
            <div className="info-item">
              <span className="label">Bed:</span>
              <span className="value">{user.bedNumber || "Not assigned"}</span>
            </div>
            <div className="info-item">
              <span className="label">Roommates:</span>
              <span className="value">{user.roommates?.length ? user.roommates.map((m) => m.name).join(", ") : "—"}</span>
            </div>
          </div>
        </Section>
      </div>

      <div id="profile-edit">
        <Section title="✏️ Update Profile">
          <form className="form-grid" onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Full name"
                defaultValue={user.name || ""}
                pattern="[a-zA-Z\s]+"
                title="Name must contain only letters and spaces"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                placeholder="10-digit phone number"
                defaultValue={user.phone || ""}
                pattern="[0-9]{10}"
                maxLength="10"
                required
              />
            </div>
            <div className="form-group">
              <label>Emergency Contact Name *</label>
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Emergency contact name"
                defaultValue={user.emergencyContact?.name || ""}
                pattern="[a-zA-Z\s]+"
                title="Name must contain only letters and spaces"
                required
              />
            </div>
            <div className="form-group">
              <label>Emergency Contact Number *</label>
              <input
                type="tel"
                name="emergencyContact"
                placeholder="Emergency contact number"
                defaultValue={user.emergencyContact?.phone || ""}
                pattern="[0-9]{10}"
                maxLength="10"
                required
              />
            </div>
            <div className="form-group">
              <label>Monthly Salary (Budget) *</label>
              <input
                type="number"
                name="monthlySalary"
                min="0"
                placeholder="e.g., Rs 15000"
                defaultValue={user.monthlySalary || 0}
                required
              />
            </div>
            <div className="form-group">
              <label>Faculty</label>
              <input
                type="text"
                name="faculty"
                placeholder="e.g., Engineering, Arts"
                defaultValue={user.faculty || ""}
              />
            </div>
            <div className="form-group">
              <label>Year</label>
              <input
                type="text"
                name="year"
                placeholder="e.g., 1st, 2nd, 3rd"
                defaultValue={user.year || ""}
              />
            </div>
            <div className="form-group">
              <label>Visitor Number</label>
              <input
                type="text"
                name="visitorNumber"
                placeholder="Your visitor pass number"
                defaultValue={user.visitorNumber || ""}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </Section>
      </div>

      {
        user.role !== "admin" && (
          <div id="profile-payment">
            <Section title="💳 Payment Details">
              {paymentError && <p className="error">{paymentError}</p>}
              {paymentSuccess && <p className="success">{paymentSuccess}</p>}
              <form className="form-grid" onSubmit={handlePaymentUpdate}>
                <div className="form-group">
                  <label>Account Amount (LKR) *</label>
                  <input
                    type="number"
                    name="walletBalance"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={user.walletBalance || 0}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Card Holder Name</label>
                  <input
                    type="text"
                    name="paymentCardHolderName"
                    placeholder="Name on card"
                    defaultValue={user.paymentCard?.holderName || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Card Brand</label>
                  <input
                    type="text"
                    name="paymentCardBrand"
                    placeholder="Visa / MasterCard"
                    defaultValue={user.paymentCard?.brand || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    name="paymentCardNumber"
                    placeholder="Enter card number"
                    inputMode="numeric"
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={paymentSaving}>
                  {paymentSaving ? "Saving..." : "Save Payment Details"}
                </button>
              </form>
            </Section>
          </div>
        )
      }

      <div id="profile-budget">
        <Section title="💰 Monthly Budget Overview">
          <div className="budget-container">
            <div className="budget-circle">
              <svg viewBox="0 0 120 120" className="budget-svg">
                <circle cx="60" cy="60" r="54" className="budget-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  className="budget-progress"
                  style={{
                    strokeDashoffset: 339.29 * (1 - (totalSpent / (budget || 1)))
                  }}
                />
                <text x="60" y="50" textAnchor="middle" className="budget-text">
                  {Math.round((totalSpent / (budget || 1)) * 100)}%
                </text>
                <text x="60" y="70" textAnchor="middle" className="budget-subtext">
                  Spent
                </text>
              </svg>
            </div>
            <div className="budget-stats">
              <div className="stat-item">
                <span className="stat-label">Monthly Budget</span>
                <span className="stat-value">Rs {budget}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Spent (This Month)</span>
                <span className="stat-value">Rs {totalSpent}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Remaining</span>
                <span className="stat-value" style={{ color: remaining > 0 ? "#10b981" : "#ef4444" }}>
                  Rs {remaining}
                </span>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div id="profile-expense-add">
        <Section title="🧾 Add Expense">
          <form className="form-grid" onSubmit={addExpense}>
            <div className="form-group">
              <label>Title *</label>
              <input name="title" placeholder="e.g., Lunch" required />
            </div>
            <div className="form-group">
              <label>Amount *</label>
              <input type="number" name="amount" min="1" placeholder="Amount" required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input name="category" placeholder="Food, Travel, Study" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" name="date" />
            </div>
            <button type="submit" className="btn-primary">Add Expense</button>
          </form>
        </Section>
      </div>

      <div id="profile-expense-history">
        <Section title="📒 Expense History">
          {expenses.length === 0 ? (
            <p className="empty">No expenses recorded</p>
          ) : (
            <div className="items-grid">
              {expenses.map((e) => (
                <div key={e._id} className="item-card">
                  <h3>{e.title}</h3>
                  <p className="item-qty">Amount: {e.amount}</p>
                  {e.category && <p className="item-notes">Category: {e.category}</p>}
                  <p className="item-notes">Date: {new Date(e.date).toLocaleDateString()}</p>
                  <button className="btn-delete" onClick={() => deleteExpense(e._id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div id="profile-visitors">
        <Section title="👥 Visitor Requests">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button
            className="btn-primary visitor-toggle-btn"
            onClick={() => setShowVisitorForm(!showVisitorForm)}
          >
            {showVisitorForm ? "✕ Cancel" : "➕ New Visitor Request"}
          </button>

          {showVisitorForm && (
            <form className="form-grid visitor-form" onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setSuccess("");
              const form = new FormData(e.target);

              // Validation
              const visitorName = form.get("visitorName")?.trim();
              if (!visitorName || visitorName.length < 2) {
                setError("Visitor name must be at least 2 characters");
                return;
              }
              if (!/^[a-zA-Z\s]+$/.test(visitorName)) {
                setError("Visitor name must contain only letters and spaces");
                return;
              }

              const visitDate = form.get("visitDate");
              if (!visitDate) {
                setError("Visit date and time is required");
                return;
              }

              const visitDateTime = new Date(visitDate);
              const now = new Date();
              // Set time to compare properly (remove seconds/milliseconds)
              const visitDateOnly = new Date(visitDateTime.getFullYear(), visitDateTime.getMonth(), visitDateTime.getDate(), visitDateTime.getHours(), visitDateTime.getMinutes());
              const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

              if (visitDateOnly <= nowDateOnly) {
                setError("Visit date and time must be in the future, not in the past");
                return;
              }

              const contact = form.get("contact")?.replace(/\D/g, "");
              if (!contact) {
                setError("Contact number is required");
                return;
              }
              if (contact.length !== 10) {
                setError("Contact number must be exactly 10 digits");
                return;
              }
              if (!/^\d{10}$/.test(contact)) {
                setError("Contact number must contain only digits");
                return;
              }

              const purpose = form.get("purpose")?.trim();
              if (purpose && purpose.length > 200) {
                setError("Purpose must not exceed 200 characters");
                return;
              }

              const idNumber = form.get("idNumber")?.trim();
              if (idNumber && idNumber.length > 20) {
                setError("ID number must not exceed 20 characters");
                return;
              }

              const notes = form.get("notes")?.trim();
              if (notes && notes.length > 500) {
                setError("Notes must not exceed 500 characters");
                return;
              }

              // Build payload with only non-empty fields
              const payload = {
                visitorName,
                visitDate: visitDateTime.toISOString()
              };

              // Only include optional fields if they have values
              if (purpose) payload.purpose = purpose;

              const idType = form.get("idType")?.trim();
              if (idType) payload.idType = idType;

              if (idNumber) payload.idNumber = idNumber;
              if (contact) payload.contact = contact;
              if (notes) payload.notes = notes;

              if (user.room?.roomNumber) {
                payload.roomNumber = user.room.roomNumber;
              }

              setSubmittingVisitor(true);
              apiFetch("/visitors/request", {
                method: "POST",
                body: JSON.stringify(payload)
              }).then(() => {
                setSuccess("✅ Visitor request sent to admin successfully!");
                setTimeout(() => setSuccess(""), 4000);
                e.target.reset();
                setShowVisitorForm(false);
                loadUser();
              }).catch(err => {
                setError("❌ " + (err.message || "Failed to send visitor request"));
                setTimeout(() => setError(""), 4000);
              }).finally(() => setSubmittingVisitor(false));
            }}>
              <div className="form-group">
                <label>Visitor Name *</label>
                <input
                  name="visitorName"
                  placeholder="Full name"
                  maxLength="100"
                  pattern="[a-zA-Z\s]+"
                  title="Name must contain only letters and spaces"
                  required
                />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input
                  name="purpose"
                  placeholder="Meeting/Delivery"
                  maxLength="200"
                />
              </div>
              <div className="form-group">
                <label>Visit Date & Time *</label>
                <input
                  type="datetime-local"
                  name="visitDate"
                  required
                />
              </div>
              <div className="form-group">
                <label>ID Type</label>
                <select name="idType">
                  <option value="">Select ID Type</option>
                  <option value="Aadhar">Aadhar</option>
                  <option value="PAN">PAN</option>
                  <option value="License">License</option>
                  <option value="Passport">Passport</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>ID Number</label>
                <input
                  name="idNumber"
                  placeholder="ID number"
                  maxLength="20"
                />
              </div>
              <div className="form-group">
                <label>Contact Number (10 digits) *</label>
                <input
                  type="tel"
                  name="contact"
                  placeholder="10-digit phone (digits only)"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                  title="Must be exactly 10 digits"
                />
              </div>
              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  placeholder="Additional notes"
                  maxLength="500"
                ></textarea>
              </div>
              <button
                type="submit"
                className="btn-primary visitor-submit-btn"
                disabled={submittingVisitor}
              >
                {submittingVisitor ? "🔄 Sending Request..." : "✉️ Send Request"}
              </button>
            </form>
          )}

          {visitorPasses.length === 0 ? (
            <p className="empty">No visitor passes yet</p>
          ) : (
            <div className="items-grid">
              {visitorPasses.map((p) => (
                <div key={p._id} className="item-card">
                  <h3>{p.visitorName}</h3>
                  <p className="item-qty">Purpose: {p.purpose || "—"}</p>
                  <p className="item-notes">Visit: {new Date(p.visitDate).toLocaleString()}</p>
                  {p.passCode ? (
                    <>
                      <p className="item-qty" style={{ color: "#10b981", fontWeight: "600" }}>Pass: {p.passCode}</p>
                      <span className="badge badge-approved">Pass generated</span>
                    </>
                  ) : (
                    <span className="badge badge-pending">Pending Admin Approval</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div id="profile-messages">
        <Section title="💬 Messages with Admin">
          <button
            className="btn-primary"
            onClick={() => setShowMessageForm(!showMessageForm)}
            style={{ marginBottom: "1rem" }}
          >
            {showMessageForm ? "Cancel Message" : "✍️ Send Message to Admin"}
          </button>

          {showMessageForm && (
            <form onSubmit={handleSendMessage} className="form-grid" style={{ marginBottom: "2rem" }}>
              <div className="form-group full-width">
                <label>Message Content</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message to the admin..."
                  required
                  rows={4}
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={sendingMessage}>
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}

          <div className="messages-list">
            {loadingMessages ? (
              <p>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="empty">No messages yet.</p>
            ) : (
              <div className="items-grid">
                {messages.map((msg) => (
                  <div key={msg._id} className={`item-card ${msg.isStudentToAdmin ? "sent-message" : "received-message"}`} style={{
                    borderLeft: msg.isStudentToAdmin ? "4px solid #3b82f6" : "4px solid #10b981",
                    backgroundColor: msg.isStudentToAdmin ? "#f0f9ff" : "#ecfdf5"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span className="badge" style={{
                        backgroundColor: msg.isStudentToAdmin ? "#3b82f6" : "#10b981",
                        color: "white"
                      }}>
                        {msg.isStudentToAdmin ? "You" : "Admin"}
                      </span>
                      <small>{new Date(msg.createdAt).toLocaleString()}</small>
                    </div>
                    <p>{msg.content}</p>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        marginTop: "0.5rem",
                        padding: 0,
                        textDecoration: "underline",
                        display: "block"
                      }}
                    >
                      Delete
                    </button>
                    {!msg.isStudentToAdmin && !msg.read && (
                      <span style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.5rem", display: "block" }}>New</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
