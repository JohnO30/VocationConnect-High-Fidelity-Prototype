const express = require('express');
const router = express.Router();

// Route for the home page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Home'
  });
});

// Route for the about page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About'
  });
});

// Route for the dashboard (requires user to be logged in)
router.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect((req.app.locals.BASE_URL || '') + '/users/login');
  }
  
  res.render('dashboard', {
    title: 'Dashboard'
  });
});

module.exports = router;
