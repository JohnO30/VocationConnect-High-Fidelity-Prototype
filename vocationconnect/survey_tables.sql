-- Add survey tables to VocationConnect database

-- Career Assessment Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id              INT AUTO_INCREMENT,
  question_number INT NOT NULL,
  category        VARCHAR(50) NOT NULL, -- 'career_interest', 'skills', 'goals', 'experience', 'industry'
  question_text   TEXT NOT NULL,
  question_type   ENUM('multiple_choice', 'rating', 'text', 'checkbox') NOT NULL,
  options         TEXT, -- JSON array for multiple choice options
  required        BOOLEAN DEFAULT TRUE,
  display_order   INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_question_order (question_number)
);

-- Student Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id              INT AUTO_INCREMENT,
  student_id      INT NOT NULL,
  question_id     INT NOT NULL,
  response_text   TEXT,
  response_numeric INT, -- For rating/numeric responses
  response_options TEXT, -- JSON for checkbox responses
  answered_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_question (student_id, question_id),
  INDEX idx_student (student_id),
  INDEX idx_question (question_id)
);

-- Survey Completion Tracking
CREATE TABLE IF NOT EXISTS survey_completions (
  id              INT AUTO_INCREMENT,
  student_id      INT NOT NULL,
  started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME,
  completed       BOOLEAN DEFAULT FALSE,
  total_score     INT, -- Overall career match score
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student (student_id),
  INDEX idx_completed (completed)
);

-- Generated Opportunities Report
CREATE TABLE IF NOT EXISTS opportunity_reports (
  id                    INT AUTO_INCREMENT,
  student_id            INT NOT NULL,
  survey_completion_id  INT NOT NULL,
  generated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_score           INT, -- 0-100 overall career readiness
  top_industries        TEXT, -- JSON array of top 3 industries
  top_roles             TEXT, -- JSON array of top 3 job roles
  skill_gaps            TEXT, -- JSON array of skills to develop
  recommended_mentors   TEXT, -- JSON array of alumni IDs to connect with
  interview_opportunities INT, -- Count of suitable alumni for interviews
  career_recommendations TEXT, -- JSON with career path suggestions
  summary_text          TEXT, -- Human-readable summary
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (survey_completion_id) REFERENCES survey_completions(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_generated (generated_at)
);

-- Opportunity Report Views (for tracking when reports were viewed)
CREATE TABLE IF NOT EXISTS report_views (
  id                INT AUTO_INCREMENT,
  opportunity_report_id INT NOT NULL,
  viewed_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (opportunity_report_id) REFERENCES opportunity_reports(id) ON DELETE CASCADE,
  INDEX idx_viewed (viewed_at)
);

-- Skill Gap Recommendations
CREATE TABLE IF NOT EXISTS skill_recommendations (
  id                INT AUTO_INCREMENT,
  opportunity_report_id INT NOT NULL,
  skill             VARCHAR(100) NOT NULL,
  proficiency_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  importance        INT, -- 1-10 scale
  resources         TEXT, -- JSON array of learning resources/alumni who have skill
  PRIMARY KEY (id),
  FOREIGN KEY (opportunity_report_id) REFERENCES opportunity_reports(id) ON DELETE CASCADE
);
