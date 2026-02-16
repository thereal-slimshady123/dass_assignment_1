import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadEvents } from "../utils/eventStore";
import { loadPreferences } from "../utils/profileStore";

const normalize = (value) => value.toLowerCase().trim();

const fuzzyMatch = (query, text) => {
  const q = normalize(query).replace(/\s+/g, "");
  const t = normalize(text);
  if (!q) return true;
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) qi += 1;
  }
  return qi === q.length;
};

export default function BrowseEvents() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [followedOnly, setFollowedOnly] = useState(false);

  const events = useMemo(() => loadEvents(), []);
  const preferences = useMemo(() => loadPreferences(), []);
  const followedClubs = preferences.clubs || [];

  const trending = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.registrations24h || 0) - (a.registrations24h || 0))
      .slice(0, 5);
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const matchQuery =
        fuzzyMatch(query, event.eventName) ||
        fuzzyMatch(query, event.organizer?.name || "");

      const matchType = typeFilter === "all" || event.type === typeFilter;

      const matchEligibility =
        eligibilityFilter === "all" || event.eligibility === eligibilityFilter;

      const matchFollowed =
        !followedOnly || followedClubs.includes(event.organizer?.name);

      const startOk = !dateStart || new Date(event.event_start) >= new Date(dateStart);
      const endOk = !dateEnd || new Date(event.event_end) <= new Date(dateEnd);

      return matchQuery && matchType && matchEligibility && matchFollowed && startOk && endOk;
    });
  }, [events, query, typeFilter, eligibilityFilter, dateStart, dateEnd, followedOnly, followedClubs]);

  return (
    <div className="user-root">
      <UserNav />

      <header className="user-header">
        <h1>Browse Events</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="filters">
            <input
              type="search"
              placeholder="Search events or organizers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input"
            />

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
              <option value="all">All Types</option>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise</option>
            </select>

            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Eligibility</option>
              <option value="open">Open</option>
              <option value="iiit">IIIT</option>
              <option value="noniiit">Non-IIIT</option>
            </select>

            <div className="filter-row">
              <label className="filter-label">From</label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="input"
              />
            </div>
            <div className="filter-row">
              <label className="filter-label">To</label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="input"
              />
            </div>

            <button
              type="button"
              className={followedOnly ? "small-btn active" : "small-btn"}
              onClick={() => setFollowedOnly(!followedOnly)}
            >
              {followedOnly ? "Followed Clubs" : "All Events"}
            </button>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Trending (Top 5 / 24h)</h3>
              <span className="muted">Based on last 24h registrations</span>
            </div>
            <div className="cards">
              {trending.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="card-link">
                  <article className="card">
                    <h4>{event.eventName}</h4>
                    <p className="muted">{event.organizer?.name}</p>
                    <p className="pill">{event.type}</p>
                    <p className="muted">{event.registrations24h || 0} joined today</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>All Events</h3>
              <span className="muted">{filtered.length} results</span>
            </div>
            <div className="cards">
              {filtered.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="card-link">
                  <article className="card">
                    <h4>{event.eventName}</h4>
                    <p className="muted">{event.description}</p>
                    <div className="card-meta">
                      <span className="pill">{event.type}</span>
                      <span className="pill">{event.eligibility}</span>
                      <span className="pill">{event.organizer?.name}</span>
                    </div>
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
