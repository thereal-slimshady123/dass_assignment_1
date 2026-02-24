import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../login.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      setMessage(response.data.message);
      setEmail('');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Reset Password</h2>
        <p className="muted">Enter your email address and we'll send you a link to reset your password.</p>

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {message && <p className="message-success">{message}</p>}
          {error && <p className="message-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p>
          Remember your password? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
}
