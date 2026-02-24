import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { getEvents } from '../services/AuthAPI';

const STATUS_CONFIG = {
    draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
    published: { label: 'Published', color: '#2563eb', bg: '#eff6ff' },
    ongoing: { label: 'Ongoing', color: '#d97706', bg: '#fffbeb' },
    completed: { label: 'Completed', color: '#059669', bg: '#f0fdf4' },
    closed: { label: 'Closed', color: '#dc2626', bg: '#fef2f2' },
};

export default function OrganizerAllEvents() {
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await getEvents();
            setEvents(response.data.events || []);
        } catch (err) {
            console.error('Failed to load events:', err);
        } finally {
            setLoading(false);
        }
    };

    const getFiltered = () => {
        let list = [...events];

        if (filterStatus !== 'all') list = list.filter(e => (e.status || 'draft') === filterStatus);

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(e =>
                e.eventName?.toLowerCase().includes(q) ||
                e.description?.toLowerCase().includes(q) ||
                e.type?.toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            if (sortBy === 'name') return (a.eventName || '').localeCompare(b.eventName || '');
            if (sortBy === 'regs') return (b.reg_count || 0) - (a.reg_count || 0);
            return 0;
        });

        return list;
    };

    const counts = {
        all: events.length,
        draft: events.filter(e => (e.status || 'draft') === 'draft').length,
        published: events.filter(e => e.status === 'published').length,
        ongoing: events.filter(e => e.status === 'ongoing').length,
        completed: events.filter(e => e.status === 'completed').length,
        closed: events.filter(e => e.status === 'closed').length,
    };

    const filtered = getFiltered();

    return (
        <div className={darkMode ? 'user-root-dark' : 'user-root'}>
            <OrganizerNav darkMode={darkMode} />

            <header className={darkMode ? 'user-header-dark' : 'user-header'}>
                <div>
                    <h1>All Events</h1>
                    <span className="muted" style={{ fontSize: '13px' }}>{events.length} event{events.length !== 1 ? 's' : ''} total</span>
                </div>
                <div className="header-actions">
                    <button className="primary-btn" onClick={() => navigate('/organizer-create-event')}>+ Create Event</button>
                    <button className="small-btn" onClick={loadEvents} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
                    <button className="small-btn" onClick={() => setDarkMode(d => !d)}>{darkMode ? 'Light' : 'Dark'} Mode</button>
                    <button className="secondary-btn" onClick={() => navigate('/organizer-dashboard')}>← Dashboard</button>
                </div>
            </header>

            <main className="user-main user-main-wide">
                <section className="content">

                    {/* Status filter tabs */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0' }}>
                        {['all', 'draft', 'published', 'ongoing', 'completed', 'closed'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '20px',
                                    border: filterStatus === s ? 'none' : '1px solid #e5e7eb',
                                    background: filterStatus === s
                                        ? (STATUS_CONFIG[s]?.bg || '#f0f4ff')
                                        : (darkMode ? '#2a2a2a' : '#fff'),
                                    color: filterStatus === s
                                        ? (STATUS_CONFIG[s]?.color || '#2563eb')
                                        : (darkMode ? '#fff' : '#374151'),
                                    fontWeight: filterStatus === s ? 700 : 400,
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label} ({counts[s] ?? 0})
                            </button>
                        ))}
                    </div>

                    {/* Search and sort */}
                    <div className="section-card" style={{ marginTop: '0', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                        <div className="filter-section">
                            <input
                                type="text"
                                className="input"
                                placeholder="Search events by name, description, or type…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name">Name A–Z</option>
                                <option value="regs">Most Registrations</option>
                            </select>
                        </div>

                        {loading ? (
                            <p className="muted" style={{ textAlign: 'center', padding: '40px' }}>Loading events…</p>
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <p className="muted" style={{ fontSize: '16px' }}>
                                    {events.length === 0 ? 'No events yet.' : 'No events match your filters.'}
                                </p>
                                {events.length === 0 && (
                                    <button className="primary-btn" style={{ marginTop: '16px' }} onClick={() => navigate('/organizer-create-event')}>
                                        Create Your First Event
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ marginTop: '8px' }}>
                                {/* Table header */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 100px 80px 120px 80px 160px',
                                    gap: '12px',
                                    padding: '10px 16px',
                                    background: darkMode ? '#2a2a2a' : '#f9fafb',
                                    borderRadius: '8px',
                                    marginBottom: '4px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: darkMode ? '#9ca3af' : '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    <span>Event</span>
                                    <span>Status</span>
                                    <span>Type</span>
                                    <span>Deadline</span>
                                    <span>Regs</span>
                                    <span style={{ textAlign: 'right' }}>Actions</span>
                                </div>

                                {filtered.map(event => {
                                    const st = event.status || 'draft';
                                    const sc = STATUS_CONFIG[st] || STATUS_CONFIG.draft;
                                    return (
                                        <div
                                            key={event._id || event.id}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 100px 80px 120px 80px 160px',
                                                gap: '12px',
                                                padding: '14px 16px',
                                                marginBottom: '4px',
                                                background: darkMode ? '#1e1e1e' : '#fff',
                                                borderRadius: '8px',
                                                border: darkMode ? '1px solid #333' : '1px solid #f0f0f0',
                                                alignItems: 'center',
                                                transition: 'box-shadow 0.15s'
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.eventName}
                                                </p>
                                                <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.description?.substring(0, 60)}…
                                                </p>
                                            </div>

                                            <span style={{
                                                display: 'inline-block',
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: sc.bg,
                                                color: sc.color,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {sc.label}
                                            </span>

                                            <span style={{ fontSize: '13px', color: darkMode ? '#d1d5db' : '#374151', textTransform: 'capitalize' }}>
                                                {event.type}
                                            </span>

                                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                {event.reg_deadline
                                                    ? new Date(event.reg_deadline).toLocaleDateString()
                                                    : '—'}
                                            </span>

                                            <span style={{ fontSize: '13px', fontWeight: 500, color: darkMode ? '#d1d5db' : '#374151' }}>
                                                {event.reg_count || 0} / {event.reg_limit}
                                            </span>

                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="small-btn"
                                                    onClick={() => navigate(`/organizer-event/${event._id || event.id}`)}
                                                >
                                                    View
                                                </button>
                                                <button
                                                    className="secondary-btn"
                                                    style={{ fontSize: '13px', padding: '6px 12px' }}
                                                    onClick={() => navigate(`/organizer-edit-event/${event._id || event.id}`)}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
