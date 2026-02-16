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

export const loadPreferences = () => safeParse(localStorage.getItem(PREF_KEY), { areas: [], clubs: [] });

export const savePreferences = (prefs) => {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
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
