import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

const defaultResources = [
  "Laundry Machine",
  "Study Room",
  "Kitchen Slot",
  "Gym",
  "Music Room",
  "Reading Hall",
  "Projector Room",
  "Table Tennis",
  "Badminton Court",
  "Conference Room",
  "Cleaning",
  "Study",
  "Vacuum",
  "Cleaning Equipment",
  "Vacuum Cleaner",
  "Iron Box",
  "Water Dispenser",
  "Common TV Room",
  "Computer Lab",
  "Seminar Hall",
  "First Aid Kit",
  "Carrom Board"
];

const resourceEmoji = {
  "Laundry Machine": "🧺",
  "Study Room": "📚",
  "Kitchen Slot": "🍳",
  Gym: "🏋️",
  "Music Room": "🎵",
  "Reading Hall": "📖",
  "Projector Room": "🎬",
  "Table Tennis": "🏓",
  "Badminton Court": "🏸",
  "Conference Room": "🧑‍💼",
  Cleaning: "🧹",
  Study: "📚",
  Vacuum: "🧼",
  "Cleaning Equipment": "🧹",
  "Vacuum Cleaner": "🧼",
  "Iron Box": "🧺",
  "Water Dispenser": "🚰",
  "Common TV Room": "📺",
  "Computer Lab": "💻",
  "Seminar Hall": "🎤",
  "First Aid Kit": "🩹",
  "Carrom Board": "🎯"
};

const resourceColor = {
  "Laundry Machine": "#06b6d4",
  "Study Room": "#3b82f6",
  "Kitchen Slot": "#f59e0b",
  Gym: "#ef4444",
  "Music Room": "#8b5cf6",
  "Reading Hall": "#06b6d4",
  "Projector Room": "#ec4899",
  "Table Tennis": "#10b981",
  "Badminton Court": "#f59e0b",
  "Conference Room": "#3b82f6",
  Cleaning: "#6b7280",
  Study: "#3b82f6",
  Vacuum: "#6b7280",
  "Cleaning Equipment": "#6b7280",
  "Vacuum Cleaner": "#6b7280",
  "Iron Box": "#06b6d4",
  "Water Dispenser": "#0ea5e9",
  "Common TV Room": "#ec4899",
  "Computer Lab": "#3b82f6",
  "Seminar Hall": "#8b5cf6",
  "First Aid Kit": "#ef4444",
  "Carrom Board": "#f59e0b"
};

