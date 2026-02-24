import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { getMyEvents } from '../services/AuthAPI';
import { loadUser } from '../utils/profileStore';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => loadUser(), []);
  const [darkMode, setDarkMode] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'organizer') {
      navigate('/');
      return;
    }

    loadOrganizerEvents();

    // Refresh data when window gains focus
    const handleFocus = () => {
      loadOrganizerEvents();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, navigate]);

  const loadOrganizerEvents = async () => {
    try {
      setLoading(true);
      const response = await getMyEvents();
      setEvents(response.data.events || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventStats = () => {
    const totalRegistrations = events.reduce((sum, e) => sum + (e.reg_count || 0), 0);
    const totalRevenue = events.reduce((sum, e) => sum + ((e.reg_count || 0) * (e.reg_fee || 0)), 0);
    const totalAttendance = events.reduce(
      (sum, e) => sum + (e.attendance_count || e.attendance || e.reg_count || 0),
      0
    );

    const stats = {
      total: events.length,
      draft: events.filter(e => e.status === 'draft').length,
      published: events.filter(e => e.status === 'published').length,
      ongoing: events.filter(e => e.status === 'ongoing').length,
      closed: events.filter(e => e.status === 'closed').length,
      totalRegistrations,
      totalRevenue,
      totalAttendance
    };
    return stats;
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);

  const stats = getEventStats();
  const displayEvents = events.slice(carouselIndex, Math.min(carouselIndex + 3, events.length));

  const handlePrevCarousel = () => {
    setCarouselIndex(Math.max(0, carouselIndex - 1));
  };

  const handleNextCarousel = () => {
    setCarouselIndex(Math.min(events.length - 3, carouselIndex + 1));
  };

  return (
    <div className={darkMode ? 'user-root-dark' : 'user-root'}>
      <OrganizerNav darkMode={darkMode} />

      <header className={darkMode ? 'user-header-dark' : 'user-header'}>
        <div>
          <h1>Organizer Dashboard</h1>
          {lastUpdated && (
            <span className="muted" style={{ fontSize: '12px' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button
            onClick={loadOrganizerEvents}
            className="small-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="small-btn"
          >
            {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h3>Total Events</h3>
              <p className="stat-number">{stats.total}</p>
            </div>
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h3>Event Status</h3>
              <p className="stat-detail">
                {stats.published} Published • {stats.ongoing} Ongoing • {stats.closed} Closed
              </p>
            </div>
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h3>Total Registrations</h3>
              <p className="stat-number">{stats.totalRegistrations}</p>
              <p className="stat-detail">Attendance: {stats.totalAttendance}</p>
            </div>
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h3>Total Revenue</h3>
              <p className="stat-number">{formatCurrency(stats.totalRevenue)}</p>
              <p className="stat-detail">Based on registrations × entry fee</p>
            </div>
          </div>

          {/* Events Carousel */}
          <div className="section-card">
            <div className="section-title">
              <h3>Your Events</h3>
              <span className="muted">{events.length} total events</span>
            </div>

            {loading ? (
              <p className="muted">Loading your events...</p>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p className="muted">No events created yet</p>
                <button
                  className="primary-btn"
                  onClick={() => navigate('/organizer-create-event')}
                  style={{ marginTop: '15px' }}
                >
                  Create Your First Event
                </button>
              </div>
            ) : (
              <>
                <div className="cards">
                  {displayEvents.map((event) => (
                    <div
                      key={event._id || event.id}
                      className="card"
                      onClick={() => navigate(`/organizer-event/${event._id || event.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <h4>{event.eventName}</h4>
                      <span className="muted" style={{ fontSize: '12px' }}>
                        {event.status || 'draft'}
                      </span>
                      <p className="muted">{event.description?.substring(0, 100)}...</p>
                      <div className="card-meta">
                        <span>{event.type}</span>
                        <span>{event.reg_count || 0} registrations</span>
                        <span>₹{event.reg_fee || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="carousel-controls">
                  <button
                    className="carousel-btn"
                    onClick={handlePrevCarousel}
                    disabled={carouselIndex === 0}
                  >
                    ← Previous
                  </button>
                  <span style={{ color: 'var(--muted)' }}>
                    {carouselIndex + 1} - {Math.min(carouselIndex + 3, events.length)} of {events.length}
                  </span>
                  <button
                    className="carousel-btn"
                    onClick={handleNextCarousel}
                    disabled={carouselIndex + 3 >= events.length}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="section-card">
            <h3>Quick Actions</h3>
            <div className="button-group">
              <button
                className="primary-btn"
                onClick={() => navigate('/organizer-create-event')}
              >
                + Create New Event
              </button>
              <button
                className="secondary-btn"
                onClick={() => navigate('/organizer-all-events')}
              >
                View All Events
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
