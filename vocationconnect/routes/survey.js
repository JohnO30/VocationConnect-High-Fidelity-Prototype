/**
 * Survey and Opportunity Report Routes
 * Handles survey completion and opportunity report generation
 */

const express = require('express');
const router = express.Router();
const SurveyService = require('../utils/surveyService');

const wantsJsonResponse = (req) => req.xhr || String(req.headers.accept || '').includes('application/json');

// Middleware to require user login
const redirectLogin = (req, res, next) => {
  if (!req.session.userId) {
    if (wantsJsonResponse(req)) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    return res.redirect((req.app.locals.BASE_URL || '') + '/users/login');
  }

  next();
};

// Middleware to require student role
const requireStudent = (req, res, next) => {
  const sql = 'SELECT user_type FROM users WHERE id = ?';
  db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      if (wantsJsonResponse(req)) {
        return res.status(500).json({ success: false, error: 'Database error', details: err.message });
      }

      return next(err);
    }

    if (results[0]?.user_type !== 'student') {
      if (wantsJsonResponse(req)) {
        return res.status(403).json({ success: false, error: 'This feature is only available to students' });
      }

      return res.status(403).send('This feature is only available to students');
    }

    next();
  });
};

/**
 * GET /survey/start
 * Display survey form
 */
router.get('/start', redirectLogin, requireStudent, (req, res, next) => {
  // Check if student already completed survey
  const checkSql = `
    SELECT * FROM survey_completions 
    WHERE student_id = ? AND completed = TRUE
    ORDER BY completed_at DESC LIMIT 1
  `;

  db.query(checkSql, [req.session.userId], (err, results) => {
    if (err) return next(err);

    const existingSurvey = results.length > 0 ? results[0] : null;

    res.render('survey_form', {
      title: 'Career Assessment Survey',
      questions: SurveyService.getSurveyQuestions(),
      existingSurvey: existingSurvey,
      completedBefore: existingSurvey ? true : false,
      layout: false
    });
  });
});

/**
 * POST /survey/submit
 * Submit survey responses and generate opportunities report
 */
router.post('/submit', redirectLogin, requireStudent, (req, res, next) => {
  const studentId = req.session.userId;
  const responses = {};

  // Parse form responses
  Object.keys(req.body || {}).forEach(key => {
    if (key.startsWith('q')) {
      responses[key] = req.body[key];
    }
  });

  // Create survey completion record
  const completionSql = `
    INSERT INTO survey_completions (student_id, started_at, completed_at, completed)
    VALUES (?, NOW(), NOW(), TRUE)
    ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), completed_at = NOW(), completed = TRUE
  `;

  db.query(completionSql, [studentId], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save survey completion',
        details: err.message
      });
    }

    const surveyCompletionId = result.insertId;

    // Store individual responses
    const responseQuestions = SurveyService.getSurveyQuestions();
    const allQuestions = Object.values(responseQuestions).flat();

    for (const question of allQuestions) {
      const questionKey = `q${question.question_number}`;
      if (responses[questionKey]) {
        const responseValue = responses[questionKey];
        const responseSql = `
          INSERT INTO survey_responses (student_id, question_id, response_text, response_numeric)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            response_text = VALUES(response_text),
            response_numeric = VALUES(response_numeric),
            answered_at = NOW()
        `;

        db.query(responseSql, [
          studentId,
          question.id,
          Array.isArray(responseValue) ? JSON.stringify(responseValue) : responseValue,
          question.question_type === 'rating' ? parseInt(responseValue, 10) || 0 : null
        ], (responseErr) => {
          if (responseErr) console.error('Error storing response:', responseErr);
        });
      }
    }

    // After storing responses, generate opportunities
    setTimeout(() => {
      generateOpportunitiesReport(studentId, surveyCompletionId, responses, (report) => {
        if (report.error) {
          return res.status(500).json(report);
        }

        res.json({
          success: true,
          surveyCompletionId: surveyCompletionId,
          reportId: report.reportId,
          redirectUrl: `${req.app.locals.BASE_URL || ''}/survey/report/${report.reportId}`
        });
      });
    }, 500);
  });
});

