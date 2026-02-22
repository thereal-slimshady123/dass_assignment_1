import seedEvents from "./eventsData";
import QRCode from "qrcode";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const EVENTS_KEY = "eventsData";
const REG_KEY = "registrations";

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const loadEvents = () => {
  const stored = safeParse(localStorage.getItem(EVENTS_KEY), null);
  if (stored && Array.isArray(stored) && stored.length) {
    return stored;
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(seedEvents));
  return seedEvents;
};

export const saveEvents = (events) => {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

export const loadRegistrations = () => {
  const stored = safeParse(localStorage.getItem(REG_KEY), []);
  return Array.isArray(stored) ? stored : [];
};

export const saveRegistrations = (records) => {
  localStorage.setItem(REG_KEY, JSON.stringify(records));
};

export const getEventById = (events, id) =>
  events.find((event) => event.id === id);

export const buildQrCode = async (value) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(value, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation failed:', error);
    // Return a placeholder if QR generation fails
    return 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EQR Error%3C/text%3E%3C/svg%3E';
  }
};

export const generateTicketId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${stamp}-${rand}`;
};

export const addRegistration = async ({ event, user, teamName }) => {
  const ticketId = generateTicketId();
  const participantName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  const participantEmail = user?.email || "";
  // Embed full participant info into QR so organizer scanner can read it without localStorage
  const qrPayload = JSON.stringify({ ticketId, name: participantName, email: participantEmail });
  const qr = await buildQrCode(qrPayload);

  const record = {
    id: ticketId,
    eventId: event.id || event._id,
    eventName: event.eventName,
    eventType: event.type,
    organizer: event.organizer?.name || "Unknown",
    schedule: {
      start: event.event_start,
      end: event.event_end
    },
    teamName: teamName || "",
    participant: {
      id: user?.id || "",
      name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      email: user?.email || ""
    },
    status: "Registered",
    qr
  };

  const registrations = loadRegistrations();
  registrations.unshift(record);
  saveRegistrations(registrations);

  // Increment event registration count in backend
  try {
    await axios.post(`${API_BASE}/auth/increment-event-registration`, {
      eventId: event._id || event.id
    });
  } catch (error) {
    console.error('Failed to update event registration count:', error);
  }

  // Send event registration confirmation email
  try {
    await axios.post(`${API_BASE}/auth/send-event-email`, {
      email: user?.email,
      firstName: user?.firstName,
      eventName: event.eventName,
      eventDate: new Date(event.event_start).toLocaleString()
    });
  } catch (error) {
    console.error('Failed to send event registration email:', error);
    // Don't fail the registration if email fails
  }

  return record;
};

export const updateEventOnRegister = (event) => {
  const next = { ...event };
  if (next.type === "merchandise") {
    next.stock = Math.max(0, (next.stock ?? 0) - 1);
  } else {
    next.reg_limit = Math.max(0, (next.reg_limit ?? 0) - 1);
  }
  next.reg_count = (next.reg_count ?? 0) + 1;
  next.registrations24h = (next.registrations24h ?? 0) + 1;
  return next;
};
