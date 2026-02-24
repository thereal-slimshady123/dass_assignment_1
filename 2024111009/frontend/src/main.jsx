import { StrictMode, lazy, Suspense } from 'react'
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
import ForgotPassword from './components/ForgotPassword.jsx'
import ResetPassword from './components/ResetPassword.jsx'

const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard.jsx'));
const OrganizerCreateEvent = lazy(() => import('./pages/OrganizerCreateEvent.jsx'));
const OrganizerEventDetail = lazy(() => import('./pages/OrganizerEventDetail.jsx'));
const OrganizerAllEvents = lazy(() => import('./pages/OrganizerAllEvents.jsx'));
const OrganizerProfile = lazy(() => import('./pages/OrganizerProfile.jsx'));
const QRAttendanceScanner = lazy(() => import('./pages/QRAttendanceScanner.jsx'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/user" element={<UserDashboard />} />
          <Route path="/events" element={<BrowseEvents />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/clubs" element={<ClubsOrganizers />} />
          <Route path="/organizers/:organizerId" element={<OrganizerDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/organizer" element={<Organizer />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
          <Route path="/organizer-create-event" element={<OrganizerCreateEvent />} />
          <Route path="/organizer-edit-event/:eventId" element={<OrganizerCreateEvent />} />
          <Route path="/organizer-all-events" element={<OrganizerAllEvents />} />
          <Route path="/organizer-event/:eventId" element={<OrganizerEventDetail />} />
          <Route path="/organizer-event/:eventId/attendance" element={<QRAttendanceScanner />} />
          <Route path="/organizer-profile" element={<OrganizerProfile />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
