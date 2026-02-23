import { useNavigate, useLocation } from 'react-router-dom';
import './user.css';

export default function OrganizerNav({ darkMode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="nav_bar">
      <a
        onClick={() => navigate('/organizer-dashboard')}
        className={`nav-link ${isActive('/organizer-dashboard') ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        Dashboard
      </a>
      <a
        onClick={() => navigate('/organizer-create-event')}
        className={`nav-link ${isActive('/organizer-create-event') ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        Create Event
      </a>
      <a
        onClick={() => navigate('/organizer-profile')}
        className={`nav-link ${isActive('/organizer-profile') ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        Profile
      </a>
      <a
        onClick={() => navigate('/organizer-all-events')}
        className={`nav-link ${isActive('/organizer-all-events') ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        All Events
      </a>
      <button onClick={handleLogout} className="nav-link" style={{ cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}
