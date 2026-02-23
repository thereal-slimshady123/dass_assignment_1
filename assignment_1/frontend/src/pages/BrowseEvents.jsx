import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadPreferences } from "../utils/profileStore";
import { getEvents } from "../services/AuthAPI";

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (value = "") => normalize(value).replace(/\s+/g, "");

const toLabel = (value) => {
  if (!value) return "Unknown";
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const subsequenceRatio = (query, text) => {
  if (!query || !text) return 0;
  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i += 1) {
    if (text[i] === query[qi]) qi += 1;
  }
  return qi / query.length;
};

const fuzzyScoreForText = (query, text) => {
  const q = compact(query);
  const t = compact(text);
  if (!q) return 0;
  if (!t) return -1;

  if (t.includes(q)) {
    return 120 - t.indexOf(q);
  }

  const ratio = subsequenceRatio(q, t);
  if (ratio < 0.7) {
    return -1;
  }

  return Math.round(ratio * 80);
};

const getEventSearchScore = (query, event) => {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return 0;

  const fields = [
    event.eventName,
    event.organizer?.name,
    event.description,
    ...(event.event_tags || [])
  ];

  let totalScore = 0;
  for (const token of tokens) {
    const bestForToken = Math.max(...fields.map((field) => fuzzyScoreForText(token, field)), -1);
    if (bestForToken < 0) {
      return -1;
    }
    totalScore += bestForToken;
  }

  return totalScore;
};

const getEventStatus = (event) => {
  const now = new Date();
  const start = new Date(event.event_start);
  const end = new Date(event.event_end);
  if (end < now) return "past";
  if (start > now) return "upcoming";
  return "ongoing";
};

export default function BrowseEvents() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [followedOnly, setFollowedOnly] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const preferences = useMemo(() => loadPreferences(), []);
  const followedClubs = preferences.clubs || [];
  const followedOrganizers = preferences.organizers || [];

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
          setErrorMsg("Could not load events from the server.");
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

  const trending = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.registrations24h || 0) - (a.registrations24h || 0))
      .slice(0, 5);
  }, [events]);

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(events.map((event) => event.type).filter(Boolean)));
    return ["all", ...values];
  }, [events]);

  const eligibilityOptions = useMemo(() => {
    const values = Array.from(new Set(events.map((event) => event.eligibility).filter(Boolean)));
    return ["all", ...values];
  }, [events]);

  const filtered = useMemo(() => {
    const scored = events.map((event) => {
      const searchScore = query.trim() ? getEventSearchScore(query, event) : 0;
      return { event, searchScore };
    });

    const matches = scored.filter(({ event, searchScore }) => {
      const matchQuery = !query.trim() || searchScore >= 0;

      const matchType = typeFilter === "all" || event.type === typeFilter;

      const matchEligibility =
        eligibilityFilter === "all" || event.eligibility === eligibilityFilter;

      const matchStatus = statusFilter === "all" || getEventStatus(event) === statusFilter;

      const matchFollowed =
        !followedOnly ||
        followedClubs.includes(event.organizer?.name) ||
        followedOrganizers.includes(event.organizer?.id);

      const startBoundary = dateStart ? new Date(`${dateStart}T00:00:00`) : null;
      const endBoundary = dateEnd ? new Date(`${dateEnd}T23:59:59`) : null;
      const startOk = !startBoundary || new Date(event.event_start) >= startBoundary;
      const endOk = !endBoundary || new Date(event.event_end) <= endBoundary;

      return matchQuery && matchType && matchEligibility && matchStatus && matchFollowed && startOk && endOk;
    });

    return matches.sort((a, b) => {
      const aEvent = a.event;
      const bEvent = b.event;
      const aFollowed = followedOrganizers.includes(aEvent.organizer?.id) || followedClubs.includes(aEvent.organizer?.name);
      const bFollowed = followedOrganizers.includes(bEvent.organizer?.id) || followedClubs.includes(bEvent.organizer?.name);
      if (aFollowed !== bFollowed) {
        return aFollowed ? -1 : 1;
      }

      if (query.trim() && a.searchScore !== b.searchScore) {
        return b.searchScore - a.searchScore;
      }

      return new Date(aEvent.event_start) - new Date(bEvent.event_start);
    }).map((item) => item.event);
  }, [events, query, typeFilter, eligibilityFilter, statusFilter, dateStart, dateEnd, followedOnly, followedClubs, followedOrganizers]);

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
              placeholder="Fuzzy search events, organizers, tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input"
            />

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Types" : toLabel(option)}
                </option>
              ))}
            </select>

            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
              className="input"
            >
              {eligibilityOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Eligibility" : toLabel(option)}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="past">Past</option>
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
              {followedOnly ? "Followed Sources" : "All Events"}
            </button>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Trending (Top 5 / 24h)</h3>
              <span className="muted">Based on last 24h registrations</span>
            </div>
            <div className="cards">
              {loading && <p className="muted">Loading events...</p>}
              {errorMsg && <p className="message-error">{errorMsg}</p>}
              {!loading && !errorMsg && trending.map((event) => (
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
              {!loading && !errorMsg && filtered.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="card-link">
                  <article className="card">
                    <h4>{event.eventName}</h4>
                    <p className="muted">{event.description}</p>
                    <div className="card-meta">
                      <span className="pill">{event.type}</span>
                      <span className="pill">{event.eligibility}</span>
                      <span className="pill">{getEventStatus(event)}</span>
                      <span className="pill">{event.organizer?.name}</span>
                    </div>
                  </article>
                </Link>
              ))}
              {!loading && !errorMsg && filtered.length === 0 && (
                <p className="muted">No events match the selected filters.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