export default function BookingsPage() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [activeResourceError, setActiveResourceError] = useState(null);

  const getResourceKey = (resource) =>
    String(resource._id || resource.name)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase();

  const loadData = async () => {
    try {
      const [bkg, res, me] = await Promise.all([
        apiFetch("/bookings"),
        apiFetch("/resources"),
        apiFetch("/users/me")
      ]);
      setBookings(bkg);
      setUser(me);
      const hasActive = res.some((r) => r.active !== false);
      setResources(hasActive ? res : defaultResources.map((name) => ({ name, active: true })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateBooking = (start, end, resourceName) => {
    if (!start) {
      setBookingError("Start time is required");
      return false;
    }
    const startDate = new Date(start);
    if (startDate < new Date()) {
      setBookingError("Cannot book past dates");
      return false;
    }
    if (!end) {
      setBookingError("End time is required");
      return false;
    }
    const endDate = new Date(end);
    if (endDate <= startDate) {
      setBookingError("End time must be after start time");
      return false;
    }
    const durationMinutes = (endDate - startDate) / (1000 * 60);
    if (durationMinutes <= 0) {
      setBookingError("End time must be after start time");
      return false;
    }
    return true;
  };

  const submitBooking = async (e, resourceName, resourceKey) => {
    e.preventDefault();
    setBookingError("");
    const form = new FormData(e.target);
    const start = form.get(`start-${resourceKey}`);
    const end = form.get(`end-${resourceKey}`);

    if (!validateBooking(start, end, resourceName)) {
      setActiveResourceError(resourceKey);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          resourceName: resourceName,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString()
        })
      });
      e.target.reset();
      setActiveResourceError(null);
      await loadData();
    } catch (err) {
      setBookingError(err.message || "Failed to create booking");
      setActiveResourceError(resourceKey);
    } finally {
      setSubmitting(false);
    }
  };

  const getUpcomingBookings = (resourceName) => {
    return bookings
      .filter((b) => b.resourceName === resourceName && new Date(b.end) >= new Date())
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  };

    const deleteBooking = async (bookingId) => {
      if (!window.confirm("Are you sure you want to delete this booking?")) {
        return;
      }
      try {
        await apiFetch(`/bookings/${bookingId}`, {
          method: "DELETE"
        });
        await loadData();
      } catch (err) {
        setError(err.message || "Failed to delete booking");
      }
    };

  if (loading) return <div className="page-loading">⏳ Loading resources...</div>;

  const activeResources = resources.filter((r) => r.active !== false);

  return (
    <div className="page">
      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🛏️</div>
          <div className="stat-content">
            <p className="stat-value">{activeResources.length}</p>
            <p className="stat-label">Available Resources</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <p className="stat-value">{bookings.filter(b => b.studentId?._id === user?._id || b.studentId === user?._id).length}</p>
            <p className="stat-label">Your Bookings</p>
          </div>
        </div>
      </div>

      <Section title="🛏️ Room & Bed Booking - Available Resources">
        {error && <div className="alert alert-error">{error}</div>}
        {activeResources.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">🛏️</p>
            <p className="empty-text">No resources available</p>
          </div>
        ) : (
          <div className="resource-cards-grid">
            {activeResources.map((r) => {
              const upcomingBookings = getUpcomingBookings(r.name);
              const resourceKey = getResourceKey(r);
              return (
                <div 
                  key={r._id || r.name} 
                  className="resource-card-full"
                  style={{ borderTopColor: resourceColor[r.name] || '#3b82f6' }}
                >
                  {/* Header with emoji and name */}
                  <div className="card-top">
                    <div className="resource-emoji-xl">
                      {resourceEmoji[r.name] || "✅"}
                    </div>
                    <div className="resource-info">
                      <h3>{r.name}</h3>
                      {upcomingBookings.length === 0 ? (
                        <p className="status-available">✨ Available Now</p>
                      ) : (
                        <p className="status-booked">⏳ Next: {new Date(upcomingBookings[0].start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      )}
                    </div>
                  </div>

                  {/* Upcoming bookings timeline */}
                  {upcomingBookings.length > 0 && (
                    <div className="upcoming-bookings">
                      <p className="timeline-title">📅 Upcoming Bookings:</p>
                      {upcomingBookings.slice(0, 3).map((booking, idx) => (
                        <div key={idx} className="booking-slot">
                          <span className="time">
                            {new Date(booking.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(booking.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="booked-by">By: {booking.studentId?.name || "Student"}</span>
                        </div>
                      ))}
                      {upcomingBookings.length > 3 && (
                        <p className="more-bookings">+{upcomingBookings.length - 3} more bookings</p>
                      )}
                    </div>
                  )}

                  {/* Booking form */}
                  <div className="quick-book-form">
                    <p className="form-title">📅 Book This Room</p>
                    <form noValidate onSubmit={(e) => submitBooking(e, r.name, resourceKey)} className="inline-booking-form">
                      <div className="form-row">
                        <div className="form-item">
                          <input 
                            type="datetime-local"
                            name={`start-${resourceKey}`}
                            placeholder="Start"
                            min={new Date().toISOString().slice(0, 16)}
                            required
                            disabled={submitting}
                            className="form-input"
                          />
                        </div>
                        <div className="form-item">
                          <input 
                            type="datetime-local"
                            name={`end-${resourceKey}`}
                            placeholder="End"
                            min={new Date().toISOString().slice(0, 16)}
                            required
                            disabled={submitting}
                            className="form-input"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="btn-book"
                          disabled={submitting}
                        >
                          {submitting ? "..." : "📅 Book"}
                        </button>
                      </div>
                      {bookingError && activeResourceError === resourceKey && (
                        <p className="booking-error">{bookingError}</p>
                      )}
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="📋 Your Bookings">
        {bookings.filter(b => b.studentId?._id === user?._id || b.studentId === user?._id).length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📅</p>
            <p className="empty-text">No bookings yet</p>
            <p className="empty-subtext">Book a resource from the quick view cards above</p>
          </div>
        ) : (
          <div className="my-bookings-grid">
            {bookings
              .filter(b => b.studentId?._id === user?._id || b.studentId === user?._id)
              .sort((a, b) => new Date(b.start) - new Date(a.start))
              .map((b) => (
                <div key={b._id} className="my-booking-card">
                  <div className="booking-badge">
                    <span className="emoji">{resourceEmoji[b.resourceName] || "✅"}</span>
                    <h3>{b.resourceName}</h3>
                  </div>
                  <div className="booking-details">
                    <p className="booking-date">📅 {new Date(b.start).toLocaleDateString()}</p>
                    <p className="booking-slot">🕒 {new Date(b.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(b.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <button 
                    className="btn-delete"
                    onClick={() => deleteBooking(b._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
          </div>
        )}
      </Section>
    </div>
  );
}
