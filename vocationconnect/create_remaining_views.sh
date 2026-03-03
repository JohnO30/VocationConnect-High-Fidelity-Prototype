#!/bin/bash

# Create dashboard.ejs
cat > views/dashboard.ejs << 'EOF'
<h2>Dashboard</h2>

<div class="welcome-message">
  Welcome, <strong><%= session.username %></strong>!
</div>

<% if (session.userType === 'student') { %>
  <h3>Student Dashboard</h3>
  
  <div class="grid">
    <div class="card">
      <h4>🎓 Quick Actions</h4>
      <a href="<%= BASE_URL %>/alumni/browse" class="btn">Browse Alumni</a>
      <a href="<%= BASE_URL %>/alumni/search" class="btn btn-secondary">Search Alumni</a>
    </div>
    
    <div class="card">
      <h4>👥 My Connections</h4>
      <p>Manage your connections with alumni mentors.</p>
      <a href="<%= BASE_URL %>/connections/my" class="btn">View Connections</a>
    </div>
    
    <div class="card">
      <h4>🎤 Mock Interviews</h4>
      <p>View scheduled and past interviews.</p>
      <a href="<%= BASE_URL %>/interviews/my" class="btn">My Interviews</a>
    </div>
    
    <div class="card">
      <h4>👤 My Profile</h4>
      <p>Update your profile information.</p>
      <a href="<%= BASE_URL %>/users/profile" class="btn">Edit Profile</a>
    </div>
  </div>
<% } else { %>
  <h3>Alumni Dashboard</h3>
  
  <div class="grid">
    <div class="card">
      <h4>📬 Connection Requests</h4>
      <p>Review and respond to student connection requests.</p>
      <a href="<%= BASE_URL %>/connections/my" class="btn">View Requests</a>
    </div>
    
    <div class="card">
      <h4>🎤 My Interviews</h4>
      <p>View scheduled and completed mock interviews.</p>
      <a href="<%= BASE_URL %>/interviews/my" class="btn">My Interviews</a>
    </div>
    
    <div class="card">
      <h4>👤 My Profile</h4>
      <p>Keep your profile updated to help students find you.</p>
      <a href="<%= BASE_URL %>/users/profile" class="btn">Edit Profile</a>
    </div>
  </div>
<% } %>
EOF

# Create profile.ejs
cat > views/profile.ejs << 'EOF'
<h2>My Profile</h2>

<div class="card">
  <h3><%= user.first_name %> <%= user.last_name %></h3>
  <p><strong>Username:</strong> <%= user.username %></p>
  <p><strong>Email:</strong> <%= user.email %></p>
  <p><strong>User Type:</strong> <%= user.user_type %></p>
  <p><strong>Graduation Year:</strong> <%= user.graduation_year || 'Not specified' %></p>
</div>

<% if (user.user_type === 'alumni') { %>
  <h3>Alumni Profile</h3>
  
  <form action="<%= BASE_URL %>/users/profile/update" method="POST">
    <label for="company">Company:</label>
    <input type="text" id="company" name="company" value="<%= user.company || '' %>">
    
    <label for="job_title">Job Title:</label>
    <input type="text" id="job_title" name="job_title" value="<%= user.job_title || '' %>">
    
    <label for="industry">Industry:</label>
    <select id="industry" name="industry">
      <option value="">Select Industry</option>
      <option value="Technology" <%= user.industry === 'Technology' ? 'selected' : '' %>>Technology</option>
      <option value="Finance" <%= user.industry === 'Finance' ? 'selected' : '' %>>Finance</option>
      <option value="Healthcare" <%= user.industry === 'Healthcare' ? 'selected' : '' %>>Healthcare</option>
      <option value="Education" <%= user.industry === 'Education' ? 'selected' : '' %>>Education</option>
      <option value="Consulting" <%= user.industry === 'Consulting' ? 'selected' : '' %>>Consulting</option>
      <option value="Other" <%= user.industry === 'Other' ? 'selected' : '' %>>Other</option>
    </select>
    
    <label for="years_experience">Years of Experience:</label>
    <input type="number" id="years_experience" name="years_experience" value="<%= user.years_experience || 0 %>" min="0">
    
    <label for="skills">Skills (comma-separated):</label>
    <textarea id="skills" name="skills"><%= user.skills || '' %></textarea>
    
    <label for="bio">Bio:</label>
    <textarea id="bio" name="bio"><%= user.bio || '' %></textarea>
    
    <label>
      <input type="checkbox" name="available_for_mock" <%= user.available_for_mock ? 'checked' : '' %>>
      Available for mock interviews
    </label>
    
    <input type="submit" value="Update Profile">
  </form>
<% } %>
EOF

