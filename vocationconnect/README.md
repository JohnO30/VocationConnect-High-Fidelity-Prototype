# VocationConnect - Alumni Connection & Mock Interview Platform

A comprehensive web application connecting students with alumni mentors for career guidance and mock interview practice. Built with Node.js, Express, MySQL, and EJS templating.

## Features

### Core Functionality
- **User Management**
  - Separate registration and profiles for students and alumni
  - Secure authentication with bcrypt password hashing
  - Session-based authorization
  - Login audit trail

- **Alumni Directory**
  - Browse all alumni profiles
  - Search and filter by industry, company, skills
  - View detailed alumni profiles with work experience and expertise

- **Connection System**
  - Students can send connection requests to alumni
  - Alumni can accept or decline requests
  - Track connection status (pending, accepted, declined)
  - View all connections in one place

- **Mock Interview Platform**
  - Schedule mock interviews with alumni
  - Live interview room with:
    - Video feed (PiP for user camera)
    - Interview questions with timer
    - Real-time chat
    - Private note-taking
    - Mute/unmute and video on/off controls
  - Interview history tracking
  - Feedback and rating system

### Technical Features
- RESTful API architecture
- Server-side rendering with EJS
- MySQL database with relational data integrity
- Form validation with express-validator
- Input sanitization for security
- Responsive design
- WebRTC-ready for video communication

## Project Structure

```
vocationconnect/
├── index.js                 # Main application file
├── package.json             # Dependencies
├── .env                     # Environment variables
├── createdb.sql            # Database schema
├── insert_test_data.sql    # Sample data
├── routes/                 # Route handlers
│   ├── main.js             # Home, about, dashboard
│   ├── users.js            # Authentication, profiles
│   ├── alumni.js           # Alumni browsing and search
│   ├── connections.js      # Connection requests
│   └── interviews.js       # Mock interviews
├── views/                  # EJS templates
│   ├── layout.ejs          # Main layout
│   ├── index.ejs           # Home page
│   ├── about.ejs           # About page
│   ├── dashboard.ejs       # User dashboard
│   ├── register.ejs        # Registration form
│   ├── login.ejs           # Login form
│   ├── profile.ejs         # User profile
│   ├── alumni_browse.ejs   # Alumni directory
│   ├── alumni_profile.ejs  # Individual alumni profile
│   ├── connections_my.ejs  # My connections
│   ├── interviews_my.ejs   # My interviews
│   ├── interview_schedule.ejs # Schedule interview
│   └── interview_room.ejs  # Live interview room
└── public/                 # Static assets
    ├── main.css            # Main stylesheet
    ├── interview-room.css  # Interview room styles
    └── interview-room.js   # Interview room JavaScript
```

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server (v8.0 or higher)
- npm (Node Package Manager)

### Installation Steps

1. **Extract the project files**
   ```bash
   cd vocationconnect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   mysql -u root -p < init.sql
   mysql -u root -p < seed.sql
   ```

4. **Configure environment variables**
   
   Edit the `.env` file or create one:
   
   **For local development:**
   ```
   VOCATION_HOST=localhost
   VOCATION_USER=vocation_app
   VOCATION_PASSWORD=qwertyuiop
   VOCATION_DATABASE=vocationconnect
   VOCATION_BASE_PATH=
   ```
   
   **For VM deployment:**
   ```
   VOCATION_HOST=localhost
   VOCATION_USER=vocation_app
   VOCATION_PASSWORD=qwertyuiop
   VOCATION_DATABASE=vocationconnect
   VOCATION_BASE_PATH=/usr/260
   ```

5. **Run the application**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - **Local:** http://localhost:8000
   - **VM:** https://www.doc.gold.ac.uk/usr/260/

## Test Accounts

All test accounts use the password: **Test123!@#**

### Student Account
- **Username:** john_student
- **Email:** john.student@example.com

### Alumni Accounts
- **Username:** jane_alumni
- **Email:** jane.smith@example.com
- **Company:** Tech Corp (Senior Software Engineer)

- **Username:** mike_alumni  
- **Email:** mike.j@example.com
- **Company:** Finance Plus (Financial Analyst)

## Database Schema

### Tables

