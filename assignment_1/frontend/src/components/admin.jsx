import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'
import { createOrganizer } from '../services/AuthAPI.js';
import {deleteOrganizer} from '../services/AuthAPI.js';    
import {addClub} from '../services/AuthAPI.js';
import {deleteClub} from '../services/AuthAPI.js';
import {addEvent, deleteEvent} from '../services/AuthAPI.js';
import './user.css';

export default function Admin() {
    const [darkMode, setDarkMode] = useState(true);
    const [showPassword, setShowPassword]=useState(false);
    const [user, setUser] = useState(null);
    const [showClubs, setShowClubs] = useState(false);
    const navigate = useNavigate();
    const [showOrganizerForm, setShowOrganizerForm] = useState(false);
    const [organizerData, setOrganizerData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    });
    const [clubData, setClubData] = useState({
        clubName: '',
        description: ''
    });
    const [eventData, setEventData] = useState({
        eventName: '',
        description: '',
        type: 'normal',
        eligibility: 'open',
        reg_deadline: '',
        event_start: '',
        event_end: '',
        reg_limit: 100,
        reg_fee: 0,
        organizerEmail: '',
        event_tags: ''
    });
    const [message, setMessage] = useState('');
    const [showEvents, setShowEvents] = useState(false);

    const inputStyle = (isDark) => ({
        width: '100%',
        padding: '10px',
        marginBottom: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: isDark ? '#3a3a3a' : '#fff',
        color: isDark ? '#fff' : '#000'
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) setUser(JSON.parse(raw));
        } catch {
            setUser(null);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
    };

    const addOrganizer = async (e) => {
        e.preventDefault();
        setMessage('');
        
        try {
            const response = await createOrganizer(organizerData);
            setMessage(response.data.message || 'Organizer created successfully!');
            setOrganizerData({ firstName: '', lastName: '', email: '', password: '' });
            setTimeout(() => {
                setShowOrganizerForm(false);
                setMessage('');
            }, 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to create organizer');
        }
    };

    const removeOrganizer = async (e) => {
        e.preventDefault();
        setMessage('');

        try
        {
            const response=await deleteOrganizer({email: organizerData.email});
            setMessage(response.data.message || 'Organizer deleted successfully!');
            setOrganizerData({ firstName: '', lastName: '', email: '', password: '' });
            setTimeout(() => {
                setShowOrganizerForm(false);
                setMessage('');
            }, 2000);
        }
        catch(error)
        {
            setMessage(error.response?.data?.message || 'Failed to delete organizer');
        }
    };

    const createClub = async (e) => {
        e.preventDefault();
        setMessage('');
        
        try {
            const response = await addClub(clubData);
            setMessage(response.data.message || 'Club created successfully!');
            setClubData({ clubName: '', description: '' });
            setTimeout(() => {
                setShowClubs(false);
                setMessage('');
            }, 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to create club');
        }
    };

    const removeClub = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const response = await deleteClub({clubName: clubData.clubName});
            setMessage(response.data.message || 'Club deleted successfully!');
            setClubData({ clubName: '', description: '' });
            setTimeout(() => {
                setShowClubs(false);
                setMessage('');
            }, 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to delete club');
        }
    };

    const createEvent = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const payload = {
                ...eventData,
                reg_limit: Number(eventData.reg_limit),
                reg_fee: Number(eventData.reg_fee),
                event_tags: eventData.event_tags.split(',').map(t => t.trim()).filter(Boolean)
            };
            const response = await addEvent(payload);
            setMessage(response.data.message || 'Event created successfully!');
            setEventData({
                eventName: '',
                description: '',
                type: 'normal',
                eligibility: 'open',
                reg_deadline: '',
                event_start: '',
                event_end: '',
                reg_limit: 100,
                reg_fee: 0,
                organizerEmail: '',
                event_tags: ''
            });
            setTimeout(() => {
                setShowEvents(false);
                setMessage('');
            }, 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to create event');
        }
    };

    const removeEvent = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await deleteEvent({ eventName: eventData.eventName });
            setMessage(response.data.message || 'Event deleted successfully!');
            setEventData({ ...eventData, eventName: '' });
            setTimeout(() => {
                setShowEvents(false);
                setMessage('');
            }, 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to delete event');
        }
    };

    return (
        <div className={darkMode ? 'user-root-dark' : 'user-root'}>
            <header className={darkMode ? 'user-header-dark' : 'user-header'}>
                <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ''}</h1>
                <div className="header-actions">
                    <button 
                        onClick={() => setDarkMode(!darkMode)} 
                        className="small-btn"
                        onMouseEnter={(e) => {
                            e.target.style.textDecoration = 'underline';
                            e.target.style.color = '#4dabf7';
                            e.target.style.scale='1.1';
                            e.target.style.transition='all 0.2s ease';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.textDecoration='none';
                            e.target.style.color= darkMode ? '#ffffff' : '#111111';
                            e.target.style.scale='1';
                            e.target.style.transition="all 0.2s ease";  
    
                        }}
                    >
                        {darkMode ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button onClick={handleLogout} className="primary-btn">Logout</button>
                </div>
            </header>

            <main className="user-main">
                <aside className="profile-card">
                    <div className="avatar">{user ? user.firstName?.[0]?.toUpperCase() : 'U'}</div>
                    <h2>{user ? `${user.firstName || ''} ${user.lastName || ''}` : 'User'}</h2>
                    <p className="muted">{user?.email || 'No email available'}</p>
                    <p className="role">Role: {user?.role || 'user'}</p>
                </aside>

                <section className="content">
                    <h3>My Events</h3>
                    <p className="muted">You have no events yet. Organizer feature coming soon.</p>

                    <div className="cards">
                        <div className="card">
                            <h4>Explore Events</h4>
                            <p className="muted">Browse and register for events organized by IIIT.</p>
                            <button className="small-btn" onClick={() => alert('Explore events coming soon')}
                                onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                Explore</button>
                        </div>

                        <div className="card">
                            <h4>Profile Settings</h4>
                            <p className="muted">Update your profile, change password, or manage preferences.</p>
                            <button className="small-btn" onClick={() => alert('Profile settings coming soon')}
                                 onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                Edit</button>
                        </div>
                        <div className="card">
                            <h4>Manage Organizers</h4>
                            <p className="muted">Add or remove event organizers for IIIT events.</p>
                            <button className="small-btn" onClick={() => setShowOrganizerForm(!showOrganizerForm)}
                                onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                {showOrganizerForm ? 'Cancel' : 'Manage Organizer'}</button>
                            
                            {showOrganizerForm && (
                                <form onSubmit={addOrganizer} style={{ marginTop: '20px' }}>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={organizerData.firstName}
                                        onChange={(e) => setOrganizerData({...organizerData, firstName: e.target.value})}
                                        required
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            marginBottom: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                            color: darkMode ? '#fff' : '#000'
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={organizerData.lastName}
                                        onChange={(e) => setOrganizerData({...organizerData, lastName: e.target.value})}
                                        required
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            marginBottom: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                            color: darkMode ? '#fff' : '#000'
                                        }}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={organizerData.email}
                                        onChange={(e) => setOrganizerData({...organizerData, email: e.target.value})}
                                        required
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            marginBottom: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                            color: darkMode ? '#fff' : '#000'
                                        }}
                                    />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={organizerData.password}
                                        onChange={(e) => setOrganizerData({...organizerData, password: e.target.value})}
                                        required
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            marginBottom: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                            color: darkMode ? '#fff' : '#000'
                                        }}
                                    />
                                    <button type="button" className="small-btn" style={{ width: '100%', marginBottom: '10px' }} onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? "Hide password" : "Show password"}
                                    </button>
    
                                    <button type="submit" className="small-btn" style={{ width: '100%' }} onClick={()=> addOrganizer}>
                                        Create Organizer
                                    </button>
                                    <button type="submit" className="small-btn" style={{ width: '100%', marginTop: '10px' }} onClick={removeOrganizer}>
                                        Remove Organizer
                                    </button>
                                    {message && (
                                        <p style={{ 
                                            marginTop: '10px', 
                                            color: message.includes('success') || message.includes('created') || message.includes('deleted') ? '#28a745' : '#dc3545',
                                            textAlign: 'center'
                                        }}>
                                            {message}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                        <div className="card">
                            <h4>Manage Clubs</h4>
                            <p className="muted">View and manage clubs for IIIT events.</p>
                            <button className="small-btn" onClick={() => setShowClubs(!showClubs)}
                                onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                {showClubs ? 'Cancel' : 'Manage Clubs'}</button>
                            
                            {showClubs && (
                                <form onSubmit={createClub} style={{ marginTop: '20px' }}>
                                    <input
                                        type="text"
                                        placeholder="Club Name"
                                        value={clubData.clubName}
                                        onChange={(e) => setClubData({...clubData, clubName: e.target.value})}
                                        required
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            marginBottom: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                            color: darkMode ? '#fff' : '#000'
                                        }}
                                    />
                                    <textarea
                                        placeholder="Club Description"
                                        value={clubData.description}
                                        onChange={(e) => setClubData({...clubData, description: e.target.value})}
                                        required
                                        rows="3"
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            marginBottom: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: darkMode ? '#3a3a3a' : '#fff',
                                            color: darkMode ? '#fff' : '#000',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                    <button type="submit" className="small-btn" style={{ width: '100%' }}>
                                        Create Club
                                    </button>
                                    <button type="button" className="small-btn" style={{ width: '100%', marginTop: '10px' }} onClick={removeClub}>
                                        Remove Club
                                    </button>
                                    {message && (
                                        <p style={{ 
                                            marginTop: '10px', 
                                            color: message.includes('success') || message.includes('created') || message.includes('deleted') ? '#28a745' : '#dc3545',
                                            textAlign: 'center'
                                        }}>
                                            {message}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                        <div className="card">
                            <h4>Manage Events</h4>
                            <p className="muted">Add or remove events.</p>
                            <button className="small-btn" onClick={() => setShowEvents(!showEvents)}
                                onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                {showEvents ? 'Cancel' : 'Manage Events'}</button>

                            {showEvents && (
                                <form onSubmit={createEvent} style={{ marginTop: '20px' }}>
                                    <input type="text" placeholder="Event Name" value={eventData.eventName}
                                        onChange={(e)=>setEventData({...eventData, eventName: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <textarea placeholder="Description" value={eventData.description}
                                        onChange={(e)=>setEventData({...eventData, description: e.target.value})}
                                        required style={{...inputStyle(darkMode), minHeight:'80px', resize:'vertical', fontFamily:'inherit'}} />
                                    <select value={eventData.type} onChange={(e)=>setEventData({...eventData, type: e.target.value})}
                                        required style={inputStyle(darkMode)}>
                                        <option value="normal">Normal</option>
                                        <option value="merchandise">Merchandise</option>
                                    </select>
                                    <select value={eventData.eligibility} onChange={(e)=>setEventData({...eventData, eligibility: e.target.value})}
                                        required style={inputStyle(darkMode)}>
                                        <option value="open">Open</option>
                                        <option value="member-only">Member-only</option>
                                    </select>
                                    <label className="muted">Registration Deadline</label>
                                    <input type="datetime-local" value={eventData.reg_deadline}
                                        onChange={(e)=>setEventData({...eventData, reg_deadline: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <label className="muted">Event Start</label>
                                    <input type="datetime-local" value={eventData.event_start}
                                        onChange={(e)=>setEventData({...eventData, event_start: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <label className="muted">Event End</label>
                                    <input type="datetime-local" value={eventData.event_end}
                                        onChange={(e)=>setEventData({...eventData, event_end: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <input type="number" placeholder="Registration Limit" value={eventData.reg_limit}
                                        onChange={(e)=>setEventData({...eventData, reg_limit: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <input type="number" placeholder="Registration Fee" value={eventData.reg_fee}
                                        onChange={(e)=>setEventData({...eventData, reg_fee: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <input type="email" placeholder="Organizer Email" value={eventData.organizerEmail}
                                        onChange={(e)=>setEventData({...eventData, organizerEmail: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <input type="text" placeholder="Event Tags (comma separated)" value={eventData.event_tags}
                                        onChange={(e)=>setEventData({...eventData, event_tags: e.target.value})}
                                        required style={inputStyle(darkMode)} />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="small-btn" type="submit"
                                            onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                            onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                            Add Event
                                        </button>
                                        <button className="small-btn" type="button" onClick={removeEvent}
                                            onMouseEnter={(e)=>{e.target.style.scale="1.1"; e.target.style.transition="all 0.2s ease";}}
                                            onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                            Delete Event
                                        </button>
                                    </div>
                                    {message && (
                                        <p style={{ 
                                            marginTop: '10px', 
                                            color: message.includes('success') || message.includes('created') || message.includes('deleted') ? '#28a745' : '#dc3545',
                                            textAlign: 'center'
                                        }}>
                                            {message}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}