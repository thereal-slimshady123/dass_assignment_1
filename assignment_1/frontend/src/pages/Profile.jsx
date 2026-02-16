import { useEffect, useMemo, useState } from "react";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadPreferences, loadUser, savePreferences, saveUser } from "../utils/profileStore";
import { getClubs } from "../services/AuthAPI";

const interestOptions = [
  "Music",
  "Dance",
  "Sports",
  "Coding",
  "Art",
  "Literature",
  "Culture",
  "Tech",
  "Entrepreneurship",
  "Gaming"
];

export default function Profile() {
  const initialUser = useMemo(() => loadUser(), []);
  const initialPrefs = useMemo(() => loadPreferences(), []);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [clubMsg, setClubMsg] = useState("");

  const [firstName, setFirstName] = useState(initialUser?.firstName || "");
  const [lastName, setLastName] = useState(initialUser?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(initialUser?.phone_number || "");
  const [collegeName, setCollegeName] = useState(initialUser?.college_name || "");
  const [areas, setAreas] = useState(initialPrefs.areas || []);
  const [clubs, setClubs] = useState(initialPrefs.clubs || []);
  const [msg, setMsg] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchClubs = async () => {
      try {
        const response = await getClubs();
        if (isMounted) {
          const clubs = response.data.clubs || [];
          setAvailableClubs(clubs.map((club) => club.clubName));
        }
      } catch (error) {
        if (isMounted) {
          setClubMsg("Could not load clubs from the server.");
        }
      }
    };
    fetchClubs();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggle = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const saveProfile = () => {
    if (!initialUser) {
      setMsg("Please sign in to update your profile.");
      return;
    }
    const updatedUser = {
      ...initialUser,
      firstName,
      lastName,
      phone_number: phoneNumber,
      college_name: collegeName
    };
    saveUser(updatedUser);
    savePreferences({ areas, clubs });
    setMsg("Profile updated successfully.");
  };

  const changePassword = () => {
    setPassMsg("");
    if (!currentPass || !newPass || !confirmPass) {
      setPassMsg("Please fill all password fields.");
      return;
    }
    const storedPass = localStorage.getItem("auth_password");
    if (storedPass && storedPass !== currentPass) {
      setPassMsg("Current password is incorrect.");
      return;
    }
    if (newPass.length < 8) {
      setPassMsg("New password should be at least 8 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg("New password and confirmation do not match.");
      return;
    }

    localStorage.setItem("auth_password", newPass);
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setPassMsg("Password updated successfully.");
  };

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>Profile</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <h3>Profile Information</h3>
            <div className="form-grid">
              <div>
                <label className="filter-label">First Name</label>
                <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="filter-label">Last Name</label>
                <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <label className="filter-label">Contact Number</label>
                <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <div>
                <label className="filter-label">College/Organization</label>
                <input className="input" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} />
              </div>
              <div>
                <label className="filter-label">Email Address</label>
                <input className="input" value={initialUser?.email || ""} disabled />
              </div>
              <div>
                <label className="filter-label">Participant Type</label>
                <input className="input" value={initialUser?.userType || ""} disabled />
              </div>
            </div>
            {msg && <p className="message-success">{msg}</p>}
            <button type="button" className="primary-btn" onClick={saveProfile}>
              Save Profile
            </button>
          </div>

          <div className="section-card">
            <h3>Selected Interests</h3>
            <div className="chips">
              {interestOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option, areas, setAreas)}
                  className={areas.includes(option) ? "chip active" : "chip"}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h3>Followed Clubs</h3>
            <div className="chips">
              {availableClubs.map((club) => (
                <button
                  key={club}
                  type="button"
                  onClick={() => toggle(club, clubs, setClubs)}
                  className={clubs.includes(club) ? "chip active" : "chip"}
                >
                  {club}
                </button>
              ))}
              {!availableClubs.length && <p className="muted">No clubs available.</p>}
              {clubMsg && <p className="message-error">{clubMsg}</p>}
            </div>
          </div>

          <div className="section-card">
            <h3>Security Settings</h3>
            <div className="form-grid">
              <div>
                <label className="filter-label">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                />
              </div>
              <div>
                <label className="filter-label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>
              <div>
                <label className="filter-label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                />
              </div>
            </div>
            {passMsg && <p className="message-info">{passMsg}</p>}
            <button type="button" className="primary-btn" onClick={changePassword}>
              Update Password
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
