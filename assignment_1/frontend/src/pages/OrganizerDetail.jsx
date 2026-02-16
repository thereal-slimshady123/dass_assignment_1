import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadEvents } from "../utils/eventStore";

export default function OrganizerDetail() {
  const { organizerId } = useParams();
  const [events] = useState(() => loadEvents());

  const organizer = useMemo(() => {
    return events.find((event) => event.organizer?.id === organizerId)?.organizer;
  }, [events, organizerId]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events.filter(
      (event) => event.organizer?.id === organizerId && new Date(event.event_start) >= now
    );
  }, [events, organizerId]);

  const pastEvents = useMemo(() => {
    const now = new Date();
    return events.filter(
      (event) => event.organizer?.id === organizerId && new Date(event.event_end) < now
    );
  }, [events, organizerId]);

  if (!organizer) {
    return (
      <div className="user-root">
        <UserNav />
        <header className="user-header">
          <h1>Organizer Not Found</h1>
        </header>
      </div>
    );
  }

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>{organizer.name}</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <h3>Organizer Info</h3>
            <p className="muted">{organizer.category}</p>
            <p>{organizer.description}</p>
            <p className="muted">Contact: {organizer.email}</p>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Upcoming Events</h3>
              <span className="muted">{upcomingEvents.length} events</span>
            </div>
            <div className="cards">
              {upcomingEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="card-link">
                  <article className="card">
                    <h4>{event.eventName}</h4>
                    <p className="muted">{new Date(event.event_start).toLocaleString()}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Past Events</h3>
              <span className="muted">{pastEvents.length} events</span>
            </div>
            <div className="cards">
              {pastEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="card-link">
                  <article className="card">
                    <h4>{event.eventName}</h4>
                    <p className="muted">{new Date(event.event_end).toLocaleString()}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
