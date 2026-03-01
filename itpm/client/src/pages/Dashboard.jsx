import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [passwordRecoveries, setPasswordRecoveries] = useState([]);
  const [noticeAlerts, setNoticeAlerts] = useState([]);
  const [studentNotices, setStudentNotices] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [prevRole, setPrevRole] = useState(null);
  const [resettingPassword, setResettingPassword] = useState({});
  const [readingIds, setReadingIds] = useState(new Set());
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      const me = await apiFetch("/users/me");
      
      // Detect role change and reload page
      if (prevRole && prevRole !== me.role) {
        window.location.reload();
        return;
      }
      
      setPrevRole(me.role);
      setUser(me);
      const ann = await apiFetch("/announcements");
      setAnnouncements(ann);
      if (me.role === "admin") {
        const [stats, notifications, notices] = await Promise.all([
          apiFetch("/dashboard/statistics"),
          apiFetch("/notifications?unread=true"),
          apiFetch("/notices")
        ]);
        setAdminStats(stats);
        setStudentNotices(notices);
        const recoveries = notifications.filter(n => n.type === "password-recovery");
        const others = notifications.filter(n => n.type !== "password-recovery");
        setPasswordRecoveries(recoveries);
        setAdminNotifications(others);
      } else if (me.role === "student") {
        const alerts = await apiFetch("/notifications?type=notice&unread=true");
        setNoticeAlerts(alerts);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!prevRole) return;
    // Check for role changes every 5 seconds
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, [prevRole]);

  const resetPassword = async (userId, email) => {
    setResettingPassword(prev => ({ ...prev, [userId]: true }));
    try {
      const result = await apiFetch("/auth/admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ userId })
      });
      const tempNotice = result?.tempPassword ? ` Temporary password: ${result.tempPassword}` : "";
      const emailNotice = result?.emailStatus && result.emailStatus !== "sent"
        ? ` (email ${result.emailStatus})`
        : "";
      setSuccess(`✅ ${result.message}${emailNotice}.${tempNotice}`);
      setTimeout(() => setSuccess(""), 6000);
      await loadDashboard();
    } catch (err) {
      setError("❌ " + (err.message || "Failed to reset password"));
      setTimeout(() => setError(""), 4000);
    } finally {
      setResettingPassword(prev => ({ ...prev, [userId]: false }));
    }
  };

  const deleteRecovery = async (notificationId) => {
    try {
      await apiFetch(`/notifications/${notificationId}`, { method: "DELETE" });
      await loadDashboard();
    } catch (err) {
      setError("❌ " + (err.message || "Failed to delete request"));
      setTimeout(() => setError(""), 4000);
    }
  };

  const deleteAlert = async (notificationId) => {
    try {
      await apiFetch(`/notifications/${notificationId}`, { method: "DELETE" });
      await loadDashboard();
    } catch (err) {
      setError("❌ " + (err.message || "Failed to delete alert"));
      setTimeout(() => setError(""), 4000);
    }
  };

  const markNoticeRead = async (id) => {
    setReadingIds(prev => new Set(prev).add(id));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNoticeAlerts(prev => prev.filter(n => n._id !== id));
      setSuccess("Notice marked as read");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to mark notice as read");
      setTimeout(() => setError(""), 3000);
    } finally {
      setReadingIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const deleteNoticeAlert = async (id) => {
    setReadingIds(prev => new Set(prev).add(id));
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      setNoticeAlerts(prev => prev.filter(n => n._id !== id));
      setSuccess("Notice dismissed");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to delete notice");
      setTimeout(() => setError(""), 3000);
    } finally {
      setReadingIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const deleteStudentNotice = async (noticeId) => {
    try {
      await apiFetch(`/notices/${noticeId}`, { method: "DELETE" });
      setSuccess("Notice removed");
      await loadDashboard();
    } catch (err) {
      setError("❌ " + (err.message || "Failed to delete notice"));
      setTimeout(() => setError(""), 4000);
    }
  };


  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <div className="page-loading">User not found</div>;

  return (
    <div className="page page-dashboard">
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
        {user.role === "admin" && adminStats && (
          <>
            {passwordRecoveries.length > 0 && (
              <Section title="🔐 Password Recovery Requests">
                <div className="items-grid">
                  {passwordRecoveries.map((n) => {
                    const canReset = Boolean(n.createdBy);
                    return (
                    <div key={n._id} className="item-card password-recovery-card">
                      <h3>🔑 {n.title}</h3>
                      <p className="item-notes">{n.message}</p>
                      {!canReset && <p className="error">No matching user found for this request.</p>}
                      <p className="timestamp">{new Date(n.createdAt).toLocaleString()}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button 
                          className="btn-primary"
                          onClick={() => canReset && resetPassword(n.createdBy, n.message.match(/\(([^)]+)\)/)?.[1])}
                          disabled={!canReset || resettingPassword[n.createdBy]}
                        >
                          {!canReset ? "No Account" : (resettingPassword[n.createdBy] ? "🔄 Resetting..." : "🔓 Reset Password")}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => deleteRecovery(n._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </Section>
            )}
            <Section title="🔔 Admin Alerts">
              {adminNotifications.length === 0 ? (
                <p className="empty">No new alerts</p>
              ) : (
                <div className="items-grid">
                  {adminNotifications.map((n) => (
                    <div key={n._id} className="item-card">
                      <h3>{n.title}</h3>
                      <p className="item-notes">{n.message}</p>
                      <p className="item-notes">{new Date(n.createdAt).toLocaleString()}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn-secondary"
                          onClick={() => deleteAlert(n._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            {studentNotices.length > 0 && (
              <Section title="📌 Room Notices Posted by Students">
                <div className="items-grid">
                  {studentNotices.map((n) => (
                    <div key={n._id} className="item-card" style={{ borderLeft: "4px solid #f59e0b" }}>
                      <h3>{n.message.substring(0, 40)}{n.message.length > 40 ? "..." : ""}</h3>
                      <p className="item-notes">By: {n.studentId?.name || "Unknown"}</p>
                      {n.roomId && <p className="item-notes">Room: {n.roomId.roomNumber}</p>}
                      <p className="timestamp">{new Date(n.createdAt).toLocaleString()}</p>
                      <button
                        className="btn-secondary"
                        onClick={() => deleteStudentNotice(n._id)}
                        style={{ marginTop: "0.5rem" }}
                      >
                        🗑️ Remove Notice
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

      <Section title="Welcome">
        <div className="dashboard-welcome-card">
          <div className="welcome-header">
            <div className="welcome-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="welcome-info">
              <h2>Welcome, {user.name}! 👋</h2>
              <p className="welcome-email">{user.email}</p>
              <div className="welcome-meta">
                <span className="meta-badge">Role: <strong>{user.role}</strong></span>
                <span className={`meta-badge status-${user.status}`}>
                  Status: <strong>{user.status}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {user.role === "student" ? (
        <>
          {noticeAlerts.length > 0 && (
            <div className="notice-alert-bar" style={{
              background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
              border: "2px solid #0284c7",
              borderRadius: "12px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.2)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, color: "#000" }}>📌 New Notice Alerts</h3>
                <span style={{
                  background: "#0284c7",
                  color: "white",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "700"
                }}>{noticeAlerts.length} unread</span>
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                maxHeight: "400px",
                overflowY: "auto"
              }}>
                {noticeAlerts.map((n) => (
                  <div key={n._id} style={{
                    background: "white",
                    borderLeft: "4px solid #0284c7",
                    padding: "1rem",
                    borderRadius: "8px",
                    display: "flex",
                    gap: "1rem",
                    flexDirection: "column"
                  }}>
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0", color: "#000" }}>{n.title}</h4>
                      <p style={{ margin: "0.25rem 0", color: "#000", fontSize: "0.9rem" }}>{n.message}</p>
                      <small style={{ color: "#666", fontSize: "0.75rem", marginTop: "0.5rem", display: "block" }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => markNoticeRead(n._id)}
                        disabled={readingIds.has(n._id)}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                      >
                        {readingIds.has(n._id) ? "Marking..." : "✓ Mark as read"}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => deleteNoticeAlert(n._id)}
                        disabled={readingIds.has(n._id)}
                        style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                      >
                        {readingIds.has(n._id) ? "Deleting..." : "🗑️ Dismiss"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Section title="🏠 Room Information">
            <div className="room-info">
              <div className="info-item">
                <span className="label">Room:</span>
                <span className="value">{user.room?.roomNumber || "Not assigned"}</span>
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
        </>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="dashboard-grid">
            <div className="stat-card stat-card-primary">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Students</h3>
                <p className="stat-number">{adminStats?.students.total || 0}</p>
                <p className="stat-detail">
                  {adminStats?.students.approved || 0} approved • {adminStats?.students.pending || 0} pending
                </p>
              </div>
              <button className="stat-action" onClick={() => navigate('/approvals')}>View All →</button>
            </div>

            <div className="stat-card stat-card-warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>Pending Approvals</h3>
                <p className="stat-number">{adminStats?.students.pending || 0}</p>
                <p className="stat-detail">Students awaiting approval</p>
              </div>
              <button className="stat-action" onClick={() => navigate('/approvals')}>Review →</button>
            </div>

            <div className="stat-card stat-card-danger">
              <div className="stat-icon">🔧</div>
              <div className="stat-content">
                <h3>Maintenance</h3>
                <p className="stat-number">{adminStats?.maintenance.pending || 0}</p>
                <p className="stat-detail">
                  {adminStats?.maintenance.inProgress || 0} in progress
                </p>
              </div>
              <button className="stat-action" onClick={() => navigate('/maintenance-admin')}>Manage →</button>
            </div>

            <div className="stat-card stat-card-success">
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <h3>Grocery Requests</h3>
                <p className="stat-number">{adminStats?.grocery.pending || 0}</p>
                <p className="stat-detail">Pending requests</p>
              </div>
              <button className="stat-action" onClick={() => navigate('/grocery-admin')}>Review →</button>
            </div>

            <div className="stat-card stat-card-info">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <h3>Bookings</h3>
                <p className="stat-number">{adminStats?.bookings.upcoming || 0}</p>
                <p className="stat-detail">
                  {adminStats?.bookings.total || 0} total bookings
                </p>
              </div>
              <button className="stat-action" onClick={() => navigate('/bookings')}>View →</button>
            </div>

          </div>

          {/* Maintenance Overview */}
          {adminStats?.maintenance.byCategory && adminStats.maintenance.byCategory.length > 0 && (
            <Section title="🔧 Maintenance by Category">
              <div className="chart-container">
                {adminStats.maintenance.byCategory.map((item) => (
                  <div key={item._id} className="chart-bar">
                    <div className="chart-label">{item._id}</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar-fill" 
                        style={{ width: `${(item.count / adminStats.maintenance.byCategory[0].count) * 100}%` }}
                      >
                        {item.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recent Activity */}
          {adminStats?.recentActivity && (
            <div className="activity-grid">
              <Section title="👥 Recent Students">
                {adminStats.recentActivity.students.length === 0 ? (
                  <p className="empty">No recent students</p>
                ) : (
                  <div className="activity-list">
                    {adminStats.recentActivity.students.map((student) => (
                      <div key={student._id} className="activity-item">
                        <div className="activity-avatar">{student.name.charAt(0)}</div>
                        <div className="activity-content">
                          <p className="activity-title">{student.name}</p>
                          <p className="activity-subtitle">{student.email}</p>
                        </div>
                        <span className={`status-badge status-${student.status}`}>
                          {student.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="🔧 Recent Maintenance">
                {adminStats.recentActivity.maintenance.length === 0 ? (
                  <p className="empty">No recent requests</p>
                ) : (
                  <div className="activity-list">
                    {adminStats.recentActivity.maintenance.map((req) => (
                      <div key={req._id} className="activity-item">
                        <div className="activity-icon">🔧</div>
                        <div className="activity-content">
                          <p className="activity-title">{req.category}</p>
                          <p className="activity-subtitle">{req.studentId?.name || 'Unknown'}</p>
                        </div>
                        <span className={`status-badge status-${req.status.toLowerCase().replace(' ', '-')}`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}


        </>
      )}

      <Section title="Hostel Announcements">
        {announcements.length === 0 ? (
          <p className="empty">No announcements yet</p>
        ) : (
          <ul>
            {announcements.map((a) => (
              <li key={a._id}>{a.message}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
