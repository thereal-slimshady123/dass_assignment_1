const FORUM_KEY = "eventForumMessages";
const FORUM_SEEN_KEY = "eventForumSeen";

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const loadForumMap = () => safeParse(localStorage.getItem(FORUM_KEY), {});

const saveForumMap = (map) => {
  localStorage.setItem(FORUM_KEY, JSON.stringify(map));
};

const loadSeenMap = () => safeParse(localStorage.getItem(FORUM_SEEN_KEY), {});

const saveSeenMap = (map) => {
  localStorage.setItem(FORUM_SEEN_KEY, JSON.stringify(map));
};

const createId = () => `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeMessages = (messages) =>
  (Array.isArray(messages) ? messages : []).map((message) => ({
    reactions: {},
    ...message,
    reactions: typeof message.reactions === "object" && message.reactions ? message.reactions : {}
  }));

export const listForumMessages = (eventId) => {
  const forumMap = loadForumMap();
  return normalizeMessages(forumMap[eventId] || []);
};

export const createForumMessage = ({
  eventId,
  text,
  parentId = null,
  isAnnouncement = false,
  author
}) => {
  const trimmedText = String(text || "").trim();
  if (!eventId || !author?.id || !trimmedText) {
    throw new Error("Invalid forum message payload");
  }

  const message = {
    id: createId(),
    eventId,
    parentId,
    text: trimmedText,
    isAnnouncement: Boolean(isAnnouncement),
    isPinned: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: {
      id: String(author.id),
      name: author.name || "Participant",
      email: author.email || "",
      role: author.role || "user"
    },
    reactions: {}
  };

  const forumMap = loadForumMap();
  const current = normalizeMessages(forumMap[eventId] || []);
  forumMap[eventId] = [message, ...current];
  saveForumMap(forumMap);
  return message;
};

export const deleteForumMessage = ({ eventId, messageId, moderator }) => {
  const forumMap = loadForumMap();
  const current = normalizeMessages(forumMap[eventId] || []);

  forumMap[eventId] = current.map((message) => {
    if (message.id !== messageId) return message;
    return {
      ...message,
      text: "[Message removed by moderator]",
      isDeleted: true,
      updatedAt: new Date().toISOString(),
      deletedBy: moderator?.name || moderator?.email || "Moderator"
    };
  });

  saveForumMap(forumMap);
};

export const togglePinForumMessage = ({ eventId, messageId }) => {
  const forumMap = loadForumMap();
  const current = normalizeMessages(forumMap[eventId] || []);

  forumMap[eventId] = current.map((message) =>
    message.id === messageId
      ? { ...message, isPinned: !message.isPinned, updatedAt: new Date().toISOString() }
      : message
  );

  saveForumMap(forumMap);
};

export const toggleForumReaction = ({ eventId, messageId, emoji, userId }) => {
  if (!emoji || !userId) return;

  const forumMap = loadForumMap();
  const current = normalizeMessages(forumMap[eventId] || []);

  forumMap[eventId] = current.map((message) => {
    if (message.id !== messageId) return message;

    const currentUsers = Array.isArray(message.reactions?.[emoji]) ? message.reactions[emoji] : [];
    const hasReacted = currentUsers.includes(String(userId));
    const nextUsers = hasReacted
      ? currentUsers.filter((id) => id !== String(userId))
      : [...currentUsers, String(userId)];

    return {
      ...message,
      reactions: {
        ...message.reactions,
        [emoji]: nextUsers
      },
      updatedAt: new Date().toISOString()
    };
  });

  saveForumMap(forumMap);
};

const getUserSeenMap = (userKey) => {
  const map = loadSeenMap();
  return typeof map[userKey] === "object" && map[userKey] ? map[userKey] : {};
};

export const markForumSeen = ({ eventId, userKey }) => {
  if (!eventId || !userKey) return;
  const seenMap = loadSeenMap();
  const nextForUser = getUserSeenMap(userKey);
  nextForUser[eventId] = new Date().toISOString();
  seenMap[userKey] = nextForUser;
  saveSeenMap(seenMap);
};

export const getUnreadForumCount = ({ eventId, userKey, ownUserId }) => {
  if (!eventId || !userKey) return 0;
  const seenAt = getUserSeenMap(userKey)[eventId];
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
  const messages = listForumMessages(eventId);

  return messages.filter((message) => {
    if (message.isDeleted) return false;
    const createdAt = new Date(message.createdAt).getTime();
    if (createdAt <= seenTime) return false;
    if (ownUserId && String(message.author?.id) === String(ownUserId)) return false;
    return true;
  }).length;
};

export const FORUM_STORAGE_KEY = FORUM_KEY;
export const FORUM_SEEN_STORAGE_KEY = FORUM_SEEN_KEY;
