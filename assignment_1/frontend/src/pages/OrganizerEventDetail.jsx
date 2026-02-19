import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { getEventById } from '../services/AuthAPI';
import { loadUser, loadRegistrations } from '../utils/profileStore';

export default function OrganizerEventDetail() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const user = useMemo(() => loadUser(), []);
  const allRegistrations = useMemo(() => loadRegistrations(), []);
  
  const [darkMode, setDarkMode] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!user || user.role !== 'organizer') {
      navigate('/');
      return;
    }
    loadEvent();
  }, [eventId, user, navigate]);

  const loadEvent = async () => {
    try {
      const response = await getEventById(eventId);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const getParticipants = () => {
    return allRegistrations.filter(reg => reg.eventId === eventId);
  };

  const getAnalytics = () => {
    const participants = getParticipants();
    return {
      totalRegistrations: participants.length,
      attendance: Math.round((participants.filter(p => p.attended).length / participants.length) * 100) || 0,
      revenue: participants.length * (event?.reg_fee || 0),
      teams: new Set(participants.filter(p => p.teamName).map(p => p.teamName)).size,
      teamsCompleted: participants.filter(p => p.teamComplete).length
    };
  };

  const filterAndSortParticipants = () => {
    let filtered = getParticipants();

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        if (filterStatus === 'attended') return p.attended;
        if (filterStatus === 'pending') return !p.attended;
        return true;
      });
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.participant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.participant?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.participant?.name || '').localeCompare(b.participant?.name || '');
      } else if (sortBy === 'date') {
        return new Date(b.registeredAt) - new Date(a.registeredAt);
      }
      return 0;
    });

    return filtered;
  };

  const exportCSV = () => {
    const participants = getParticipants();
    const headers = ['Name', 'Email', 'Team', 'Registration Date', 'Payment Status', 'Attendance'];
    const rows = participants.map(p => [
      p.participant?.name || 'N/A',
      p.participant?.email || 'N/A',
      p.teamName || 'N/A',
      new Date(p.registeredAt || Date.now()).toLocaleDateString(),
      'Paid',
      p.attended ? 'Yes' : 'No'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.eventName}-participants.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className={darkMode ? 'user-root-dark' : 'user-root'}>
        <OrganizerNav darkMode={darkMode} />
        <header className={darkMode ? 'user-header-dark' : 'user-header'}>
          <h1>Loading...</h1>
        </header>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={darkMode ? 'user-root-dark' : 'user-root'}>
        <OrganizerNav darkMode={darkMode} />
        <header className={darkMode ? 'user-header-dark' : 'user-header'}>
          <h1>Event Not Found</h1>
        </header>
      </div>
    );
  }

  const analytics = getAnalytics();
  const participants = filterAndSortParticipants();

  return (
    <div className={darkMode ? 'user-root-dark' : 'user-root'}>
      <OrganizerNav darkMode={darkMode} />
      
      <header className={darkMode ? 'user-header-dark' : 'user-header'}>
        <h1>{event.eventName}</h1>
        <div className="header-actions">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="small-btn"
          >
            {darkMode ? 'Light' : 'Dark'} Mode
          </button>
          <button 
            onClick={() => navigate('/organizer-dashboard')} 
            className="secondary-btn"
          >
            Back
          </button>
        </div>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          {/* Event Overview */}
          <div className="section-card">
            <h3>Event Overview</h3>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Name</span>
                <p>{event.eventName}</p>
              </div>
              <div>
                <span className="detail-label">Type</span>
                <p className="pill">{event.type}</p>
              </div>
              <div>
                <span className="detail-label">Status</span>
                <p className={`badge ${event.status || 'draft'}`}>{event.status || 'Draft'}</p>
              </div>
              <div>
                <span className="detail-label">Eligibility</span>
                <p className="pill">{event.eligibility}</p>
              </div>
              <div>
                <span className="detail-label">Registration Deadline</span>
                <p>{new Date(event.reg_deadline).toLocaleString()}</p>
              </div>
              <div>
                <span className="detail-label">Event Duration</span>
                <p>{new Date(event.event_start).toLocaleString()} - {new Date(event.event_end).toLocaleString()}</p>
              </div>
              <div>
                <span className="detail-label">Registration Fee</span>
                <p>₹{event.reg_fee || 0}</p>
              </div>
              <div>
                <span className="detail-label">Limit</span>
                <p>{event.reg_limit} slots</p>
              </div>
            </div>
            <p className="muted">{event.description}</p>
          </div>

          {/* Analytics */}
          <div className="stats-grid">
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h4>Total Registrations</h4>
              <p className="stat-number">{analytics.totalRegistrations}</p>
            </div>
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h4>Attendance Rate</h4>
              <p className="stat-number">{analytics.attendance}%</p>
            </div>
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h4>Total Revenue</h4>
              <p className="stat-number">₹{analytics.revenue.toLocaleString()}</p>
            </div>
            <div className={`stat-card ${darkMode ? 'stat-card-dark' : ''}`}>
              <h4>Team Completion</h4>
              <p className="stat-number">{analytics.teamsCompleted}/{analytics.teams}</p>
            </div>
          </div>

          {/* Participants List */}
          <div className="section-card">
            <div className="section-title">
              <h3>Participants</h3>
              <button className="small-btn" onClick={exportCSV}>
                📥 Export CSV
              </button>
            </div>

            {/* Filters and Search */}
            <div className="filter-section">
              <input
                type="text"
                placeholder="Search by name, email, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="attended">Attended</option>
                <option value="pending">Pending</option>
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            {/* Participants Table */}
            <div className="table-container">
              <div className="table-header">
                <span>Name</span>
                <span>Email</span>
                <span>Team</span>
                <span>Reg Date</span>
                <span>Payment</span>
                <span>Attendance</span>
              </div>
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <div key={participant.id} className="table-row">
                    <span>{participant.participant?.name || 'N/A'}</span>
                    <span>{participant.participant?.email || 'N/A'}</span>
                    <span>{participant.teamName || '-'}</span>
                    <span>{new Date(participant.registeredAt || Date.now()).toLocaleDateString()}</span>
                    <span className="badge paid">Paid</span>
                    <span className={`badge ${participant.attended ? 'attended' : 'pending'}`}>
                      {participant.attended ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ padding: '20px', textAlign: 'center' }}>
                  No participants found
                </p>
              )}
            </div>
          </div>

          {/* Event Actions */}
          <div className="section-card">
            <h3>Event Actions</h3>
            <div className="button-group">
              <button className="primary-btn" onClick={() => navigate(`/organizer-edit-event/${event.id}`)}>
                Edit Event
              </button>
              <button className="secondary-btn" onClick={() => navigate('/organizer-dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
