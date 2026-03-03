# VocationConnect - Quick Start Guide

## Overview
VocationConnect is a full-stack web application that connects university students with alumni for mentorship and mock interview practice. The application has been refactored from the HealthTrack project to provide comprehensive alumni networking and interview preparation features.

## What's Been Refactored

### From HealthTrack to VocationConnect
- **User system:** Expanded to support both students and alumni user types
- **Activities tracking:** Transformed into alumni profiles with work experience
- **Search functionality:** Enhanced to search alumni by industry, company, and skills
- **New connection system:** Students can request connections with alumni
- **Mock interview platform:** Complete interview scheduling and live interview room
- **Real-time features:** Video, chat, and note-taking during interviews

## Project Structure
```
vocationconnect/
├── index.js                    # Main Express application
├── package.json                # Node.js dependencies
├── .env                        # Environment configuration
├── createdb.sql               # Database schema (8 tables)
├── insert_test_data.sql       # Test data with sample users
├── README.md                  # Comprehensive documentation
├── routes/                    # Backend route handlers
│   ├── main.js               # Home, about, dashboard
│   ├── users.js              # Auth, login, registration, profiles
│   ├── alumni.js             # Alumni browsing and search
│   ├── connections.js        # Connection requests system
│   └── interviews.js         # Mock interview scheduling & rooms
├── views/                    # EJS templates (14 views)
│   ├── layout.ejs           # Main layout with navigation
│   ├── index.ejs            # Homepage
│   ├── dashboard.ejs        # User dashboard
│   ├── interview_room.ejs   # Live interview interface
│   └── ...                  # Other view templates
└── public/                  # Static assets
    ├── main.css             # Main stylesheet
    └── interview-room.css   # Interview room styling
```

## Quick Start

### 1. Install Dependencies
```bash
cd vocationconnect
npm install
```

### 2. Set Up Database
```bash
# Create database and tables
mysql -u root -p < createdb.sql

# Insert test data
mysql -u root -p < insert_test_data.sql
```

### 3. Configure Environment
The `.env` file is already configured for local development:
```
VOCATION_HOST=localhost
VOCATION_USER=vocation_app
VOCATION_PASSWORD=qwertyuiop
VOCATION_DATABASE=vocationconnect
VOCATION_BASE_PATH=
```

### 4. Run the Application
```bash
npm start
```

Access at: http://localhost:8000

## Test Accounts

**Password for all test accounts:** `Test123!@#`

### Student Account
- Username: `john_student`
- Email: john.student@example.com
- Can browse alumni, send connection requests, schedule interviews

### Alumni Accounts
- Username: `jane_alumni`
  - Company: Tech Corp
  - Role: Senior Software Engineer
  - Available for mock interviews

- Username: `mike_alumni`
  - Company: Finance Plus
  - Role: Financial Analyst
  - Available for mock interviews

## Key Features to Test

### 1. User Registration & Login
- Register as a student or alumni
- Login with test accounts
- View and edit profile

### 2. Alumni Directory
- Browse all alumni: `/alumni/browse`
- Search by keyword or industry: `/alumni/search`
- View alumni profiles with work experience

### 3. Connection System
- Students can send connection requests
- Alumni can accept/decline requests
- View all connections: `/connections/my`

### 4. Mock Interview Platform
- Schedule interviews with connected alumni
- Join live interview room with:
  - Video feed (camera access required)
  - Interview questions
  - Timer
  - Real-time chat
  - Private notes
- View interview history

## Database Schema

### 8 Tables Created:
1. **users** - All user accounts (students & alumni)
2. **alumni_profiles** - Extended profiles for alumni
3. **connections** - Connection requests (pending/accepted/declined)
4. **mock_interviews** - Scheduled and completed interviews
5. **interview_questions** - Questions for each interview
6. **chat_messages** - Real-time chat during interviews
7. **interview_notes** - Private notes for each user
8. **login_audit** - Security audit trail

