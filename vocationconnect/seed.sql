USE vocationconnect;

-- Temporarily disable foreign key checks for clean reloading
SET FOREIGN_KEY_CHECKS=0;

-- Delete old test data by username (if exists)
DELETE FROM users WHERE username IN ('john_student', 'jane_alumni', 'mike_alumni', 'sarah_student');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- Sample users (students and alumni)
-- Password for all test users is: Test123!@#
INSERT INTO users (username, first_name, last_name, email, hashedPassword, user_type, graduation_year)
VALUES
  ('john_student', 'John', 'Doe', 'john.student@example.com', '$2b$10$XifHtP0XxZ29TDqDqsq5SOBtW0Vucncc8cxiXQMFT7RJ7kKzDWvIC', 'student', 2025),
  ('jane_alumni', 'Jane', 'Smith', 'jane.smith@example.com', '$2b$10$XifHtP0XxZ29TDqDqsq5SOBtW0Vucncc8cxiXQMFT7RJ7kKzDWvIC', 'alumni', 2020),
  ('mike_alumni', 'Mike', 'Johnson', 'mike.j@example.com', '$2b$10$XifHtP0XxZ29TDqDqsq5SOBtW0Vucncc8cxiXQMFT7RJ7kKzDWvIC', 'alumni', 2018),
  ('sarah_student', 'Sarah', 'Williams', 'sarah.w@example.com', '$2b$10$XifHtP0XxZ29TDqDqsq5SOBtW0Vucncc8cxiXQMFT7RJ7kKzDWvIC', 'student', 2026);

-- Alumni profiles
INSERT INTO alumni_profiles (user_id, company, job_title, industry, years_experience, skills, bio, available_for_mock)
VALUES
  ((SELECT id FROM users WHERE username = 'jane_alumni'), 'Tech Corp', 'Senior Software Engineer', 'Technology', 5, 'JavaScript, Python, React, Node.js', 'Passionate software engineer with 5 years of experience in full-stack development. Love mentoring students!', TRUE),
  ((SELECT id FROM users WHERE username = 'mike_alumni'), 'Finance Plus', 'Financial Analyst', 'Finance', 7, 'Financial Modeling, Excel, Python, SQL', 'Experienced financial analyst specializing in investment banking. Happy to help students prepare for finance interviews.', TRUE);

-- Connection requests
INSERT INTO connections (student_id, alumni_id, status, message)
VALUES
  ((SELECT id FROM users WHERE username = 'john_student'), (SELECT id FROM users WHERE username = 'jane_alumni'), 'accepted', 'Hi Jane, I would love to connect and learn more about software engineering!'),
  ((SELECT id FROM users WHERE username = 'sarah_student'), (SELECT id FROM users WHERE username = 'mike_alumni'), 'pending', 'Hello Mike, I am interested in finance and would appreciate your guidance.');

-- Mock interviews
INSERT INTO mock_interviews (student_id, alumni_id, scheduled_date, duration_minutes, interview_type, status, notes)
VALUES
  ((SELECT id FROM users WHERE username = 'john_student'), (SELECT id FROM users WHERE username = 'jane_alumni'), '2026-02-10 14:00:00', 30, 'Technical Interview', 'scheduled', 'Focus on JavaScript and system design'),
  ((SELECT id FROM users WHERE username = 'john_student'), (SELECT id FROM users WHERE username = 'jane_alumni'), '2026-01-20 10:00:00', 45, 'Behavioral Interview', 'completed', 'Discussed past projects and teamwork');

-- Interview questions
INSERT INTO interview_questions (interview_id, question_text, time_allocated)
VALUES
  (1, 'Tell me about a time you faced a significant challenge at work. How did you handle it?', 300),
  (1, 'Describe a project where you had to work with a difficult team member. What was the outcome?', 300),
  (2, 'Explain the difference between var, let, and const in JavaScript.', 180),
  (2, 'How would you design a URL shortening service like bit.ly?', 600);

-- Interview notes
INSERT INTO interview_notes (interview_id, user_id, note_text)
VALUES
  (2, (SELECT id FROM users WHERE username = 'john_student'), 'Remember to use STAR method for behavioral questions'),
  (2, (SELECT id FROM users WHERE username = 'jane_alumni'), 'Student showed good understanding of React concepts but needs work on system design');

-- Default notification settings for test users
INSERT INTO user_notification_settings (user_id, email_notifications, push_notifications, connection_requests, messages, interviews)
VALUES
  ((SELECT id FROM users WHERE username = 'john_student'), TRUE, TRUE, TRUE, TRUE, TRUE),
  ((SELECT id FROM users WHERE username = 'jane_alumni'), TRUE, TRUE, TRUE, TRUE, TRUE),
  ((SELECT id FROM users WHERE username = 'mike_alumni'), TRUE, TRUE, TRUE, TRUE, TRUE),
  ((SELECT id FROM users WHERE username = 'sarah_student'), TRUE, TRUE, TRUE, TRUE, TRUE);
