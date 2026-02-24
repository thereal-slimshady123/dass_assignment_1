import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom'
import './user.css';

const areaOptions = [
        "AI / ML",
        "Web Development",
        "Systems / DevOps",
        "Product / Design",
        "Entrepreneurship",
        "Cybersecurity",
        "Data Science",
        "Robotics",
        "Competitive Programming"
    ];
  
    const clubOptions = [
        "Coding Club",
        "Robotics Club",
        "Entrepreneurship Cell",
        "Design Club",
        "ML Society",
        "Cybersecurity Group"
    ];

export default function User() {
    const [darkMode, setDarkMode] = useState(true);
    const [user, setUser] = useState(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [areas, setAreas] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [msg, setMsg] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const parsed = JSON.parse(raw);
                setUser(parsed);
                setFirstName(parsed.firstName || "");
                setLastName(parsed.lastName || "");
            }
            const prefRaw = localStorage.getItem('preferences');
            if (prefRaw) {
                const prefs = JSON.parse(prefRaw);
                if (prefs.areas) setAreas(prefs.areas);
                if (prefs.clubs) setClubs(prefs.clubs);
            }
        } catch {
            setUser(null);
        }
    }, []);

    const toggle = (value, list, setList) => {
        if (list.includes(value)) {
            setList(list.filter((item) => item !== value));
        } else {
            setList([...list, value]);
        }
    };

    const saveProfile = () => {
        setMsg("");
        try {
            const updatedUser = {
                ...(user || {}),
                firstName,
                lastName
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('preferences', JSON.stringify({ areas, clubs }));
            setUser(updatedUser);
            setMsg("Profile updated");
        } catch (e) {
            setMsg("Could not save profile");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className={darkMode ? 'user-root-dark' : 'user-root'}>
            <div className="nav_bar">
                <a href="./user" className="primary-btn">Dashboard</a>
                <a href="./events" className="primary-btn">Events</a>
                <a href="./profile" className="primary-btn">Profile</a>
                <button onClick={handleLogout}
                    className="primary-btn"
                    onMouseEnter={(e) => {
                        e.target.style.textDecoration = 'none';
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
                >Logout</button>
                <button 
                        onClick={() => setDarkMode(!darkMode)} 
                        className="small-btn"
                        onMouseEnter={(e) => {
                            e.target.style.textDecoration = 'none';
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

            </div>
            <header className={darkMode ? 'user-header-dark' : 'user-header'}>
                <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ''}</h1>
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
                            <p className="muted">Update display name and interests.</p>
                            <button className="small-btn" onClick={()=>navigate('/interests')}
                                 onMouseEnter={(e)=>{e.target.style.scale="1.05"; e.target.style.transition="all 0.2s ease";}}
                                onMouseLeave={(e)=>{e.target.style.scale="1"; e.target.style.transition="all 0.2s ease";}}>
                                Edit
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}