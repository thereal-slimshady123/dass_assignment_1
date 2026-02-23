import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { getEventById, getMerchandiseOrders, approveMerchandiseOrder, rejectMerchandiseOrder } from '../services/AuthAPI';
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
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'orders'

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [expandedProof, setExpandedProof] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'organizer') { navigate('/'); return; }
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

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    setActionMsg('');
    try {
      const res = await getMerchandiseOrders(eventId);
      setOrders(res.data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'orders' && event?.type === 'merchandise') {
      fetchOrders();
    }
  }, [activeTab, event, fetchOrders]);

  const handleApprove = async (orderId) => {
    try {
      await approveMerchandiseOrder(orderId);
      setActionMsg('✅ Order approved! Ticket generated and email sent.');
      fetchOrders();
    } catch (err) {
      setActionMsg('❌ ' + (err.response?.data?.message || 'Approval failed'));
    }
  };

  const handleReject = async (orderId) => {
    if (!rejectReason.trim()) { setActionMsg('Please enter a rejection reason.'); return; }
    try {
      await rejectMerchandiseOrder(orderId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      setActionMsg('Order rejected.');
      fetchOrders();
    } catch (err) {
      setActionMsg('❌ ' + (err.response?.data?.message || 'Rejection failed'));
    }
  };

  const getParticipants = () => allRegistrations.filter(reg => reg.eventId === eventId);

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
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => {
        if (filterStatus === 'attended') return p.attended;
        if (filterStatus === 'pending') return !p.attended;
        return true;
      });
    }
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.participant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.participant?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.participant?.name || '').localeCompare(b.participant?.name || '');
      if (sortBy === 'date') return new Date(b.registeredAt) - new Date(a.registeredAt);
      return 0;
    });
    return filtered;
  };

  const exportCSV = () => {
    const participants = getParticipants();
    const headers = ['Name', 'Email', 'Team', 'Registration Date', 'Attendance'];
    const rows = participants.map(p => [
      p.participant?.name || 'N/A',
      p.participant?.email || 'N/A',
      p.teamName || 'N/A',
      new Date(p.registeredAt || Date.now()).toLocaleDateString(),
      p.attended ? 'Yes' : 'No'
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
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
        <header className={darkMode ? 'user-header-dark' : 'user-header'}><h1>Loading...</h1></header>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={darkMode ? 'user-root-dark' : 'user-root'}>
        <OrganizerNav darkMode={darkMode} />
        <header className={darkMode ? 'user-header-dark' : 'user-header'}><h1>Event Not Found</h1></header>
      </div>
    );
  }

  const analytics = getAnalytics();
  const participants = filterAndSortParticipants();
  const isMerchandise = event.type === 'merchandise';

  const statusColor = { pending: '#d97706', approved: '#059669', rejected: '#dc2626' };
  const statusLabel = { pending: '⏳ Pending', approved: '✅ Approved', rejected: '❌ Rejected' };

  return (
    <div className={darkMode ? 'user-root-dark' : 'user-root'}>
      <OrganizerNav darkMode={darkMode} />

      <header className={darkMode ? 'user-header-dark' : 'user-header'}>
        <h1>{event.eventName}</h1>
        <div className="header-actions">
          <button onClick={() => setDarkMode(!darkMode)} className="small-btn">
            {darkMode ? 'Light' : 'Dark'} Mode
          </button>
          <button onClick={() => navigate('/organizer-dashboard')} className="secondary-btn">Back</button>
        </div>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          {/* Event Overview */}
          <div className="section-card">
            <h3>Event Overview</h3>
            <div className="detail-grid">
              <div><span className="detail-label">Name</span><p>{event.eventName}</p></div>
              <div><span className="detail-label">Type</span><p className="pill">{event.type}</p></div>
              <div><span className="detail-label">Status</span><p className={`badge ${event.status || 'draft'}`}>{event.status || 'Draft'}</p></div>
              <div><span className="detail-label">Eligibility</span><p className="pill">{event.eligibility}</p></div>
              <div><span className="detail-label">Registration Deadline</span><p>{new Date(event.reg_deadline).toLocaleString()}</p></div>
              <div><span className="detail-label">Event Duration</span><p>{new Date(event.event_start).toLocaleString()} – {new Date(event.event_end).toLocaleString()}</p></div>
              <div><span className="detail-label">Registration Fee</span><p>₹{event.reg_fee || 0}</p></div>
              <div><span className="detail-label">{isMerchandise ? 'Stock' : 'Limit'}</span><p>{isMerchandise ? event.stock : event.reg_limit} {isMerchandise ? 'units' : 'slots'}</p></div>
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

          {/* Tab switcher (show Orders tab only for merchandise) */}
          {isMerchandise && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '0' }}>
              <button
                className={activeTab === 'participants' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('participants')}
              >
                👥 Participants
              </button>
              <button
                className={activeTab === 'orders' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('orders')}
              >
                📦 Payment Orders {orders.filter(o => o.status === 'pending').length > 0 && `(${orders.filter(o => o.status === 'pending').length} pending)`}
              </button>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && isMerchandise && (
            <div className="section-card" style={{ marginTop: '0', borderTopLeftRadius: 0 }}>
              <div className="section-title">
                <h3>Payment Orders</h3>
                <button className="small-btn" onClick={fetchOrders}>↻ Refresh</button>
              </div>
              {actionMsg && (
                <p style={{ padding: '10px 14px', borderRadius: '8px', background: actionMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: actionMsg.startsWith('✅') ? '#059669' : '#dc2626', marginBottom: '12px' }}>
                  {actionMsg}
                </p>
              )}
              {ordersLoading ? (
                <p className="muted">Loading orders…</p>
              ) : orders.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: '32px' }}>No orders submitted yet.</p>
              ) : (
                orders.map(order => (
                  <div key={order._id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600 }}>{order.participantName || 'Unknown'}</p>
                        <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: '13px' }}>{order.participantEmail}</p>
                        <p style={{ margin: '0', color: '#9ca3af', fontSize: '12px' }}>Submitted {new Date(order.createdAt).toLocaleString()}</p>
                        {order.status === 'approved' && <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '12px' }}>Ticket: {order.ticketId}</p>}
                        {order.status === 'rejected' && order.rejectionReason && (
                          <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: '12px' }}>Reason: {order.rejectionReason}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{ background: (statusColor[order.status] || '#6b7280') + '22', color: statusColor[order.status] || '#6b7280', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                          {statusLabel[order.status] || order.status}
                        </span>
                        {/* Payment proof thumbnail */}
                        {order.paymentProofImage && (
                          <button
                            className="small-btn"
                            onClick={() => setExpandedProof(expandedProof === order._id ? null : order._id)}
                          >
                            {expandedProof === order._id ? 'Hide Proof' : '🖼 View Proof'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payment proof expanded */}
                    {expandedProof === order._id && order.paymentProofImage && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <img
                          src={order.paymentProofImage}
                          alt="Payment proof"
                          style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                      </div>
                    )}

                    {/* Approve / Reject actions — only for pending orders */}
                    {order.status === 'pending' && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                        {rejectingId === order._id ? (
                          <div>
                            <textarea
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="Enter rejection reason (required)…"
                              rows={2}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button className="primary-btn" style={{ background: '#dc2626', flex: 1 }} onClick={() => handleReject(order._id)}>
                                Confirm Reject
                              </button>
                              <button className="secondary-btn" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="primary-btn" style={{ flex: 1 }} onClick={() => handleApprove(order._id)}>
                              ✅ Approve
                            </button>
                            <button
                              className="secondary-btn"
                              style={{ flex: 1, color: '#dc2626', borderColor: '#dc2626' }}
                              onClick={() => { setRejectingId(order._id); setActionMsg(''); }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Participants Tab (always shown for non-merch, shown when tab = participants for merch) */}
          {activeTab === 'participants' && (
            <div className="section-card" style={isMerchandise ? { marginTop: '0', borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}}>
              <div className="section-title">
                <h3>Participants</h3>
                <button className="small-btn" onClick={exportCSV}>📥 Export CSV</button>
              </div>
              <div className="filter-section">
                <input
                  type="text"
                  placeholder="Search by name, email, or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
                  <option value="all">All Status</option>
                  <option value="attended">Attended</option>
                  <option value="pending">Pending</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
              <div className="table-container">
                <div className="table-header">
                  <span>Name</span><span>Email</span><span>Team</span>
                  <span>Reg Date</span><span>Attendance</span>
                </div>
                {participants.length > 0 ? (
                  participants.map((participant) => (
                    <div key={participant.id} className="table-row">
                      <span>{participant.participant?.name || 'N/A'}</span>
                      <span>{participant.participant?.email || 'N/A'}</span>
                      <span>{participant.teamName || '-'}</span>
                      <span>{new Date(participant.registeredAt || Date.now()).toLocaleDateString()}</span>
                      <span className={`badge ${participant.attended ? 'attended' : 'pending'}`}>
                        {participant.attended ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ padding: '20px', textAlign: 'center' }}>No participants found</p>
                )}
              </div>
            </div>
          )}

          {/* Event Actions */}
          <div className="section-card">
            <h3>Event Actions</h3>
            <div className="button-group">
              <button className="primary-btn" onClick={() => navigate(`/organizer-event/${event.id || event._id}/attendance`)}>
                📷 Scan Attendance
              </button>
              <button className="secondary-btn" onClick={() => navigate(`/organizer-edit-event/${event._id || event.id}`)}>
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
