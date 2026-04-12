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

// Process alumni search with advanced filters
router.post('/search', redirectLogin, (req, res, next) => {
  const keyword = req.sanitize(req.body.keyword || '');
  const industry = req.sanitize(req.body.industry || '');
  const minExperience = parseInt(req.body.minExperience) || 0;
  const maxExperience = parseInt(req.body.maxExperience) || 100;
  const minGradYear = parseInt(req.body.minGradYear) || 1990;
  const maxGradYear = parseInt(req.body.maxGradYear) || new Date().getFullYear();
  const availabilityOnly = req.body.availabilityOnly === 'on';
  const sortBy = req.sanitize(req.body.sortBy || 'name');
  
  let sql = `
    SELECT u.id, u.username, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, 
           ap.skills, ap.bio, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
  `;
  
  const params = [];
  
  // Keyword search across multiple fields
  if (keyword) {
    sql += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR ap.company LIKE ? OR ap.job_title LIKE ? OR ap.skills LIKE ?)`;
    const searchTerm = `%${keyword}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  // Industry filter
  if (industry && industry !== 'all') {
    sql += ` AND ap.industry = ?`;
    params.push(industry);
  }
  
  // Experience range filter
  sql += ` AND ap.years_experience >= ? AND ap.years_experience <= ?`;
  params.push(minExperience, maxExperience);
  
  // Graduation year range filter
  sql += ` AND u.graduation_year >= ? AND u.graduation_year <= ?`;
  params.push(minGradYear, maxGradYear);
  
  // Availability filter
  if (availabilityOnly) {
    sql += ` AND ap.available_for_mock = TRUE`;
  }
  
  // Apply sorting
  switch(sortBy) {
    case 'experience':
      sql += ` ORDER BY ap.years_experience DESC, u.first_name`;
      break;
    case 'graduation':
      sql += ` ORDER BY u.graduation_year DESC, u.first_name`;
      break;
    case 'company':
      sql += ` ORDER BY ap.company, u.first_name`;
      break;
    default: // 'name'
      sql += ` ORDER BY u.first_name, u.last_name`;
  }
  
  db.query(sql, params, (err, results) => {
    if (err) return next(err);
    
    // Get all available industries for filter options
    const industrySql = `
      SELECT DISTINCT industry FROM alumni_profiles 
      WHERE industry IS NOT NULL AND industry != ''
      ORDER BY industry
    `;
    
    db.query(industrySql, (err2, industries) => {
      if (err2) return next(err2);
      
      res.render('alumni_search_results', {
        title: 'Search Results',
        alumni: results,
        searchParams: {
          keyword: keyword,
          industry: industry,
          minExperience: minExperience,
          maxExperience: maxExperience,
          minGradYear: minGradYear,
          maxGradYear: maxGradYear,
          availabilityOnly: availabilityOnly,
          sortBy: sortBy
        },
        industries: industries,
        currentYear: new Date().getFullYear()
      });
    });
  });
});

// Real-time search API for autocomplete suggestions
router.get('/api/search-suggestions', redirectLogin, (req, res, next) => {
  const query = req.sanitize(req.query.q || '');
  
  if (!query || query.length < 2) {
    return res.json({ suggestions: [] });
  }
  
  const searchTerm = `%${query}%`;
  
  const sql = `
    SELECT 
      u.id, 
      u.first_name, 
      u.last_name, 
      ap.company, 
      ap.job_title,
      ap.industry,
      (CASE 
        WHEN u.first_name LIKE ? THEN 1
        WHEN u.last_name LIKE ? THEN 2
        WHEN ap.company LIKE ? THEN 3
        WHEN ap.job_title LIKE ? THEN 4
        ELSE 5
      END) AS relevance
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
    AND (u.first_name LIKE ? OR u.last_name LIKE ? OR ap.company LIKE ? OR ap.job_title LIKE ? OR ap.skills LIKE ?)
    ORDER BY relevance, u.first_name, u.last_name
    LIMIT 10
  `;
  
  const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
  
  db.query(sql, params, (err, results) => {
    if (err) return next(err);
    
    const suggestions = results.map(row => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      company: row.company,
      title: row.job_title,
      industry: row.industry,
      displayText: `${row.first_name} ${row.last_name}${row.company ? ' at ' + row.company : ''}`
    }));
    
    res.json({ suggestions: suggestions });
  });
});

// Get available industries for filter options
router.get('/api/industries', redirectLogin, (req, res, next) => {
  const sql = `
    SELECT DISTINCT industry FROM alumni_profiles 
    WHERE industry IS NOT NULL AND industry != ''
    ORDER BY industry
  `;
  
  db.query(sql, (err, results) => {
    if (err) return next(err);
    
    const industries = results.map(row => row.industry);
    res.json({ industries: industries });
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
