import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import BrowseEvents from './pages/BrowseEvents.jsx'
import EventDetails from './pages/EventDetails.jsx'
import ClubsOrganizers from './pages/ClubsOrganizers.jsx'
import OrganizerDetail from './pages/OrganizerDetail.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './components/admin.jsx'
import Organizer from './components/organizer.jsx'
import Interests from './interests.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login /> } />
        <Route path="/user" element={<UserDashboard /> } />
        <Route path="/events" element={<BrowseEvents /> } />
        <Route path="/events/:eventId" element={<EventDetails /> } />
        <Route path="/clubs" element={<ClubsOrganizers /> } />
        <Route path="/organizers/:organizerId" element={<OrganizerDetail /> } />
        <Route path="/profile" element={<Profile /> } />
        <Route path="/admin" element={<Admin /> } />
        <Route path="/organizer" element={<Organizer /> } />
        <Route path="/interests" element={<Interests /> } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
