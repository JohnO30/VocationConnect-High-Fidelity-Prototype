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

// Display user's mock interviews
router.get('/my', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  const userType = req.session.userType;
  
  let sql;
  if (userType === 'student') {
    sql = `
      SELECT mi.*, 
             u.first_name as alumni_first_name, u.last_name as alumni_last_name,
             ap.company, ap.job_title
      FROM mock_interviews mi
      JOIN users u ON mi.alumni_id = u.id
      JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE mi.student_id = ?
      ORDER BY mi.scheduled_date DESC
    `;
  } else {
    sql = `
      SELECT mi.*, 
             u.first_name as student_first_name, u.last_name as student_last_name,
             u.email as student_email
      FROM mock_interviews mi
      JOIN users u ON mi.student_id = u.id
      WHERE mi.alumni_id = ?
      ORDER BY mi.scheduled_date DESC
    `;
  }
  
  db.query(sql, [userId], (err, results) => {
    if (err) return next(err);
    
    res.render('interviews_my', {
      title: 'My Mock Interviews',
      interviews: results
    });
  });
});

// Schedule new interview
router.get('/schedule/:alumniId', redirectLogin, (req, res, next) => {
  if (req.session.userType !== 'student') {
    return res.status(403).send('Only students can schedule interviews');
  }
  
  const alumniId = parseInt(req.params.alumniId);
  
  // Get alumni info
  const sql = `
    SELECT u.id, u.first_name, u.last_name,
           ap.company, ap.job_title, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.id = ? AND u.user_type = 'alumni'
  `;
  
  db.query(sql, [alumniId], (err, results) => {
    if (err) return next(err);
    
    if (results.length === 0 || !results[0].available_for_mock) {
      return res.send('This alumni is not available for mock interviews.');
    }
    
    res.render('interview_schedule', {
      title: 'Schedule Interview',
      alumni: results[0]
    });
  });
});

// Process interview scheduling
router.post('/schedule', redirectLogin, (req, res, next) => {
  if (req.session.userType !== 'student') {
    return res.status(403).send('Only students can schedule interviews');
  }
  
  const studentId = req.session.userId;
  const alumniId = parseInt(req.body.alumni_id);
  const scheduledDate = req.body.scheduled_date;
  const durationMinutes = parseInt(req.body.duration_minutes) || 30;
  const interviewType = req.sanitize(req.body.interview_type);
  const notes = req.sanitize(req.body.notes);
  
  const sql = `
    INSERT INTO mock_interviews 
    (student_id, alumni_id, scheduled_date, duration_minutes, interview_type, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [studentId, alumniId, scheduledDate, durationMinutes, interviewType, notes], (err, result) => {
    if (err) return next(err);
    
    // Add default questions
    const questionSql = `
      INSERT INTO interview_questions (interview_id, question_text, time_allocated)
      VALUES 
        (?, 'Tell me about yourself and your background.', 180),
        (?, 'What are your greatest strengths and weaknesses?', 180),
        (?, 'Tell me about a time you faced a significant challenge. How did you handle it?', 300)
    `;
    
    const interviewId = result.insertId;
    db.query(questionSql, [interviewId, interviewId, interviewId]);
    
    res.redirect((req.app.locals.BASE_URL || '') + '/interviews/my');
  });
});

// Interview room (live interview)
router.get('/room/:id', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id);
  const userId = req.session.userId;
  
  // Get interview details
  const sql = `
    SELECT mi.*, 
           s.id as student_id, s.first_name as student_first_name, s.last_name as student_last_name,
           a.id as alumni_id, a.first_name as alumni_first_name, a.last_name as alumni_last_name,
           ap.company, ap.job_title
    FROM mock_interviews mi
    JOIN users s ON mi.student_id = s.id
    JOIN users a ON mi.alumni_id = a.id
    JOIN alumni_profiles ap ON a.id = ap.user_id
    WHERE mi.id = ? AND (mi.student_id = ? OR mi.alumni_id = ?)
  `;
  
  db.query(sql, [interviewId, userId, userId], (err, results) => {
    if (err) return next(err);
    
    if (results.length === 0) {
      return res.status(404).send('Interview not found or access denied');
    }
    
    const interview = results[0];
    
    // Get questions
    const questionSql = `
      SELECT * FROM interview_questions
      WHERE interview_id = ?
      ORDER BY id
    `;
    
    db.query(questionSql, [interviewId], (err2, questions) => {
      if (err2) return next(err2);
      
      // Get notes for current user
      const notesSql = `
        SELECT * FROM interview_notes
        WHERE interview_id = ? AND user_id = ?
        ORDER BY updated_at DESC
      `;
      
      db.query(notesSql, [interviewId, userId], (err3, notes) => {
        if (err3) return next(err3);
        
        res.render('interview_room', {
          title: 'Mock Interview',
          interview: interview,
          questions: questions,
          userNotes: notes.length > 0 ? notes[0].note_text : ''
        });
      });
    });
  });
});

// Save interview notes
router.post('/notes/:id', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id);
  const userId = req.session.userId;
  const noteText = req.sanitize(req.body.note_text);
  
  // Check if notes exist
  const checkSql = `
    SELECT * FROM interview_notes
    WHERE interview_id = ? AND user_id = ?
  `;
  
  db.query(checkSql, [interviewId, userId], (err, results) => {
    if (err) return next(err);
    
    let sql;
    let params;
    
    if (results.length > 0) {
      // Update existing notes
      sql = `
        UPDATE interview_notes 
        SET note_text = ?, updated_at = NOW()
        WHERE interview_id = ? AND user_id = ?
      `;
      params = [noteText, interviewId, userId];
    } else {
      // Insert new notes
      sql = `
        INSERT INTO interview_notes (interview_id, user_id, note_text)
        VALUES (?, ?, ?)
      `;
      params = [interviewId, userId, noteText];
    }
    
    db.query(sql, params, (err2) => {
      if (err2) return next(err2);
      res.json({ success: true });
    });
  });
});

// Send chat message
router.post('/chat/:id', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id);
  const senderId = req.session.userId;
  const messageText = req.sanitize(req.body.message_text);
  
  const sql = `
    INSERT INTO chat_messages (interview_id, sender_id, message_text)
    VALUES (?, ?, ?)
  `;
  
  db.query(sql, [interviewId, senderId, messageText], (err, result) => {
    if (err) return next(err);
    
    res.json({ 
      success: true, 
      id: result.insertId,
      sender: req.session.username,
      message_text: messageText,
      sent_at: new Date()
    });
  });
});

// Get chat messages
router.get('/chat/:id', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id);
  
  const sql = `
    SELECT cm.*, u.username, u.first_name, u.last_name
    FROM chat_messages cm
    JOIN users u ON cm.sender_id = u.id
    WHERE cm.interview_id = ?
    ORDER BY cm.sent_at ASC
  `;
  
  db.query(sql, [interviewId], (err, results) => {
    if (err) return next(err);
    res.json(results);
  });
});

// Complete interview
router.post('/:id/complete', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id);
  const feedback = req.sanitize(req.body.feedback);
  const rating = parseInt(req.body.rating) || null;
  
  const sql = `
    UPDATE mock_interviews 
    SET status = 'completed', feedback = ?, rating = ?
    WHERE id = ?
  `;
  
  db.query(sql, [feedback, rating, interviewId], (err) => {
    if (err) return next(err);
    res.redirect((req.app.locals.BASE_URL || '') + '/interviews/my');
  });
});

module.exports = router;
