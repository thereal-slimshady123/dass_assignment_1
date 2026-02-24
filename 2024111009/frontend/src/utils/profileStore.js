const USER_KEY = "user";
const PREF_KEY = "preferences";

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const loadUser = () => safeParse(localStorage.getItem(USER_KEY), null);

export const saveUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const normalizePreferences = (value) => {
  const parsed = value && typeof value === "object" ? value : {};
  const clubs = Array.isArray(parsed.clubs) ? parsed.clubs : [];
  const organizers = Array.isArray(parsed.organizers) ? parsed.organizers : [];
  const areas = Array.isArray(parsed.areas) ? parsed.areas : [];

  return {
    ...parsed,
    areas,
    clubs,
    organizers
  };
};

export const loadPreferences = () => normalizePreferences(safeParse(localStorage.getItem(PREF_KEY), { areas: [], clubs: [], organizers: [] }));

export const savePreferences = (prefs) => {
  localStorage.setItem(PREF_KEY, JSON.stringify(normalizePreferences(prefs)));
};

export const toggleFollowedClub = (clubName) => {
  const prefs = loadPreferences();
  const clubs = prefs.clubs || [];
  const nextClubs = clubs.includes(clubName)
    ? clubs.filter((club) => club !== clubName)
    : [...clubs, clubName];
  const next = { ...prefs, clubs: nextClubs };
  savePreferences(next);
  return next;
};

export const toggleFollowedOrganizer = (organizerId) => {
  const prefs = loadPreferences();
  const organizers = prefs.organizers || [];
  const nextOrganizers = organizers.includes(organizerId)
    ? organizers.filter((organizer) => organizer !== organizerId)
    : [...organizers, organizerId];
  const next = { ...prefs, organizers: nextOrganizers };
  savePreferences(next);
  return next;
};

// Registration management
const REG_KEY = "registrations";

export const loadRegistrations = () => {
  const stored = safeParse(localStorage.getItem(REG_KEY), []);
  return Array.isArray(stored) ? stored : [];
};

export const saveRegistrations = (records) => {
  localStorage.setItem(REG_KEY, JSON.stringify(records));
};
