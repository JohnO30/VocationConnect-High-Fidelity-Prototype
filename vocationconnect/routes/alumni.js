const express = require('express');
const router = express.Router();

// Middleware to require user login
const redirectLogin = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect((req.app.locals.BASE_URL || '') + '/users/login');
  } else {
    next();
  }
};

// Display list of all alumni
router.get('/browse', redirectLogin, (req, res, next) => {
  const sql = `
    SELECT u.id, u.username, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, 
           ap.bio, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
    ORDER BY u.first_name, u.last_name
  `;
  
  db.query(sql, (err, results) => {
    if (err) return next(err);
    
    res.render('alumni_browse', {
      title: 'Browse Alumni',
      alumni: results
    });
  });
});

// Display alumni search form
router.get('/search', redirectLogin, (req, res) => {
  res.render('alumni_search', {
    title: 'Search Alumni'
  });
});

// Process alumni search
router.post('/search', redirectLogin, (req, res, next) => {
  const keyword = req.sanitize(req.body.keyword);
  const industry = req.sanitize(req.body.industry);
  
  let sql = `
    SELECT u.id, u.username, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, 
           ap.bio, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
  `;
  
  const params = [];
  
  if (keyword) {
    sql += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR ap.company LIKE ? OR ap.job_title LIKE ? OR ap.skills LIKE ?)`;
    const searchTerm = `%${keyword}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (industry && industry !== 'all') {
    sql += ` AND ap.industry = ?`;
    params.push(industry);
  }
  
  sql += ` ORDER BY u.first_name, u.last_name`;
  
  db.query(sql, params, (err, results) => {
    if (err) return next(err);
    
    res.render('alumni_search_results', {
      title: 'Search Results',
      alumni: results,
      keyword: keyword,
      industry: industry
    });
  });
});

// Display individual alumni profile
router.get('/:id', redirectLogin, (req, res, next) => {
  const alumniId = parseInt(req.params.id);
  
  const sql = `
    SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, 
           ap.skills, ap.bio, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.id = ? AND u.user_type = 'alumni'
  `;
  
  db.query(sql, [alumniId], (err, results) => {
    if (err) return next(err);
    
    if (results.length === 0) {
      return res.status(404).send('Alumni not found');
    }
    
    // Check if user has a connection with this alumni
    const connSql = `
      SELECT * FROM connections 
      WHERE student_id = ? AND alumni_id = ?
    `;
    
    db.query(connSql, [req.session.userId, alumniId], (err2, connResults) => {
      if (err2) return next(err2);

      const status = req.query.status;
      let flash = null;
      if (status === 'sent') {
        flash = { type: 'success', message: 'Connection request sent successfully.' };
      } else if (status === 'exists') {
        flash = { type: 'warning', message: 'You already have a connection request for this alumni.' };
      }

      res.render('alumni_profile', {
        title: results[0].first_name + ' ' + results[0].last_name,
        alumni: results[0],
        connection: connResults.length > 0 ? connResults[0] : null,
        flash: flash
      });
    });
  });
});

module.exports = router;
