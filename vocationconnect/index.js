[// Import required modules
var express = require('express');
var ejs = require('ejs');
var expressLayouts = require('express-ejs-layouts');
const path = require('path');
var mysql = require('mysql2');
require('dotenv').config();
var session = require('express-session');
const expressSanitizer = require('express-sanitizer');

// Initialize Express application
const app = express();
const port = 8000;

// Configure EJS as the templating engine
app.set('view engine', 'ejs');

// Enable express-ejs-layouts for consistent page layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Serve static files (CSS, images, client-side JavaScript)
app.use(express.static(path.join(__dirname, 'public')));

// Parse incoming request bodies (for form data and JSON)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sanitize user input to prevent XSS attacks
app.use(expressSanitizer());

// Configure session management
app.use(session({
  secret: 'VocationConnectSecretKey2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 3600000 // 1 hour
  }
}));

// Create MySQL database connection pool
const db = mysql.createPool({
  host: process.env.VOCATION_HOST || 'localhost',
  user: process.env.VOCATION_USER || 'vocation_app',
  password: process.env.VOCATION_PASSWORD || 'qwertyuiop',
  database: process.env.VOCATION_DATABASE || 'vocationconnect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Make database connection globally available
global.db = db;

// Set application-wide local variables for templates
app.locals.siteData = {
  siteName: "VocationConnect"
};

// Configure base URL for deployment (e.g., subfolder hosting)
const BASE_PATH = process.env.VOCATION_BASE_PATH || '';

// Make BASE_URL available in all templates
app.locals.BASE_URL = BASE_PATH;
app.use((req, res, next) => {
  res.locals.BASE_URL = BASE_PATH;
  next();
});

// Make session data available in all templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Import route handlers
const mainRoutes = require('./routes/main');
const userRoutes = require('./routes/users');
const alumniRoutes = require('./routes/alumni');
const interviewRoutes = require('./routes/interviews');
const connectionRoutes = require('./routes/connections');

// Mount route handlers with base path
app.use(BASE_PATH + '/', mainRoutes);
app.use(BASE_PATH + '/users', userRoutes);
app.use(BASE_PATH + '/alumni', alumniRoutes);
app.use(BASE_PATH + '/interviews', interviewRoutes);
app.use(BASE_PATH + '/connections', connectionRoutes);

// Start the server
app.listen(port, () => {
  console.log(`VocationConnect app listening on port ${port}...`);
  console.log(`Access at: http://localhost:${port}${BASE_PATH}/`);
});
