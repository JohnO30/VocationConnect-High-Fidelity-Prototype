const express = require('express');
const router = express.Router();

const DEFAULT_INTERVIEW_QUESTIONS = [
  {
    question_text: 'Tell me about yourself and your background.',
    time_allocated: 180
  },
  {
    question_text: 'What are your greatest strengths and weaknesses?',
    time_allocated: 180
  },
  {
    question_text: 'Tell me about a time you faced a significant challenge. How did you handle it?',
    time_allocated: 300
  }
];

// Middleware to require user login
const redirectLogin = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect((req.app.locals.BASE_URL || '') + '/users/login');
  } else {
    next();
  }
};

const getBaseUrl = (req) => req.app.locals.BASE_URL || '';

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});

const normalizeScheduledDate = (scheduledDate) => {
  if (!scheduledDate) {
    return null;
  }

  if (scheduledDate.includes('T')) {
    return scheduledDate.replace('T', ' ') + (scheduledDate.length === 16 ? ':00' : '');
  }

  return scheduledDate;
};

async function verifyStudentCanRequestInterview(studentId, alumniId) {
  const sql = `
    SELECT u.id, u.first_name, u.last_name,
           ap.company, ap.job_title, ap.available_for_mock,
           c.status AS connection_status
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    LEFT JOIN connections c ON c.student_id = ? AND c.alumni_id = u.id
    WHERE u.id = ? AND u.user_type = 'alumni'
    LIMIT 1
  `;

  const results = await query(sql, [alumniId, studentId]);
  if (!results || results.length === 0) {
    return { allowed: false, reason: 'Alumni not found' };
  }

  const alumni = results[0];

  if (!alumni.available_for_mock) {
    return { allowed: false, reason: 'This alumni is not available for mock interviews.' };
  }

  if (alumni.connection_status !== 'accepted') {
    return {
      allowed: false,
      reason: 'You must have an accepted connection before requesting a mock interview.'
    };
  }

  return { allowed: true, alumni };
}

async function seedDefaultQuestions(interviewId) {
  const existingQuestions = await query(
    'SELECT id FROM interview_questions WHERE interview_id = ? LIMIT 1',
    [interviewId]
  );

  if (existingQuestions.length > 0) {
    return;
  }

  const values = DEFAULT_INTERVIEW_QUESTIONS.map((question) => [
    interviewId,
    question.question_text,
    question.time_allocated
  ]);

  const placeholders = values.map(() => '(?, ?, ?)').join(', ');
  const params = values.flat();

  await query(
    `INSERT INTO interview_questions (interview_id, question_text, time_allocated) VALUES ${placeholders}`,
    params
  );
}

// Display user's mock interviews
router.get('/my', redirectLogin, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;

    let sql;
    if (userType === 'student') {
      sql = `
        SELECT mi.*,
               u.id as alumni_id, u.first_name as alumni_first_name, u.last_name as alumni_last_name,
               ap.company, ap.job_title
        FROM mock_interviews mi
        JOIN users u ON mi.alumni_id = u.id
        JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE mi.student_id = ?
        ORDER BY mi.created_at DESC
      `;
    } else {
      sql = `
        SELECT mi.*,
               u.id as student_id, u.first_name as student_first_name, u.last_name as student_last_name,
               u.email as student_email
        FROM mock_interviews mi
        JOIN users u ON mi.student_id = u.id
        WHERE mi.alumni_id = ?
        ORDER BY mi.created_at DESC
      `;
    }

    const results = await query(sql, [userId]);

    res.render('interviews_my', {
      title: 'My Mock Interviews',
      interviews: results
    });
  } catch (err) {
    next(err);
  }
});

// Request interview form
router.get(['/request/:alumniId', '/schedule/:alumniId'], redirectLogin, async (req, res, next) => {
  try {
    if (req.session.userType !== 'student') {
      return res.status(403).send('Only students can request interviews');
    }

    const studentId = req.session.userId;
    const alumniId = parseInt(req.params.alumniId, 10);

    if (!alumniId || Number.isNaN(alumniId)) {
      return res.status(400).send('Invalid alumni ID');
    }

    const eligibility = await verifyStudentCanRequestInterview(studentId, alumniId);

    if (!eligibility.allowed) {
      return res.status(403).send(eligibility.reason);
    }

    res.render('interview_schedule', {
      title: 'Request Mock Interview',
      alumni: eligibility.alumni,
      requestMode: true
    });
  } catch (err) {
    next(err);
  }
});

// Process interview request
router.post(['/request', '/schedule'], redirectLogin, async (req, res, next) => {
  try {
    if (req.session.userType !== 'student') {
      return res.status(403).send('Only students can request interviews');
    }

    const studentId = req.session.userId;
    const alumniId = parseInt(req.body.alumni_id, 10);
    const scheduledDate = normalizeScheduledDate(req.body.scheduled_date);
    const durationMinutes = parseInt(req.body.duration_minutes, 10) || 30;
    const interviewType = req.sanitize(req.body.interview_type || 'General Career Guidance');
    const notes = req.sanitize(req.body.notes || '');
    const baseUrl = getBaseUrl(req);

    if (!alumniId || Number.isNaN(alumniId)) {
      return res.status(400).send('Invalid alumni ID');
    }

    if (!scheduledDate) {
      return res.status(400).send('Scheduled date is required');
    }

    const eligibility = await verifyStudentCanRequestInterview(studentId, alumniId);

    if (!eligibility.allowed) {
      return res.status(403).send(eligibility.reason);
    }

    const insertSql = `
      INSERT INTO mock_interviews
      (student_id, alumni_id, scheduled_date, duration_minutes, interview_type, status, notes)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `;

    const result = await query(insertSql, [
      studentId,
      alumniId,
      scheduledDate,
      durationMinutes,
      interviewType,
      notes
    ]);

    const interviewId = result.insertId;

    await seedDefaultQuestions(interviewId);

    try {
      await global.notificationService.notifyInterviewRequest(studentId, alumniId, interviewId, {
        interview_type: interviewType,
        scheduled_date: scheduledDate
      });
    } catch (notificationError) {
      console.error('Failed to send interview request notification:', notificationError);
    }

    return res.redirect(baseUrl + '/interviews/my?status=requested');
  } catch (err) {
    next(err);
  }
});

