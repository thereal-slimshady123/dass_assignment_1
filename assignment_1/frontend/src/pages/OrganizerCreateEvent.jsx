import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { addEvent, updateEvent, getEventById } from '../services/AuthAPI';
import { loadUser } from '../utils/profileStore';

// Fields editable per status
// draft      → all fields + form builder
// published  → description, reg_deadline (extend), reg_limit (increase), status
// ongoing    → status only
// completed  → status only
// closed     → nothing

const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  ongoing: 'Ongoing',
  completed: 'Completed',
  closed: 'Closed',
};

export default function OrganizerCreateEvent() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const user = useMemo(() => loadUser(), []);

  const isEditing = !!eventId;

  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error'); // 'error' | 'success'
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingEvent, setLoadingEvent] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // The original event status (for edit restrictions)
  const [originalStatus, setOriginalStatus] = useState(null);
  const [originalRegCount, setOriginalRegCount] = useState(0);
  const [originalRegLimit, setOriginalRegLimit] = useState(0);
  const [originalDeadline, setOriginalDeadline] = useState(null);

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
    if (!user || user.role !== 'organizer') { navigate('/'); return; }

    if (isEditing) {
      loadEventData();
    }
  }, [user, navigate, isEditing, eventId]);

  const toLocalDatetimeString = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d)) return '';
    // Format to "YYYY-MM-DDThh:mm"
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const loadEventData = async () => {
    try {
      setLoadingEvent(true);
      const response = await getEventById(eventId);
      const ev = response.data.event;

      setOriginalStatus(ev.status || 'draft');
      setOriginalRegCount(ev.reg_count || 0);
      setOriginalRegLimit(ev.reg_limit || 0);
      setOriginalDeadline(ev.reg_deadline);

      setEventData({
        eventName: ev.eventName || '',
        description: ev.description || '',
        type: ev.type || 'normal',
        eligibility: ev.eligibility || 'open',
        reg_deadline: toLocalDatetimeString(ev.reg_deadline),
        event_start: toLocalDatetimeString(ev.event_start),
        event_end: toLocalDatetimeString(ev.event_end),
        reg_limit: ev.reg_limit || 100,
        reg_fee: ev.reg_fee || 0,
        event_tags: Array.isArray(ev.event_tags) ? ev.event_tags.join(', ') : (ev.event_tags || ''),
        status: ev.status || 'draft'
      });

      if (ev.customForm && Array.isArray(ev.customForm)) {
        setCustomForm(ev.customForm);
      }
    } catch (err) {
      console.error('Failed to load event:', err);
      showMessage('Failed to load event data.', 'error');
    } finally {
      setLoadingEvent(false);
    }
  };

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
  };

  const handle = (field, value) =>
    setEventData(prev => ({ ...prev, [field]: value }));

  // ── CREATE flow ──────────────────────────────────────────────────────────────
  const handleCreate = async (publishNow) => {
    setSaving(true);
    setMessage('');
    try {
      if (!eventData.eventName || !eventData.description || !eventData.event_start || !eventData.event_end || !eventData.reg_deadline) {
        showMessage('Please fill all required fields.');
        return;
      }
      const tags = eventData.event_tags.split(',').map(t => t.trim()).filter(Boolean);
      if (!tags.length) { showMessage('Please enter at least one event tag.'); return; }

      const payload = {
        ...eventData,
        event_tags: tags,
        customForm,
        status: publishNow ? 'published' : 'draft'
      };

      const response = await addEvent(payload);
      showMessage(response.data.message || 'Event created!', 'success');
      setTimeout(() => navigate('/organizer-events'), 1800);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  // ── UPDATE flow ──────────────────────────────────────────────────────────────
  const handleUpdate = async (overridePayload) => {
    setSaving(true);
    setMessage('');
    try {
      const payload = overridePayload || buildPublishedPayload();
      const response = await updateEvent(eventId, payload);
      showMessage(response.data.message || 'Event updated!', 'success');
      setTimeout(() => navigate(`/organizer-event/${eventId}`), 1800);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const buildPublishedPayload = () => {
    const payload = { description: eventData.description };
    if (eventData.reg_deadline !== toLocalDatetimeString(originalDeadline)) {
      payload.reg_deadline = eventData.reg_deadline;
    }
    if (Number(eventData.reg_limit) !== originalRegLimit) {
      payload.reg_limit = Number(eventData.reg_limit);
    }
    return payload;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Form builder helpers
  const addFormField = () => {
    const newId = Math.max(...customForm.map(f => f.id), 0) + 1;
    setCustomForm([...customForm, { id: newId, type: 'text', label: 'New Field', required: false }]);
  };
  const updateFormField = (id, field, value) =>
    setCustomForm(customForm.map(f => f.id === id ? { ...f, [field]: value } : f));
  const removeFormField = (id) => {
    if (customForm.length > 1) setCustomForm(customForm.filter(f => f.id !== id));
  };
  const moveFormField = (id, dir) => {
    const idx = customForm.findIndex(f => f.id === id);
    if ((dir === 'up' && idx > 0) || (dir === 'down' && idx < customForm.length - 1)) {
      const arr = [...customForm];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      setCustomForm(arr);
    }
  };

  const inputStyle = (locked = false) => ({
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: darkMode ? '1px solid #555' : '1px solid #ddd',
    borderRadius: '5px',
    backgroundColor: locked ? (darkMode ? '#111' : '#f5f5f5') : (darkMode ? '#222' : '#fff'),
    color: locked ? '#aaa' : (darkMode ? '#fff' : '#111'),
    fontFamily: 'inherit',
    fontSize: '14px',
    cursor: locked ? 'not-allowed' : 'auto',
    opacity: locked ? 0.7 : 1,
  });

  if (loadingEvent) {
    return (
      <div className={darkMode ? 'user-root-dark' : 'user-root'}>
        <OrganizerNav darkMode={darkMode} />
        <header className={darkMode ? 'user-header-dark' : 'user-header'}><h1>Loading Event…</h1></header>
      </div>
    );
  }

  // ── EDIT MODE VIEWS ──────────────────────────────────────────────────────────

  // Ongoing / Completed → status change only
  if (isEditing && (originalStatus === 'ongoing' || originalStatus === 'completed')) {
    const allowedNext = originalStatus === 'ongoing'
      ? ['completed', 'closed']
      : ['closed'];

    return (
      <div className={darkMode ? 'user-root-dark' : 'user-root'}>
        <OrganizerNav darkMode={darkMode} />
        <header className={darkMode ? 'user-header-dark' : 'user-header'}>
          <h1>Edit Event</h1>
          <div className="header-actions">
            <button className="small-btn" onClick={() => setDarkMode(d => !d)}>{darkMode ? 'Light' : 'Dark'} Mode</button>
            <button className="secondary-btn" onClick={() => navigate(`/organizer-event/${eventId}`)}>← Back</button>
          </div>
        </header>
        <main className="user-main user-main-wide">
          <section className="content">
            <div className="section-card">
              <h3 style={{ marginTop: 0 }}>{eventData.eventName}</h3>
              <div style={{
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                ⚠️ This event is <strong>{STATUS_LABELS[originalStatus]}</strong>. Only status changes are permitted.
              </div>
              <p style={{ color: darkMode ? '#d1d5db' : '#374151', marginBottom: '8px', fontWeight: 600 }}>
                Change Status To:
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {allowedNext.map(s => (
                  <button
                    key={s}
                    className="primary-btn"
                    disabled={saving}
                    onClick={() => handleUpdate({ status: s })}
                    style={{
                      background: s === 'closed' ? '#dc2626' : '#059669',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : `Mark as ${STATUS_LABELS[s]}`}
                  </button>
                ))}
              </div>
              {message && (
                <p style={{
                  marginTop: '16px', padding: '10px', borderRadius: '6px',
                  color: messageType === 'success' ? '#059669' : '#dc2626',
                  background: messageType === 'success' ? '#f0fdf4' : '#fef2f2',
                }}>
                  {message}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Published → limited edits
  if (isEditing && (originalStatus === 'published' || originalStatus === 'closed')) {
    return (
      <div className={darkMode ? 'user-root-dark' : 'user-root'}>
        <OrganizerNav darkMode={darkMode} />
        <header className={darkMode ? 'user-header-dark' : 'user-header'}>
          <h1>Edit Event</h1>
          <div className="header-actions">
            <button className="small-btn" onClick={() => setDarkMode(d => !d)}>{darkMode ? 'Light' : 'Dark'} Mode</button>
            <button className="secondary-btn" onClick={() => navigate(`/organizer-event/${eventId}`)}>← Back</button>
          </div>
        </header>
        <main className="user-main user-main-wide">
          <section className="content">
            <div style={{
              padding: '12px 18px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              marginBottom: '12px',
              fontSize: '14px'
            }}>
              📌 This event is <strong>{STATUS_LABELS[originalStatus]}</strong>. Only description, registration deadline (extend), registration limit (increase), and status change are permitted.
            </div>

            <div className="section-card">
              <h3 style={{ marginTop: 0 }}>Editable Fields</h3>

              {/* Read-only title */}
              <label>Event Name <span style={{ color: '#9ca3af', fontSize: '12px' }}>(read-only)</span></label>
              <input type="text" value={eventData.eventName} readOnly style={inputStyle(true)} />

              <label>Description *</label>
              <textarea
                value={eventData.description}
                onChange={e => handle('description', e.target.value)}
                style={{ ...inputStyle(false), minHeight: '90px', resize: 'vertical' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Registration Deadline
                    <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '6px' }}>
                      (must extend – currently {originalDeadline ? new Date(originalDeadline).toLocaleString() : '—'})
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={eventData.reg_deadline}
                    onChange={e => handle('reg_deadline', e.target.value)}
                    style={inputStyle(false)}
                  />
                </div>
                <div>
                  <label>Registration Limit
                    <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '6px' }}>
                      (must increase – currently {originalRegLimit})
                    </span>
                  </label>
                  <input
                    type="number"
                    value={eventData.reg_limit}
                    onChange={e => handle('reg_limit', parseInt(e.target.value))}
                    style={inputStyle(false)}
                  />
                </div>
              </div>

              {/* Read-only fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Type <span style={{ color: '#9ca3af', fontSize: '12px' }}>(read-only)</span></label>
                  <input type="text" value={eventData.type} readOnly style={inputStyle(true)} />
                </div>
                <div>
                  <label>Eligibility <span style={{ color: '#9ca3af', fontSize: '12px' }}>(read-only)</span></label>
                  <input type="text" value={eventData.eligibility} readOnly style={inputStyle(true)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Event Start <span style={{ color: '#9ca3af', fontSize: '12px' }}>(read-only)</span></label>
                  <input type="datetime-local" value={eventData.event_start} readOnly style={inputStyle(true)} />
                </div>
                <div>
                  <label>Event End <span style={{ color: '#9ca3af', fontSize: '12px' }}>(read-only)</span></label>
                  <input type="datetime-local" value={eventData.event_end} readOnly style={inputStyle(true)} />
                </div>
              </div>

              {/* Form locked notice */}
              <div style={{
                marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                background: originalRegCount > 0 ? '#fef2f2' : '#f0fdf4',
                color: originalRegCount > 0 ? '#dc2626' : '#059669',
                fontSize: '13px'
              }}>
                {originalRegCount > 0
                  ? `🔒 Registration form is locked (${originalRegCount} registration${originalRegCount !== 1 ? 's' : ''} received).`
                  : '✅ Registration form is not locked yet (no registrations).'}
              </div>

              {/* Close registrations */}
              {originalStatus === 'published' && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 10px' }}>Status Change</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="secondary-btn"
                      style={{ color: '#dc2626', borderColor: '#dc2626' }}
                      disabled={saving}
                      onClick={() => handleUpdate({ status: 'closed' })}
                    >
                      {saving ? 'Saving…' : '🔒 Close Registrations'}
                    </button>
                    <button
                      className="secondary-btn"
                      style={{ color: '#d97706', borderColor: '#d97706' }}
                      disabled={saving}
                      onClick={() => handleUpdate({ status: 'ongoing' })}
                    >
                      {saving ? 'Saving…' : '▶ Mark as Ongoing'}
                    </button>
                  </div>
                </div>
              )}

              {message && (
                <p style={{
                  marginTop: '16px', padding: '10px', borderRadius: '6px',
                  color: messageType === 'success' ? '#059669' : '#dc2626',
                  background: messageType === 'success' ? '#f0fdf4' : '#fef2f2',
                }}>
                  {message}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button
                  className="primary-btn"
                  disabled={saving}
                  onClick={() => handleUpdate()}
                >
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
                <button className="secondary-btn" onClick={() => navigate(`/organizer-event/${eventId}`)}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ── CREATE / DRAFT EDIT MODE (full form) ────────────────────────────────────
  const formLocked = isEditing && originalRegCount > 0;

  return (
    <div className={darkMode ? 'user-root-dark' : 'user-root'}>
      <OrganizerNav darkMode={darkMode} />

      <header className={darkMode ? 'user-header-dark' : 'user-header'}>
        <h1>{isEditing ? `Edit Draft: ${eventData.eventName}` : 'Create New Event'}</h1>
        <div className="header-actions">
          <button className="small-btn" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? 'Light' : 'Dark'} Mode
          </button>
          {isEditing && (
            <button className="secondary-btn" onClick={() => navigate(`/organizer-event/${eventId}`)}>
              ← Back
            </button>
          )}
        </div>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          {/* Step Indicator */}
          <div className="step-indicator">
            {[1, 2, 3].map(s => (
              <button
                key={s}
                className={`step ${currentStep === s ? 'active' : ''}`}
                onClick={() => setCurrentStep(s)}
              >
                {s === 1 ? '1. Event Details' : s === 2 ? '2. Registration Form' : '3. Review & Save'}
              </button>
            ))}
          </div>

          <div className="section-card">
            {/* ── STEP 1 ── */}
            {currentStep === 1 && (
              <div>
                <h3>Event Details</h3>

                <label>Event Name *</label>
                <input
                  type="text"
                  placeholder="Enter event name"
                  value={eventData.eventName}
                  onChange={e => handle('eventName', e.target.value)}
                  required
                  style={inputStyle(false)}
                />

                <label>Description *</label>
                <textarea
                  placeholder="Enter event description"
                  value={eventData.description}
                  onChange={e => handle('description', e.target.value)}
                  required
                  style={{ ...inputStyle(false), minHeight: '80px', resize: 'vertical' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label>Event Type</label>
                    <select value={eventData.type} onChange={e => handle('type', e.target.value)} style={inputStyle(false)}>
                      <option value="normal">Normal</option>
                      <option value="merchandise">Merchandise</option>
                    </select>
                  </div>
                  <div>
                    <label>Eligibility</label>
                    <select value={eventData.eligibility} onChange={e => handle('eligibility', e.target.value)} style={inputStyle(false)}>
                      <option value="open">Open</option>
                      <option value="member-only">Member-only</option>
                    </select>
                  </div>
                </div>

                <label>Registration Deadline *</label>
                <input type="datetime-local" value={eventData.reg_deadline} onChange={e => handle('reg_deadline', e.target.value)} required style={inputStyle(false)} />

                <label>Event Start *</label>
                <input type="datetime-local" value={eventData.event_start} onChange={e => handle('event_start', e.target.value)} required style={inputStyle(false)} />

                <label>Event End *</label>
                <input type="datetime-local" value={eventData.event_end} onChange={e => handle('event_end', e.target.value)} required style={inputStyle(false)} />

                <label>Registration Limit</label>
                <input type="number" value={eventData.reg_limit} onChange={e => handle('reg_limit', parseInt(e.target.value))} style={inputStyle(false)} />

                <label>Registration Fee (₹)</label>
                <input type="number" value={eventData.reg_fee} onChange={e => handle('reg_fee', parseFloat(e.target.value))} style={inputStyle(false)} />

                <label>Event Tags (comma separated)</label>
                <input type="text" placeholder="e.g., Coding, Hackathon, Tech" value={eventData.event_tags} onChange={e => handle('event_tags', e.target.value)} style={inputStyle(false)} />

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="primary-btn" onClick={() => setCurrentStep(2)}>Next: Create Form →</button>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {currentStep === 2 && (
              <div>
                <h3>Custom Registration Form</h3>
                {formLocked ? (
                  <div style={{
                    padding: '14px 18px', borderRadius: '8px', background: '#fef2f2',
                    color: '#dc2626', border: '1px solid #fca5a5', marginBottom: '16px', fontSize: '14px'
                  }}>
                    🔒 Form is <strong>locked</strong> — {originalRegCount} registration{originalRegCount !== 1 ? 's' : ''} received. Fields cannot be changed.
                  </div>
                ) : (
                  <p className="muted">Build a custom registration form for your event. Forms are locked after the first registration.</p>
                )}

                <div style={{ marginTop: '16px' }}>
                  {customForm.map((field, index) => (
                    <div
                      key={field.id}
                      style={{
                        padding: '15px',
                        marginBottom: '10px',
                        border: darkMode ? '1px solid #555' : '1px solid #ddd',
                        borderRadius: '5px',
                        backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
                        opacity: formLocked ? 0.65 : 1
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div>
                          <label>Field Type</label>
                          <select
                            value={field.type}
                            onChange={e => updateFormField(field.id, 'type', e.target.value)}
                            disabled={formLocked}
                            style={inputStyle(formLocked)}
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
                            onChange={e => updateFormField(field.id, 'label', e.target.value)}
                            disabled={formLocked}
                            style={inputStyle(formLocked)}
                          />
                        </div>
                        {field.type === 'dropdown' && (
                          <div>
                            <label>Options (comma-separated)</label>
                            <input
                              type="text"
                              placeholder="Option A, Option B"
                              value={field.options || ''}
                              onChange={e => updateFormField(field.id, 'options', e.target.value)}
                              disabled={formLocked}
                              style={inputStyle(formLocked)}
                            />
                          </div>
                        )}
                        {field.type !== 'dropdown' && (
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => updateFormField(field.id, 'required', e.target.checked)}
                                disabled={formLocked}
                              />
                              Required
                            </label>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                        <button type="button" className="small-btn" onClick={() => moveFormField(field.id, 'up')} disabled={index === 0 || formLocked}>↑ Move Up</button>
                        <button type="button" className="small-btn" onClick={() => moveFormField(field.id, 'down')} disabled={index === customForm.length - 1 || formLocked}>↓ Move Down</button>
                        <button type="button" className="small-btn" onClick={() => removeFormField(field.id)} disabled={customForm.length === 1 || formLocked}>🗑️ Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                {!formLocked && (
                  <button type="button" className="secondary-btn" onClick={addFormField} style={{ marginTop: '15px' }}>
                    + Add Form Field
                  </button>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="secondary-btn" onClick={() => setCurrentStep(1)}>← Back</button>
                  <button type="button" className="primary-btn" onClick={() => setCurrentStep(3)}>Next: Review & Save →</button>
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {currentStep === 3 && (
              <div>
                <h3>{isEditing ? 'Review & Save' : 'Review & Publish'}</h3>

                <div className="review-section" style={{ marginBottom: '20px' }}>
                  <h4>Event Summary</h4>
                  <div style={{ padding: '15px', backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9', borderRadius: '5px' }}>
                    <p><strong>Name:</strong> {eventData.eventName}</p>
                    <p><strong>Type:</strong> {eventData.type}</p>
                    <p><strong>Fee:</strong> ₹{eventData.reg_fee}</p>
                    <p><strong>Limit:</strong> {eventData.reg_limit} registrations</p>
                    <p><strong>Deadline:</strong> {eventData.reg_deadline ? new Date(eventData.reg_deadline).toLocaleString() : '—'}</p>
                    <p><strong>Start:</strong> {eventData.event_start ? new Date(eventData.event_start).toLocaleString() : '—'}</p>
                    <p><strong>End:</strong> {eventData.event_end ? new Date(eventData.event_end).toLocaleString() : '—'}</p>
                    <p><strong>Status:</strong> {isEditing ? STATUS_LABELS[originalStatus] : 'Will be set on save'}</p>
                  </div>
                </div>

                <div className="review-section">
                  <h4>Registration Form Fields {formLocked && <span style={{ color: '#dc2626', fontSize: '12px' }}>(🔒 Locked)</span>}</h4>
                  <div style={{ padding: '15px', backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9', borderRadius: '5px' }}>
                    {customForm.map((field, i) => (
                      <p key={field.id} style={{ margin: '4px 0' }}>
                        {i + 1}. {field.label} ({field.type})
                        {field.required && <strong style={{ color: 'red' }}> *</strong>}
                        {field.type === 'dropdown' && field.options && <span style={{ color: '#9ca3af', fontSize: '12px' }}> — [{field.options}]</span>}
                      </p>
                    ))}
                  </div>
                </div>

                {message && (
                  <p style={{
                    marginTop: '15px', padding: '10px', borderRadius: '5px',
                    color: messageType === 'success' ? '#059669' : '#dc2626',
                    backgroundColor: messageType === 'success' ? '#f0fdf4' : '#fef2f2',
                  }}>
                    {message}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <button type="button" className="secondary-btn" onClick={() => setCurrentStep(2)}>← Back</button>

                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={saving}
                        onClick={() => handleUpdate({ ...eventData, event_tags: eventData.event_tags.split(',').map(t => t.trim()).filter(Boolean), customForm })}
                      >
                        {saving ? 'Saving…' : '💾 Save as Draft'}
                      </button>
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={saving}
                        style={{ background: '#2563eb' }}
                        onClick={() => handleUpdate({
                          ...eventData,
                          event_tags: eventData.event_tags.split(',').map(t => t.trim()).filter(Boolean),
                          customForm,
                          status: 'published'
                        })}
                      >
                        {saving ? 'Publishing…' : '🚀 Save & Publish'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="secondary-btn" disabled={saving} onClick={() => handleCreate(false)}>
                        {saving ? 'Saving…' : '💾 Save as Draft'}
                      </button>
                      <button type="button" className="primary-btn" disabled={saving} onClick={() => handleCreate(true)}>
                        {saving ? 'Publishing…' : '✓ Create & Publish'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
