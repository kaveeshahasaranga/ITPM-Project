import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function AnnouncementsPage() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const me = await apiFetch("/users/me");
      setUser(me);
      const data = await apiFetch("/announcements");
      setAnnouncements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createAnnouncement = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({ message: form.get("message") })
      });
      e.target.reset();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      {user?.role === "admin" && (
        <Section title="Publish Announcement">
          {error && <p className="error">{error}</p>}
          <form className="form-grid" onSubmit={createAnnouncement}>
            <div className="form-group full-width">
              <label>Message *</label>
              <textarea name="message" placeholder="Announcement message" required></textarea>
            </div>
            <button type="submit" className="btn-primary">Publish</button>
          </form>
        </Section>
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
