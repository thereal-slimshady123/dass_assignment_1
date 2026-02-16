import axios from "axios";

const API = "http://localhost:5000/api/auth";

export const login = (data) =>
  axios.post(`${API}/login`, data);

export const register = (data) =>
  axios.post(`${API}/register`, data);

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