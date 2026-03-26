import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function VisitorsPage() {
  const [user, setUser] = useState(null);
  const [passes, setPasses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [readingIds, setReadingIds] = useState(new Set());
  const [prevRole, setPrevRole] = useState(null);

  const loadData = async () => {
    try {
      const me = await apiFetch("/users/me");
      
      // Detect role change and reload page
      if (prevRole && prevRole !== me.role) {
        window.location.reload();
        return;
      }
      
      setPrevRole(me.role);
      setUser(me);
      if (me.role !== "admin") {
        setLoading(false);
        return;
      }
      const [data, notes] = await Promise.all([
        apiFetch("/visitors"),
        apiFetch("/notifications?unread=true")
      ]);
      setPasses(data);
      // Filter for visitor-request type notifications
      setNotifications(notes.filter(n => n.type === "visitor-request"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!prevRole) return;
    // Check for role changes every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [prevRole]);


  const deletePass = async (id) => {
    try {
      await apiFetch(`/visitors/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const approvePass = async (id) => {
    try {
      await apiFetch(`/visitors/${id}/approve`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const markNotificationRead = async (id) => {
    setReadingIds(prev => new Set(prev).add(id));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.filter(n => n._id !== id));
      setSuccess("Notification marked as read");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setReadingIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const markAllRead = async () => {
    const allIds = notifications.map(n => n._id);
    setReadingIds(new Set(allIds));
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications([]);
      setSuccess(`${allIds.length} notification${allIds.length !== 1 ? 's' : ''} marked as read`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setReadingIds(new Set());
    }
  };


  if (loading) return <div className="page-loading">Loading...</div>;

  if (user && user.role !== "admin") {
    return (
      <div className="page">
        <Section title="Access Restricted">
          <p className="error">Admin access required.</p>
        </Section>
      </div>
    );
  }

  return (
    <div className="page">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <Section title="Admin Notifications">
        {notifications.length === 0 ? (
          <p className="empty">No new visitor requests</p>
        ) : (
          <>
            <div className="notification-header">
              <span className="notification-badge">{notifications.length} unread</span>
              <button 
                className="btn-secondary" 
                onClick={markAllRead}
                disabled={readingIds.size > 0}
              >
                {readingIds.size > 0 ? "Marking..." : "Mark all as read"}
              </button>
            </div>
            <div className="items-grid">
              {notifications.map((n) => (
                <div key={n._id} className="item-card notification-card unread">
                  <div className="notification-indicator"></div>
                  <h3>{n.title}</h3>
                  <p className="item-notes">{n.message}</p>
                  <p className="timestamp">{new Date(n.createdAt).toLocaleString()}</p>
                  <button 
                    className="btn-secondary" 
                    onClick={() => markNotificationRead(n._id)}
                    disabled={readingIds.has(n._id)}
                  >
                    {readingIds.has(n._id) ? "Marking..." : "✓ Mark as read"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Visitor Passes">
        {passes.length === 0 ? (
          <p className="empty">No visitor passes yet</p>
        ) : (
          <div className="items-grid">
            {passes.map((p) => (
              <div key={p._id} className="item-card">
                <h3>{p.visitorName}</h3>
                <p className="item-qty">Pass: {p.passCode || "Pending"}</p>
                {p.purpose && <p className="item-notes">Purpose: {p.purpose}</p>}
                <p className="item-notes">Visit: {new Date(p.visitDate).toLocaleString()}</p>
                {(p.studentId || p.roomNumber) && (
                  <p className="item-notes">
                    {p.studentId?.name ? `Student: ${p.studentId.name}` : ""} {p.roomNumber ? `• Room ${p.roomNumber}` : ""}
                  </p>
                )}
                {p.idType && <p className="item-notes">ID: {p.idType} {p.idNumber ? `- ${p.idNumber}` : ""}</p>}
                {p.contact && <p className="item-notes">Contact: {p.contact}</p>}
                {p.passCode ? (
                  <span className="badge badge-approved">Pass generated</span>
                ) : (
                  <button className="btn-primary" onClick={() => approvePass(p._id)}>
                    Generate Pass
                  </button>
                )}
                <button className="btn-delete" onClick={() => deletePass(p._id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
