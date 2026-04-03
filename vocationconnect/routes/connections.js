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

// Display user's connections
router.get('/my', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  const userType = req.session.userType;
  
  let sql;
  if (userType === 'student') {
    sql = `
      SELECT c.id, c.status, c.message, c.created_at, c.updated_at,
             u.id as alumni_id, u.first_name, u.last_name,
             ap.company, ap.job_title
      FROM connections c
      JOIN users u ON c.alumni_id = u.id
      JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE c.student_id = ?
      ORDER BY c.created_at DESC
    `;
  } else {
    sql = `
      SELECT c.id, c.status, c.message, c.created_at, c.updated_at,
             u.id as student_id, u.first_name, u.last_name, u.email
      FROM connections c
      JOIN users u ON c.student_id = u.id
      WHERE c.alumni_id = ?
      ORDER BY c.created_at DESC
    `;
  }
  
  db.query(sql, [userId], (err, results) => {
    if (err) return next(err);
    
    res.render('connections_my', {
      title: 'My Connections',
      connections: results
    });
  });
});

// Send connection request
router.post('/request', redirectLogin, (req, res, next) => {
  if (req.session.userType !== 'student') {
    return res.status(403).send('Only students can send connection requests');
  }

  const studentId = req.session.userId;
  const alumniId = parseInt(req.body.alumni_id);
  const message = req.sanitize(req.body.message || '');
  const baseUrl = (req.app.locals.BASE_URL || '');

  if (!alumniId || isNaN(alumniId)) {
    return res.status(400).send('Invalid alumni ID');
  }

  if (alumniId === studentId) {
    return res.status(400).send('You cannot send a connection request to yourself.');
  }

  const userSql = `SELECT user_type FROM users WHERE id = ?`;
  db.query(userSql, [alumniId], (err, userResults) => {
    if (err) return next(err);

    if (!userResults || userResults.length === 0 || userResults[0].user_type !== 'alumni') {
      return res.status(404).send('Alumni user not found');
    }

    // Check if connection already exists
    const checkSql = `
      SELECT * FROM connections 
      WHERE student_id = ? AND alumni_id = ?
    `;

    db.query(checkSql, [studentId, alumniId], (err2, connResults) => {
      if (err2) return next(err2);

      if (connResults.length > 0) {
        return res.redirect(baseUrl + '/alumni/' + alumniId + '?status=exists');
      }

      const sql = `
        INSERT INTO connections (student_id, alumni_id, message)
        VALUES (?, ?, ?)
      `;

      db.query(sql, [studentId, alumniId, message], (err3) => {
        if (err3) return next(err3);

        return res.redirect(baseUrl + '/alumni/' + alumniId + '?status=sent');
      });
    });
  });
});

// Accept connection
router.post('/:id/accept', redirectLogin, (req, res, next) => {
  if (req.session.userType !== 'alumni') {
    return res.status(403).send('Only alumni can accept connection requests');
  }
  
  const connectionId = parseInt(req.params.id);
  const alumniId = req.session.userId;
  
  const sql = `
    UPDATE connections 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = ? AND alumni_id = ?
  `;
  
  db.query(sql, [connectionId, alumniId], (err) => {
    if (err) return next(err);
    res.redirect((req.app.locals.BASE_URL || '') + '/connections/my');
  });
});

// Decline connection
router.post('/:id/decline', redirectLogin, (req, res, next) => {
  if (req.session.userType !== 'alumni') {
    return res.status(403).send('Only alumni can decline connection requests');
  }
  
  const connectionId = parseInt(req.params.id);
  const alumniId = req.session.userId;
  
  const sql = `
    UPDATE connections 
    SET status = 'declined', updated_at = NOW()
    WHERE id = ? AND alumni_id = ?
  `;
  
  db.query(sql, [connectionId, alumniId], (err) => {
    if (err) return next(err);
    res.redirect((req.app.locals.BASE_URL || '') + '/connections/my');
  });
});

// Cancel connection request
router.post('/:id/cancel', redirectLogin, (req, res, next) => {
  if (req.session.userType !== 'student') {
    return res.status(403).send('Only students can cancel connection requests');
  }

  const connectionId = parseInt(req.params.id);
  const studentId = req.session.userId;

  const sql = `
    UPDATE connections
    SET status = 'declined', updated_at = NOW()
    WHERE id = ? AND student_id = ? AND status = 'pending'
  `;

  db.query(sql, [connectionId, studentId], (err, result) => {
    if (err) return next(err);

    if (result.affectedRows === 0) {
      return res.status(404).send('No pending connection request found to cancel');
    }

    res.redirect((req.app.locals.BASE_URL || '') + '/connections/my');
  });
});

module.exports = router;
