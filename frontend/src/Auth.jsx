import React, { useState } from 'react';
import axios from 'axios';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';
import callIcon from './assets/CalIicon.png';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await axios.post('${API}/api/auth/login', { username, password });
        onLogin(res.data.token, res.data.username);
      } else {
        await axios.post('${API}/api/auth/register', { username, password });
        // Automatically login after successful registration
        const res = await axios.post('${API}/api/auth/login', { username, password });
        onLogin(res.data.token, res.data.username);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="mesh-gradient"></div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-ring" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}><img src={callIcon} alt="Call Anexa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
          <h2>Call Anexa</h2>
          <p>{isLogin ? 'Sign in to manage your WhatsApp agents' : 'Start automating your WhatsApp workflows'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="input-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button className="text-btn" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