1. **users** - User accounts (students and alumni)
2. **alumni_profiles** - Extended profiles for alumni
3. **connections** - Connection requests between students and alumni
4. **mock_interviews** - Scheduled and completed interviews
5. **interview_questions** - Questions for each interview
6. **chat_messages** - Real-time chat during interviews
7. **interview_notes** - Private notes taken during interviews
8. **login_audit** - Login attempt tracking

## Key Routes

### Public Routes
- `/` - Home page
- `/about` - About the platform
- `/users/register` - Registration
- `/users/login` - Login

### Authenticated Routes
- `/dashboard` - User dashboard
- `/users/profile` - View/edit profile
- `/alumni/browse` - Browse all alumni
- `/alumni/search` - Search alumni
- `/alumni/:id` - View alumni profile
- `/connections/my` - View my connections
- `/connections/request` - Send connection request
- `/interviews/my` - View my interviews
- `/interviews/schedule/:alumniId` - Schedule new interview
- `/interviews/room/:id` - Live interview room

## API Endpoints

### Chat API
- `POST /interviews/chat/:id` - Send chat message
- `GET /interviews/chat/:id` - Get chat history

### Notes API
- `POST /interviews/notes/:id` - Save interview notes

### Connection API
- `POST /connections/request` - Send connection request
- `POST /connections/:id/accept` - Accept request
- `POST /connections/:id/decline` - Decline request

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VOCATION_HOST | MySQL host | localhost |
| VOCATION_USER | MySQL user | vocation_app |
| VOCATION_PASSWORD | MySQL password | qwertyuiop |
| VOCATION_DATABASE | Database name | vocationconnect |
| VOCATION_BASE_PATH | URL prefix for deployment | (empty) |

## Security Features

- **Password Security:** bcrypt hashing with 10 salt rounds
- **Session Management:** Secure, server-side sessions with 1-hour expiration
- **Input Sanitization:** All user inputs sanitized to prevent XSS
- **SQL Injection Prevention:** Parameterized queries throughout
- **Access Control:** Route-level authentication middleware
- **Login Audit:** Complete tracking of authentication attempts

## Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MySQL2** - MySQL database driver
- **bcrypt** - Password hashing
- **express-session** - Session management
- **express-validator** - Form validation
- **express-sanitizer** - Input sanitization
- **dotenv** - Environment variable management

### Frontend
- **EJS** - Templating engine
- **express-ejs-layouts** - Layout support
- **Custom CSS** - Responsive styling
- **Vanilla JavaScript** - Client-side interactivity

## Development

### Adding New Features

1. **Create database tables** in `createdb.sql`
2. **Add routes** in appropriate file under `routes/`
3. **Create views** in `views/` directory
4. **Update navigation** in `views/layout.ejs`
5. **Add styles** to `public/main.css` or create new CSS file

### Running in Development Mode

```bash
npm run dev
```

This uses nodemon for auto-reload on file changes.

## Deployment

### VM Deployment (doc.gold.ac.uk)

1. Upload files to VM
2. Set `VOCATION_BASE_PATH=/usr/260` in `.env`
3. Run database setup scripts
4. Start application: `npm start`
5. Access at: https://www.doc.gold.ac.uk/usr/260/

### Production Considerations

- Use process manager (PM2, systemd)
- Enable HTTPS
- Set secure session secrets
- Configure proper database credentials
- Enable error logging
- Set up database backups

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database user has proper privileges

### Login Issues
- Clear browser cookies
- Check password meets requirements
- Verify user exists in database

### Session Issues
- Check session secret is set
- Verify session middleware is loaded
- Clear expired sessions from database

## Future Enhancements

- [ ] Real-time video using WebRTC
- [ ] Email notifications for connections and interviews
- [ ] Calendar integration
- [ ] Interview recording and playback
- [ ] AI-powered interview analysis
- [ ] Mobile app
- [ ] Advanced search filters
- [ ] Recommendation system
- [ ] Portfolio/resume upload
- [ ] Industry-specific question banks

## Credits

**Refactored from:** HealthTrack application  
**Original Base:** Dynamic Web Applications module project  
**Institution:** Goldsmiths, University of London  
**Created:** February 2026

## License

This project is for educational purposes.

## Support
For issue of support please contact jolad001@gold.ac.uk

---

**VocationConnect** - Bridging the gap between students and alumni, one interview at a time.
