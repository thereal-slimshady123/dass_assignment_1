import axios from "axios";

const API = "http://localhost:5000/api/auth";

export const login = (data) =>
  axios.post(`${API}/login`, data);

export const register = (data) =>
  axios.post(`${API}/register`, data);

export const forgotPassword = (data) =>
  axios.post(`${API}/forgot-password`, data);

export const resetPassword = (data) =>
  axios.post(`${API}/reset-password`, data);

export const changePassword = (data) =>
  axios.post(`${API}/change-password`, data);

export const sendEventRegistrationEmail = (data) =>
  axios.post(`${API}/send-event-email`, data);

export const updateOrganizerProfile = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/update-organizer-profile`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const createOrganizer = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/create-organizer`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const deleteOrganizer = (data) => {
  const token = localStorage.getItem('token');
  return axios.delete(`${API}/delete-organizer`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: data
  });
};

export const addClub = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/add-club`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const deleteClub = (data) => {
  const token = localStorage.getItem('token');
  return axios.delete(`${API}/delete-club`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: data
  });
};

export const addEvent = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/add-event`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const deleteEvent = (data) => {
  const token = localStorage.getItem('token');
  return axios.delete(`${API}/delete-event`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: data
  });
};

export const getEvents = () =>
  axios.get(`${API}/events`);

export const getEventById = (id) =>
  axios.get(`${API}/events/${id}`);

export const getClubs = () =>
  axios.get(`${API}/clubs`);

export const getAllOrganizers = () => {
  const token = localStorage.getItem('token');
  return axios.get(`${API}/organizers`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getAllClubs = () => {
  const token = localStorage.getItem('token');
  return axios.get(`${API}/all-clubs`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const updateOrganizerStatus = (data) => {
  const token = localStorage.getItem('token');
  return axios.patch(`${API}/update-organizer-status`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const updateClubStatus = (data) => {
  const token = localStorage.getItem('token');
  return axios.patch(`${API}/update-club-status`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getPasswordResetRequests = () => {
  const token = localStorage.getItem('token');
  return axios.get(`${API}/password-reset-requests`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const clearPasswordResetRequest = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/clear-password-reset-request`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getPasswordChangeRequests = () => {
  const token = localStorage.getItem('token');
  return axios.get(`${API}/password-change-requests`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const approvePasswordChangeRequest = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/approve-password-change-request`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const rejectPasswordChangeRequest = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/reject-password-change-request`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

// Attendance tracking APIs
export const scanAttendance = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/scan-attendance`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getAttendanceDashboard = (eventId) => {
  const token = localStorage.getItem('token');
  return axios.get(`${API}/attendance-dashboard/${eventId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const manualOverrideAttendance = (data) => {
  const token = localStorage.getItem('token');
  return axios.post(`${API}/manual-override`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const exportAttendanceCSV = (eventId) => {
  const token = localStorage.getItem('token');
  return axios.get(`${API}/export-attendance/${eventId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    responseType: 'blob'
  });
};