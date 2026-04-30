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

// Get user's notifications
router.get('/', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get notifications
  const sql = `
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(sql, [userId, limit, offset], (err, notifications) => {
    if (err) return next(err);

    // Get total count for pagination
    const countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    db.query(countSql, [userId], (err2, countResult) => {
      if (err2) return next(err2);

      const totalNotifications = countResult[0].total;
      const totalPages = Math.ceil(totalNotifications / limit);

      res.render('notifications', {
        title: 'Notifications',
        notifications: notifications,
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      });
    });
  });
});

// Get unread notification count (API endpoint)
router.get('/unread-count', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;

  const sql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE';

  db.query(sql, [userId], (err, result) => {
    if (err) return next(err);

    res.json({ count: result[0].count });
  });
});

// Mark notification as read
router.post('/:id/read', redirectLogin, (req, res, next) => {
  const notificationId = parseInt(req.params.id);
  const userId = req.session.userId;

  global.notificationService.markAsRead(notificationId, userId)
    .then(success => {
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Notification not found' });
      }
    })
    .catch(err => next(err));
});

// Mark all notifications as read
router.post('/mark-all-read', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;

  const sql = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';

  db.query(sql, [userId], (err, result) => {
    if (err) return next(err);

    res.json({ success: true, markedCount: result.affectedRows });
  });
});

// Get user notification settings
router.get('/settings', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;

  global.notificationService.getUserNotificationPreferences(userId)
    .then(settings => {
      res.render('notification_settings', {
        title: 'Notification Settings',
        settings: settings,
        layout: false
      });
    })
    .catch(err => next(err));
});

// Update notification settings
router.post('/settings', redirectLogin, (req, res, next) => {
  const userId = req.session.userId;
  const settings = {
    email_notifications: req.body.email_notifications === 'on',
    push_notifications: req.body.push_notifications === 'on',
    connection_requests: req.body.connection_requests === 'on',
    messages: req.body.messages === 'on',
    interviews: req.body.interviews === 'on'
  };

  const sql = `
    INSERT INTO user_notification_settings
    (user_id, email_notifications, push_notifications, connection_requests, messages, interviews)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    email_notifications = VALUES(email_notifications),
    push_notifications = VALUES(push_notifications),
    connection_requests = VALUES(connection_requests),
    messages = VALUES(messages),
    interviews = VALUES(interviews),
    updated_at = NOW()
  `;

  db.query(sql, [
    userId,
    settings.email_notifications,
    settings.push_notifications,
    settings.connection_requests,
    settings.messages,
    settings.interviews
  ], (err) => {
    if (err) return next(err);

    res.redirect((req.app.locals.BASE_URL || '') + '/notifications/settings?status=updated');
  });
});

module.exports = router;
