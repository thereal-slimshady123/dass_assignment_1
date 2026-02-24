const APP_CALENDAR_NAME = "IIIT Events";

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const pad2 = (value) => String(value).padStart(2, "0");

const toICSDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
    "T",
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds()),
    "Z"
  ].join("");
};

const escapeICSText = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const sanitizeFileName = (value = "events") =>
  String(value).replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();

const createReminderBlock = (minutes) => {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "";

  return [
    "BEGIN:VALARM",
    `TRIGGER:-PT${Math.floor(value)}M`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICSText(`Reminder: event starts in ${Math.floor(value)} minutes`)}`,
    "END:VALARM"
  ].join("\r\n");
};

export const getLocalTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const formatReminderLabel = (minutes) => {
  const value = Number(minutes);
  if (!value) return "No reminder";
  if (value < 60) return `${value} minutes before`;
  if (value === 60) return "1 hour before";
  if (value < 1440) return `${Math.floor(value / 60)} hours before`;
  if (value === 1440) return "1 day before";
  return `${Math.floor(value / 1440)} days before`;
};

export const normalizeEventForCalendar = (record, eventDetail) => {
  const start = toDate(record?.schedule?.start || eventDetail?.event_start);
  const end = toDate(record?.schedule?.end || eventDetail?.event_end);

  if (!start || !end) {
    return null;
  }

  const idPart = record?.id || record?.eventId || eventDetail?._id || eventDetail?.id || `event-${Date.now()}`;
  return {
    uid: `${idPart}@iiit-events.local`,
    title: record?.eventName || eventDetail?.eventName || "Registered Event",
    description: [
      eventDetail?.description,
      record?.organizer ? `Organizer: ${record.organizer}` : "",
      record?.teamName ? `Team: ${record.teamName}` : ""
    ].filter(Boolean).join("\n"),
    location: eventDetail?.location || eventDetail?.venue || "IIIT Campus",
    start,
    end
  };
};

export const createICSContent = (events, { reminderMinutes = 0, calendarName = APP_CALENDAR_NAME } = {}) => {
  const validEvents = (events || []).filter((event) => event?.start && event?.end);
  const now = toICSDateTime(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//IIIT Events//Calendar Export//EN",
    `X-WR-CALNAME:${escapeICSText(calendarName)}`
  ];

  for (const event of validEvents) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeICSText(event.uid)}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${toICSDateTime(event.start)}`);
    lines.push(`DTEND:${toICSDateTime(event.end)}`);
    lines.push(`SUMMARY:${escapeICSText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeICSText(event.description || "")}`);
    lines.push(`LOCATION:${escapeICSText(event.location || "")}`);

    const reminderBlock = createReminderBlock(reminderMinutes);
    if (reminderBlock) {
      lines.push(reminderBlock);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

export const downloadICSFile = (events, { reminderMinutes = 0, fileName = "registered-events" } = {}) => {
  const content = createICSContent(events, { reminderMinutes });
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(fileName) || "registered-events"}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const toProviderDate = (value) => toICSDateTime(value);

export const createGoogleCalendarLink = (event, { reminderMinutes = 0, timezone = getLocalTimezone() } = {}) => {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const dates = `${toProviderDate(event.start)}/${toProviderDate(event.end)}`;
  const detailsParts = [event.description || ""];
  if (Number(reminderMinutes) > 0) {
    detailsParts.push(`Preferred reminder: ${formatReminderLabel(reminderMinutes)}`);
  }

  const params = new URLSearchParams({
    text: event.title || "Event",
    dates,
    details: detailsParts.filter(Boolean).join("\n"),
    location: event.location || "",
    ctz: timezone || "UTC"
  });

  return `${base}&${params.toString()}`;
};

export const createOutlookCalendarLink = (event, { reminderMinutes = 0 } = {}) => {
  const base = "https://outlook.office.com/calendar/0/deeplink/compose";
  const detailsParts = [event.description || ""];
  if (Number(reminderMinutes) > 0) {
    detailsParts.push(`Preferred reminder: ${formatReminderLabel(reminderMinutes)}`);
  }

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title || "Event",
    startdt: toDate(event.start)?.toISOString() || "",
    enddt: toDate(event.end)?.toISOString() || "",
    body: detailsParts.filter(Boolean).join("\n"),
    location: event.location || ""
  });

  return `${base}?${params.toString()}`;
};
