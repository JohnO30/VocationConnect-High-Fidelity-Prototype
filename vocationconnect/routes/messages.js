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

// Display user's message conversations for accepted connections
router.get('/my', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  const userType = req.session.userType;

  let sql;
  if (userType === 'student') {
    sql = `
      SELECT c.id, c.updated_at,
             u.id as alumni_id, u.first_name, u.last_name, u.username,
             ap.company, ap.job_title
      FROM connections c
      JOIN users u ON c.alumni_id = u.id
      JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE c.student_id = ? AND c.status = 'accepted'
      ORDER BY c.updated_at DESC
    `;
  } else {
    sql = `
      SELECT c.id, c.updated_at,
             u.id as student_id, u.first_name, u.last_name, u.username, u.email
      FROM connections c
      JOIN users u ON c.student_id = u.id
      WHERE c.alumni_id = ? AND c.status = 'accepted'
      ORDER BY c.updated_at DESC
    `;
  }

  db.query(sql, [userId], (err, results) => {
    if (err) return next(err);

    res.render('messages_my', {
      title: 'Messages',
      conversations: results
    });
  });
});

// Display a single conversation thread
router.get('/:id', redirectLogin, (req, res, next) => {
  const connectionId = parseInt(req.params.id);
  const userId = req.session.userId;

  const connectionSql = `
    SELECT c.id, c.student_id, c.alumni_id, c.status,
           s.first_name AS student_first_name, s.last_name AS student_last_name,
           a.first_name AS alumni_first_name, a.last_name AS alumni_last_name
    FROM connections c
    JOIN users s ON c.student_id = s.id
    JOIN users a ON c.alumni_id = a.id
    WHERE c.id = ? AND c.status = 'accepted' AND (c.student_id = ? OR c.alumni_id = ?)
  `;

  db.query(connectionSql, [connectionId, userId, userId], (err, results) => {
    if (err) return next(err);
    if (results.length === 0) {
      return res.status(404).send('Conversation not found or access denied');
    }

    const conversation = results[0];
    const otherUser = conversation.student_id === userId
      ? {
          id: conversation.alumni_id,
          first_name: conversation.alumni_first_name,
          last_name: conversation.alumni_last_name,
          label: 'Alumni'
        }
      : {
          id: conversation.student_id,
          first_name: conversation.student_first_name,
          last_name: conversation.student_last_name,
          label: 'Student'
        };

    const messagesSql = `
      SELECT dm.*, u.first_name, u.last_name, u.username
      FROM direct_messages dm
      JOIN users u ON dm.sender_id = u.id
      WHERE dm.connection_id = ?
      ORDER BY dm.sent_at ASC
    `;

    db.query(messagesSql, [connectionId], (err2, messages) => {
      if (err2) return next(err2);

      res.render('message_conversation', {
        title: 'Conversation',
        conversation: conversation,
        otherUser: otherUser,
        messages: messages
      });
    });
  });
});

// Send a direct message for an accepted connection
router.post('/:id', redirectLogin, (req, res, next) => {
  const connectionId = parseInt(req.params.id);
  const senderId = req.session.userId;
  const messageText = req.sanitize(req.body.message_text || '').trim();

  if (!messageText) {
    return res.redirect((req.app.locals.BASE_URL || '') + `/directmessages/${connectionId}`);
  }

  const connectionSql = `
    SELECT * FROM connections
    WHERE id = ? AND status = 'accepted' AND (student_id = ? OR alumni_id = ?)
  `;

  db.query(connectionSql, [connectionId, senderId, senderId], (err, results) => {
    if (err) return next(err);
    if (results.length === 0) {
      return res.status(404).send('Conversation not found or access denied');
    }

    const sql = `
      INSERT INTO direct_messages (connection_id, sender_id, message_text)
      VALUES (?, ?, ?)
    `;

    db.query(sql, [connectionId, senderId, messageText], (err2) => {
      if (err2) return next(err2);
      res.redirect((req.app.locals.BASE_URL || '') + `/directmessages/${connectionId}`);
    });
  });
});

module.exports = router;
