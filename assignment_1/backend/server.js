require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const Admin = require('./models/admin');
const { initSocket } = require('./config/socket');

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', require('./routes/authRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MERN API' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const ensureAdminProvisioned = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Admin' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('Admin provisioning skipped: set ADMIN_EMAIL and ADMIN_PASSWORD env vars');
    return;
  }

  const existing = await Admin.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    return;
  }

  await Admin.create({ adminName: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log('Admin account provisioned');
};

initSocket(server);

server.listen(PORT, async () => {
  await ensureAdminProvisioned();
  console.log(`Server is running on port ${PORT}`);
});