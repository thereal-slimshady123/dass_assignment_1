import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadPreferences, toggleFollowedClub } from "../utils/profileStore";
import { getEvents } from "../services/AuthAPI";

export default function ClubsOrganizers() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [preferences, setPreferences] = useState(() => loadPreferences());

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
          setErrorMsg("Could not load organizers from the server.");
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

  const organizers = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      if (event.organizer?.id) {
        map.set(event.organizer.id, event.organizer);
      }
    });
    return Array.from(map.values());
  }, [events]);

  const handleToggle = (clubName) => {
    const next = toggleFollowedClub(clubName);
    setPreferences(next);
  };

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>Clubs & Organizers</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <div className="section-title">
              <h3>All Approved Organizers</h3>
              <span className="muted">{organizers.length} available</span>
            </div>

            <div className="cards">
              {loading && <p className="muted">Loading organizers...</p>}
              {errorMsg && <p className="message-error">{errorMsg}</p>}
              {!loading && !errorMsg && organizers.map((org) => {
                const isFollowed = (preferences.clubs || []).includes(org.name);
                return (
                  <article key={org.id} className="card">
                    <h4>{org.name}</h4>
                    <p className="muted">{org.category || "Organizer"}</p>
                    <p className="muted">{org.description || "No description available."}</p>
                    <div className="card-actions">
                      <Link to={`/organizers/${org.id}`} className="small-btn">
                        View Details
                      </Link>
                      <button
                        type="button"
                        className={isFollowed ? "primary-btn" : "small-btn"}
                        onClick={() => handleToggle(org.name)}
                      >
                        {isFollowed ? "Unfollow" : "Follow"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
