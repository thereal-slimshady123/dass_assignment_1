import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { getEvents } from "../services/AuthAPI";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export default function OrganizerDetail() {
  const { organizerId } = useParams();
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        // Fetch organizer from User model
        const orgRes = await axios.get(`${API_BASE}/auth/public-organizers`);
        const allOrganizers = orgRes.data.organizers || [];
        const found = allOrganizers.find(o => o.id === organizerId);

        // Fetch events for upcoming/past sections
        const evtRes = await getEvents();

        if (isMounted) {
          setOrganizer(found || null);
          setEvents(evtRes.data.events || []);
          if (!found) setErrorMsg("Organizer not found.");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMsg("Could not load organizer details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [organizerId]);

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

  const categoryLabel = (cat) => {
    const labels = { club: 'Club', council: 'Council', fest_team: 'Fest Team' };
    return labels[cat] || cat;
  };

  if (loading) {
    return (
      <div className="user-root">
        <UserNav />
        <header className="user-header">
          <h1>Loading Organizer...</h1>
        </header>
      </div>
    );
  }

  if (!organizer || errorMsg) {
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
            <p className="muted">{categoryLabel(organizer.category)}</p>
            <p>{organizer.description || "No description available."}</p>
            <p className="muted">Contact: {organizer.email || "N/A"}</p>
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