# Create alumni_browse.ejs
cat > views/alumni_browse.ejs << 'EOF'
<h2>Browse Alumni</h2>

<p><a href="<%= BASE_URL %>/alumni/search">Advanced Search</a></p>

<% if (alumni && alumni.length > 0) { %>
  <div class="grid">
    <% alumni.forEach(function(alum) { %>
      <div class="card alumni-card">
        <h3><%= alum.first_name %> <%= alum.last_name %></h3>
        <p class="company"><%= alum.company || 'Company not specified' %></p>
        <p class="job-title"><%= alum.job_title || 'Job title not specified' %></p>
        <p><strong>Industry:</strong> <%= alum.industry || 'N/A' %></p>
        <p><strong>Experience:</strong> <%= alum.years_experience || 0 %> years</p>
        <% if (alum.available_for_mock) { %>
          <span class="badge badge-success">Available for Interviews</span>
        <% } %>
        <div class="card-footer">
          <a href="<%= BASE_URL %>/alumni/<%= alum.id %>" class="btn btn-primary">View Profile</a>
        </div>
      </div>
    <% }); %>
  </div>
<% } else { %>
  <p>No alumni profiles found.</p>
<% } %>
EOF

# Create alumni_profile.ejs
cat > views/alumni_profile.ejs << 'EOF'
<h2><%= alumni.first_name %> <%= alumni.last_name %></h2>

<div class="card">
  <p class="company"><%= alumni.company || 'Company not specified' %></p>
  <p class="job-title"><%= alumni.job_title || 'Job title not specified' %></p>
  <p><strong>Industry:</strong> <%= alumni.industry || 'N/A' %></p>
  <p><strong>Experience:</strong> <%= alumni.years_experience || 0 %> years</p>
  <p><strong>Graduation Year:</strong> <%= alumni.graduation_year %></p>
  
  <% if (alumni.bio) { %>
    <h4>Bio</h4>
    <p><%= alumni.bio %></p>
  <% } %>
  
  <% if (alumni.skills) { %>
    <h4>Skills</h4>
    <p><%= alumni.skills %></p>
  <% } %>
  
  <% if (alumni.available_for_mock) { %>
    <span class="badge badge-success">Available for Mock Interviews</span>
  <% } %>
</div>

<% if (session.userType === 'student') { %>
  <% if (!connection) { %>
    <h3>Send Connection Request</h3>
    <form action="<%= BASE_URL %>/connections/request" method="POST">
      <input type="hidden" name="alumni_id" value="<%= alumni.id %>">
      <label for="message">Message:</label>
      <textarea id="message" name="message" required>Hi <%= alumni.first_name %>, I would love to connect and learn more about your experience!</textarea>
      <input type="submit" value="Send Request">
    </form>
  <% } else { %>
    <div class="info">
      <p><strong>Connection Status:</strong> <span class="interview-status status-<%= connection.status %>"><%= connection.status %></span></p>
      <% if (connection.status === 'accepted' && alumni.available_for_mock) { %>
        <a href="<%= BASE_URL %>/interviews/schedule/<%= alumni.id %>" class="btn btn-success">Schedule Mock Interview</a>
      <% } %>
    </div>
  <% } %>
<% } %>
EOF

echo "All view files created successfully!"
