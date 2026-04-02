-- Initialize VocationConnect database
DROP DATABASE IF EXISTS vocationconnect;
CREATE DATABASE vocationconnect;
USE vocationconnect;

-- Users table (stores both students and alumni accounts)
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT,
  username       VARCHAR(50) NOT NULL UNIQUE,
  first_name     VARCHAR(50) NOT NULL,
  last_name      VARCHAR(50) NOT NULL,
  email          VARCHAR(100) NOT NULL UNIQUE,
  hashedPassword VARCHAR(255) NOT NULL,
  user_type      ENUM('student', 'alumni') NOT NULL DEFAULT 'student',
  graduation_year INT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id),
  INDEX idx_user_type (user_type),
  INDEX idx_graduation_year (graduation_year)
);

-- Alumni profiles (extended information for alumni users)
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id                INT AUTO_INCREMENT,
  user_id           INT NOT NULL,
  company           VARCHAR(200),
  job_title         VARCHAR(200),
  industry          VARCHAR(100),
  years_experience  INT,
  skills            TEXT,
  bio               TEXT,
  available_for_mock BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_available (available_for_mock),
  INDEX idx_industry (industry)
);

-- Connection requests between students and alumni
CREATE TABLE IF NOT EXISTS connections (
  id             INT AUTO_INCREMENT,
  student_id     INT NOT NULL,
  alumni_id      INT NOT NULL,
  status         ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  message        TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alumni_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_student (student_id),
  INDEX idx_alumni (alumni_id)
);

-- Direct messages for accepted connections
CREATE TABLE IF NOT EXISTS direct_messages (
  id             INT AUTO_INCREMENT,
  connection_id  INT NOT NULL,
  sender_id      INT NOT NULL,
  message_text   TEXT NOT NULL,
  sent_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id),
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_connection (connection_id)
);

-- Mock interviews
CREATE TABLE IF NOT EXISTS mock_interviews (
  id              INT AUTO_INCREMENT,
  student_id      INT NOT NULL,
  alumni_id       INT NOT NULL,
  scheduled_date  DATETIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  interview_type  VARCHAR(100),
  status          ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes           TEXT,
  feedback        TEXT,
  rating          INT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alumni_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_scheduled_date (scheduled_date)
);

-- Interview questions
CREATE TABLE IF NOT EXISTS interview_questions (
  id            INT AUTO_INCREMENT,
  interview_id  INT NOT NULL,
  question_text TEXT NOT NULL,
  time_allocated INT DEFAULT 120,
  answered_at   DATETIME,
  PRIMARY KEY (id),
  FOREIGN KEY (interview_id) REFERENCES mock_interviews(id) ON DELETE CASCADE
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id           INT AUTO_INCREMENT,
  interview_id INT NOT NULL,
  sender_id    INT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (interview_id) REFERENCES mock_interviews(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_interview (interview_id)
);

-- Interview notes
CREATE TABLE IF NOT EXISTS interview_notes (
  id           INT AUTO_INCREMENT,
  interview_id INT NOT NULL,
  user_id      INT NOT NULL,
  note_text    TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (interview_id) REFERENCES mock_interviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Login audit table
CREATE TABLE IF NOT EXISTS login_audit (
  id          INT AUTO_INCREMENT,
  username    VARCHAR(50) NOT NULL,
  login_time  DATETIME DEFAULT CURRENT_TIMESTAMP,
  status      VARCHAR(20) NOT NULL,
  message     VARCHAR(255),
  PRIMARY KEY(id),
  INDEX idx_login_time (login_time)
);

-- Create application user
CREATE USER IF NOT EXISTS 'vocation_app'@'localhost' IDENTIFIED BY 'qwertyuiop';
GRANT ALL PRIVILEGES ON vocationconnect.* TO 'vocation_app'@'localhost';
