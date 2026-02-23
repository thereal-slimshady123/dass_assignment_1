import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadUser } from "../utils/profileStore";
import {
  getEventById,
  createMerchandiseOrder,
  getUserMerchandiseOrders,
  getEventForumMessages,
  createForumPost,
  deleteForumPost,
  togglePinForumPost,
  toggleForumReaction
} from "../services/AuthAPI";
import { addRegistration, updateEventOnRegister, loadRegistrations } from "../utils/eventStore";
import { createForumSocket, getForumUnreadCount, markForumSeen } from "../utils/forumRealtime";

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [teamName, setTeamName] = useState("");
  const [msg, setMsg] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  // Merchandise payment flow state
  const [mercStep, setMercStep] = useState("info"); // "info" | "upload" | "submitted"
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingOrder, setExistingOrder] = useState(null);
  const [customFormResponses, setCustomFormResponses] = useState({});
  const [customFormError, setCustomFormError] = useState('');
  const [forumMessages, setForumMessages] = useState([]);
  const [forumInput, setForumInput] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [forumMode, setForumMode] = useState("discussion");
  const [postAsAnnouncement, setPostAsAnnouncement] = useState(false);
  const [forumMsg, setForumMsg] = useState("");
  const [forumUnread, setForumUnread] = useState(0);

  const currentUser = loadUser();
  const currentUserId = currentUser?.id || "";
  const currentUserEmail = currentUser?.email || "";
  const currentUserKey = currentUserEmail || currentUserId;

  const refreshForum = useCallback(async () => {
    if (!eventId) return;
    try {
      const response = await getEventForumMessages(eventId);
      const nextMessages = Array.isArray(response.data?.messages) ? response.data.messages : [];
      setForumMessages(nextMessages);

      if (currentUserKey) {
        setForumUnread(
          getForumUnreadCount({
            eventId,
            userKey: currentUserKey,
            ownUserId: currentUserId,
            messages: nextMessages
          })
        );
      }
    } catch {
      setForumMsg("Failed to load forum messages.");
    }
  }, [eventId, currentUserId, currentUserKey]);

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      try {
        const response = await getEventById(eventId);
        if (isMounted) {
          const ev = response.data.event || null;
          setEvent(ev);

          const user = loadUser();
          if (user) {
            // Check localStorage registration (non-merch)
            const registrations = loadRegistrations();
            const alreadyRegistered = registrations.some(
              reg => reg.eventId === eventId && reg.participant?.email === user.email
            );
            setIsRegistered(alreadyRegistered);

            // For merchandise events: fetch real order status from backend
            if (ev?.type === "merchandise") {
              try {
                const ordersRes = await getUserMerchandiseOrders();
                const orders = ordersRes.data.orders || [];
                const found = orders.find(o =>
                  (o.eventId?.toString() === eventId || o.eventId === eventId)
                );
                if (found) setExistingOrder(found);
              } catch {
                // fall through — no existing order
              }
            }

            const formFields = Array.isArray(ev?.customForm) ? ev.customForm : [];
            const initialResponses = {};
            formFields.forEach((field) => {
              const key = String(field.id);
              if (field.type === 'checkbox') {
                initialResponses[key] = false;
              } else {
                initialResponses[key] = '';
              }
            });
            setCustomFormResponses(initialResponses);
          }
        }
      } catch {
        if (isMounted) setErrorMsg("Event not found.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchEvent();
    return () => { isMounted = false; };
  }, [eventId]);

  useEffect(() => {
    refreshForum();
  }, [refreshForum]);

  useEffect(() => {
    if (!eventId) return undefined;
    const socket = createForumSocket();

    socket.emit("forum:join", { eventId });
    socket.on("forum:update", (payload) => {
      if (String(payload?.eventId) !== String(eventId)) return;
      refreshForum();
    });

    return () => {
      socket.emit("forum:leave", { eventId });
      socket.disconnect();
    };
  }, [eventId, refreshForum]);


  if (loading) {
    return (
      <div className="user-root">
        <UserNav />
        <header className="user-header"><h1>Loading Event...</h1></header>
      </div>
    );
  }

  if (!event || errorMsg) {
    return (
      <div className="user-root">
        <UserNav />
        <header className="user-header"><h1>Event Not Found</h1></header>
      </div>
    );
  }

  const now = new Date();
  const deadlinePassed = new Date(event.reg_deadline) < now;
  const outOfStock = event.type === "merchandise"
    ? (event.stock ?? 0) <= 0
    : (event.reg_limit ?? 0) <= 0;
  const isMerchandise = event.type === "merchandise";
  const customFormFields = Array.isArray(event.customForm) ? event.customForm : [];
  const isOrganizerOwner = currentUser?.role === "organizer" && String(currentUserId) === String(event.organizer?.id || "");
  const canModerateForum = currentUser?.role === "admin" || isOrganizerOwner;
  const canPostForum = Boolean(currentUser) && (canModerateForum || isRegistered || existingOrder?.status === "approved");
  const reactionOptions = ["👍", "❤️", "🎉", "❓", "💀"];

  const markForumAsRead = () => {
    if (!currentUserKey) return;
    markForumSeen({ eventId, userKey: currentUserKey });
    setForumUnread(0);
  };

  const handlePostForumMessage = async ({ parentId = null } = {}) => {
    const content = parentId ? replyInputs[parentId] : forumInput;
    const text = String(content || "").trim();

    if (!text) return;
    if (!canPostForum) {
      setForumMsg("Only registered participants can post in this discussion.");
      return;
    }

    try {
      await createForumPost(eventId, {
        parentId,
        text,
        isAnnouncement: parentId ? false : (canModerateForum && postAsAnnouncement)
      });
    } catch (error) {
      setForumMsg(error?.response?.data?.message || "Unable to post forum message.");
      return;
    }

    if (parentId) {
      setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
    } else {
      setForumInput("");
    }

    setForumMsg("");
    markForumAsRead();
    await refreshForum();
  };

  const handleDeleteForumMessage = async (message) => {
    if (!canModerateForum || !window.confirm("Delete this message?")) return;
    try {
      await deleteForumPost(eventId, message.id);
      await refreshForum();
    } catch (error) {
      setForumMsg(error?.response?.data?.message || "Unable to delete message.");
    }
  };

  const handleTogglePinForumMessage = async (message) => {
    if (!canModerateForum) return;
    try {
      await togglePinForumPost(eventId, message.id);
      await refreshForum();
    } catch (error) {
      setForumMsg(error?.response?.data?.message || "Unable to update pin status.");
    }
  };

  const handleToggleReaction = async (message, emoji) => {
    if (!currentUserId) {
      setForumMsg("Please log in to react.");
      return;
    }
    try {
      await toggleForumReaction(eventId, message.id, emoji);
      await refreshForum();
    } catch (error) {
      setForumMsg(error?.response?.data?.message || "Unable to update reaction.");
    }
  };

  const visibleRootMessages = forumMessages
    .filter((message) => !message.parentId)
    .filter((message) => forumMode === "discussion" ? !message.isAnnouncement : message.isAnnouncement)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const getReplies = (parentId) => forumMessages
    .filter((message) => message.parentId === parentId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const renderForumMessage = (message, depth = 0) => {
    const replies = getReplies(message.id);
    const createdAt = new Date(message.createdAt).toLocaleString();
    const canReply = canPostForum && !message.isDeleted;

    return (
      <div key={message.id} className="forum-item" style={{ marginLeft: depth > 0 ? "20px" : 0 }}>
        <div className="forum-item-header">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <strong>{message.author?.name || "Participant"}</strong>
            <span className="muted" style={{ fontSize: "12px" }}>{createdAt}</span>
            {message.isAnnouncement && <span className="pill">Announcement</span>}
            {message.isPinned && <span className="pill">Pinned</span>}
          </div>
          {canModerateForum && (
            <div className="card-actions">
              {!message.parentId && (
                <button type="button" className="small-btn" onClick={() => handleTogglePinForumMessage(message)}>
                  {message.isPinned ? "Unpin" : "Pin"}
                </button>
              )}
              <button type="button" className="small-btn" onClick={() => handleDeleteForumMessage(message)}>Delete</button>
            </div>
          )}
        </div>

        <p style={{ margin: "8px 0 10px" }}>{message.text}</p>

        <div className="forum-reactions">
          {reactionOptions.map((emoji) => {
            const users = Array.isArray(message.reactions?.[emoji]) ? message.reactions[emoji] : [];
            const reacted = users.includes(String(currentUserId));
            return (
              <button
                key={`${message.id}-${emoji}`}
                type="button"
                className={reacted ? "small-btn" : "link-btn"}
                onClick={() => handleToggleReaction(message, emoji)}
              >
                {emoji} {users.length > 0 ? users.length : ""}
              </button>
            );
          })}
        </div>

        {canReply && (
          <div className="forum-reply-box">
            <input
              className="input"
              placeholder="Write a reply..."
              value={replyInputs[message.id] || ""}
              onChange={(e) => setReplyInputs((prev) => ({ ...prev, [message.id]: e.target.value }))}
            />
            <button type="button" className="small-btn" onClick={() => handlePostForumMessage({ parentId: message.id })}>
              Reply
            </button>
          </div>
        )}

        {replies.length > 0 && (
          <div style={{ marginTop: "10px", display: "grid", gap: "10px" }}>
            {replies.map((reply) => renderForumMessage(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const updateCustomFormResponse = (fieldId, value) => {
    setCustomFormResponses((prev) => ({
      ...prev,
      [String(fieldId)]: value
    }));
    setCustomFormError('');
  };

  const validateCustomForm = () => {
    const missingField = customFormFields.find((field) => {
      if (!field?.required) return false;
      const key = String(field.id);
      const value = customFormResponses[key];

      if (field.type === 'checkbox') return value !== true;
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingField) {
      setCustomFormError(`Please fill required field: ${missingField.label || `Field ${missingField.id}`}`);
      return false;
    }

    return true;
  };

  const renderCustomFormFieldInput = (field) => {
    const value = customFormResponses[String(field.id)] ?? (field.type === 'checkbox' ? false : '');

    if (field.type === 'textarea') {
      return (
        <textarea
          value={String(value)}
          onChange={(e) => updateCustomFormResponse(field.id, e.target.value)}
          className="input"
          style={{ minHeight: '90px', resize: 'vertical' }}
          placeholder={field.label || 'Enter response'}
        />
      );
    }

    if (field.type === 'dropdown') {
      const options = String(field.options || '')
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean);

      return (
        <select
          value={String(value)}
          onChange={(e) => updateCustomFormResponse(field.id, e.target.value)}
          className="input"
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => updateCustomFormResponse(field.id, e.target.checked)}
          />
          <span className="muted">Check to confirm</span>
        </label>
      );
    }

    if (field.type === 'file') {
      return (
        <input
          type="file"
          className="input"
          onChange={(e) => updateCustomFormResponse(field.id, e.target.files?.[0]?.name || '')}
        />
      );
    }

    const inputType = ['email', 'number'].includes(field.type) ? field.type : 'text';
    return (
      <input
        type={inputType}
        value={String(value)}
        onChange={(e) => updateCustomFormResponse(field.id, e.target.value)}
        className="input"
        placeholder={field.label || 'Enter response'}
      />
    );
  };

  // --- Normal event registration ---
  const handleRegister = async () => {
    setMsg("");
    if (deadlinePassed || outOfStock) { setMsg("Registration is closed for this event."); return; }
    const user = loadUser();
    if (!user) { setMsg("Please log in to register."); return; }
    if (!validateCustomForm()) return;
    await addRegistration({ event, user, teamName, customFormResponses });
    const updated = updateEventOnRegister(event);
    setEvent(updated);
    setMsg(`Registered successfully. Confirmation email sent to ${user.email || "your email"}.`);
    setTimeout(() => navigate("/user"), 500);
  };

  // --- Merchandise: handle image file selection ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("Please upload an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("Image must be under 5 MB."); return; }
    setPaymentProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPaymentProofPreview(reader.result);
    reader.readAsDataURL(file);
    setMsg("");
  };

  // --- Merchandise: submit order ---
  const handleSubmitOrder = async () => {
    if (!validateCustomForm()) { return; }
    if (!paymentProofFile) { setMsg("Please upload your payment proof image."); return; }
    const user = loadUser();
    if (!user) { setMsg("Please log in to continue."); return; }

    setSubmitting(true);
    setMsg("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result; // full data URL
        const mimeType = paymentProofFile.type;

        try {
          const res = await createMerchandiseOrder({
            eventId: event._id || event.id,
            paymentProofImage: base64,
            paymentProofMimeType: mimeType,
            customFormResponses
          });

          setExistingOrder({ status: "pending", _id: res.data.order?.id });
          setMercStep("submitted");
        } catch (err) {
          const serverMsg = err.response?.data?.message;
          const serverStatus = err.response?.data?.status;
          if (err.response?.status === 409) {
            setExistingOrder({ status: serverStatus || "pending" });
            setMercStep("submitted");
          } else {
            setMsg(serverMsg || "Failed to submit order. Please try again.");
          }
        } finally {
          setSubmitting(false);
        }
      };
      reader.readAsDataURL(paymentProofFile);
    } catch {
      setMsg("Failed to read image. Please try again.");
      setSubmitting(false);
    }
  };

  // --- Render merchandise flow ---
  const renderMerchandiseFlow = () => {
    if (isRegistered || existingOrder?.status === "approved") {
      return (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p className="message-success" style={{ fontSize: "18px" }}>✅ Your order has been approved! Check your email for the QR ticket.</p>
          <button className="secondary-btn" onClick={() => navigate("/user")} style={{ marginTop: 12 }}>
            Go to My Dashboard
          </button>
        </div>
      );
    }

    if (existingOrder?.status === "pending" || mercStep === "submitted") {
      return (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontSize: "32px" }}>⏳</p>
          <h3 style={{ margin: "8px 0" }}>Order Pending Approval</h3>
          <p className="muted">Your payment proof has been submitted. The organizer will review it shortly. You'll receive a confirmation email with your QR ticket once approved.</p>
          <button className="secondary-btn" onClick={() => navigate("/user")} style={{ marginTop: 12 }}>
            Go to My Dashboard
          </button>
        </div>
      );
    }

    if (existingOrder?.status === "rejected") {
      return (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontSize: "32px" }}>❌</p>
          <h3 style={{ margin: "8px 0", color: "#dc2626" }}>Order Rejected</h3>
          <p className="muted">Your previous payment could not be verified. You may submit a new payment proof below.</p>
          {renderUploadForm()}
        </div>
      );
    }

    if (mercStep === "upload") return renderUploadForm();

    // Default: payment instructions (Step 1)
    return (
      <div>
        <div style={{
          background: "linear-gradient(135deg, #667eea22, #764ba222)",
          border: "1px solid #667eea44",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px"
        }}>
          <h4 style={{ margin: "0 0 12px", color: "#667eea" }}>💳 Payment Instructions</h4>
          <p style={{ margin: "0 0 8px" }}><strong>Amount:</strong> ₹{event.reg_fee || 0}</p>
          <p style={{ margin: "0 0 8px" }}><strong>UPI ID:</strong> organizer@upi</p>
          <p style={{ margin: "0 0 4px" }}><strong>Bank Transfer:</strong></p>
          <p style={{ margin: "0 0 2px", color: "#6b7280", fontSize: "13px" }}>Account: 1234567890 | IFSC: BANK0001234 | Name: DASS Events</p>
          <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#9ca3af" }}>
            ⚠️ After payment, take a screenshot and upload it below for verification.
          </p>
        </div>
        <button
          className="primary-btn"
          onClick={() => setMercStep("upload")}
          disabled={deadlinePassed || outOfStock}
          style={{ width: "100%" }}
        >
          I've Paid — Upload Proof
        </button>
      </div>
    );
  };

  const renderUploadForm = () => (
    <div style={{ marginTop: "16px" }}>
      <h4 style={{ margin: "0 0 12px" }}>📎 Upload Payment Proof</h4>
      <div
        onClick={() => document.getElementById("proofFileInput").click()}
        style={{
          border: "2px dashed #667eea",
          borderRadius: "12px",
          padding: "32px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: paymentProofPreview ? "transparent" : "#f9fafb",
          transition: "background 0.2s"
        }}
      >
        {paymentProofPreview ? (
          <img src={paymentProofPreview} alt="Payment proof preview" style={{ maxHeight: "200px", maxWidth: "100%", borderRadius: "8px" }} />
        ) : (
          <>
            <p style={{ fontSize: "32px", margin: "0 0 8px" }}>📷</p>
            <p style={{ margin: 0, color: "#667eea", fontWeight: 600 }}>Click to upload screenshot</p>
            <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "12px" }}>JPG, PNG, WEBP — max 5 MB</p>
          </>
        )}
      </div>
      <input
        id="proofFileInput"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {paymentProofPreview && (
        <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
          ✓ {paymentProofFile?.name} — click the box to change
        </p>
      )}
      {msg && <p className="message-error" style={{ marginTop: 8 }}>{msg}</p>}
      <button
        className="primary-btn"
        onClick={handleSubmitOrder}
        disabled={submitting || !paymentProofFile}
        style={{ width: "100%", marginTop: "16px" }}
      >
        {submitting ? "Submitting…" : "Submit Order"}
      </button>
      <button className="secondary-btn" onClick={() => { setMercStep("info"); setMsg(""); }} style={{ width: "100%", marginTop: "8px" }}>
        ← Back
      </button>
    </div>
  );

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>{event.eventName}</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <h3>Event Details</h3>
            <p className="muted">{event.description}</p>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Type</span>
                <p className="pill">{event.type}</p>
              </div>
              <div>
                <span className="detail-label">Eligibility</span>
                <p className="pill">{event.eligibility}</p>
              </div>
              <div>
                <span className="detail-label">Organizer</span>
                <p>{event.organizer?.name}</p>
              </div>
              <div>
                <span className="detail-label">Schedule</span>
                <p>
                  {new Date(event.event_start).toLocaleString()} - {new Date(event.event_end).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="detail-meta">
              <span className="pill">Deadline: {new Date(event.reg_deadline).toLocaleString()}</span>
              {event.type === "merchandise" ? (
                <span className="pill">Stock: {event.stock ?? 0}</span>
              ) : (
                <span className="pill">Slots left: {event.reg_limit ?? 0}</span>
              )}
              <span className="pill">Fee: {event.reg_fee ? `INR ${event.reg_fee}` : "Free"}</span>
            </div>

            {customFormFields.length > 0 && (
              <div style={{ marginTop: '20px', marginBottom: '8px' }}>
                <h4 style={{ marginBottom: '12px' }}>Registration Form</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {customFormFields.map((field) => (
                    <div key={field.id} className="form-row" style={{ marginBottom: 0 }}>
                      <label className="filter-label" style={{ display: 'block', marginBottom: '6px' }}>
                        {field.label || `Field ${field.id}`}
                        {field.required && <span style={{ color: '#dc2626' }}> *</span>}
                      </label>
                      {renderCustomFormFieldInput(field)}
                    </div>
                  ))}
                </div>
                {customFormError && <p className="message-error" style={{ marginTop: '10px' }}>{customFormError}</p>}
              </div>
            )}

            {deadlinePassed && <p className="message-error">Registration deadline has passed.</p>}
            {outOfStock && <p className="message-error">Registrations or stock are exhausted.</p>}

            {/* --- Merchandise flow --- */}
            {isMerchandise && !deadlinePassed && !outOfStock && renderMerchandiseFlow()}

            {/* --- Normal event flow --- */}
            {!isMerchandise && (
              <>
                {event.type === "normal" && (
                  <div className="form-row">
                    <label className="filter-label" htmlFor="teamName">Team Name (optional)</label>
                    <input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="input"
                      placeholder="Enter team name"
                    />
                  </div>
                )}
                {msg && <p className="message-success">{msg}</p>}
                {isRegistered && <p className="message-success">✓ You are already registered for this event</p>}
                <button
                  type="button"
                  className={isRegistered ? "secondary-btn" : "primary-btn"}
                  onClick={isRegistered ? () => navigate('/user') : handleRegister}
                  disabled={deadlinePassed || outOfStock}
                >
                  {isRegistered ? "Already Registered - View Ticket" : "Register Now"}
                </button>
              </>
            )}
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Event Forum</h3>
              <div className="card-actions" style={{ alignItems: "center" }}>
                <span className="muted">{forumMessages.length} messages</span>
                {forumUnread > 0 && <span className="pill">{forumUnread} new</span>}
                <button type="button" className="small-btn" onClick={markForumAsRead}>Mark as read</button>
              </div>
            </div>

            <div className="tabs" style={{ marginBottom: "12px" }}>
              <button
                type="button"
                className={forumMode === "discussion" ? "tab active" : "tab"}
                onClick={() => setForumMode("discussion")}
              >
                Discussion
              </button>
              <button
                type="button"
                className={forumMode === "announcements" ? "tab active" : "tab"}
                onClick={() => setForumMode("announcements")}
              >
                Announcements
              </button>
            </div>

            {canPostForum ? (
              <div className="forum-compose">
                <textarea
                  className="input"
                  placeholder={forumMode === "announcements" ? "Post an announcement..." : "Ask a question or share an update..."}
                  value={forumInput}
                  onChange={(e) => setForumInput(e.target.value)}
                  style={{ minHeight: "90px", resize: "vertical" }}
                />
                <div className="card-actions" style={{ justifyContent: "space-between", width: "100%" }}>
                  {canModerateForum ? (
                    <label className="muted" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={postAsAnnouncement}
                        onChange={(e) => setPostAsAnnouncement(e.target.checked)}
                      />
                      Post as announcement
                    </label>
                  ) : <span />}
                  <button type="button" className="primary-btn" onClick={() => handlePostForumMessage()}>
                    Post Message
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">Register for this event to post and interact in the forum.</p>
            )}

            {forumMsg && <p className="message-info" style={{ marginTop: "8px" }}>{forumMsg}</p>}

            <div style={{ marginTop: "14px", display: "grid", gap: "12px" }}>
              {visibleRootMessages.length ? visibleRootMessages.map((message) => renderForumMessage(message)) : (
                <p className="muted">No messages yet in this section.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
