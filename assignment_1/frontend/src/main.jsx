import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login.jsx'
import User from './components/user.jsx'
import Admin from './components/admin.jsx'
import Organizer from './components/organizer.jsx'
import Interests from './interests.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login /> } />
        <Route path="/user" element={<User /> } />
        <Route path="/admin" element={<Admin /> } />
        <Route path="/organizer" element={<Organizer /> } />
        <Route path="/interests" element={<Interests /> } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
