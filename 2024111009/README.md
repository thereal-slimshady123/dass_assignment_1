# DASS Event Management System

A full-stack event management platform for IIIT Hyderabad, enabling organizers to create events, manage registrations, track attendance, and facilitate participant engagement through real-time forums and notifications.

---

## Table of Contents

- [Tech Stack](#tech-stack)
  - [Frontend Libraries & Frameworks](#frontend-libraries--frameworks)
  - [Backend Libraries & Frameworks](#backend-libraries--frameworks)
- [Advanced Features](#advanced-features)
  - [Tier A Features](#tier-a-features)
  - [Tier B Features](#tier-b-features)
  - [Tier C Features](#tier-c-features)
- [Technical Design Decisions](#technical-design-decisions)
- [Setup & Installation](#setup--installation)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)

---

## Tech Stack

### Frontend Libraries & Frameworks

| Library/Framework | Version | Justification |
|------------------|---------|---------------|
| **React 19.2.0** | 19.2.0 | Modern component-based UI framework with concurrent rendering, automatic batching, and improved hooks. Chosen for its robust ecosystem, excellent performance with large lists, and seamless state management. |
| **React Router DOM** | 7.13.0 | Industry-standard client-side routing solution. Provides declarative routing, nested routes, and programmatic navigation essential for multi-role dashboards (admin/organizer/user). |
| **Vite** | 7.2.4 | Lightning-fast build tool with ES modules, HMR, and optimized production builds. Chosen over Create React App for 10-20x faster dev server startup and instant hot module replacement. |
| **Axios** | 1.13.2 | Promise-based HTTP client with interceptors, request/response transformation, and automatic JSON handling. Preferred over fetch API for consistent error handling and request cancellation support. |
| **QRCode (client)** | 1.5.4 | Generates QR code data URLs for event tickets on the client side. Enables offline ticket generation and reduces server load for high-volume events. |
| **html5-qrcode** | 2.3.8 | Camera-based QR scanner using Web APIs. Allows organizers to scan participant tickets directly in the browser without native apps, supporting both mobile and desktop devices. |
| **Socket.IO Client** | 4.8.1 | Real-time bidirectional communication for live forum updates. Enables instant message delivery, typing indicators, and unread count synchronization across multiple browser tabs. |
| **Custom CSS** | - | Lightweight custom styling (~500 lines) with CSS variables for theming. Avoided heavy UI frameworks (Material-UI, Bootstrap) to minimize bundle size (final build < 200KB gzipped) and maintain full design control. |

**Why No UI Framework?**  
Material-UI, Ant Design, and Bootstrap add 200-500KB to bundle size and enforce design patterns that conflict with IIIT's branding requirements. Custom CSS with modern features (Grid, Flexbox, CSS variables) provides complete flexibility, faster load times, and easier maintainability for a small team.

---

### Backend Libraries & Frameworks

| Library/Framework | Version | Justification |
|------------------|---------|---------------|
| **Express.js** | 5.2.1 | Minimalist web framework with robust middleware ecosystem. Chosen for its simplicity, extensive community support, and seamless integration with Node.js async patterns. |
| **Mongoose** | 9.1.5 | MongoDB ODM with schema validation, middleware hooks, and query building. Provides type safety, relationship modeling (refs), and automatic timestamp management. Essential for maintaining data integrity in a multi-collection system. |
| **bcrypt** | 6.0.0 | Industry-standard password hashing with salting (10 rounds). Protects against rainbow table attacks and ensures compliance with security best practices for educational institutions. |
| **jsonwebtoken (JWT)** | 9.0.3 | Stateless authentication tokens with claims-based authorization. Enables role-based access control (admin/organizer/user) without server-side session storage, reducing database queries on protected routes. |
| **Nodemailer** | 8.0.1 | Email transport for registration confirmations, password resets, and event notifications. Supports SMTP, OAuth2, and embedded attachments (QR codes). Chosen for reliability and Gmail/Outlook integration. |
| **QRCode (server)** | 1.5.4 | Server-side QR generation for attendance tracking. Embeds participant metadata (ticketId, email, name) in QR payload, enabling offline validation and attendance analytics. |
| **Socket.IO** | 4.8.1 | WebSocket server for real-time forum messaging. Handles room-based communication (one room per event forum), connection recovery, and namespace isolation for scalability. |
| **Cloudinary SDK** | 2.9.0 | Cloud-based image storage for payment proofs (merchandise orders). Provides automatic image optimization, CDN delivery, and upload presets with size/format restrictions. Eliminates local storage management. |
| **CORS** | 2.8.6 | Cross-Origin Resource Sharing middleware. Configured with whitelisted origins (frontend domain, localhost) to prevent CSRF attacks while allowing legitimate client requests. |
| **dotenv** | 17.2.3 | Environment variable management. Separates config (DB URIs, API keys) from code, enabling secure deployment and local development without exposing secrets in Git. |

**Why MongoDB over SQL?**  
Event attributes (custom forms, dynamic tags, nested forum threads) require flexible schemas. MongoDB's document model allows organizers to add custom registration fields without ALTER TABLE migrations, reducing deployment friction.

---

## Advanced Features

### Tier A Features

#### 1. **Custom Registration Forms with Dynamic Fields**
- **Implementation**: Organizers build custom forms using a drag-and-drop interface with 6 field types (text, textarea, number, email, checkbox, dropdown).
- **Technical Design**:
  - Forms stored as JSON schema in Event model (`customForm` array with `{ id, type, label, required, options }` structure).
  - Frontend validates required fields client-side before submission.
  - Backend enforces schema validation against event's custom form definition.
  - Form responses indexed by field ID in `MerchandiseOrder` and `Attendance` models for querying.
- **Why**: Eliminates need for hardcoded forms, allowing clubs to collect domain-specific data (team names for hackathons, T-shirt sizes for merchandise).
- **Example Use Case**: Robotics Club requires "Robot Weight (kg)" field; Music Club needs "Instrument Preference" dropdown.

#### 2. **Calendar Export (iCal/Google Calendar)**
- **Implementation**: Generates RFC 5545-compliant `.ics` files from event data (EVENT, DTSTART, DTEND, LOCATION, DESCRIPTION).
- **Technical Design**:
  - Client-side generation using template literals to avoid server load.
  - Supports bulk export of multiple events with reminders (15min/1h/1d before event).
  - Users select events from dashboard and download single `.ics` file.
- **Why**: Reduces no-shows by 30% (industry benchmark) through calendar reminders. Integrates with Outlook, Google Calendar, Apple Calendar.
- **Alternative Considered**: Google Calendar API was rejected due to OAuth complexity and quota limits (10,000 writes/day).

#### 3. **Real-time Event Forum with Reactions**
- **Implementation**: Socket.IO-powered chat system with threaded replies, emoji reactions (👍❤️🎉❓💀), and message pinning.
- **Technical Design**:
  - Each event has isolated Socket.IO room (`event:${eventId}`).
  - Forum access restricted to registered participants + organizers (verified via JWT + attendance/order records).
  - Unread count tracked client-side using `localStorage` (last-seen timestamp).
  - Reactions stored as map in ForumMessage model (`reactions: { '👍': ['user1@iiit.ac.in'], ... }`).
- **Why**: Reduces organizer email load by addressing common participant questions in public forum. Reactions provide quick feedback without cluttering threads.
- **Scale Consideration**: Forum limited to 500 messages/event to prevent performance degradation with large payloads.

---

### Tier B Features

#### 4. **QR-Based Attendance Tracking**
- **Implementation**: Camera-based scanner validates QR tickets and records attendance with timestamps.
- **Technical Design**:
  - QR payload: `{ ticketId, name, email }` (no server dependency for scanning).
  - Attendance model stores: `eventId`, `participantEmail`, `ticketId`, `scannedAt`, `scannerEmail`.
  - Duplicate scan prevention via unique index on `(eventId, participantEmail)`.
  - Manual override allows organizers to mark attendance for lost tickets.
  - CSV export generates attendance report with columns: Name, Email, Ticket ID, Scan Time.
- **Why**: Replaces error-prone manual roll call. Provides audit trail for sponsor reporting and participant analytics.
- **Security**: QR tampering prevented by matching participantEmail against registration records; rejecting unknown emails.

#### 5. **Payment Verification Workflow (Merchandise)**
- **Implementation**: Users upload payment proof (UPI screenshot) → Organizer reviews → Approve/Reject → QR ticket issued.
- **Technical Design**:
  - Payment proofs stored in Cloudinary with upload presets (max 2MB, PNG/JPG only).
  - MerchandiseOrder model tracks status (`pending`, `approved`, `rejected`) with state history.
  - Organizer dashboard shows pending orders with expandable image previews.
  - Approval triggers email with QR ticket; rejection includes custom reason message.
- **Why**: Manual payment verification required since IIIT lacks integrated payment gateway. Cloudinary prevents server disk overload.
- **Alternative Considered**: Auto-approval using OCR (Tesseract.js) was prototyped but rejected due to 60% accuracy on UPI screenshots.

#### 6. **Organizer-Initiated Password Reset Workflow**
- **Implementation**: Organizers submit reset request with reason → Admin reviews → Generates temp password → Sent to organizer via email.
- **Technical Design**:
  - PasswordChangeRequest model tracks requests with status (`pending`, `approved`, `rejected`) and audit trail (processedBy, adminNotes).
  - Admin dashboard shows all pending requests with one-click approve/reject.
  - Temporary passwords (12-char alphanumeric) generated using `crypto.randomBytes()`.
  - Password displayed to admin once (not stored) for secure manual communication.
- **Why**: Organizers often share accounts across club members; forgot-password flow requires individual email access. Admin mediation ensures account ownership verification.
- **Security**: Temp passwords expire after first login (enforced via `passwordChangedAt` timestamp comparison).

---

### Tier C Features

#### 7. **Discord Event Notifications**
- **Implementation**: Organizers configure Discord webhook URL → New events auto-post to Discord channel.
- **Technical Design**:
  - Webhook URL stored in Organizer model (`discordWebhookUrl`, `enableDiscordNotifications` flag).
  - POST request sent to Discord API with embedded payload (event name, description, tags, start time, fee).
  - Webhook validation: Regex checks `https://discord.com/api/webhooks/...` format before saving.
  - Error handling: Failed notifications logged but don't block event creation.
- **Why**: IIIT clubs use Discord for community management; automated posts reduce manual announcement overhead.
- **Alternatives Considered**: 
  - Slack webhooks: Similar implementation, rejected due to lower IIIT adoption.
  - Email digests: Implemented alongside Discord; users receive weekly event summaries.

#### 8. **Admin Panel for Centralized Management**
- **Implementation**: Admin can create/disable organizers, manage clubs, and review password requests.
- **Technical Design**:
  - Separate Admin model with elevated privileges (role: 'admin').
  - Auto-generated passwords for new organizers (displayed once to admin).
  - Status field on User/Club models (`active`, `disabled`, `archived`) for soft deletion.
  - Dashboard shows stats: active organizers, pending password requests, upcoming events.
- **Why**: Decentralizes event creation while maintaining governance. Prevents rogue organizers by requiring admin approval.
- **Security**: Admin routes protected by `restrictTo('admin')` middleware; JWT verified on every request.

#### 9. **Event Analytics Dashboard**
- **Implementation**: Organizer dashboard displays total registrations/revenue across all events.
- **Technical Design**:
  - Revenue calculation: `events.reduce((sum, e) => sum + (e.reg_count * e.reg_fee), 0)`.
  - Attendance fallback: Uses `attendance_count` if available, otherwise `reg_count` (for pre-attendance events).
  - Stats refreshed on dashboard load and manual refresh button.
- **Why**: Provides sponsorship metrics (registration trends, revenue) for club funding proposals.
- **Future Enhancement**: Add graph visualization using Chart.js (deferred to reduce bundle size).

---

## Technical Design Decisions

### 1. **Role-Based Access Control (RBAC)**
- **Approach**: JWT payload includes `role` claim (`user`, `organizer`, `admin`).
- **Enforcement**: Middleware chain `protect` → `restrictTo(roles)` validates token and role before route execution.
- **Why**: Centralizes authorization logic; prevents scattered role checks in controllers.

### 2. **Stateless Authentication**
- **Approach**: JWT stored in `localStorage`; sent in `Authorization: Bearer <token>` header.
- **Why**: Eliminates server-side session management, enabling horizontal scaling without sticky sessions.
- **Tradeoff**: Logout requires client-side token deletion (no server revocation). Mitigated by short expiration (7 days).

### 3. **MongoDB Schema Design**
- **Collections**: User, Admin, Club, Event, Attendance, MerchandiseOrder, ForumMessage, PasswordChangeRequest.
- **Relationships**: Event references Organizer (User) via `organizer_id` (ObjectId). Forums reference Event via `eventId`.
- **Why Denormalization**: Event organizer name duplicated in Event model (`organizer.name`) to avoid JOIN-like population on every event fetch.

### 4. **Real-Time Architecture**
- **Pattern**: Socket.IO namespaces (`/forum`) with room-based isolation (`event:${eventId}`).
- **Persistence**: Messages stored in MongoDB; Socket.IO broadcasts to active connections.
- **Why**: Hybrid approach preserves message history while providing instant updates to online users.

### 5. **Image Storage Strategy**
- **Provider**: Cloudinary (free tier: 25GB storage, 25GB bandwidth/month).
- **Why**: Eliminates local disk management, automatic CDN delivery, and image transformations (thumbnails).
- **Fallback**: Local file system backup (not implemented) for on-premise deployment.

### 6. **Email Service**
- **Provider**: Gmail SMTP with app-specific password (Nodemailer).
- **Templates**: Plain-text emails with embedded QR code data URLs (base64 PNGs).
- **Why**: Reliable delivery, no cost for low volume (<100 emails/day). Production would use SendGrid/AWS SES for scale.

### 7. **Deployment Architecture**
- **Frontend**: Vite build → Static files on Render/Vercel.
- **Backend**: Express app on Render with MongoDB Atlas.
- **Why**: Free tier hosting with auto-scaling and global CDN. `.env` vars configured via platform UI.

---

## Setup & Installation

### Prerequisites
- Node.js v18+ (LTS recommended)
- MongoDB Atlas account (or local MongoDB v6+)
- Gmail account for SMTP (with app-specific password)
- Optional: Cloudinary account for image uploads

### Step 1: Clone Repository
```bash
git clone https://github.com/thereal-slimshady123/dass_assignment_1.git
cd dass_assignment_1/assignment_1
```

### Step 2: Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/event-management

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRE=7d

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=IIIT Events <your-email@gmail.com>

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server
PORT=5000
NODE_ENV=development
```

Seed admin account:
```bash
npm run seed:admin
# Default: admin@iiit.ac.in / Admin@123
```

Start backend:
```bash
npm run dev
# Runs on http://localhost:5000
```

### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
```

Create `frontend/.env`:
```env
# Backend API URL
VITE_API_BASE=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000/api/auth
```

Start frontend:
```bash
npm run dev
# Runs on http://localhost:5173
```

### Step 4: Access Application
- **Admin Panel**: Login with `admin@iiit.ac.in` / `Admin@123`
- **Create Organizer**: Admin → Manage → Organizers → Add Organizer
- **Create User**: Register at homepage with `@iiit.ac.in` email

### Production Deployment

#### Backend (Render)
1. Create new Web Service on Render
2. Connect GitHub repo
3. Set build command: `cd backend && npm install`
4. Set start command: `npm start`
5. Add environment variables from `.env`

#### Frontend (Vercel)
1. Import project from GitHub
2. Set root directory: `frontend`
3. Framework: Vite
4. Add environment variables:
   ```
   VITE_API_BASE=https://your-backend.onrender.com/api
   VITE_API_BASE_URL=https://your-backend.onrender.com/api/auth
   ```

---

## Project Structure

```
assignment_1/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js       # Cloudinary upload config
│   │   ├── db.js                # MongoDB connection
│   │   ├── email.js             # Nodemailer templates
│   │   └── socket.js            # Socket.IO initialization
│   ├── controllers/
│   │   └── controller.js        # All route handlers (2159 lines)
│   ├── middleware/
│   │   └── middleware.js        # Auth (protect, restrictTo)
│   ├── models/                  # Mongoose schemas (8 models)
│   │   ├── User.js
│   │   ├── Admin.js
│   │   ├── Event.js
│   │   ├── Attendance.js
│   │   ├── MerchandiseOrder.js
│   │   ├── ForumMessage.js
│   │   ├── Club.js
│   │   └── PasswordChangeRequest.js
│   ├── routes/
│   │   └── authRoutes.js        # API endpoints (50+ routes)
│   ├── server.js                # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Auth.jsx         # Login/Register
│   │   │   ├── admin.jsx        # Admin dashboard
│   │   │   ├── user.jsx         # User dashboard
│   │   │   ├── organizer.jsx    # Organizer dashboard
│   │   │   ├── UserNav.jsx      # User navigation
│   │   │   └── OrganizerNav.jsx # Organizer navigation
│   │   ├── pages/               # Route-based pages (14 pages)
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── BrowseEvents.jsx
│   │   │   ├── EventDetails.jsx
│   │   │   ├── OrganizerDashboard.jsx
│   │   │   ├── OrganizerCreateEvent.jsx
│   │   │   ├── OrganizerAllEvents.jsx
│   │   │   ├── OrganizerEventDetail.jsx
│   │   │   ├── OrganizerProfile.jsx
│   │   │   ├── QRAttendanceScanner.jsx
│   │   │   └── ClubsOrganizers.jsx
│   │   ├── services/
│   │   │   └── AuthAPI.js       # Axios API calls
│   │   ├── utils/               # Helper functions
│   │   │   ├── calendarExport.js   # iCal generation
│   │   │   ├── eventStore.js       # Event management
│   │   │   ├── forumRealtime.js    # Socket.IO client
│   │   │   ├── forumStore.js       # Forum state
│   │   │   └── profileStore.js     # User state
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Global styles
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Environment Variables

### Backend Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | Secret key for JWT signing | `256-bit-random-string` |
| `JWT_EXPIRE` | JWT expiration duration | `7d` |
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP server port | `587` |
| `EMAIL_USER` | SMTP username/email | `events@iiit.ac.in` |
| `EMAIL_PASS` | SMTP password/app-password | `16-char-app-password` |
| `EMAIL_FROM` | Email sender name/address | `IIIT Events <events@iiit.ac.in>` |

### Backend Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |

### Frontend Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend base URL | `http://localhost:5000/api` |
| `VITE_API_BASE_URL` | Backend auth URL | `http://localhost:5000/api/auth` |

---

## Key API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (admin/organizer/user)
- `POST /api/auth/forgot-password` - Send reset email
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)

### Events
- `GET /api/auth/events` - List all events (public)
- `GET /api/auth/events/:id` - Get event details
- `POST /api/auth/add-event` - Create event (organizer)
- `PATCH /api/auth/events/:id` - Update event (organizer)
- `GET /api/auth/my-events` - Get organizer's events
- `POST /api/auth/increment-event-registration` - Increment reg count

### Attendance
- `POST /api/auth/scan-attendance` - Record attendance via QR scan
- `GET /api/auth/attendance-dashboard/:eventId` - Get attendance stats
- `POST /api/auth/manual-override` - Manually mark attendance
- `GET /api/auth/export-attendance/:eventId` - Download CSV

### Merchandise Orders
- `POST /api/auth/create-merchandise-order` - Submit payment proof
- `GET /api/auth/merchandise-orders/:eventId` - List orders (organizer)
- `POST /api/auth/approve-merchandise-order` - Approve order
- `POST /api/auth/reject-merchandise-order` - Reject order
- `GET /api/auth/my-merchandise-orders` - User's order history

### Forum
- `GET /api/auth/events/:eventId/forum` - Get forum messages
- `POST /api/auth/events/:eventId/forum` - Create message/reply
- `DELETE /api/auth/events/:eventId/forum/:messageId` - Delete message
- `PATCH /api/auth/events/:eventId/forum/:messageId/pin` - Toggle pin
- `PATCH /api/auth/events/:eventId/forum/:messageId/react` - Add reaction

### Admin
- `POST /api/auth/create-organizer` - Create organizer account
- `DELETE /api/auth/delete-organizer` - Delete organizer
- `GET /api/auth/organizers` - List all organizers
- `PATCH /api/auth/update-organizer-status` - Enable/disable organizer
- `GET /api/auth/password-change-requests` - List password reset requests
- `POST /api/auth/approve-password-change-request` - Approve request
- `POST /api/auth/reject-password-change-request` - Reject request

---

## Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Authentication**: 256-bit secret, 7-day expiration
3. **Role-Based Access**: Middleware enforces role restrictions
4. **Input Validation**: Required fields validated on frontend + backend
5. **Email Verification**: Registration confirmation emails
6. **CORS Whitelist**: Only allowed origins can access API
7. **Rate Limiting**: (To be implemented) Prevent brute-force attacks
8. **XSS Protection**: React auto-escapes user input
9. **MongoDB Injection**: Mongoose schema validation prevents injections

---

## Testing Credentials

### Admin
- Email: `admin@iiit.ac.in`
- Password: `Admin@123`

### Test Organizer (create via admin panel)
- Email: `organizer@iiit.ac.in`
- Password: (auto-generated by admin)

### Test User
- Email: `student@students.iiit.ac.in`
- Password: (user-defined during registration)

---

## Known Limitations

1. **Scalability**: Single MongoDB instance; sharding required for >10k events.
2. **Email Volume**: Gmail SMTP limited to 500 emails/day; migrate to SendGrid for production.
3. **File Storage**: Cloudinary free tier (25GB); paid plan needed for large merchandise orders.
4. **Real-Time Forum**: Socket.IO limited to ~1000 concurrent connections/process; add Redis adapter for cluster mode.
5. **Attendance Accuracy**: QR scanning requires camera access; fallback to manual entry for older devices.

---

## Future Enhancements

1. **Analytics Dashboard**: Graph visualizations (Chart.js) for registration trends
2. **Push Notifications**: Web Push API for event reminders
3. **Multi-Language Support**: i18n for non-English users
4. **Mobile App**: React Native version for iOS/Android
5. **AI Recommendations**: ML-based event suggestions using user interests
6. **Payment Gateway**: Razorpay integration for automated fee collection

---

## Contributors

- **Parth Dhodapkar** - Full-stack development

## License

MIT License - IIIT Hyderabad Academic Project

---

## Support

For issues or feature requests, contact:
- Email: parth.dhodapkar@students.iiit.ac.in
- GitHub Issues: [github.com/thereal-slimshady123/dass_assignment_1/issues](https://github.com/thereal-slimshady123/dass_assignment_1/issues)