// Interview room (live interview)
router.get('/room/:id', redirectLogin, async (req, res, next) => {
  try {
    const interviewId = parseInt(req.params.id, 10);
    const userId = req.session.userId;

    if (!interviewId || Number.isNaN(interviewId)) {
      return res.status(400).send('Invalid interview ID');
    }

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
      LIMIT 1
    `;

    const results = await query(sql, [interviewId, userId, userId]);

    if (results.length === 0) {
      return res.status(404).send('Interview not found or access denied');
    }

    const interview = results[0];

    if (interview.status !== 'scheduled') {
      return res.status(403).send('This interview is not scheduled yet.');
    }

    const questions = await query(
      `
        SELECT * FROM interview_questions
        WHERE interview_id = ?
        ORDER BY id
      `,
      [interviewId]
    );

    const notes = await query(
      `
        SELECT * FROM interview_notes
        WHERE interview_id = ? AND user_id = ?
        ORDER BY updated_at DESC
      `,
      [interviewId, userId]
    );

    res.render('interview_room', {
      title: 'Mock Interview',
      interview: interview,
      questions: questions,
      userNotes: notes.length > 0 ? notes[0].note_text : ''
    });
  } catch (err) {
    next(err);
  }
});

// Save interview notes
router.post('/notes/:id', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id, 10);
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
  const interviewId = parseInt(req.params.id, 10);
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
  const interviewId = parseInt(req.params.id, 10);

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

// Accept interview request
router.post('/:id/accept', redirectLogin, async (req, res, next) => {
  try {
    if (req.session.userType !== 'alumni') {
      return res.status(403).send('Only alumni can accept interview requests');
    }

    const interviewId = parseInt(req.params.id, 10);
    const alumniId = req.session.userId;
    const baseUrl = getBaseUrl(req);

    if (!interviewId || Number.isNaN(interviewId)) {
      return res.status(400).send('Invalid interview ID');
    }

    const sql = `
      UPDATE mock_interviews
      SET status = 'scheduled'
      WHERE id = ? AND alumni_id = ? AND status = 'pending'
    `;

    const result = await query(sql, [interviewId, alumniId]);

    if (result.affectedRows === 0) {
      return res.status(404).send('No pending interview request found to accept');
    }

    await seedDefaultQuestions(interviewId);

    try {
      await global.notificationService.notifyInterviewResponse(interviewId, 'accepted');
    } catch (notificationError) {
      console.error('Failed to send interview acceptance notification:', notificationError);
    }

    res.redirect(baseUrl + '/interviews/my');
  } catch (err) {
    next(err);
  }
});

// Decline interview request
router.post('/:id/decline', redirectLogin, async (req, res, next) => {
  try {
    if (req.session.userType !== 'alumni') {
      return res.status(403).send('Only alumni can decline interview requests');
    }

    const interviewId = parseInt(req.params.id, 10);
    const alumniId = req.session.userId;
    const baseUrl = getBaseUrl(req);

    if (!interviewId || Number.isNaN(interviewId)) {
      return res.status(400).send('Invalid interview ID');
    }

    const sql = `
      UPDATE mock_interviews
      SET status = 'cancelled'
      WHERE id = ? AND alumni_id = ? AND status = 'pending'
    `;

    const result = await query(sql, [interviewId, alumniId]);

    if (result.affectedRows === 0) {
      return res.status(404).send('No pending interview request found to decline');
    }

    try {
      await global.notificationService.notifyInterviewResponse(interviewId, 'declined');
    } catch (notificationError) {
      console.error('Failed to send interview decline notification:', notificationError);
    }

    res.redirect(baseUrl + '/interviews/my');
  } catch (err) {
    next(err);
  }
});

// Cancel interview request
router.post('/:id/cancel', redirectLogin, async (req, res, next) => {
  try {
    if (req.session.userType !== 'student') {
      return res.status(403).send('Only students can cancel interview requests');
    }

    const interviewId = parseInt(req.params.id, 10);
    const studentId = req.session.userId;
    const baseUrl = getBaseUrl(req);

    if (!interviewId || Number.isNaN(interviewId)) {
      return res.status(400).send('Invalid interview ID');
    }

    const sql = `
      UPDATE mock_interviews
      SET status = 'cancelled'
      WHERE id = ? AND student_id = ? AND status = 'pending'
    `;

    const result = await query(sql, [interviewId, studentId]);

    if (result.affectedRows === 0) {
      return res.status(404).send('No pending interview request found to cancel');
    }

    res.redirect(baseUrl + '/interviews/my');
  } catch (err) {
    next(err);
  }
});

// Complete interview
router.post('/:id/complete', redirectLogin, (req, res, next) => {
  const interviewId = parseInt(req.params.id, 10);
  const feedback = req.sanitize(req.body.feedback);
  const rating = parseInt(req.body.rating, 10) || null;

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