## Key Routes

### Public
- `/` - Homepage
- `/about` - About the platform
- `/users/register` - Registration
- `/users/login` - Login

### Authenticated
- `/dashboard` - User dashboard
- `/alumni/browse` - All alumni
- `/alumni/:id` - Alumni profile
- `/connections/my` - My connections
- `/interviews/my` - My interviews
- `/interviews/room/:id` - Live interview room

## Interview Room Features

The live interview room (`/interviews/room/:id`) includes:

1. **Video Interface**
   - Full-screen interviewer video
   - Picture-in-picture for user camera
   - Mute/unmute controls
   - Video on/off controls

2. **Interview Questions**
   - Display current question
   - Navigate between questions
   - Timed responses

3. **Communication**
   - Real-time chat
   - Message history
   - Auto-refresh

4. **Note Taking**
   - Private notes
   - Auto-save every 30 seconds
   - Manual save option

5. **Timer**
   - Elapsed time tracking
   - Always visible

## Technology Stack

### Backend
- Node.js + Express.js
- MySQL2 for database
- bcrypt for password hashing
- express-session for authentication
- express-validator for input validation
- express-sanitizer for security
- dotenv for configuration

### Frontend
- EJS templating
- Vanilla JavaScript
- Custom CSS (responsive design)
- WebRTC-ready (getUserMedia API)

## Security Features

✓ bcrypt password hashing (10 rounds)
✓ Session-based authentication
✓ Input sanitization (XSS prevention)
✓ Parameterized queries (SQL injection prevention)
✓ Login audit trail
✓ Protected routes
✓ CSRF protection

## Development Tips

### Adding New Features
1. Update database schema in `createdb.sql`
2. Create new routes in appropriate file
3. Create corresponding views in `views/`
4. Update navigation in `layout.ejs`
5. Add styling to CSS files

### Debugging
- Check browser console for JavaScript errors
- Check terminal for server-side errors
- Verify database connections
- Test with different browsers

### Common Issues

**Database Connection Error**
- Ensure MySQL is running
- Verify credentials in `.env`
- Check database user privileges

**Session Issues**
- Clear browser cookies
- Check session middleware
- Verify secret key is set

**Camera Not Working**
- Grant browser permission for camera/microphone
- Use HTTPS (required for getUserMedia in production)
- Test camera in browser settings

## Next Steps

1. **Test Core Features**
   - Register accounts
   - Browse and search alumni
   - Send connection requests
   - Schedule interviews

2. **Try Live Interview**
   - Join interview room
   - Test camera/video
   - Send chat messages
   - Take notes

3. **Customize**
   - Add more interview questions
   - Customize industries
   - Add new user fields
   - Enhance styling

4. **Deploy**
   - Set up on VM with BASE_PATH
   - Configure production database
   - Enable HTTPS
   - Set secure session secrets

## Files Included

**Configuration (4 files)**
- package.json - Dependencies
- .env - Environment variables
- .gitignore - Git exclusions
- README.md - Full documentation

**Backend (6 files)**
- index.js - Main app
- createdb.sql - Database schema
- insert_test_data.sql - Sample data
- routes/main.js - Core routes
- routes/users.js - Authentication
- routes/alumni.js - Alumni features
- routes/connections.js - Connections
- routes/interviews.js - Interviews

**Frontend (16 files)**
- views/layout.ejs - Main template
- views/*.ejs - 13 page templates
- public/main.css - Main styles
- public/interview-room.css - Interview styles

**Total: 26 key files + documentation**

## Support Resources

- See README.md for comprehensive documentation
- Check inline comments in code files
- Review test data in insert_test_data.sql
- Examine route handlers for API endpoints

## Conclusion

VocationConnect successfully refactors HealthTrack into a comprehensive alumni connection and mock interview platform. All core features are implemented and ready for testing. The application demonstrates proper MVC architecture, security best practices, and modern web development techniques.

**Happy coding! 🚀**
