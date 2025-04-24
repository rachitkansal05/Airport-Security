const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

// Configure CORS to explicitly allow requests from any origin
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Increase payload size limit for fingerprint uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/biometric', require('./routes/biometric'));

app.get('/', (req, res) => {
  res.send('API is running');
});

// Add a test endpoint with connection information
app.get('/test-connection', (req, res) => {
  res.json({
    success: true,
    message: 'Connection successful',
    clientIP: req.ip || req.connection.remoteAddress,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all available network interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`For local access, use: http://localhost:${PORT}`);
  console.log(`For network access, use your machine's IP address: http://<YOUR_IP>:${PORT}`);
});