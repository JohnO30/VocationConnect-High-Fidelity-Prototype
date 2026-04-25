const nodemailer = require('nodemailer');
const webpush = require('web-push');
require('dotenv').config();

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Web Push configuration
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'vocations@example.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

class NotificationService {
  constructor(db) {
    this.db = db;
  }

  // Create a notification in the database
  async createNotification(userId, type, title, message, relatedId = null) {
    const sql = `
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [userId, type, title, message, relatedId], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }

  // Send email notification
  async sendEmailNotification(userId, subject, htmlContent) {
    try {
      // Get user email
      const userSql = 'SELECT email, first_name FROM users WHERE id = ?';
      const user = await new Promise((resolve, reject) => {
        this.db.query(userSql, [userId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      if (!user) return false;

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: user.email,
        subject: subject,
        html: htmlContent
      };

      await emailTransporter.sendMail(mailOptions);

      // Mark email as sent in database
      const updateSql = 'UPDATE notifications SET email_sent = TRUE WHERE user_id = ? AND email_sent = FALSE';
      await new Promise((resolve, reject) => {
        this.db.query(updateSql, [userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return true;
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  // Send push notification (browser notification)
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      // Get user's push subscription (this would need to be stored in database)
      // For now, we'll implement browser notifications via WebSocket or similar
      // This is a placeholder for future push notification implementation

      // Mark push as sent in database
      const updateSql = 'UPDATE notifications SET push_sent = TRUE WHERE user_id = ? AND push_sent = FALSE';
      await new Promise((resolve, reject) => {
        this.db.query(updateSql, [userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  // Send notification for connection request
  async notifyConnectionRequest(studentId, alumniId, message = '') {
    try {
      // Get student info
      const studentSql = 'SELECT first_name, last_name FROM users WHERE id = ?';
      const student = await new Promise((resolve, reject) => {
        this.db.query(studentSql, [studentId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      const title = 'New Connection Request';
      const notificationMessage = `${student.first_name} ${student.last_name} wants to connect with you${message ? ': "' + message + '"' : ''}`;

      // Create notification in database
      const notificationId = await this.createNotification(alumniId, 'connection_request', title, notificationMessage, null);

      // Check user preferences
      const prefs = await this.getUserNotificationPreferences(alumniId);

      if (prefs.email_notifications) {
        const subject = 'New Connection Request on VocationConnect';
        const htmlContent = `
          <h2>New Connection Request</h2>
          <p><strong>${student.first_name} ${student.last_name}</strong> wants to connect with you.</p>
          ${message ? `<p><em>"${message}"</em></p>` : ''}
          <p><a href="${process.env.BASE_URL || 'http://localhost:8000'}/connections/my">View Connection Requests</a></p>
        `;

        await this.sendEmailNotification(alumniId, subject, htmlContent);
      }

      return notificationId;
    } catch (error) {
      console.error('Connection request notification error:', error);
      return false;
    }
  }

  // Send notification for connection response
  async notifyConnectionResponse(connectionId, responseType) {
    try {
      // Get connection details
      const connSql = `
        SELECT c.student_id, c.alumni_id, u.first_name, u.last_name
        FROM connections c
        JOIN users u ON c.alumni_id = u.id
        WHERE c.id = ?
      `;
      const connection = await new Promise((resolve, reject) => {
        this.db.query(connSql, [connectionId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      const title = responseType === 'accepted' ? 'Connection Request Accepted' : 'Connection Request Declined';
      const notificationMessage = `${connection.first_name} ${connection.last_name} has ${responseType} your connection request.`;

      // Create notification for student
      const notificationId = await this.createNotification(connection.student_id, `connection_${responseType}`, title, notificationMessage, connectionId);

      // Check user preferences
      const prefs = await this.getUserNotificationPreferences(connection.student_id);

      if (prefs.email_notifications) {
        const subject = `Connection Request ${responseType.charAt(0).toUpperCase() + responseType.slice(1)}`;
        const htmlContent = `
          <h2>Connection Request ${responseType.charAt(0).toUpperCase() + responseType.slice(1)}</h2>
          <p><strong>${connection.first_name} ${connection.last_name}</strong> has ${responseType} your connection request.</p>
          <p><a href="${process.env.BASE_URL || 'http://localhost:8000'}/connections/my">View Your Connections</a></p>
        `;

        await this.sendEmailNotification(connection.student_id, subject, htmlContent);
      }

      return notificationId;
    } catch (error) {
      console.error('Connection response notification error:', error);
      return false;
    }
  }

  // Send notification for interview request
  async notifyInterviewRequest(studentId, alumniId, interviewId, interviewDetails = {}) {
    try {
      const studentSql = 'SELECT first_name, last_name FROM users WHERE id = ?';
      const student = await new Promise((resolve, reject) => {
        this.db.query(studentSql, [studentId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      const alumniSql = `
        SELECT u.first_name, u.last_name, ap.company, ap.job_title
        FROM users u
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE u.id = ?
      `;
      const alumni = await new Promise((resolve, reject) => {
        this.db.query(alumniSql, [alumniId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      if (!student || !alumni) {
        return false;
      }

      const interviewType = interviewDetails.interview_type || 'Mock Interview';
      const scheduledDate = interviewDetails.scheduled_date
        ? new Date(interviewDetails.scheduled_date).toLocaleString()
        : null;

      const title = 'New Interview Request';
      const notificationMessage = `${student.first_name} ${student.last_name} requested a ${interviewType.toLowerCase()}${scheduledDate ? ` for ${scheduledDate}` : ''}.`;

      const notificationId = await this.createNotification(
        alumniId,
        'interview_request',
        title,
        notificationMessage,
        interviewId
      );

      const prefs = await this.getUserNotificationPreferences(alumniId);

      if (prefs.email_notifications) {
        const subject = 'New Interview Request on VocationConnect';
        const htmlContent = `
          <h2>New Interview Request</h2>
          <p><strong>${student.first_name} ${student.last_name}</strong> requested a <strong>${interviewType}</strong>.</p>
          ${scheduledDate ? `<p><strong>Proposed time:</strong> ${scheduledDate}</p>` : ''}
          <p><a href="${process.env.BASE_URL || 'http://localhost:8000'}/interviews/my">Review Interview Requests</a></p>
        `;

        await this.sendEmailNotification(alumniId, subject, htmlContent);
      }

      return notificationId;
    } catch (error) {
      console.error('Interview request notification error:', error);
      return false;
    }
  }

  // Send notification for interview response
  async notifyInterviewResponse(interviewId, responseType) {
    try {
      const interviewSql = `
        SELECT mi.student_id, mi.alumni_id, mi.interview_type, mi.scheduled_date,
               s.first_name as student_first_name, s.last_name as student_last_name,
               a.first_name as alumni_first_name, a.last_name as alumni_last_name,
               ap.company, ap.job_title
        FROM mock_interviews mi
        JOIN users s ON mi.student_id = s.id
        JOIN users a ON mi.alumni_id = a.id
        LEFT JOIN alumni_profiles ap ON a.id = ap.user_id
        WHERE mi.id = ?
      `;
      const interview = await new Promise((resolve, reject) => {
        this.db.query(interviewSql, [interviewId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      if (!interview) {
        return false;
      }

      const alumniName = `${interview.alumni_first_name} ${interview.alumni_last_name}`;
      const isAccepted = responseType === 'accepted';
      const title = isAccepted ? 'Interview Request Accepted' : 'Interview Request Declined';
      const notificationMessage = isAccepted
        ? `${alumniName} accepted your interview request.`
        : `${alumniName} declined your interview request.`;

      const notificationId = await this.createNotification(
        interview.student_id,
        isAccepted ? 'interview_accepted' : 'interview_declined',
        title,
        notificationMessage,
        interviewId
      );

      const prefs = await this.getUserNotificationPreferences(interview.student_id);

      if (prefs.email_notifications) {
        const subject = isAccepted
          ? 'Interview Request Accepted on VocationConnect'
          : 'Interview Request Declined on VocationConnect';
        const htmlContent = `
          <h2>${isAccepted ? 'Interview Request Accepted' : 'Interview Request Declined'}</h2>
          <p><strong>${alumniName}</strong> has ${responseType} your interview request.</p>
          <p><a href="${process.env.BASE_URL || 'http://localhost:8000'}/interviews/my">View Your Interviews</a></p>
        `;

        await this.sendEmailNotification(interview.student_id, subject, htmlContent);
      }

      return notificationId;
    } catch (error) {
      console.error('Interview response notification error:', error);
      return false;
    }
  }

  // Get user notification preferences
  async getUserNotificationPreferences(userId) {
    const sql = `
      SELECT * FROM user_notification_settings WHERE user_id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [userId], (err, results) => {
        if (err) reject(err);
        else {
          if (results.length > 0) {
            resolve(results[0]);
          } else {
            // Return defaults if no preferences set
            resolve({
              email_notifications: true,
              push_notifications: true,
              connection_requests: true,
              messages: true,
              interviews: true
            });
          }
        }
      });
    });
  }

  // Get unread notifications for user
  async getUnreadNotifications(userId, limit = 50) {
    const sql = `
      SELECT * FROM notifications
      WHERE user_id = ? AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [userId, limit], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const sql = 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';

    return new Promise((resolve, reject) => {
      this.db.query(sql, [notificationId, userId], (err, result) => {
        if (err) reject(err);
        else resolve(result.affectedRows > 0);
      });
    });
  }
}

module.exports = NotificationService;
