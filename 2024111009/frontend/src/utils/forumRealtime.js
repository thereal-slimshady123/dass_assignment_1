import { io } from 'socket.io-client';

const FORUM_SEEN_KEY = 'eventForumSeen';

const parseJSON = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const getSeenMap = () => parseJSON(localStorage.getItem(FORUM_SEEN_KEY), {});

const setSeenMap = (map) => {
  localStorage.setItem(FORUM_SEEN_KEY, JSON.stringify(map));
};

export const markForumSeen = ({ eventId, userKey }) => {
  if (!eventId || !userKey) return;
  const current = getSeenMap();
  const forUser = typeof current[userKey] === 'object' && current[userKey] ? current[userKey] : {};
  forUser[eventId] = new Date().toISOString();
  current[userKey] = forUser;
  setSeenMap(current);
};

export const getForumUnreadCount = ({ eventId, userKey, ownUserId, messages }) => {
  if (!eventId || !userKey || !Array.isArray(messages)) return 0;
  const current = getSeenMap();
  const seenAt = current?.[userKey]?.[eventId];
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;

  return messages.filter((message) => {
    if (!message || message.isDeleted) return false;
    const createdAt = new Date(message.createdAt).getTime();
    if (Number.isNaN(createdAt) || createdAt <= seenTime) return false;
    if (ownUserId && String(message.author?.id) === String(ownUserId)) return false;
    return true;
  }).length;
};

const getApiBase = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/auth';

export const getSocketBaseUrl = () => getApiBase().replace(/\/api\/auth\/?$/, '');

export const createForumSocket = () => io(getSocketBaseUrl(), {
  transports: ['websocket', 'polling']
});
