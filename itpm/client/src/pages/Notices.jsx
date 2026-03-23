import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function NoticesPage() {
  const [user, setUser] = useState(null);
  const [notices, setNotices] = useState([]);
  const [noticeAlerts, setNoticeAlerts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [readingIds, setReadingIds] = useState(new Set());

  const loadNotices = async () => {
    setLoading(true);
    try {
      const me = await apiFetch("/users/me");
      setUser(me);
      const data = await apiFetch("/notices");
      setNotices(data);
      if (me.role === "student") {
        const alerts = await apiFetch("/notifications?type=notice&unread=true");
        setNoticeAlerts(alerts);
      } else {
        setNoticeAlerts([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const submitNotice = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const message = form.get("message").trim();
    
    if (message.length < 3) {
      setError("Message must be at least 3 characters");
      return;
    }

    try {
      await apiFetch("/notices", {
        method: "POST",
        body: JSON.stringify({ message })
      });
      e.target.reset();
      await loadNotices();
    } catch (err) {
      setError(err.message);
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
      setSuccess("Notice deleted");
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

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      {success && <div className="alert alert-success">{success}</div>}
      <Section title="📌 Post to Notice Board">
        {error && <p className="error">{error}</p>}
        <form className="form-grid" onSubmit={submitNotice}>
          <div className="form-group full-width">
            <label>Message *</label>
            <textarea
              name="message"
              placeholder="Post a notice for all students (cleaning schedule, guests, reminders, etc.)"
              minLength="3"
              required
            ></textarea>
          </div>
          <button type="submit" className="btn-primary">Post Notice</button>
        </form>
      </Section>

      <Section title="Notice Board">
        {notices.length === 0 ? (
          <p className="empty">No notices yet</p>
        ) : (
          <div className="notices-list">
            {notices.map((n) => (
              <div key={n._id} className="notice-card">
                <p>{n.message}</p>
                {(n.studentId?.name || n.roomId?.roomNumber) && (
                  <small className="notice-time">
                    {n.studentId?.name ? `By ${n.studentId.name}` : ""}
                    {n.roomId?.roomNumber ? ` • Room ${n.roomId.roomNumber}` : ""}
                  </small>
                )}
                <small className="notice-time">{new Date(n.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
