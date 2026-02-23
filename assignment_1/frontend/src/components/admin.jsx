import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { createOrganizer, deleteOrganizer, addClub, deleteClub, addEvent, deleteEvent, getAllOrganizers, getAllClubs, updateOrganizerStatus, updateClubStatus, getPasswordResetRequests, clearPasswordResetRequest, getPasswordChangeRequests, approvePasswordChangeRequest, rejectPasswordChangeRequest } from '../services/AuthAPI.js';
import './user.css';

export default function Admin() {
    const [darkMode, setDarkMode] = useState(true);
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const navigate = useNavigate();

    // Data states
    const [organizers, setOrganizers] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [passwordResetRequests, setPasswordResetRequests] = useState([]);
    const [passwordChangeRequests, setPasswordChangeRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [latestApprovedCredentials, setLatestApprovedCredentials] = useState(null);

    // Management states
    const [managementTab, setManagementTab] = useState('organizers'); // 'organizers' or 'clubs'
    const [showAddForm, setShowAddForm] = useState(false);

    // Form states
    const [organizerForm, setOrganizerForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        organizerCategory: 'club',
        autoGenerate: true
    });

    const [clubForm, setClubForm] = useState({
        clubName: '',
        description: ''
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) setUser(JSON.parse(raw));
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        if (currentView === 'manage') {
            fetchOrganizers();
            fetchClubs();
        } else if (currentView === 'password-reset') {
            fetchPasswordResetRequests();
            fetchPasswordChangeRequests();
        } else if (currentView === 'dashboard') {
            fetchOrganizers();
            fetchClubs();
            fetchPasswordResetRequests();
            fetchPasswordChangeRequests();
        }
    }, [currentView]);

    const fetchOrganizers = async () => {
        try {
            const response = await getAllOrganizers();
            setOrganizers(response.data.organizers || []);
        } catch (error) {
            console.error('Error fetching organizers:', error);
        }
    };

    const fetchClubs = async () => {
        try {
            const response = await getAllClubs();
            setClubs(response.data.clubs || []);
        } catch (error) {
            console.error('Error fetching clubs:', error);
        }
    };

    const fetchPasswordResetRequests = async () => {
        try {
            const response = await getPasswordResetRequests();
            setPasswordResetRequests(response.data.requests || []);
        } catch (error) {
            console.error('Error fetching password reset requests:', error);
        }
    };

    const fetchPasswordChangeRequests = async () => {
        try {
            const response = await getPasswordChangeRequests();
            setPasswordChangeRequests(response.data.requests || []);
        } catch (error) {
            console.error('Error fetching password change requests:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
    };

    const handleAddOrganizer = async (e) => {
        e.preventDefault();
        setMessage('');
        setGeneratedCredentials(null);

        try {
            const response = await createOrganizer(organizerForm);
            setMessage(response.data.message || 'Organizer created successfully!');

            if (response.data.organizer?.generatedPassword) {
                setGeneratedCredentials({
                    email: response.data.organizer.email,
                    password: response.data.organizer.generatedPassword
                });
            }

            setOrganizerForm({ firstName: '', lastName: '', email: '', password: '', organizerCategory: 'club', autoGenerate: true });
            fetchOrganizers();
            setTimeout(() => setShowAddForm(false), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to create organizer');
        }
    };

    const handleRemoveOrganizer = async (email) => {
        if (!window.confirm('Are you sure you want to permanently delete this organizer?')) return;

        try {
            const response = await deleteOrganizer({ email });
            setMessage(response.data.message || 'Organizer deleted successfully!');
            fetchOrganizers();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to delete organizer');
        }
    };

    const handleUpdateOrganizerStatus = async (email, status) => {
        try {
            const response = await updateOrganizerStatus({ email, status });
            setMessage(response.data.message || 'Status updated successfully!');
            fetchOrganizers();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleAddClub = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const response = await addClub(clubForm);
            setMessage(response.data.message || 'Club created successfully!');
            setClubForm({ clubName: '', description: '' });
            fetchClubs();
            setTimeout(() => setShowAddForm(false), 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to create club');
        }
    };

    const handleRemoveClub = async (clubName) => {
        if (!window.confirm('Are you sure you want to permanently delete this club?')) return;

        try {
            const response = await deleteClub({ clubName });
            setMessage(response.data.message || 'Club deleted successfully!');
            fetchClubs();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to delete club');
        }
    };

    const handleUpdateClubStatus = async (clubName, status) => {
        try {
            const response = await updateClubStatus({ clubName, status });
            setMessage(response.data.message || 'Status updated successfully!');
            fetchClubs();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to update status');
        }
    };

    const inputStyle = (isDark) => ({
        width: '100%',
        padding: '10px',
        marginBottom: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: isDark ? '#3a3a3a' : '#fff',
        color: isDark ? '#fff' : '#000'
    });

    const renderNavbar = () => (
        <nav style={{
            display: 'flex',
            gap: '20px',
            padding: '20px',
            backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5',
            borderBottom: `2px solid ${darkMode ? '#444' : '#ddd'}`,
            marginBottom: '20px'
        }}>
            <button
                onClick={() => setCurrentView('dashboard')}
                className="small-btn"
                style={{
                    backgroundColor: currentView === 'dashboard' ? '#4dabf7' : 'transparent',
                    color: currentView === 'dashboard' ? '#fff' : (darkMode ? '#fff' : '#000')
                }}
            >
                Dashboard
            </button>
            <button
                onClick={() => setCurrentView('manage')}
                className="small-btn"
                style={{
                    backgroundColor: currentView === 'manage' ? '#4dabf7' : 'transparent',
                    color: currentView === 'manage' ? '#fff' : (darkMode ? '#fff' : '#000')
                }}
            >
                Manage Clubs/Organizers
            </button>
            <button
                onClick={() => setCurrentView('password-reset')}
                className="small-btn"
                style={{
                    backgroundColor: currentView === 'password-reset' ? '#4dabf7' : 'transparent',
                    color: currentView === 'password-reset' ? '#fff' : (darkMode ? '#fff' : '#000')
                }}
            >
                Password Reset Requests
            </button>
        </nav>
    );

    const renderDashboard = () => (
        <section className="content">
            <h3>Admin Dashboard</h3>
            <p className="muted">Welcome to the admin dashboard. Use the navigation menu to manage the system.</p>

            <div className="cards">
                <div className="card">
                    <h4>📊 Statistics</h4>
                    <p className="muted">Total Organizers: {organizers.length}</p>
                    <p className="muted">Total Clubs: {clubs.length}</p>
                    <p className="muted">Pending Organizer Reset Requests: {passwordChangeRequests.filter((req) => req.status === 'pending').length}</p>
                    <p className="muted">Forgot Password Requests: {passwordResetRequests.length}</p>
                    <button
                        className="small-btn"
                        onClick={() => setCurrentView('manage')}
                        onMouseEnter={(e) => { e.target.style.scale = "1.1"; e.target.style.transition = "all 0.2s ease"; }}
                        onMouseLeave={(e) => { e.target.style.scale = "1"; e.target.style.transition = "all 0.2s ease"; }}
                    >
                        View Details
                    </button>
                </div>

                <div className="card">
                    <h4>👥 Quick Actions</h4>
                    <p className="muted">Manage clubs and organizers efficiently.</p>
                    <button
                        className="small-btn"
                        onClick={() => {
                            setCurrentView('manage');
                            setManagementTab('organizers');
                            setShowAddForm(true);
                        }}
                        onMouseEnter={(e) => { e.target.style.scale = "1.1"; e.target.style.transition = "all 0.2s ease"; }}
                        onMouseLeave={(e) => { e.target.style.scale = "1"; e.target.style.transition = "all 0.2s ease"; }}
                    >
                        Add Organizer
                    </button>
                </div>

                <div className="card">
                    <h4>🏢 Club Management</h4>
                    <p className="muted">Create and manage clubs.</p>
                    <button
                        className="small-btn"
                        onClick={() => {
                            setCurrentView('manage');
                            setManagementTab('clubs');
                            setShowAddForm(true);
                        }}
                        onMouseEnter={(e) => { e.target.style.scale = "1.1"; e.target.style.transition = "all 0.2s ease"; }}
                        onMouseLeave={(e) => { e.target.style.scale = "1"; e.target.style.transition = "all 0.2s ease"; }}
                    >
                        Add Club
                    </button>
                </div>

                <div className="card">
                    <h4>🔐 Password Requests</h4>
                    <p className="muted">
                        {passwordChangeRequests.length === 0 && passwordResetRequests.length === 0
                            ? 'No pending password requests.'
                            : `${passwordChangeRequests.filter((req) => req.status === 'pending').length} organizer reset request${passwordChangeRequests.filter((req) => req.status === 'pending').length !== 1 ? 's' : ''}, ${passwordResetRequests.length} forgot password request${passwordResetRequests.length !== 1 ? 's' : ''}.`}
                    </p>
                    <button
                        className="small-btn"
                        onClick={() => setCurrentView('password-reset')}
                        onMouseEnter={(e) => { e.target.style.scale = "1.1"; e.target.style.transition = "all 0.2s ease"; }}
                        onMouseLeave={(e) => { e.target.style.scale = "1"; e.target.style.transition = "all 0.2s ease"; }}
                    >
                        View Requests
                    </button>
                </div>
            </div>
        </section>
    );

    const renderManageView = () => (
        <section className="content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Manage Clubs & Organizers</h3>
                <button
                    className="primary-btn"
                    onClick={() => {
                        setShowAddForm(!showAddForm);
                        setMessage('');
                        setGeneratedCredentials(null);
                    }}
                >
                    {showAddForm ? 'Cancel' : `Add New ${managementTab === 'organizers' ? 'Organizer' : 'Club'}`}
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => {
                        setManagementTab('organizers');
                        setShowAddForm(false);
                        setMessage('');
                    }}
                    className="small-btn"
                    style={{
                        marginRight: '10px',
                        backgroundColor: managementTab === 'organizers' ? '#4dabf7' : 'transparent',
                        color: managementTab === 'organizers' ? '#fff' : (darkMode ? '#fff' : '#000')
                    }}
                >
                    Organizers ({organizers.length})
                </button>
                <button
                    onClick={() => {
                        setManagementTab('clubs');
                        setShowAddForm(false);
                        setMessage('');
                    }}
                    className="small-btn"
                    style={{
                        backgroundColor: managementTab === 'clubs' ? '#4dabf7' : 'transparent',
                        color: managementTab === 'clubs' ? '#fff' : (darkMode ? '#fff' : '#000')
                    }}
                >
                    Clubs ({clubs.length})
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '10px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    backgroundColor: message.includes('success') || message.includes('created') || message.includes('deleted') || message.includes('updated') ? '#28a745' : '#dc3545',
                    color: '#fff'
                }}>
                    {message}
                </div>
            )}

            {showAddForm && managementTab === 'organizers' && (
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h4>Add New Organizer</h4>
                    <form onSubmit={handleAddOrganizer}>
                        <input
                            type="text"
                            placeholder="First Name"
                            value={organizerForm.firstName}
                            onChange={(e) => setOrganizerForm({ ...organizerForm, firstName: e.target.value })}
                            required
                            style={inputStyle(darkMode)}
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={organizerForm.lastName}
                            onChange={(e) => setOrganizerForm({ ...organizerForm, lastName: e.target.value })}
                            required
                            style={inputStyle(darkMode)}
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={organizerForm.email}
                            onChange={(e) => setOrganizerForm({ ...organizerForm, email: e.target.value })}
                            required
                            style={inputStyle(darkMode)}
                        />
                        <select
                            value={organizerForm.organizerCategory}
                            onChange={(e) => setOrganizerForm({ ...organizerForm, organizerCategory: e.target.value })}
                            style={inputStyle(darkMode)}
                        >
                            <option value="club">Club</option>
                            <option value="council">Council</option>
                            <option value="fest_team">Fest Team</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                            <input
                                type="checkbox"
                                checked={organizerForm.autoGenerate}
                                onChange={(e) => setOrganizerForm({ ...organizerForm, autoGenerate: e.target.checked })}
                                style={{ marginRight: '10px' }}
                            />
                            Auto-generate password
                        </label>
                        {!organizerForm.autoGenerate && (
                            <input
                                type="password"
                                placeholder="Enter password (min 6 characters)"
                                value={organizerForm.password}
                                onChange={(e) => setOrganizerForm({ ...organizerForm, password: e.target.value })}
                                required
                                minLength={6}
                                style={inputStyle(darkMode)}
                            />
                        )}
                        <button type="submit" className="primary-btn" style={{ width: '100%' }}>
                            Create Organizer
                        </button>
                    </form>

                    {generatedCredentials && (
                        <div style={{
                            marginTop: '20px',
                            padding: '15px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            borderRadius: '4px'
                        }}>
                            <h4 style={{ marginTop: 0 }}>✅ Organizer Created Successfully!</h4>
                            <p style={{ marginBottom: '5px' }}><strong>Email:</strong> {generatedCredentials.email}</p>
                            <p style={{ marginBottom: '5px' }}><strong>Password:</strong> {generatedCredentials.password}</p>
                            <p style={{ fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>
                                ⚠️ Please save these credentials and share them with the organizer. This is the only time you'll see this password.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {showAddForm && managementTab === 'clubs' && (
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h4>Add New Club</h4>
                    <form onSubmit={handleAddClub}>
                        <input
                            type="text"
                            placeholder="Club Name"
                            value={clubForm.clubName}
                            onChange={(e) => setClubForm({ ...clubForm, clubName: e.target.value })}
                            required
                            style={inputStyle(darkMode)}
                        />
                        <textarea
                            placeholder="Description"
                            value={clubForm.description}
                            onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                            required
                            rows="4"
                            style={{ ...inputStyle(darkMode), resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <button type="submit" className="primary-btn" style={{ width: '100%' }}>
                            Create Club
                        </button>
                    </form>
                </div>
            )}

            {managementTab === 'organizers' && (
                <div>
                    <h4>Organizers List</h4>
                    {organizers.length === 0 ? (
                        <p className="muted">No organizers found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                backgroundColor: darkMode ? '#2a2a2a' : '#fff'
                            }}>
                                <thead>
                                    <tr style={{ backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Name</th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Email</th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Status</th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizers.map((org) => (
                                        <tr key={org._id} style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}` }}>
                                            <td style={{ padding: '12px' }}>{org.firstName} {org.lastName}</td>
                                            <td style={{ padding: '12px' }}>{org.email}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    backgroundColor: org.status === 'active' ? '#28a745' : org.status === 'disabled' ? '#ffc107' : '#6c757d',
                                                    color: '#fff'
                                                }}>
                                                    {org.status || 'active'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <select
                                                    onChange={(e) => {
                                                        const action = e.target.value;
                                                        if (action === 'delete') {
                                                            handleRemoveOrganizer(org.email);
                                                        } else if (action) {
                                                            handleUpdateOrganizerStatus(org.email, action);
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '4px',
                                                        backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                                        color: darkMode ? '#fff' : '#000',
                                                        border: '1px solid #ccc',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="">Manage</option>
                                                    {org.status !== 'active' && <option value="active">Activate</option>}
                                                    {org.status !== 'disabled' && <option value="disabled">Disable</option>}
                                                    {org.status !== 'archived' && <option value="archived">Archive</option>}
                                                    <option value="delete">Delete</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {managementTab === 'clubs' && (
                <div>
                    <h4>Clubs List</h4>
                    {clubs.length === 0 ? (
                        <p className="muted">No clubs found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                backgroundColor: darkMode ? '#2a2a2a' : '#fff'
                            }}>
                                <thead>
                                    <tr style={{ backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Club Name</th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Description</th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Status</th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clubs.map((club) => (
                                        <tr key={club._id} style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}` }}>
                                            <td style={{ padding: '12px' }}>{club.clubName}</td>
                                            <td style={{ padding: '12px' }}>{club.description}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    backgroundColor: club.status === 'active' ? '#28a745' : club.status === 'disabled' ? '#ffc107' : '#6c757d',
                                                    color: '#fff'
                                                }}>
                                                    {club.status || 'active'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <select
                                                    onChange={(e) => {
                                                        const action = e.target.value;
                                                        if (action === 'delete') {
                                                            handleRemoveClub(club.clubName);
                                                        } else if (action) {
                                                            handleUpdateClubStatus(club.clubName, action);
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '4px',
                                                        backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                                        color: darkMode ? '#fff' : '#000',
                                                        border: '1px solid #ccc',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="">Manage</option>
                                                    {club.status !== 'active' && <option value="active">Activate</option>}
                                                    {club.status !== 'disabled' && <option value="disabled">Disable</option>}
                                                    {club.status !== 'archived' && <option value="archived">Archive</option>}
                                                    <option value="delete">Delete</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );

    const handleClearPasswordReset = async (email) => {
        if (!window.confirm('Are you sure you want to clear this password reset request?')) return;

        try {
            const response = await clearPasswordResetRequest({ email });
            setMessage(response.data.message || 'Password reset request cleared successfully!');
            fetchPasswordResetRequests();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to clear password reset request');
        }
    };

    const handleApprovePasswordChange = async (requestId) => {
        const adminNotes = prompt('Optional: Enter approval comment for this reset request:');

        try {
            const response = await approvePasswordChangeRequest({ requestId, adminNotes: adminNotes || '' });
            setMessage(response.data.message || 'Password change request approved successfully!');
            if (response.data.generatedPassword) {
                setLatestApprovedCredentials({
                    organizerName: response.data.organizerName,
                    organizerEmail: response.data.organizerEmail,
                    generatedPassword: response.data.generatedPassword
                });
            }
            fetchPasswordChangeRequests();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to approve password change request');
        }
    };

    const handleRejectPasswordChange = async (requestId) => {
        const adminNotes = prompt('Enter rejection comment (required):');
        if (!adminNotes || !adminNotes.trim()) return;

        try {
            const response = await rejectPasswordChangeRequest({ requestId, adminNotes: adminNotes.trim() });
            setMessage(response.data.message || 'Password change request rejected successfully!');
            fetchPasswordChangeRequests();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to reject password change request');
        }
    };

    const PasswordResetViewContent = () => {
        const [requestTab, setRequestTab] = React.useState('change');

        return (
            <section className="content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>Password Management Requests</h3>
                    <button
                        className="small-btn"
                        onClick={() => {
                            fetchPasswordResetRequests();
                            fetchPasswordChangeRequests();
                        }}
                        onMouseEnter={(e) => { e.target.style.scale = "1.1"; e.target.style.transition = "all 0.2s ease"; }}
                        onMouseLeave={(e) => { e.target.style.scale = "1"; e.target.style.transition = "all 0.2s ease"; }}
                    >
                        🔄 Refresh
                    </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => setRequestTab('change')}
                        className="small-btn"
                        style={{
                            marginRight: '10px',
                            backgroundColor: requestTab === 'change' ? '#4dabf7' : 'transparent',
                            color: requestTab === 'change' ? '#fff' : (darkMode ? '#fff' : '#000')
                        }}
                    >
                        Password Change Requests ({passwordChangeRequests.length})
                    </button>
                    <button
                        onClick={() => setRequestTab('reset')}
                        className="small-btn"
                        style={{
                            backgroundColor: requestTab === 'reset' ? '#4dabf7' : 'transparent',
                            color: requestTab === 'reset' ? '#fff' : (darkMode ? '#fff' : '#000')
                        }}
                    >
                        Forgot Password Requests ({passwordResetRequests.length})
                    </button>
                </div>

                {message && (
                    <div style={{
                        padding: '10px',
                        marginBottom: '20px',
                        borderRadius: '4px',
                        backgroundColor: message.includes('success') || message.includes('approved') || message.includes('rejected') || message.includes('cleared') ? '#28a745' : '#dc3545',
                        color: '#fff'
                    }}>
                        {message}
                    </div>
                )}

                {requestTab === 'change' && (
                    <>
                        <p className="muted">Organizer password reset requests with full status tracking and processing comments.</p>

                        {latestApprovedCredentials && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '12px',
                                borderRadius: '6px',
                                backgroundColor: '#28a745',
                                color: '#fff'
                            }}>
                                <h4 style={{ margin: '0 0 8px' }}>✅ New Password Generated</h4>
                                <p style={{ margin: '4px 0' }}><strong>Organizer:</strong> {latestApprovedCredentials.organizerName}</p>
                                <p style={{ margin: '4px 0' }}><strong>Email:</strong> {latestApprovedCredentials.organizerEmail}</p>
                                <p style={{ margin: '4px 0' }}><strong>Temporary Password:</strong> {latestApprovedCredentials.generatedPassword}</p>
                                <p style={{ margin: '8px 0 0', fontSize: '12px' }}>Share this password securely with the organizer.</p>
                            </div>
                        )}

                        {passwordChangeRequests.length === 0 ? (
                            <div className="card">
                                <h4>📋 No Requests</h4>
                                <p className="muted">No organizer password reset requests found.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    backgroundColor: darkMode ? '#2a2a2a' : '#fff'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Club Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Email</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Reason</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Admin Comment</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Requested</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Processed</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {passwordChangeRequests.map((request) => {
                                            const requestedAt = new Date(request.createdAt);

                                            return (
                                                <tr key={request._id} style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}` }}>
                                                    <td style={{ padding: '12px' }}>{request.userName}</td>
                                                    <td style={{ padding: '12px' }}>{request.clubName || '-'}</td>
                                                    <td style={{ padding: '12px' }}>{request.userEmail}</td>
                                                    <td style={{ padding: '12px' }}>{request.reason || 'No reason provided'}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            backgroundColor: request.status === 'approved' ? '#28a745' : request.status === 'rejected' ? '#dc3545' : '#ffc107',
                                                            color: request.status === 'pending' ? '#111' : '#fff'
                                                        }}>
                                                            {request.status?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>{request.adminNotes || '-'}</td>
                                                    <td style={{ padding: '12px' }}>{requestedAt.toLocaleString()}</td>
                                                    <td style={{ padding: '12px' }}>{request.processedAt ? new Date(request.processedAt).toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        {request.status === 'pending' ? (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => handleApprovePasswordChange(request._id)}
                                                                    className="small-btn"
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: '#28a745',
                                                                        color: '#fff'
                                                                    }}
                                                                >
                                                                    ✓ Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectPasswordChange(request._id)}
                                                                    className="small-btn"
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: '#dc3545',
                                                                        color: '#fff'
                                                                    }}
                                                                >
                                                                    ✗ Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="muted">Processed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="card" style={{ marginTop: '20px' }}>
                            <h4>ℹ️ About Organizer Reset Requests</h4>
                            <p className="muted">
                                Organizers submit reset requests with a reason and their club details. You can approve/reject with comments.
                            </p>
                            <p className="muted">
                                <strong>Note:</strong> On approval, the system auto-generates a temporary password and shows it to you for secure sharing.
                            </p>
                        </div>
                    </>
                )}

                {requestTab === 'reset' && (
                    <>
                        <p className="muted">Users who have requested a password reset via the "Forgot Password" feature.</p>

                        {passwordResetRequests.length === 0 ? (
                            <div className="card">
                                <h4>📋 No Pending Requests</h4>
                                <p className="muted">There are currently no pending password reset requests.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    backgroundColor: darkMode ? '#2a2a2a' : '#fff'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Email</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Role</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Token Expires</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #444' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {passwordResetRequests.map((request) => {
                                            const expiresAt = new Date(request.resetPasswordExpire);
                                            const now = new Date();
                                            const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000 / 60)); // minutes

                                            return (
                                                <tr key={request._id} style={{ borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}` }}>
                                                    <td style={{ padding: '12px' }}>{request.firstName} {request.lastName}</td>
                                                    <td style={{ padding: '12px' }}>{request.email}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            backgroundColor: request.role === 'organizer' ? '#4dabf7' : '#6c757d',
                                                            color: '#fff'
                                                        }}>
                                                            {request.role}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            color: timeRemaining < 10 ? '#dc3545' : (darkMode ? '#fff' : '#000')
                                                        }}>
                                                            {timeRemaining > 0 ? `${timeRemaining} minutes` : 'Expired'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <button
                                                            onClick={() => handleClearPasswordReset(request.email)}
                                                            className="small-btn"
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: '#dc3545',
                                                                color: '#fff'
                                                            }}
                                                        >
                                                            Clear Request
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="card" style={{ marginTop: '20px' }}>
                            <h4>ℹ️ About Password Reset Requests</h4>
                            <p className="muted">
                                When users click "Forgot Password" on the login page, they receive an email with a reset link.
                                The reset token is valid for 1 hour. Users listed here have active reset tokens.
                            </p>
                            <p className="muted">
                                <strong>Note:</strong> Users can complete the password reset themselves using the link in their email.
                                You can clear requests here if needed (e.g., if a user reports they didn't request a reset).
                            </p>
                        </div>
                    </>
                )}
            </section>
        );
    };

    const renderPasswordResetView = () => <PasswordResetViewContent />;

    return (
        <div className={darkMode ? 'user-root-dark' : 'user-root'}>
            <header className={darkMode ? 'user-header-dark' : 'user-header'}>
                <h1>Admin Panel</h1>
                <div className="header-actions">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="small-btn"
                        onMouseEnter={(e) => {
                            e.target.style.textDecoration = 'underline';
                            e.target.style.color = '#4dabf7';
                            e.target.style.scale = '1.1';
                            e.target.style.transition = 'all 0.2s ease';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.textDecoration = 'none';
                            e.target.style.color = darkMode ? '#ffffff' : '#111111';
                            e.target.style.scale = '1';
                            e.target.style.transition = "all 0.2s ease";
                        }}
                    >
                        {darkMode ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button onClick={handleLogout} className="primary-btn">Logout</button>
                </div>
            </header>

            {renderNavbar()}

            <main className="user-main">
                <aside className="profile-card">
                    <div className="avatar">{user?.adminName?.[0]?.toUpperCase() || 'A'}</div>
                    <h2>{user?.adminName || 'Admin'}</h2>
                    <p className="muted">{user?.email || 'admin@iiit.ac.in'}</p>
                    <p className="role">Role: Admin</p>
                </aside>

                {currentView === 'dashboard' && renderDashboard()}
                {currentView === 'manage' && renderManageView()}
                {currentView === 'password-reset' && renderPasswordResetView()}
            </main>
        </div>
    );
}
