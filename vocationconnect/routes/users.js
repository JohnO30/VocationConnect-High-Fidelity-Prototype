const express = require('express');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const router = express.Router();

// Middleware to redirect to login page if user is not authenticated
const redirectLogin = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect((req.app.locals.BASE_URL || '') + '/users/login');
  } else {
    next();
  }
};

// Middleware to redirect to home page if user is already logged in
const redirectHome = (req, res, next) => {
  if (req.session.userId) {
    res.redirect(req.app.locals.BASE_URL || '/');
  } else {
    next();
  }
};

// Display registration form
router.get('/register', redirectHome, (req, res) => {
  res.render('register', {
    title: 'Register',
    errors: null
  });
});

// Process registration form submission with validation
router.post('/registered',
  [
    check('username', 'Username must be 2-20 characters long').isLength({ min: 2, max: 20 }),
    check('first_name', 'First name is required').notEmpty(),
    check('last_name', 'Last name is required').notEmpty(),
    check('email', 'Invalid email address').isEmail(),
    check('password', 'Password must be 8+ chars, with 1 uppercase, 1 lowercase, 1 number, and 1 symbol')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/),
    check('user_type', 'User type must be student or alumni').isIn(['student', 'alumni'])
  ],
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('register', {
        title: 'Register',
        errors: errors.array()
      });
    }

    try {
      // Hash the password for secure storage
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Insert new user into database
      const sql = "INSERT INTO users (username, first_name, last_name, email, hashedPassword, user_type, graduation_year) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const newUserData = [
        req.sanitize(req.body.username),
        req.sanitize(req.body.first_name),
        req.sanitize(req.body.last_name),
        req.sanitize(req.body.email),
        hashedPassword,
        req.body.user_type,
        req.body.graduation_year || null
      ];

      db.query(sql, newUserData, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.render('register', {
              title: 'Register',
              errors: [{ msg: 'Username or email already exists. Please choose another.' }]
            });
          }
          return next(err);
        }

        // If user is alumni, create their profile
        if (req.body.user_type === 'alumni') {
          const profileSql = "INSERT INTO alumni_profiles (user_id) VALUES (?)";
          db.query(profileSql, [result.insertId], (err2) => {
            if (err2) console.error('Error creating alumni profile:', err2);
          });
        }

        res.send(`
          <h2>Registration Successful</h2>
          <p>User ${req.body.username} has been registered successfully as a ${req.body.user_type}!</p>
          <p><a href="${req.app.locals.BASE_URL || ''}/users/login">Login here</a> or <a href="${req.app.locals.BASE_URL || ''}">Go to Home</a></p>
        `);
      });

    } catch (error) {
      next(error);
    }
  }
);

// Display login form
router.get('/login', redirectHome, (req, res) => {
  res.render('login', {
    title: 'Login',
    error: null
  });
});

// Process login form submission
router.post('/loggedin', async (req, res, next) => {
  const { username, password } = req.body;

  const sql = "SELECT id, username, hashedPassword, user_type FROM users WHERE username = ?";

  db.query(sql, [username], async (err, results) => {
    if (err) {
      // Log failed login attempt
      const auditSql = "INSERT INTO login_audit (username, status, message) VALUES (?, 'failed', 'Database error')";
      db.query(auditSql, [username]);
      return next(err);
    }

    if (results.length === 0) {
      // Log failed login attempt
      const auditSql = "INSERT INTO login_audit (username, status, message) VALUES (?, 'failed', 'Username not found')";
      db.query(auditSql, [username]);
      
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password.'
      });
    }

    const user = results[0];
    
    bcrypt.compare(password, user.hashedPassword, function (err2, match) {
      if (err2) {
        return next(err2);
      }

      if (!match) {
        // Log failed login attempt
        const auditSql = "INSERT INTO login_audit (username, status, message) VALUES (?, 'failed', 'Incorrect password')";
        db.query(auditSql, [username]);
        
        return res.render('login', {
          title: 'Login',
          error: 'Invalid username or password.'
        });
      }

      // Log successful login
      const auditSql = "INSERT INTO login_audit (username, status, message) VALUES (?, 'success', 'Login successful')";
      db.query(auditSql, [username]);

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.userType = user.user_type;
      
      res.redirect(req.app.locals.BASE_URL || '/dashboard');
    });
  });
});

// Logout user and destroy session
router.get('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect(req.app.locals.BASE_URL || '');
  });
});

// Display user profile
router.get('/profile', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  
  const sql = `
    SELECT u.*, ap.* 
    FROM users u 
    LEFT JOIN alumni_profiles ap ON u.id = ap.user_id 
    WHERE u.id = ?
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) return next(err);
    
    res.render('profile', {
      title: 'My Profile',
      user: results[0]
    });
  });
});

// Update user profile
router.post('/profile/update', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  
  if (req.session.userType === 'alumni') {
    const sql = `
      UPDATE alumni_profiles 
      SET company = ?, job_title = ?, industry = ?, years_experience = ?, 
          skills = ?, bio = ?, available_for_mock = ?
      WHERE user_id = ?
    `;
    
    const params = [
      req.sanitize(req.body.company),
      req.sanitize(req.body.job_title),
      req.sanitize(req.body.industry),
      parseInt(req.body.years_experience) || 0,
      req.sanitize(req.body.skills),
      req.sanitize(req.body.bio),
      req.body.available_for_mock === 'on' ? 1 : 0,
      userId
    ];
    
    db.query(sql, params, (err) => {
      if (err) return next(err);
      res.redirect((req.app.locals.BASE_URL || '') + '/users/profile');
    });
  } else {
    res.redirect((req.app.locals.BASE_URL || '') + '/users/profile');
  }
});

module.exports = router;
