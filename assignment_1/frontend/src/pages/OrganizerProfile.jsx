import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { loadUser } from '../utils/profileStore';
import { requestOrganizerPasswordReset, getOrganizerPasswordResetHistory } from '../services/AuthAPI';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function OrganizerProfile() {
  const navigate = useNavigate();
  const user = useMemo(() => loadUser(), []);
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    organizerName: '',
    organizerCategory: 'club',
    organizerDescription: '',
    contactEmail: '',
    contactPhone: '',
    discordWebhookUrl: '',
    enableDiscordNotifications: false
  });

  const [passwordData, setPasswordData] = useState({ reason: '' });
  const [passwordRequestHistory, setPasswordRequestHistory] = useState([]);

  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const loadPasswordRequestHistory = async () => {
    try {
      const response = await getOrganizerPasswordResetHistory();
      setPasswordRequestHistory(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load password reset history:', error);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'organizer') {
      navigate('/');
      return;
    }

    // Load organizer profile data from localStorage if available
    const savedProfile = localStorage.getItem('organizerProfile');
    if (savedProfile) {
      setProfileData(JSON.parse(savedProfile));
    } else {
      setProfileData(prev => ({
        ...prev,
        organizerName: user.firstName + ' ' + user.lastName,
        contactEmail: user.email
      }));
    }

    loadPasswordRequestHistory();
  }, [user, navigate]);

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateDiscordWebhook = (url) => {
    if (!url) return true; // Optional field
    return url.startsWith('https://discord.com/api/webhooks/');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // Validate Discord webhook if provided
      if (profileData.discordWebhookUrl && !validateDiscordWebhook(profileData.discordWebhookUrl)) {
        setMessage('Invalid Discord webhook URL. It should start with https://discord.com/api/webhooks/');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/update-organizer-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizerName: profileData.organizerName,
          organizerCategory: profileData.organizerCategory,
          organizerDescription: profileData.organizerDescription,
          contactEmail: profileData.contactEmail,
          contactPhone: profileData.contactPhone,
          discordWebhookUrl: profileData.discordWebhookUrl,
          enableDiscordNotifications: profileData.enableDiscordNotifications
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✓ Profile saved successfully!');

        // Update local storage with new organizer profile
        localStorage.setItem('organizerProfile', JSON.stringify(profileData));

        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'Failed to save profile');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testDiscordWebhook = async () => {
    if (!profileData.discordWebhookUrl) {
      setMessage('Please enter a Discord webhook URL first');
      return;
    }

    if (!validateDiscordWebhook(profileData.discordWebhookUrl)) {
      setMessage('Invalid Discord webhook URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(profileData.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '✅ Discord Webhook Test',
          embeds: [{
            title: 'Test Webhook from DASS',
            description: `Event management system webhook test from ${profileData.organizerName}`,
            color: 5793266,
            footer: { text: 'DASS Event Management System' }
          }]
        })
      });

      if (response.ok) {
        setMessage('✓ Discord webhook working correctly!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to send test message to Discord');
      }
    } catch (error) {
      setMessage('Error connecting to Discord webhook: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!passwordData.reason.trim()) {
      setMessage('Please provide reason for password reset request');
      return;
    }

    setLoading(true);
    try {
      const response = await requestOrganizerPasswordReset({ reason: passwordData.reason.trim() });
      setMessage(response.data.message || 'Password reset request submitted successfully!');
      setPasswordData({ reason: '' });
      setShowPasswordChange(false);
      await loadPasswordRequestHistory();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(error.response?.data?.message || ('Error: ' + error.message));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (isDark) => ({
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: isDark ? '1px solid #555' : '1px solid #ddd',
    borderRadius: '5px',
    backgroundColor: isDark ? '#222' : '#fff',
    color: isDark ? '#fff' : '#111',
    fontFamily: 'inherit',
    fontSize: '14px'
  });

  return (
    <div className={darkMode ? 'user-root-dark' : 'user-root'}>
      <OrganizerNav darkMode={darkMode} />

      <header className={darkMode ? 'user-header-dark' : 'user-header'}>
        <h1>Organizer Profile</h1>
        <div className="header-actions">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="small-btn"
          >
            {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </header>

      <main className="user-main">
        {message && (
          <div className="section-card" style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: message.includes('✓') || message.includes('success') ? '#d4edda' : '#f8d7da',
            color: message.includes('✓') || message.includes('success') ? '#155724' : '#721c24',
            borderRadius: '5px',
            border: message.includes('✓') || message.includes('success') ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
          }}>
            {message}
          </div>
        )}

        {/* Profile Section */}
        <section className="section-card">
          <h3>Profile Information</h3>
          <form onSubmit={saveProfile}>
            <label>Organizer Name *</label>
            <input
              type="text"
              placeholder="Enter organizer name"
              value={profileData.organizerName}
              onChange={(e) => handleProfileChange('organizerName', e.target.value)}
              required
              style={inputStyle(darkMode)}
            />

            <label>Email (Cannot change - from account) *</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{ ...inputStyle(darkMode), opacity: 0.6 }}
            />

            <label>Contact Email</label>
            <input
              type="email"
              placeholder="Enter contact email for organizer"
              value={profileData.contactEmail}
              onChange={(e) => handleProfileChange('contactEmail', e.target.value)}
              style={inputStyle(darkMode)}
            />

            <label>Contact Phone</label>
            <input
              type="tel"
              placeholder="Enter contact phone number"
              value={profileData.contactPhone}
              onChange={(e) => handleProfileChange('contactPhone', e.target.value)}
              style={inputStyle(darkMode)}
            />

            <label>Organizer Category</label>
            <select
              value={profileData.organizerCategory}
              onChange={(e) => handleProfileChange('organizerCategory', e.target.value)}
              style={inputStyle(darkMode)}
            >
              <option value="club">Club</option>
              <option value="council">Council</option>
              <option value="fest_team">Fest Team</option>
            </select>

            <label>Organizer Description</label>
            <textarea
              placeholder="Describe your organization or club"
              value={profileData.organizerDescription}
              onChange={(e) => handleProfileChange('organizerDescription', e.target.value)}
              style={{ ...inputStyle(darkMode), minHeight: '100px', resize: 'vertical' }}
            />

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
              style={{ marginTop: '15px' }}
            >
              {loading ? 'Saving...' : '✓ Save Profile'}
            </button>
          </form>
        </section>

        {/* Discord Webhook Section */}
        <section className="section-card">
          <h3>Discord Integration</h3>
          <p className="muted">Get instant notification in Discord when someone registers for your event.</p>

          <form onSubmit={(e) => { e.preventDefault(); }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <input
                type="checkbox"
                checked={profileData.enableDiscordNotifications}
                onChange={(e) => handleProfileChange('enableDiscordNotifications', e.target.checked)}
              />
              <strong>Enable Discord Notifications</strong>
            </label>

            {profileData.enableDiscordNotifications && (
              <>
                <label>Discord Webhook URL</label>
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/XXX/YYY"
                  value={profileData.discordWebhookUrl}
                  onChange={(e) => handleProfileChange('discordWebhookUrl', e.target.value)}
                  style={inputStyle(darkMode)}
                />

                <p className="muted" style={{ fontSize: '12px' }}>
                  How to get your webhook URL:
                  <br />1. Go to your Discord server settings
                  <br />2. Navigate to Integrations → Webhooks
                  <br />3. Click "New Webhook" or select existing one
                  <br />4. Copy the webhook URL and paste it above
                </p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={testDiscordWebhook}
                    disabled={loading || !profileData.discordWebhookUrl}
                  >
                    🧪 Test Webhook
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={saveProfile}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : '✓ Save Discord Settings'}
                  </button>
                </div>
              </>
            )}
          </form>
        </section>

        {/* Password Change Section */}
        <section className="section-card">
          <h3>Security</h3>

          {passwordRequestHistory.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '10px' }}>Password Reset History</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                {passwordRequestHistory.map((request) => (
                  <div
                    key={request._id}
                    style={{
                      border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      backgroundColor: darkMode ? '#232323' : '#fafafa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{new Date(request.createdAt).toLocaleString()}</span>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor:
                            request.status === 'approved' ? '#28a745' :
                              request.status === 'rejected' ? '#dc3545' : '#ffc107',
                          color: request.status === 'pending' ? '#111' : '#fff'
                        }}
                      >
                        {request.status?.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 4px' }}><strong>Reason:</strong> {request.reason || 'Not specified'}</p>
                    {request.adminNotes && <p style={{ margin: 0 }}><strong>Admin Comment:</strong> {request.adminNotes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showPasswordChange ? (
            <button
              className="secondary-btn"
              onClick={() => setShowPasswordChange(true)}
            >
              🔐 Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword}>
              <label>Reason for Password Reset *</label>
              <textarea
                placeholder="Explain why you need an admin-assisted password reset"
                value={passwordData.reason}
                onChange={(e) => handlePasswordChange('reason', e.target.value)}
                required
                style={{ ...inputStyle(darkMode), minHeight: '80px', resize: 'vertical' }}
              />

              <div style={{
                padding: '12px',
                marginTop: '10px',
                backgroundColor: darkMode ? '#3a3a3a' : '#fff3cd',
                color: darkMode ? '#ffc107' : '#856404',
                borderRadius: '5px',
                border: '1px solid #ffc107',
                fontSize: '13px'
              }}>
                ⚠️ <strong>Note:</strong> Admin will approve/reject this request with comments. If approved, admin generates and shares a new temporary password.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : '📝 Submit Request'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ reason: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Account Info */}
        <section className="section-card">
          <h3>Account Information</h3>
          <p><strong>Account Role:</strong> {user?.role || 'organizer'}</p>
          <p><strong>Account Email:</strong> {user?.email}</p>
          <p><strong>Account Created:</strong> {new Date().toLocaleDateString()}</p>
        </section>
      </main>
    </div>
  );
}
