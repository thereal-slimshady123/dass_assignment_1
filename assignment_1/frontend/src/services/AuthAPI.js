import axios from "axios";

const API = "http://localhost:5000/api/auth";
const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

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

export const requestOrganizerPasswordReset = (data) => {
  return axios.post(`${API}/organizer-password-reset-request`, data, authHeaders());
};

export const getOrganizerPasswordResetHistory = () => {
  return axios.get(`${API}/organizer-password-reset-history`, authHeaders());
};

export const sendEventRegistrationEmail = (data) =>
  axios.post(`${API}/send-event-email`, data);

export const updateOrganizerProfile = (data) => {
  return axios.post(`${API}/update-organizer-profile`, data, authHeaders());
};

export const createOrganizer = (data) => {
  return axios.post(`${API}/create-organizer`, data, authHeaders());
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
  return axios.post(`${API}/add-club`, data, authHeaders());
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
  return axios.post(`${API}/add-event`, data, authHeaders());
};

export const updateEvent = (id, data) => {
  return axios.patch(`${API}/events/${id}`, data, authHeaders());
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

export const getMyEvents = () => {
  return axios.get(`${API}/my-events`, authHeaders());
};

export const getClubs = () =>
  axios.get(`${API}/clubs`);

export const getAllOrganizers = () => {
  return axios.get(`${API}/organizers`, authHeaders());
};

export const getAllClubs = () => {
  return axios.get(`${API}/all-clubs`, authHeaders());
};

export const updateOrganizerStatus = (data) => {
  return axios.patch(`${API}/update-organizer-status`, data, authHeaders());
};

export const updateClubStatus = (data) => {
  return axios.patch(`${API}/update-club-status`, data, authHeaders());
};

export const getPasswordResetRequests = () => {
  return axios.get(`${API}/password-reset-requests`, authHeaders());
};

export const clearPasswordResetRequest = (data) => {
  return axios.post(`${API}/clear-password-reset-request`, data, authHeaders());
};

export const getPasswordChangeRequests = (status) => {
  return axios.get(`${API}/password-change-requests`, {
    params: status ? { status } : undefined,
    ...authHeaders()
  });
};

export const approvePasswordChangeRequest = (data) => {
  return axios.post(`${API}/approve-password-change-request`, data, authHeaders());
};

export const rejectPasswordChangeRequest = (data) => {
  return axios.post(`${API}/reject-password-change-request`, data, authHeaders());
};

// Attendance tracking APIs
export const scanAttendance = (data) => {
  return axios.post(`${API}/scan-attendance`, data, authHeaders());
};

export const getAttendanceDashboard = (eventId) => {
  return axios.get(`${API}/attendance-dashboard/${eventId}`, authHeaders());
};

export const manualOverrideAttendance = (data) => {
  return axios.post(`${API}/manual-override`, data, authHeaders());
};

export const exportAttendanceCSV = (eventId) => {
  return axios.get(`${API}/export-attendance/${eventId}`, {
    ...authHeaders(),
    responseType: 'blob'
  });
};

// Merchandise payment verification APIs
export const createMerchandiseOrder = (data) => {
  return axios.post(`${API}/create-merchandise-order`, data, authHeaders());
};

export const getMerchandiseOrders = (eventId) => {
  return axios.get(`${API}/merchandise-orders/${eventId}`, authHeaders());
};

export const approveMerchandiseOrder = (orderId) => {
  return axios.post(`${API}/approve-merchandise-order`, { orderId }, authHeaders());
};

export const rejectMerchandiseOrder = (orderId, reason) => {
  return axios.post(`${API}/reject-merchandise-order`, { orderId, reason }, authHeaders());
};

export const getUserMerchandiseOrders = () => {
  return axios.get(`${API}/my-merchandise-orders`, authHeaders());
};

export const getEventForumMessages = (eventId) =>
  axios.get(`${API}/events/${eventId}/forum`, authHeaders());

export const createForumPost = (eventId, data) =>
  axios.post(`${API}/events/${eventId}/forum`, data, authHeaders());

export const deleteForumPost = (eventId, messageId) =>
  axios.delete(`${API}/events/${eventId}/forum/${messageId}`, authHeaders());

export const togglePinForumPost = (eventId, messageId) =>
  axios.patch(`${API}/events/${eventId}/forum/${messageId}/pin`, {}, authHeaders());

export const toggleForumReaction = (eventId, messageId, emoji) =>
  axios.patch(`${API}/events/${eventId}/forum/${messageId}/react`, { emoji }, authHeaders());