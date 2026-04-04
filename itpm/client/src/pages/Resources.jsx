import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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

const BookingCalendar = ({ bookings }) => {
  const events = bookings.map((b) => ({
    title: `${b.resourceName} - ${b.studentId?.name || "Student"}`,
    start: new Date(b.start),
    end: new Date(b.end),
    resourceName: b.resourceName,
  }));

  const eventPropGetter = (event) => {
    const backgroundColor = resourceColor[event.resourceName] || "#3b82f6";
    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        border: "none",
        color: "white",
        fontWeight: "500",
        padding: "2px 5px",
      },
    };
  };

  return (
    <Section title="📅 Resource Bookings Calendar">
      <div style={{ height: 600, padding: "20px", backgroundColor: "var(--bg-card, #ffffff)", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }} className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", fontFamily: "inherit" }}
          eventPropGetter={eventPropGetter}
          views={["month", "week", "day"]}
          defaultView="week"
        />
      </div>
    </Section>
  );
};

export default function ResourcesPage() {
  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [prevRole, setPrevRole] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [bookingData, setBookingData] = useState({ start: "", end: "" });
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [res, bkg, me] = await Promise.all([
        apiFetch("/resources"),
        apiFetch("/bookings"),
        apiFetch("/users/me")
      ]);
      
      // Detect role change and reload page
      if (prevRole && prevRole !== me.role) {
        window.location.reload();
        return;
      }
      
      setPrevRole(me.role);
      setUser(me);
      setBookings(bkg);
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

  useEffect(() => {
    if (!prevRole) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [prevRole]);

  const handleBookClick = (resource) => {
    setSelectedResource(resource);
    setBookingError("");
    setBookingData({ start: "", end: "" });
  };

  const validateBooking = (start, end) => {
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
    if (durationMinutes < 15) {
      setBookingError("Booking must be at least 15 minutes");
      return false;
    }
    if (durationMinutes > 120) {
      setBookingError("Booking duration cannot exceed 2 hours");
      return false;
    }
    return true;
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setBookingError("");

    if (!validateBooking(bookingData.start, bookingData.end)) {
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          resourceName: selectedResource.name,
          start: new Date(bookingData.start).toISOString(),
          end: new Date(bookingData.end).toISOString()
        })
      });
      setSelectedResource(null);
      setBookingData({ start: "", end: "" });
      await loadData();
    } catch (err) {
      setBookingError(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const getNextBooking = (resourceName) => {
    const upcoming = bookings
      .filter((b) => b.resourceName === resourceName && new Date(b.end) >= new Date())
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    return upcoming[0] || null;
  };

  const createResource = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/resources", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), active: true })
      });
      e.target.reset();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleResource = async (id, active) => {
    try {
      await apiFetch(`/resources/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-loading">⏳ Loading resources...</div>;

  // Admin view
  if (user && user.role === "admin") {
    return (
      <div className="page">
        <BookingCalendar bookings={bookings} />
        <Section title="Create Resource">
          {error && <div className="alert alert-error">{error}</div>}
          <form className="form-grid" onSubmit={createResource}>
            <div className="form-group">
              <label>🎯 Resource Name *</label>
              <input name="name" placeholder="e.g., Study Room" required />
            </div>
            <button type="submit" className="btn-primary">➕ Add Resource</button>
          </form>
        </Section>

        <Section title="Manage Resources">
          {resources.length === 0 ? (
            <p className="empty">No resources found</p>
          ) : (
            <div className="items-grid">
              {resources.map((r) => (
                <div key={r._id} className="item-card">
                  <h3>{r.name}</h3>
                  <p className="item-qty">Status: {r.active ? "Active" : "Inactive"}</p>
                  <button
                    className={r.active ? "btn-secondary" : "btn-primary"}
                    onClick={() => toggleResource(r._id, !r.active)}
                  >
                    {r.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    );
  }

  // Student view
  const activeResources = resources.filter((r) => r.active !== false);

  return (
    <div className="page">
      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
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

      <Section title="🎯 Book Resources - Quick View">
        {error && <div className="alert alert-error">{error}</div>}
        {activeResources.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📦</p>
            <p className="empty-text">No resources available</p>
          </div>
        ) : (
          <div className="resource-cards-grid">
            {activeResources.map((r) => {
              const upcomingBookings = bookings
                .filter((b) => b.resourceName === r.name && new Date(b.end) >= new Date())
                .sort((a, b) => new Date(a.start) - new Date(b.start));
              
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
                        <p className="status-booked">⏳ Next booking at {new Date(upcomingBookings[0].start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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
                    <p className="form-title">📅 Book This Resource</p>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.target);
                      const start = form.get(`start-${r._id || r.name}`);
                      const end = form.get(`end-${r._id || r.name}`);
                      if (validateBooking(start, end)) {
                        setSelectedResource(r);
                        setBookingData({ start, end });
                        submitBooking({
                          ...e,
                          preventDefault: () => {},
                          target: {
                            reset: () => e.target.reset()
                          }
                        });
                      }
                    }} className="inline-booking-form">
                      <div className="form-row">
                        <div className="form-item">
                          <input 
                            type="datetime-local"
                            name={`start-${r._id || r.name}`}
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
                            name={`end-${r._id || r.name}`}
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
                          {submitting ? "..." : "📅"}
                        </button>
                      </div>
                      {bookingError && selectedResource?.name === r.name && (
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
                </div>
              ))}
          </div>
        )}
      </Section>
      
      <BookingCalendar bookings={bookings} />
    </div>
  );
}
