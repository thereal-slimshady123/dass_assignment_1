import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadPreferences, toggleFollowedClub, toggleFollowedOrganizer } from "../utils/profileStore";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

export default function ClubsOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [preferences, setPreferences] = useState(() => loadPreferences());

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [organizerRes, clubRes] = await Promise.all([
          axios.get(`${API_BASE}/auth/public-organizers`),
          axios.get(`${API_BASE}/auth/clubs`)
        ]);
        if (isMounted) {
          setOrganizers(organizerRes.data.organizers || []);
          const allClubs = clubRes.data.clubs || [];
          setClubs(allClubs.filter((club) => (club.status || "active") === "active"));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMsg("Could not load clubs/organizers from the server.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleClub = (clubName) => {
    const next = toggleFollowedClub(clubName);
    setPreferences(next);
  };

  const handleToggleOrganizer = (organizerId) => {
    const next = toggleFollowedOrganizer(organizerId);
    setPreferences(next);
  };

  const categoryLabel = (cat) => {
    const labels = { club: 'Club Organizer', council: 'Council Organizer', fest_team: 'Fest Team Organizer' };
    return labels[cat] || cat;
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
              <h3>Clubs</h3>
              <span className="muted">{clubs.length} available</span>
            </div>

            <div className="cards">
              {loading && <p className="muted">Loading clubs...</p>}
              {errorMsg && <p className="message-error">{errorMsg}</p>}
              {!loading && !errorMsg && clubs.map((club) => {
                const isFollowed = (preferences.clubs || []).includes(club.clubName);
                return (
                  <article key={club._id} className="card">
                    <h4>{club.clubName}</h4>
                    <p className="muted">Club</p>
                    <p className="muted">{club.description || "No description available."}</p>
                    <div className="card-actions">
                      <button
                        type="button"
                        className={isFollowed ? "primary-btn" : "small-btn"}
                        onClick={() => handleToggleClub(club.clubName)}
                      >
                        {isFollowed ? "Unfollow Club" : "Follow Club"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Organizers</h3>
              <span className="muted">{organizers.length} available</span>
            </div>

            <div className="cards">
              {loading && <p className="muted">Loading organizers...</p>}
              {errorMsg && <p className="message-error">{errorMsg}</p>}
              {!loading && !errorMsg && organizers.map((org) => {
                const isFollowed = (preferences.organizers || []).includes(org.id);
                return (
                  <article key={org.id} className="card">
                    <h4>{org.name}</h4>
                    <p className="muted">Organizer • {categoryLabel(org.category)}</p>
                    <p className="muted">{org.description || "No description available."}</p>
                    <div className="card-actions">
                      <Link to={`/organizers/${org.id}`} className="small-btn">
                        View Details
                      </Link>
                      <button
                        type="button"
                        className={isFollowed ? "primary-btn" : "small-btn"}
                        onClick={() => handleToggleOrganizer(org.id)}
                      >
                        {isFollowed ? "Unfollow Organizer" : "Follow Organizer"}
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

