import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, MessageCircle, Users, Clock, Calendar } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Dashboard({ sessionId, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [sessionId]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/api/analytics/${sessionId}`);
      setAnalytics(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Loading Analytics...</h2>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>No Analytics Available</h2>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><BarChart3 size={24} /> Analytics Dashboard</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <MessageCircle size={24} />
            </div>
            <div className="stat-info">
              <h3>{analytics.total}</h3>
              <p>Total Messages</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <h3>{analytics.incoming}</h3>
              <p>Received</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <TrendingUp size={24} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <div className="stat-info">
              <h3>{analytics.outgoing}</h3>
              <p>Sent</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <h3>{analytics.last24h}</h3>
              <p>Last 24 Hours</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pink">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <h3>{analytics.last7days}</h3>
              <p>Last 7 Days</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon teal">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h3>{analytics.topContacts?.length || 0}</h3>
              <p>Active Contacts</p>
            </div>
          </div>
        </div>

        <div className="top-contacts-section">
          <h3>Top Contacts</h3>
          <div className="contacts-list">
            {analytics.topContacts?.length > 0 ? (
              analytics.topContacts.map((contact, idx) => (
                <div key={idx} className="contact-item">
                  <span className="contact-rank">#{idx + 1}</span>
                  <span className="contact-name">{contact.contact}</span>
                  <span className="contact-count">{contact.count} messages</span>
                </div>
              ))
            ) : (
              <p className="text-muted">No contacts yet</p>
            )}
          </div>
        </div>

        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default Dashboard;
