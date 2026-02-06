import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'
import './user.css';

export default function Organizer() {
    const [darkMode, setDarkMode] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

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
                            <button className="primary-btn" onClick={() => alert('Explore events coming soon')}
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
                    </div>
                </section>
            </main>
        </div>
    );
}