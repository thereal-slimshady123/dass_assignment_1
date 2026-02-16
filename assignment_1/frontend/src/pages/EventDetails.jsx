import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { addRegistration, loadEvents, updateEventOnRegister } from "../utils/eventStore";
import { loadUser } from "../utils/profileStore";

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState(() => loadEvents());
  const [teamName, setTeamName] = useState("");
  const [msg, setMsg] = useState("");

  const event = useMemo(
    () => events.find((item) => item.id === eventId),
    [events, eventId]
  );

  if (!event) {
    return (
      <div className="user-root">
        <UserNav />
        <header className="user-header">
          <h1>Event Not Found</h1>
        </header>
      </div>
    );
  }

  const now = new Date();
  const deadlinePassed = new Date(event.reg_deadline) < now;
  const outOfStock = event.type === "merchandise"
    ? (event.stock ?? 0) <= 0
    : (event.reg_limit ?? 0) <= 0;

  const handleRegister = () => {
    setMsg("");
    if (deadlinePassed || outOfStock) {
      setMsg("Registration is closed for this event.");
      return;
    }

    const user = loadUser();
    if (!user) {
      setMsg("Please log in to register.");
      return;
    }

    addRegistration({ event, user, teamName });
    const updated = updateEventOnRegister(events, event.id);
    setEvents(updated);

    setMsg(
      event.type === "merchandise"
        ? `Purchase complete. Confirmation email sent to ${user.email || "your email"}.`
        : `Registered successfully. Confirmation email sent to ${user.email || "your email"}.`
    );

    setTimeout(() => navigate("/user"), 500);
  };

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>{event.eventName}</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <h3>Event Details</h3>
            <p className="muted">{event.description}</p>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Type</span>
                <p className="pill">{event.type}</p>
              </div>
              <div>
                <span className="detail-label">Eligibility</span>
                <p className="pill">{event.eligibility}</p>
              </div>
              <div>
                <span className="detail-label">Organizer</span>
                <p>{event.organizer?.name}</p>
              </div>
              <div>
                <span className="detail-label">Schedule</span>
                <p>
                  {new Date(event.event_start).toLocaleString()} - {new Date(event.event_end).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="detail-meta">
              <span className="pill">Deadline: {new Date(event.reg_deadline).toLocaleString()}</span>
              {event.type === "merchandise" ? (
                <span className="pill">Stock: {event.stock ?? 0}</span>
              ) : (
                <span className="pill">Slots left: {event.reg_limit ?? 0}</span>
              )}
              <span className="pill">Fee: {event.reg_fee ? `INR ${event.reg_fee}` : "Free"}</span>
            </div>

            {event.type === "normal" && (
              <div className="form-row">
                <label className="filter-label" htmlFor="teamName">Team Name (optional)</label>
                <input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input"
                  placeholder="Enter team name"
                />
              </div>
            )}

            {msg && <p className="message-success">{msg}</p>}

            {deadlinePassed && <p className="message-error">Registration deadline has passed.</p>}
            {outOfStock && <p className="message-error">Registrations or stock are exhausted.</p>}

            <button
              type="button"
              className="primary-btn"
              onClick={handleRegister}
              disabled={deadlinePassed || outOfStock}
            >
              {event.type === "merchandise" ? "Purchase & Get Ticket" : "Register Now"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
