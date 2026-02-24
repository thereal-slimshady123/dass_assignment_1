import { useEffect, useMemo, useState } from "react";
import UserNav from "../components/UserNav";
import "../components/user.css";
import { loadRegistrations } from "../utils/eventStore";
import { loadUser, loadPreferences } from "../utils/profileStore";
import { getEvents, getUserMerchandiseOrders } from "../services/AuthAPI";
import {
  normalizeEventForCalendar,
  downloadICSFile,
  createGoogleCalendarLink,
  createOutlookCalendarLink,
  getLocalTimezone,
  formatReminderLabel
} from "../utils/calendarExport";

const tabs = ["Normal", "Merchandise", "Completed", "Cancelled/Rejected"];
const reminderOptions = [0, 10, 30, 60, 1440];

export default function UserDashboard() {
  const user = useMemo(() => loadUser(), []);
  const preferences = useMemo(() => loadPreferences(), []);
  const followedClubs = preferences.clubs || [];
  const followedOrganizers = preferences.organizers || [];
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Normal");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [merchandiseOrders, setMerchandiseOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [calendarMessage, setCalendarMessage] = useState("");
  const timezone = useMemo(() => getLocalTimezone(), []);

  const getEventByRecord = (record) =>
    events.find((item) => item.id === record.eventId || item._id === record.eventId);

  const isFollowedSource = (event) => {
    if (!event) return false;
    return followedOrganizers.includes(event.organizer?.id) || followedClubs.includes(event.organizer?.name);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const response = await getEvents();
        if (isMounted) {
          setEvents(response.data.events || []);
        }
      } catch (error) {
        if (isMounted) {
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchEvents();
    return () => { isMounted = false; };
  }, []);

  // Fetch merchandise orders when tab changes to Merchandise
  useEffect(() => {
    if (activeTab !== "Merchandise") return;
    setOrdersLoading(true);
    getUserMerchandiseOrders()
      .then(res => setMerchandiseOrders(res.data.orders || []))
      .catch(() => setMerchandiseOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [activeTab]);

  const registrations = useMemo(() => {
    const list = loadRegistrations();
    const now = new Date();
    return list.map((record) => {
      const event = events.find((item) => item.id === record.eventId);
      const end = event ? new Date(event.event_end) : null;
      let status = record.status || "Registered";
      if (status === "Registered" && end && end < now) {
        status = "Completed";
      }
      return { ...record, status, eventType: event?.type || record.eventType };
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const list = registrations.filter((record) => {
      const event = getEventByRecord(record);
      if (!event) return false;
      return new Date(event.event_start) > now && record.status === "Registered";
    });

    return list.sort((a, b) => {
      const aEvent = getEventByRecord(a);
      const bEvent = getEventByRecord(b);
      const aFollowed = isFollowedSource(aEvent);
      const bFollowed = isFollowedSource(bEvent);
      if (aFollowed === bFollowed) {
        return new Date(a.schedule.start) - new Date(b.schedule.start);
      }
      return aFollowed ? -1 : 1;
    });
  }, [registrations, events, followedClubs, followedOrganizers]);

  const exportableEvents = useMemo(() => {
    return registrations
      .filter((record) => record.eventType === "normal" && !["Cancelled", "Rejected"].includes(record.status))
      .map((record) => ({
        record,
        event: normalizeEventForCalendar(record, getEventByRecord(record))
      }))
      .filter((item) => Boolean(item.event));
  }, [registrations, events]);

  useEffect(() => {
    setSelectedEventIds((current) => current.filter((id) => exportableEvents.some((item) => item.record.id === id)));
  }, [exportableEvents]);

  const selectedExportEvents = useMemo(() => {
    return exportableEvents
      .filter((item) => selectedEventIds.includes(item.record.id))
      .map((item) => item.event);
  }, [exportableEvents, selectedEventIds]);

  const handleToggleSelectEvent = (recordId) => {
    setCalendarMessage("");
    setSelectedEventIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    );
  };

  const handleSelectAllExportable = () => {
    setCalendarMessage("");
    if (selectedEventIds.length === exportableEvents.length) {
      setSelectedEventIds([]);
      return;
    }
    setSelectedEventIds(exportableEvents.map((item) => item.record.id));
  };

  const handleDownloadSingleICS = (calendarEvent) => {
    downloadICSFile([calendarEvent], {
      reminderMinutes,
      fileName: calendarEvent.title
    });
    setCalendarMessage(`Exported ${calendarEvent.title} as .ics`);
  };

  const handleBatchExport = () => {
    if (!selectedExportEvents.length) {
      setCalendarMessage("Select at least one registered event to export.");
      return;
    }

    downloadICSFile(selectedExportEvents, {
      reminderMinutes,
      fileName: `registered-events-${selectedExportEvents.length}`
    });
    setCalendarMessage(`Exported ${selectedExportEvents.length} event(s) as .ics`);
  };

  const openCalendarLink = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const history = useMemo(() => {
    const list = registrations.filter((record) => {
      if (activeTab === "Normal") return record.eventType === "normal";
      if (activeTab === "Completed") return record.status === "Completed";
      return record.status === "Cancelled" || record.status === "Rejected";
    });

    return list.sort((a, b) => {
      const aEvent = getEventByRecord(a);
      const bEvent = getEventByRecord(b);
      const aFollowed = isFollowedSource(aEvent);
      const bFollowed = isFollowedSource(bEvent);
      if (aFollowed === bFollowed) {
        return new Date(b.schedule.start) - new Date(a.schedule.start);
      }
      return aFollowed ? -1 : 1;
    });
  }, [registrations, activeTab, events, followedClubs, followedOrganizers]);

  return (
    <div className="user-root">
      <UserNav />
      <header className="user-header">
        <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ""}</h1>
      </header>

      <main className="user-main user-main-wide">
        <section className="content">
          <div className="section-card">
            <div className="section-title">
              <h3>Upcoming Events</h3>
              <span className="muted">{upcomingEvents.length} registered</span>
            </div>
            <div className="card-actions" style={{ marginBottom: "12px", alignItems: "center" }}>
              <label className="muted" style={{ fontSize: "13px" }}>
                Reminder:
              </label>
              <select
                className="input"
                style={{ maxWidth: "220px", padding: "8px" }}
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
              >
                {reminderOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatReminderLabel(option)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="small-btn"
                onClick={handleSelectAllExportable}
                disabled={!exportableEvents.length}
              >
                {selectedEventIds.length === exportableEvents.length && exportableEvents.length ? "Clear Selection" : "Select All"}
              </button>
              <button
                type="button"
                className="small-btn"
                onClick={handleBatchExport}
                disabled={!selectedExportEvents.length}
              >
                Export Selected (.ics)
              </button>
            </div>
            <p className="muted" style={{ marginBottom: "12px" }}>Timezone: {timezone}</p>
            {calendarMessage && <p className="message-info" style={{ marginBottom: "12px" }}>{calendarMessage}</p>}
            <div className="cards">
              {upcomingEvents.length ? (
                upcomingEvents.map((record) => {
                  const eventDetail = getEventByRecord(record);
                  const calendarEvent = normalizeEventForCalendar(record, eventDetail);

                  return (
                    <article key={record.id} className="card">
                      <div className="card-actions" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
                        <label className="muted" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={selectedEventIds.includes(record.id)}
                            onChange={() => handleToggleSelectEvent(record.id)}
                          />
                          Select
                        </label>
                        <p className="pill" style={{ margin: 0 }}>{record.eventType}</p>
                      </div>
                      <h4>{record.eventName}</h4>
                      <p className="muted">{record.organizer}</p>
                      <p className="muted">
                        {new Date(record.schedule.start).toLocaleString()} - {new Date(record.schedule.end).toLocaleString()}
                      </p>
                      {calendarEvent && (
                        <div className="card-actions" style={{ marginTop: "10px" }}>
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => handleDownloadSingleICS(calendarEvent)}
                          >
                            Download .ics
                          </button>
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => openCalendarLink(createGoogleCalendarLink(calendarEvent, { reminderMinutes, timezone }))}
                          >
                            Google Calendar
                          </button>
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => openCalendarLink(createOutlookCalendarLink(calendarEvent, { reminderMinutes }))}
                          >
                            Outlook
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                <p className="muted">{loading ? "Loading events..." : "No upcoming events yet."}</p>
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">
              <h3>Participation History</h3>
              <div className="tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "tab active" : "tab"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Merchandise tab: shows backend orders with status */}
            {activeTab === "Merchandise" ? (
              <div>
                {ordersLoading ? (
                  <p className="muted" style={{ padding: "16px" }}>Loading orders…</p>
                ) : merchandiseOrders.length === 0 ? (
                  <p className="muted" style={{ padding: "16px" }}>No merchandise orders yet.</p>
                ) : (
                  merchandiseOrders.map((order) => {
                    const statusColor = {
                      pending: "#d97706", approved: "#059669", rejected: "#dc2626"
                    }[order.status] || "#6b7280";
                    const statusLabel = {
                      pending: "⏳ Pending Approval", approved: "✅ Approved", rejected: "❌ Rejected"
                    }[order.status] || order.status;
                    return (
                      <div key={order._id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: "12px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <h4 style={{ margin: "0 0 4px" }}>{order.eventName}</h4>
                            <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>Submitted {new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span style={{ background: statusColor + "22", color: statusColor, padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
                            {statusLabel}
                          </span>
                        </div>
                        {order.status === "rejected" && order.rejectionReason && (
                          <p style={{ margin: "8px 0 0", color: "#dc2626", fontSize: "13px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                            Reason: {order.rejectionReason}
                          </p>
                        )}
                        {order.status === "approved" && order.ticketId && (
                          <div style={{ marginTop: "12px" }}>
                            <button className="link-btn" onClick={() => setSelectedTicket({
                              id: order.ticketId, qr: order.qrDataUrl, eventName: order.eventName,
                              organizer: "", participant: { name: order.participantName, email: order.participantEmail }
                            })}>
                              🎟 View Ticket — {order.ticketId}
                            </button>
                          </div>
                        )}
                        {order.status === "pending" && (
                          <p style={{ margin: "8px 0 0", color: "#92400e", fontSize: "12px", background: "#fffbeb", padding: "8px", borderRadius: "6px" }}>
                            Under review — you'll receive an email when approved.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="table">
                <div className="table-header">
                  <span>Event</span><span>Type</span><span>Organizer</span>
                  <span>Status</span><span>Team</span><span>Ticket</span>
                </div>
                {history.length ? (
                  history.map((record) => (
                    <div key={record.id} className="table-row">
                      <span>{record.eventName}</span>
                      <span>{record.eventType}</span>
                      <span>{record.organizer}</span>
                      <span>{record.status}</span>
                      <span>{record.teamName || "-"}</span>
                      <button type="button" className="link-btn" onClick={() => setSelectedTicket(record)}>
                        {record.id}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">No records in this category.</p>
                )}
              </div>
            )}
          </div>
        </section>

        {selectedTicket && (
          <aside className="ticket-panel">
            <div className="section-card">
              <div className="section-title">
                <h3>Ticket Details</h3>
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </button>
              </div>
              <div className="ticket">
                <img src={selectedTicket.qr} alt="Ticket QR" className="ticket-qr" />
                <div>
                  <h4>{selectedTicket.eventName}</h4>
                  <p className="muted">{selectedTicket.organizer}</p>
                  <p className="muted">Ticket ID: {selectedTicket.id}</p>
                  <p className="muted">Participant: {selectedTicket.participant?.name}</p>
                  <p className="muted">Email: {selectedTicket.participant?.email}</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
