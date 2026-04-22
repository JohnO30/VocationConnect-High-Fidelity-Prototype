const express = require('express');
const router = express.Router();
const searchEngine = require('../utils/searchEngine');

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

// Process alumni search with advanced algorithmic ranking
router.post('/search', redirectLogin, (req, res, next) => {
  const keyword = req.sanitize(req.body.keyword || '');
  const industry = req.sanitize(req.body.industry || '');
  const minExperience = parseInt(req.body.minExperience) || 0;
  const maxExperience = parseInt(req.body.maxExperience) || 100;
  const minGradYear = parseInt(req.body.minGradYear) || 1990;
  const maxGradYear = parseInt(req.body.maxGradYear) || new Date().getFullYear();
  const availabilityOnly = req.body.availabilityOnly === 'on';
  const sortBy = req.sanitize(req.body.sortBy || 'relevance');
  
  // Fetch all alumni from database
  const sql = `
    SELECT u.id, u.username, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, 
           ap.skills, ap.bio, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
  `;
  
  db.query(sql, (err, allAlumni) => {
    if (err) return next(err);
    
    // Apply search engine with advanced ranking
    const searchFilters = {
      industry: industry && industry !== 'all' ? industry : null,
      minExperience: minExperience,
      maxExperience: maxExperience,
      minGradYear: minGradYear,
      maxGradYear: maxGradYear,
      availabilityOnly: availabilityOnly
    };
    
    let results = searchEngine.performSearch(allAlumni, keyword, searchFilters);
    
    // Apply secondary sorting (after relevance ranking)
    results = applySorting(results, sortBy);
    
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
        currentYear: new Date().getFullYear(),
        totalResults: results.length,
        searchStats: searchEngine.getStatistics()
      });
    });
  });
});

/**
 * Apply secondary sorting to already-ranked results
 * @param {array} results - Already ranked by relevance
 * @param {string} sortBy - Sort criteria
 * @returns {array} - Re-sorted results
 */
function applySorting(results, sortBy) {
  const sorted = [...results];
  
  switch(sortBy) {
    case 'experience':
      sorted.sort((a, b) => {
        if (b.years_experience !== a.years_experience) {
          return b.years_experience - a.years_experience;
        }
        // Secondary sort by relevance if experience equal
        return b.relevanceScore - a.relevanceScore;
      });
      break;
      
    case 'graduation':
      sorted.sort((a, b) => {
        if (b.graduation_year !== a.graduation_year) {
          return b.graduation_year - a.graduation_year;
        }
        return b.relevanceScore - a.relevanceScore;
      });
      break;
      
    case 'company':
      sorted.sort((a, b) => {
        const companyA = (a.company || '').toLowerCase();
        const companyB = (b.company || '').toLowerCase();
        if (companyA !== companyB) {
          return companyA.localeCompare(companyB);
        }
        return b.relevanceScore - a.relevanceScore;
      });
      break;
      
    case 'name':
      sorted.sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      break;
      
    case 'relevance':
    default:
      // Already sorted by relevance from searchEngine.performSearch
      break;
  }
  
  return sorted;
}

// Real-time search API for autocomplete suggestions with fuzzy matching
router.get('/api/search-suggestions', redirectLogin, (req, res, next) => {
  const query = req.sanitize(req.query.q || '');
  
  if (!query || query.length < 1) {
    return res.json({ suggestions: [] });
  }
  
  // Get all alumni for fuzzy matching
  const sql = `
    SELECT u.id, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, ap.skills
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
  `;
  
  db.query(sql, (err, allAlumni) => {
    if (err) return next(err);
    
    // Use search engine's fuzzy autocomplete algorithm
    let suggestions = searchEngine.getAutocompleteSuggestions(allAlumni, query, 15);
    
    // Add additional details from database
    suggestions = suggestions.map(suggestion => {
      const alumni = allAlumni.find(a => a.id === suggestion.id);
      return {
        ...suggestion,
        bio: alumni?.bio,
        displayText: `${suggestion.name}${suggestion.company ? ' at ' + suggestion.company : ''}`
      };
    });
    
    res.json({ suggestions: suggestions });
  });
});

// Enhanced fuzzy search endpoint for better typo tolerance
router.get('/api/fuzzy-search', redirectLogin, (req, res, next) => {
  const query = req.sanitize(req.query.q || '');
  
  if (!query || query.length < 2) {
    return res.json({ results: [], message: 'Query too short' });
  }
  
  // Get all alumni
  const sql = `
    SELECT u.id, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, ap.skills, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
  `;
  
  db.query(sql, (err, allAlumni) => {
    if (err) return next(err);
    
    // Use fuzzy search with typo tolerance
    let results = searchEngine.getFuzzySuggestions(allAlumni, query, 20);
    
    res.json({ 
      results: results,
      query: query,
      resultCount: results.length
    });
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

// Get search analytics and statistics
router.get('/api/search-analytics', redirectLogin, (req, res) => {
  const stats = searchEngine.getStatistics();
  res.json(stats);
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
