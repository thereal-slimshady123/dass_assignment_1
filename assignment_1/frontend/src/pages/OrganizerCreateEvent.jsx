import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { addEvent } from '../services/AuthAPI';
import { loadUser } from '../utils/profileStore';

export default function OrganizerCreateEvent() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const user = useMemo(() => loadUser(), []);
  
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing] = useState(!!eventId);
  const [currentStep, setCurrentStep] = useState(1);

  const [eventData, setEventData] = useState({
    eventName: '',
    description: '',
    type: 'normal',
    eligibility: 'open',
    reg_deadline: '',
    event_start: '',
    event_end: '',
    reg_limit: 100,
    reg_fee: 0,
    event_tags: '',
    status: 'draft'
  });

  const [customForm, setCustomForm] = useState([
    { id: 1, type: 'text', label: 'Full Name', required: true }
  ]);

  useEffect(() => {
    if (!user || user.role !== 'organizer') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEventDataChange = (field, value) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      if (!eventData.eventName || !eventData.description || !eventData.event_start || !eventData.event_end) {
        setMessage('Please fill all required fields');
        return;
      }

      if (!eventData.reg_deadline) {
        setMessage('Please set a registration deadline');
        return;
      }

      const payload = {
        ...eventData,
        event_tags: eventData.event_tags.split(',').map(t => t.trim()).filter(Boolean),
        customForm: customForm,
        status: 'published' // Set to published when submitting
      };

      console.log('Submitting event:', payload);

      const response = await addEvent(payload);
      setMessage(response.data.message || 'Event created successfully!');
      
      setTimeout(() => {
        navigate('/organizer-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Event creation error:', error);
      setMessage(error.response?.data?.message || 'Failed to create event');
    }
  };

  const addFormField = () => {
    const newId = Math.max(...customForm.map(f => f.id), 0) + 1;
    setCustomForm([
      ...customForm,
      { id: newId, type: 'text', label: 'New Field', required: false }
    ]);
  };

  const updateFormField = (id, field, value) => {
    setCustomForm(customForm.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const removeFormField = (id) => {
    if (customForm.length > 1) {
      setCustomForm(customForm.filter(f => f.id !== id));
    }
  };

  const moveFormField = (id, direction) => {
    const index = customForm.findIndex(f => f.id === id);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < customForm.length - 1)
    ) {
      const newForm = [...customForm];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newForm[index], newForm[swapIndex]] = [newForm[swapIndex], newForm[index]];
      setCustomForm(newForm);
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
        <h1>{isEditing ? 'Edit Event' : 'Create New Event'}</h1>
        <div className="header-actions">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="small-btn"
          >
            {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          {/* Step Indicator */}
          <div className="step-indicator">
            <button 
              className={`step ${currentStep === 1 ? 'active' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              1. Event Details
            </button>
            <button 
              className={`step ${currentStep === 2 ? 'active' : ''}`}
              onClick={() => setCurrentStep(2)}
            >
              2. Registration Form
            </button>
            <button 
              className={`step ${currentStep === 3 ? 'active' : ''}`}
              onClick={() => setCurrentStep(3)}
            >
              3. Review & Publish
            </button>
          </div>

          <div className="section-card">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Event Details */}
              {currentStep === 1 && (
                <div>
                  <h3>Event Details</h3>
                  
                  <label>Event Name *</label>
                  <input
                    type="text"
                    placeholder="Enter event name"
                    value={eventData.eventName}
                    onChange={(e) => handleEventDataChange('eventName', e.target.value)}
                    required
                    style={inputStyle(darkMode)}
                  />

                  <label>Description *</label>
                  <textarea
                    placeholder="Enter event description"
                    value={eventData.description}
                    onChange={(e) => handleEventDataChange('description', e.target.value)}
                    required
                    style={{ ...inputStyle(darkMode), minHeight: '80px', resize: 'vertical' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label>Event Type</label>
                      <select 
                        value={eventData.type}
                        onChange={(e) => handleEventDataChange('type', e.target.value)}
                        style={inputStyle(darkMode)}
                      >
                        <option value="normal">Normal</option>
                        <option value="merchandise">Merchandise</option>
                      </select>
                    </div>

                    <div>
                      <label>Eligibility</label>
                      <select 
                        value={eventData.eligibility}
                        onChange={(e) => handleEventDataChange('eligibility', e.target.value)}
                        style={inputStyle(darkMode)}
                      >
                        <option value="open">Open</option>
                        <option value="member-only">Member-only</option>
                      </select>
                    </div>
                  </div>

                  <label>Registration Deadline *</label>
                  <input
                    type="datetime-local"
                    value={eventData.reg_deadline}
                    onChange={(e) => handleEventDataChange('reg_deadline', e.target.value)}
                    required
                    style={inputStyle(darkMode)}
                  />

                  <label>Event Start *</label>
                  <input
                    type="datetime-local"
                    value={eventData.event_start}
                    onChange={(e) => handleEventDataChange('event_start', e.target.value)}
                    required
                    style={inputStyle(darkMode)}
                  />

                  <label>Event End *</label>
                  <input
                    type="datetime-local"
                    value={eventData.event_end}
                    onChange={(e) => handleEventDataChange('event_end', e.target.value)}
                    required
                    style={inputStyle(darkMode)}
                  />

                  <label>Registration Limit</label>
                  <input
                    type="number"
                    placeholder="Enter registration limit"
                    value={eventData.reg_limit}
                    onChange={(e) => handleEventDataChange('reg_limit', parseInt(e.target.value))}
                    style={inputStyle(darkMode)}
                  />

                  <label>Registration Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter registration fee"
                    value={eventData.reg_fee}
                    onChange={(e) => handleEventDataChange('reg_fee', parseFloat(e.target.value))}
                    style={inputStyle(darkMode)}
                  />

                  <label>Event Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., Coding, Hackathon, Tech"
                    value={eventData.event_tags}
                    onChange={(e) => handleEventDataChange('event_tags', e.target.value)}
                    style={inputStyle(darkMode)}
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button"
                      className="primary-btn"
                      onClick={() => setCurrentStep(2)}
                    >
                      Next: Create Form →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Registration Form Builder */}
              {currentStep === 2 && (
                <div>
                  <h3>Custom Registration Form</h3>
                  <p className="muted">Build a custom registration form for your event. Forms are locked after the first registration.</p>

                  <div style={{ marginTop: '20px' }}>
                    {customForm.map((field, index) => (
                      <div key={field.id} style={{ 
                        padding: '15px', 
                        marginBottom: '10px',
                        border: darkMode ? '1px solid #555' : '1px solid #ddd',
                        borderRadius: '5px',
                        backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          <div>
                            <label>Field Type</label>
                            <select 
                              value={field.type}
                              onChange={(e) => updateFormField(field.id, 'type', e.target.value)}
                              style={inputStyle(darkMode)}
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="number">Number</option>
                              <option value="dropdown">Dropdown</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="file">File Upload</option>
                              <option value="textarea">Text Area</option>
                            </select>
                          </div>

                          <div>
                            <label>Field Label</label>
                            <input
                              type="text"
                              placeholder="e.g., Phone Number"
                              value={field.label}
                              onChange={(e) => updateFormField(field.id, 'label', e.target.value)}
                              style={inputStyle(darkMode)}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateFormField(field.id, 'required', e.target.checked)}
                              />
                              Required
                            </label>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                          <button 
                            type="button"
                            className="small-btn"
                            onClick={() => moveFormField(field.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑ Move Up
                          </button>
                          <button 
                            type="button"
                            className="small-btn"
                            onClick={() => moveFormField(field.id, 'down')}
                            disabled={index === customForm.length - 1}
                          >
                            ↓ Move Down
                          </button>
                          <button 
                            type="button"
                            className="small-btn"
                            onClick={() => removeFormField(field.id)}
                            disabled={customForm.length === 1}
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button"
                    className="secondary-btn"
                    onClick={addFormField}
                    style={{ marginTop: '15px' }}
                  >
                    + Add Form Field
                  </button>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button"
                      className="secondary-btn"
                      onClick={() => setCurrentStep(1)}
                    >
                      ← Back
                    </button>
                    <button 
                      type="button"
                      className="primary-btn"
                      onClick={() => setCurrentStep(3)}
                    >
                      Next: Review & Publish →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Publish */}
              {currentStep === 3 && (
                <div>
                  <h3>Review & Publish</h3>
                  
                  <div className="review-section" style={{ marginBottom: '20px' }}>
                    <h4>Event Summary</h4>
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
                      borderRadius: '5px'
                    }}>
                      <p><strong>Name:</strong> {eventData.eventName}</p>
                      <p><strong>Type:</strong> {eventData.type}</p>
                      <p><strong>Fee:</strong> ₹{eventData.reg_fee}</p>
                      <p><strong>Limit:</strong> {eventData.reg_limit} registrations</p>
                      <p><strong>Status:</strong> {eventData.status}</p>
                    </div>
                  </div>

                  <div className="review-section">
                    <h4>Registration Form Fields</h4>
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
                      borderRadius: '5px'
                    }}>
                      {customForm.map((field, index) => (
                        <p key={field.id}>
                          {index + 1}. {field.label} ({field.type})
                          {field.required && <strong style={{ color: 'red' }}> *</strong>}
                        </p>
                      ))}
                    </div>
                  </div>

                  {message && (
                    <p style={{ 
                      marginTop: '15px',
                      padding: '10px',
                      color: message.includes('success') ? '#28a745' : '#dc3545',
                      backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
                      borderRadius: '5px'
                    }}>
                      {message}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button"
                      className="secondary-btn"
                      onClick={() => setCurrentStep(2)}
                    >
                      ← Back
                    </button>
                    <button 
                      type="submit"
                      className="primary-btn"
                    >
                      ✓ Create & Publish Event
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
