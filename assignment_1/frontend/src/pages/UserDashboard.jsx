import { useEffect, useMemo, useState } from "react";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadRegistrations } from "../utils/eventStore";
import { loadUser } from "../utils/profileStore";
import { getEvents } from "../services/AuthAPI";

const tabs = ["Normal", "Merchandise", "Completed", "Cancelled/Rejected"];

export default function UserDashboard() {
  const user = useMemo(() => loadUser(), []);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Normal");
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const response = await getEvents();
        if (isMounted) {
          setEvents(response.data.events || []);
        }
      } catch (error) {
        if (isMounted) {
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const registrations = useMemo(() => {
    const list = loadRegistrations();
    const now = new Date();
    return list.map((record) => {
      const event = events.find((item) => item.id === record.eventId);
      const end = event ? new Date(event.event_end) : null;
      let status = record.status || "Registered";
      if (status === "Registered" && end && end < now) {
        status = "Completed";
      }
      return { ...record, status, eventType: event?.type || record.eventType };
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return registrations.filter((record) => {
      const event = events.find((item) => item.id === record.eventId);
      if (!event) return false;
      return new Date(event.event_start) > now && record.status === "Registered";
    });
  }, [registrations, events]);

  const history = useMemo(() => {
    return registrations.filter((record) => {
      if (activeTab === "Normal") return record.eventType === "normal";
      if (activeTab === "Merchandise") return record.eventType === "merchandise";
      if (activeTab === "Completed") return record.status === "Completed";
      return record.status === "Cancelled" || record.status === "Rejected";
    });
  }, [registrations, activeTab]);

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ""}</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <div className="section-title">
              <h3>Upcoming Events</h3>
              <span className="muted">{upcomingEvents.length} registered</span>
            </div>
            <div className="cards">
              {upcomingEvents.length ? (
                upcomingEvents.map((record) => (
                  <article key={record.id} className="card">
                    <h4>{record.eventName}</h4>
                    <p className="muted">{record.organizer}</p>
                    <p className="pill">{record.eventType}</p>
                    <p className="muted">
                      {new Date(record.schedule.start).toLocaleString()} - {new Date(record.schedule.end).toLocaleString()}
                    </p>
                  </article>
                ))
              ) : (
                <p className="muted">{loading ? "Loading events..." : "No upcoming events yet."}</p>
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Participation History</h3>
              <div className="tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "tab active" : "tab"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="table">
              <div className="table-header">
                <span>Event</span>
                <span>Type</span>
                <span>Organizer</span>
                <span>Status</span>
                <span>Team</span>
                <span>Ticket</span>
              </div>
              {history.length ? (
                history.map((record) => (
                  <div key={record.id} className="table-row">
                    <span>{record.eventName}</span>
                    <span>{record.eventType}</span>
                    <span>{record.organizer}</span>
                    <span>{record.status}</span>
                    <span>{record.teamName || "-"}</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelectedTicket(record)}
                    >
                      {record.id}
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted">No records in this category.</p>
              )}
            </div>
          </div>
        </section>

        {selectedTicket && (
          <aside className="ticket-panel">
            <div className="section-card">
              <div className="section-title">
                <h3>Ticket Details</h3>
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </button>
              </div>
              <div className="ticket">
                <img src={selectedTicket.qr} alt="Ticket QR" className="ticket-qr" />
                <div>
                  <h4>{selectedTicket.eventName}</h4>
                  <p className="muted">{selectedTicket.organizer}</p>
                  <p className="muted">Ticket ID: {selectedTicket.id}</p>
                  <p className="muted">Participant: {selectedTicket.participant?.name}</p>
                  <p className="muted">Email: {selectedTicket.participant?.email}</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