/**
 * Generate opportunities report from survey responses
 */
function generateOpportunitiesReport(studentId, surveyCompletionId, responses, callback) {
  // Get all alumni for matching
  const alumniSql = `
    SELECT u.id, u.first_name, u.last_name, u.graduation_year,
           ap.company, ap.job_title, ap.industry, ap.years_experience, 
           ap.skills, ap.bio, ap.available_for_mock
    FROM users u
    JOIN alumni_profiles ap ON u.id = ap.user_id
    WHERE u.user_type = 'alumni'
  `;

  db.query(alumniSql, (err, alumni) => {
    if (err) {
      return callback({ error: 'Database error', message: err.message });
    }

    try {
      // Generate opportunities using service
      const report = SurveyService.generateOpportunities(responses, alumni);

      // Extract data for storage
      const topIndustries = report.topIndustries.map(ind => ind.name).slice(0, 3);
      const topRoles = report.topRoles.map(role => role.title).slice(0, 3);
      const recommendedMentorIds = report.recommendedMentors.map(m => m.id);

      // Store opportunity report
      const reportSql = `
        INSERT INTO opportunity_reports (
          student_id, 
          survey_completion_id, 
          generated_at,
          total_score,
          top_industries,
          top_roles,
          skill_gaps,
          recommended_mentors,
          interview_opportunities,
          career_recommendations,
          summary_text
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(reportSql, [
        studentId,
        surveyCompletionId,
        report.totalScore,
        JSON.stringify(topIndustries),
        JSON.stringify(topRoles),
        JSON.stringify(report.skillGaps),
        JSON.stringify(recommendedMentorIds),
        report.interviewOpportunities,
        JSON.stringify(report.careerRecommendations),
        report.summary
      ], (err, result) => {
        if (err) {
          return callback({ error: 'Error saving report', message: err.message });
        }

        const reportId = result.insertId;

        // Store skill recommendations
        let skillsProcessed = 0;
        for (const skillGap of report.skillGaps.slice(0, 5)) {
          const skillSql = `
            INSERT INTO skill_recommendations (
              opportunity_report_id,
              skill,
              proficiency_level,
              importance,
              resources
            ) VALUES (?, ?, ?, ?, ?)
          `;

          db.query(skillSql, [
            reportId,
            skillGap.skill,
            skillGap.proficiency,
            skillGap.importance,
            JSON.stringify(skillGap.learningResources)
          ], (err) => {
            if (err) console.error('Skill error:', err);
            skillsProcessed++;
          });
        }

        callback({
          reportId: reportId,
          totalScore: report.totalScore,
          topIndustries: topIndustries,
          topRoles: topRoles,
          interviewOpportunities: report.interviewOpportunities
        });
      });
    } catch (error) {
      callback({ error: 'Generation error', message: error.message });
    }
  });
}

/**
 * GET /survey/report/:reportId
 * Display generated opportunity report
 */
router.get('/report/:reportId', redirectLogin, requireStudent, (req, res, next) => {
  const reportId = parseInt(req.params.reportId);
  const studentId = req.session.userId;

  // Get report
  const reportSql = `
    SELECT * FROM opportunity_reports
    WHERE id = ? AND student_id = ?
  `;

  db.query(reportSql, [reportId, studentId], (err, reportResults) => {
    if (err) return next(err);
    if (reportResults.length === 0) {
      return res.status(404).send('Report not found');
    }

    const report = reportResults[0];

    // Get skill recommendations
    const skillSql = `
      SELECT * FROM skill_recommendations
      WHERE opportunity_report_id = ?
      ORDER BY importance DESC
      LIMIT 5
    `;

    db.query(skillSql, [reportId], (err, skills) => {
      if (err) return next(err);

      // Get recommended mentors
      const mentorIds = JSON.parse(report.recommended_mentors || '[]');
      let mentors = [];

      if (mentorIds.length > 0) {
        const mentorSql = `
          SELECT u.id, u.first_name, u.last_name, u.graduation_year,
                 ap.company, ap.job_title, ap.industry, ap.years_experience,
                 ap.available_for_mock
          FROM users u
          JOIN alumni_profiles ap ON u.id = ap.user_id
          WHERE u.id IN (?)
          LIMIT 10
        `;

        db.query(mentorSql, [mentorIds], (err, mentorResults) => {
          if (err) return next(err);
          mentors = mentorResults;

          // Record report view
          db.query('INSERT INTO report_views (opportunity_report_id) VALUES (?)', [reportId]);

          res.render('survey_report', {
            title: 'Your Opportunity Report',
            layout: false,
            report: {
              id: report.id,
              totalScore: report.total_score,
              topIndustries: JSON.parse(report.top_industries || '[]'),
              topRoles: JSON.parse(report.top_roles || '[]'),
              skillGaps: skills,
              interviewOpportunities: report.interview_opportunities,
              careerRecommendations: JSON.parse(report.career_recommendations || '{}'),
              summary: report.summary_text,
              generatedAt: report.generated_at
            },
            mentors: mentors,
            recommendationCount: mentorIds.length
          });
        });
      } else {
        res.render('survey_report', {
          title: 'Your Opportunity Report',
          layout: false,
          report: {
            id: report.id,
            totalScore: report.total_score,
            topIndustries: JSON.parse(report.top_industries || '[]'),
            topRoles: JSON.parse(report.top_roles || '[]'),
            skillGaps: skills,
            interviewOpportunities: report.interview_opportunities,
            careerRecommendations: JSON.parse(report.career_recommendations || '{}'),
            summary: report.summary_text,
            generatedAt: report.generated_at
          },
          mentors: [],
          recommendationCount: 0
        });
      }
    });
  });
});

/**
 * GET /survey/history
 * View all survey reports history
 */
router.get('/history', redirectLogin, requireStudent, (req, res, next) => {
  const studentId = req.session.userId;

  const historySql = `
    SELECT report.id, report.generated_at, report.total_score, report.top_industries, report.top_roles,
           report.interview_opportunities
    FROM opportunity_reports report
    WHERE report.student_id = ?
    ORDER BY report.generated_at DESC
    LIMIT 10
  `;

  db.query(historySql, [studentId], (err, reports) => {
    if (err) return next(err);

    const parsedReports = reports.map(r => ({
      ...r,
      topIndustries: JSON.parse(r.top_industries || '[]'),
      topRoles: JSON.parse(r.top_roles || '[]'),
      generatedAt: r.generated_at,
      generatedDate: new Date(r.generated_at).toLocaleDateString()
    }));

    res.render('survey_history', {
      title: 'Your Survey Reports',
      layout: false,
      reports: parsedReports
    });
  });
});

/**
 * GET /survey/status
 * Check if student has completed survey (API endpoint)
 */
router.get('/status', redirectLogin, requireStudent, (req, res, next) => {
  const studentId = req.session.userId;

  const statusSql = `
    SELECT completed, completed_at FROM survey_completions
    WHERE student_id = ?
  `;

  db.query(statusSql, [studentId], (err, results) => {
    if (err) return next(err);

    const completed = results.length > 0 && results[0].completed;

    res.json({
      completed: completed,
      lastCompletedAt: completed ? results[0].completed_at : null,
      canRetake: true // Allow students to retake survey for updated report
    });
  });
});

/**
 * GET /survey/download/:reportId
 * Download report as PDF (placeholder for future PDF generation)
 */
router.get('/download/:reportId', redirectLogin, requireStudent, (req, res, next) => {
  const reportId = parseInt(req.params.reportId);
  const studentId = req.session.userId;

  const reportSql = `
    SELECT * FROM opportunity_reports
    WHERE id = ? AND student_id = ?
  `;

  db.query(reportSql, [reportId, studentId], (err, results) => {
    if (err) return next(err);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // TODO: Implement PDF generation
    res.json({
      success: true,
      message: 'PDF download feature coming soon',
      reportId: reportId
    });
  });
});

module.exports = router;
