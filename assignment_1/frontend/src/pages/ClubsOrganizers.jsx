import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadPreferences, toggleFollowedClub } from "../utils/profileStore";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

export default function ClubsOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [preferences, setPreferences] = useState(() => loadPreferences());

  useEffect(() => {
    let isMounted = true;
    const fetchOrganizers = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/public-organizers`);
        if (isMounted) {
          setOrganizers(response.data.organizers || []);
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
    fetchOrganizers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = (clubName) => {
    const next = toggleFollowedClub(clubName);
    setPreferences(next);
  };

  const categoryLabel = (cat) => {
    const labels = { club: 'Club', council: 'Council', fest_team: 'Fest Team' };
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
                    <p className="muted">{categoryLabel(org.category)}</p>
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

