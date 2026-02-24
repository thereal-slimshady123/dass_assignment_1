import { NavLink, useNavigate } from "react-router-dom";
import "./user.css";

export default function UserNav({ showThemeToggle = false, darkMode = false, onToggleTheme }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="nav_bar">
      <NavLink to="/user" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>Dashboard</NavLink>
      <NavLink to="/events" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>Browse Events</NavLink>
      <NavLink to="/clubs" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>Clubs/Organizers</NavLink>
      <NavLink to="/profile" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>Profile</NavLink>
      <button onClick={handleLogout} className="primary-btn">Logout</button>
      {showThemeToggle && (
        <button onClick={onToggleTheme} className="small-btn">
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      )}
    </div>
  );
}
