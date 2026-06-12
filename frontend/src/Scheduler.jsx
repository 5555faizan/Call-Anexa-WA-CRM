import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Send, Trash2, CheckCircle } from 'lucide-react';

function Scheduler({ sessionId, onClose }) {
  const [scheduled, setScheduled] = useState([]);
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduled();
  }, [sessionId]);

  const fetchScheduled = async () => {
    try {
      const res = await axios.get(`${API}/api/scheduled/${sessionId}`);
      setScheduled(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching scheduled:', err);
      setLoading(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();

    if (!contact || !message || !date || !time) {
      alert('Please fill all fields');
      return;
    }

    const scheduledTime = new Date(`${date}T${time}`).getTime();

    if (scheduledTime < Date.now()) {
      alert('Please select a future date and time');
      return;
    }

    try {
      await axios.post('${API}/api/scheduled/add', {
        sessionId,
        contact,
        message,
        scheduledTime
      });

      setContact('');
      setMessage('');
      setDate('');
      setTime('');
      fetchScheduled();
    } catch (err) {
      console.error('Error scheduling:', err);
      alert('Failed to schedule message');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this scheduled message?')) {
      try {
        await axios.delete(`${API}/api/scheduled/${id}`);
        fetchScheduled();
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content scheduler-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Clock size={24} /> Message Scheduler</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form className="scheduler-form" onSubmit={handleSchedule}>
          <div className="form-group">
            <label>Contact Number (with country code)</label>
            <input
              type="text"
              placeholder="e.g., 923001234567@s.whatsapp.net"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-textarea"
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <Send size={18} /> Schedule Message
          </button>
        </form>

        <div className="scheduled-list">
          <h3>Scheduled Messages ({scheduled.length})</h3>

          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : scheduled.length === 0 ? (
            <p className="text-muted">No scheduled messages</p>
          ) : (
            <div className="scheduled-items">
              {scheduled.map((item) => (
                <div key={item.id} className={`scheduled-item ${item.status}`}>
                  <div className="scheduled-info">
                    <div className="scheduled-header">
                      <strong>{item.contact}</strong>
                      <span className={`status-badge ${item.status}`}>
                        {item.status === 'sent' && <CheckCircle size={14} />}
                        {item.status}
                      </span>
                    </div>
                    <p className="scheduled-message">{item.message}</p>
                    <small className="scheduled-time">
                      <Calendar size={14} /> {formatDate(item.scheduled_time)}
                    </small>
                  </div>
                  {item.status === 'pending' && (
                    <button
                      className="btn-icon-small danger"
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Scheduler;
