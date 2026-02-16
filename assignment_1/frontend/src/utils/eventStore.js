import seedEvents from "./eventsData";

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

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

export const buildQrSvg = (value) => {
  const size = 21;
  const cell = 6;
  const seed = hashString(value);
  const squares = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const shouldFill = ((seed + row * 7 + col * 13) % 5) === 0;
      if (shouldFill) {
        squares.push(
          `<rect x=\"${col * cell}\" y=\"${row * cell}\" width=\"${cell}\" height=\"${cell}\" />`
        );
      }
    }
  }

  const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>` +
    `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${size * cell}\" height=\"${size * cell}\" viewBox=\"0 0 ${size * cell} ${size * cell}\" fill=\"#111\">` +
    squares.join("") +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const generateTicketId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${stamp}-${rand}`;
};

export const addRegistration = ({ event, user, teamName }) => {
  const ticketId = generateTicketId();
  const qr = buildQrSvg(ticketId);

  const record = {
    id: ticketId,
    eventId: event.id,
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
