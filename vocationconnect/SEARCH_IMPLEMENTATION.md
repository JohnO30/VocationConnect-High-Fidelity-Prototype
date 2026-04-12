# Search Engine - Developer Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (EJS Views)                      │
├─────────────────────────────────────────────────────────────┤
│  alumni_search.ejs (Form)          alumni_search_results.ejs │
│  - Advanced filters               - Results display         │
│  - Real-time suggestions          - Sort functionality      │
│  - Form validation                - Filter badges          │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP Requests
┌─────────────────────────────────────────────────────────────┐
│                    Express Routes (Node.js)                  │
├─────────────────────────────────────────────────────────────┤
│  routes/alumni.js                                            │
│  POST  /alumni/search                                        │
│  GET   /alumni/api/search-suggestions                        │
│  GET   /alumni/api/industries                                │
└─────────────────────────────────────────────────────────────┘
                          ↓ SQL Queries
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database                            │
├─────────────────────────────────────────────────────────────┤
│  users table       alumni_profiles table                     │
│  - id              - user_id ← FK                            │
│  - first_name      - company                                 │
│  - last_name       - job_title                               │
│  - graduation_year - industry                                │
│                    - years_experience                        │
│                    - skills                                  │
│                    - available_for_mock                      │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
vocationconnect/
├── routes/
│   └── alumni.js                 ← Main search logic
├── views/
│   ├── alumni_search.ejs        ← Search form UI
│   └── alumni_search_results.ejs ← Results & display
├── public/
│   └── main.css                  ← Styling (uses CSS variables)
├── SEARCH_ENGINE.md              ← Feature documentation
├── SEARCH_QUICK_START.md         ← User guide
└── (this file)                   ← Developer guide
```

## Route Implementation Details

### 1. POST /alumni/search

**Purpose**: Execute parameterized search with filters

**Request Body**:
```javascript
{
  keyword: String,           // Optional: name, company, skill
  industry: String,          // Optional: industry filter
  minExperience: Number,     // Default: 0
  maxExperience: Number,     // Default: 100
  minGradYear: Number,       // Default: 1990
  maxGradYear: Number,       // Default: current year
  availabilityOnly: Boolean, // Default: false
  sortBy: String            // Default: 'name' | 'experience' | 'graduation' | 'company'
}
```

**SQL Logic**:
```sql
SELECT users and alumni_profiles data
WHERE user_type = 'alumni'
  AND (keyword filters with OR conditions)
  AND (industry filter if provided)
  AND experience between min and max
  AND graduation_year between min and max
  AND available_for_mock if checkbox checked
ORDER BY (sort criteria)
```

**Response**: 
```javascript
{
  title: 'Search Results',
  alumni: Array<AlumniProfile>,
  searchParams: {
    keyword, industry, minExperience, maxExperience,
    minGradYear, maxGradYear, availabilityOnly, sortBy
  },
  industries: Array<String>,
  currentYear: Number
}
```

### 2. GET /alumni/api/search-suggestions

**Purpose**: Real-time autocomplete suggestions (called on input)

**Query Parameters**:
```
?q=john
```

**Processing**:
1. Check query length >= 2
2. Build LIKE search terms with relevance scoring
3. Rank by relevance (name > company > skills)
4. Limit to 10 results
5. Return JSON with suggestions

**SQL Relevance Ranking**:
```sql
CASE 
  WHEN u.first_name LIKE ? THEN 1
  WHEN u.last_name LIKE ? THEN 2
  WHEN ap.company LIKE ? THEN 3
  WHEN ap.job_title LIKE ? THEN 4
  ELSE 5
END AS relevance
ORDER BY relevance, u.first_name, u.last_name
LIMIT 10
```

**Response**:
```json
{
  "suggestions": [
    {
      "id": 42,
      "name": "John Smith",
      "company": "Google",
      "title": "Senior Engineer",
      "industry": "Technology",
      "displayText": "John Smith at Google"
    },
    ...
  ]
}
```

### 3. GET /alumni/api/industries

**Purpose**: Fetch all available industries for filter dropdown

**Processing**:
1. Query distinct industries from profiles
2. Filter out NULL and empty values
3. Sort alphabetically
4. Return as array

**SQL**:
```sql
SELECT DISTINCT industry FROM alumni_profiles 
WHERE industry IS NOT NULL AND industry != ''
ORDER BY industry
```

**Response**:
```json
{
  "industries": [
    "Consulting",
    "Education",
    "Finance",
    "Government",
    "Healthcare",
    "Legal",
    "Marketing",
    "Retail",
    "Technology",
    "Other"
  ]
}
```

## Frontend Implementation Details

### alumni_search.ejs

**Key Components**:

#### Autocomplete Handler
```javascript
// Real-time suggestion fetching
searchInput.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const query = this.value.trim();
  
  if (query.length < 2) {
    suggestionsContainer.style.display = 'none';
    return;
  }
  
  // 300ms debounce to avoid too many requests
  searchTimeout = setTimeout(() => {
    fetch(`/alumni/api/search-suggestions?q=${encodeURIComponent(query)}`)
      .then(response => response.json())
      .then(data => {
        // Render suggestions HTML
        suggestionsContainer.innerHTML = renderSuggestions(data.suggestions);
        suggestionsContainer.style.display = 'block';
      });
  }, 300);
});
```

**Why Debounce?**
- Prevents firing request on every keystroke
- Reduces server load
- Improves user experience with faster search
- 300ms is imperceptible to users but prevents spam

#### Suggestion Selection
```javascript
function selectSuggestion(text, id) {
  searchInput.value = text;
  suggestionsContainer.style.display = 'none';
}
```

#### Click Outside Handler
```javascript
document.addEventListener('click', (e) => {
  if (e.target !== searchInput) {
    suggestionsContainer.style.display = 'none';
  }
});
```

### alumni_search_results.ejs

**Key Features**:

#### Badge System
```html
<!-- Each filter shown as a colored badge -->
<% if (searchParams.keyword) { %>
  <span style="background-color: var(--primary-color); ...">
    📝 "<%= searchParams.keyword %>"
  </span>
<% } %>
```

**Badge Colors**:
- Blue (`--primary-color`): Keyword
- Dark Blue (`--secondary-color`): Industry
- Orange (`--warning-color`): Experience
- Green (`--success-color`): Graduation year, Availability

#### Skills Display
```html
<% if (alum.skills) { %>
  <% alum.skills.split(',').slice(0, 3).forEach(skill => { %>
    <span><!-- Show first 3 --><%= skill.trim() %></span>
  <% }); %>
  <% if (alum.skills.split(',').length > 3) { %>
    <span>+<%= alum.skills.split(',').length - 3 %> more</span>
  <% } %>
<% } %>
```

#### Sort Handler
```javascript
sortSelect.addEventListener('change', function() {
  // Create form with all search parameters
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/alumni/search';
  
  // Re-submit with new sort order
  // (preserves all other filters)
  document.body.appendChild(form);
  form.submit();
});
```

## Database Optimization

### Important Indexes

```sql
-- These should exist for optimal search performance:
CREATE INDEX idx_user_type ON users(user_type);
CREATE INDEX idx_graduation_year ON users(graduation_year);
CREATE INDEX idx_available ON alumni_profiles(available_for_mock);
CREATE INDEX idx_industry ON alumni_profiles(industry);
CREATE INDEX idx_company ON alumni_profiles(company);

-- Note: First name and last name searches hit full table scan
-- Consider FULLTEXT indexes for large datasets
```

### Query Performance Tips

1. **Filter Selectivity**: Apply most selective filters first
2. **Parameterized Queries**: All user input uses `?` placeholders
3. **LIMIT on Suggestions**: API suggestions capped at 10 results
4. **Index Usage**: WHERE clauses on indexed columns
5. **JOIN Condition**: Uses simple FK relationship

### For Large Datasets

If searching becomes slow with 10,000+ alumni:

```sql
-- Add FULLTEXT index for name/skills searches
ALTER TABLE users ADD FULLTEXT idx_name_search (first_name, last_name);
ALTER TABLE alumni_profiles ADD FULLTEXT idx_profile_search (company, job_title, skills);

-- Use MATCH...AGAINST for faster text search
SELECT * FROM alumni_profiles 
WHERE MATCH(company, job_title, skills) 
AGAINST(? IN BOOLEAN MODE)
```

## Security Considerations

### Input Sanitization
```javascript
// All user input is sanitized
const keyword = req.sanitize(req.body.keyword);
const industry = req.sanitize(req.body.industry);
```

### SQL Injection Prevention
```javascript
// Parameterized queries with ? placeholders
db.query(sql, [param1, param2, ...], callback);
// Parameters are safely escaped by the driver
```

### Authentication Check
```javascript
// All search routes require login
const redirectLogin = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect('/users/login');
  } else {
    next();
  }
};

router.get('/search', redirectLogin, (req, res) => {
  // Only logged-in users can search
});
```

## Error Handling

### Database Errors
```javascript
db.query(sql, params, (err, results) => {
  if (err) return next(err); // Pass to error handler
  // Process results
});
```

### Validation
- Number inputs have min/max attributes (HTML5)
- Keyword length validated on backend
- Missing parameters have sensible defaults
- Result set cannot be negative (logic prevents this)

## Testing the Search

### Manual Testing Checklist

```
[ ] Keyword Search
  [ ] Single word search
  [ ] Multiple word search
  [ ] Special characters
  [ ] Case insensitivity

[ ] Industry Filter
  [ ] All industries
  [ ] Individual industries
  [ ] Non-matching combinations

[ ] Experience Range
  [ ] Min only
  [ ] Max only
  [ ] Min + Max
  [ ] Range with no results

[ ] Graduation Year
  [ ] Same year
  [ ] Custom range
  [ ] Cross-era searches

[ ] Interview Availability
  [ ] Checkbox on
  [ ] Checkbox off
  [ ] Combined with other filters

[ ] Sorting
  [ ] Name sort
  [ ] Experience sort
  [ ] Graduation sort
  [ ] Company sort

[ ] Autocomplete
  [ ] Less than 2 characters (no suggestions)
  [ ] 2 characters (suggestions appear)
  [ ] Click suggestion (fills input)
  [ ] Type more to refine
  [ ] Click outside (hides suggestions)

[ ] Results Page
  [ ] No results found message
  [ ] Results counter accurate
  [ ] Filter badges show correctly
  [ ] All alumni data displays
  [ ] Skills truncation works
  [ ] Availability badge shows/hides
  [ ] Action buttons functional

[ ] Responsive Design
  [ ] Mobile (< 600px)
  [ ] Tablet (600-1024px)
  [ ] Desktop (> 1024px)

[ ] Accessibility
  [ ] Labels properly associated
  [ ] Keyboard navigation works
  [ ] Form submission on Enter
```

### Unit Test Ideas

```javascript
// Test filter building logic
test('builds correct SQL for experience filter', () => {
  // Assert SQL contains proper range check
});

test('sanitizes keyword input', () => {
  // Assert dangerous input is escaped
});

test('applies relevance ranking correctly', () => {
  // Assert name matches rank higher than company
});

test('limits suggestion results to 10', () => {
  // Assert max 10 suggestions returned
});

test('handles empty result set gracefully', () => {
  // Assert empty results render properly
});
```

## Extending the Search

### Adding a New Filter

1. **Update Route** (alumni.js):
```javascript
const myNewFilter = req.sanitize(req.body.myFilter);

if (myNewFilter && myNewFilter !== 'default') {
  sql += ` AND alumni_profiles.my_field = ?`;
  params.push(myNewFilter);
}
```

2. **Update Form** (alumni_search.ejs):
```html
<label for="myFilter">My New Filter</label>
<select id="myFilter" name="myFilter">
  <option value="default">All</option>
  <option value="option1">Option 1</option>
</select>
```

3. **Update Results Page** (alumni_search_results.ejs):
```html
<% if (searchParams.myFilter && searchParams.myFilter !== 'default') { %>
  <span style="background-color: var(--primary-color); ...">
    <%= searchParams.myFilter %>
  </span>
<% } %>
```

4. **Add to Send Parameters**:
```javascript
formData.append('myFilter', '<%= searchParams.myFilter %>');
```

### Adding a New Sort Option

1. **Update Route**:
```javascript
case 'mySort':
  sql += ` ORDER BY my_field ASC, u.first_name`;
  break;
```

2. **Update Form**:
```html
<option value="mySort">My Sort Option</option>
```

3. **Update Results Page Sort Dropdown**:
```html
<option value="mySort" <%= ... ? 'selected' : '' %>>My Sort</option>
```

## Performance Monitoring

### Slow Query Log

Enable MySQL slow query logging:
```sql
SET GLOBAL slow_query_log='ON';
SET GLOBAL long_query_time=2; -- Log queries > 2 seconds
```

### Common Performance Issues

```
Problem: Search is slow
Solution: 
  - Check if indexes exist on filtered columns
  - Run EXPLAIN on the query
  - Consider pagination

Problem: Autocomplete feels laggy
Solution:
  - Increase debounce timeout
  - Add LIMIT to suggestion query
  - Check backend response time

Problem: Page load is slow
Solution:
  - Lazy load images
  - Minify CSS/JavaScript
  - Cache industry list
```

## Deployment Checklist

```
[ ] Database indexes created
[ ] Routes properly mounted in index.js
[ ] Views in correct directory
[ ] BASE_URL environment variable set
[ ] CSS variables properly loaded
[ ] JavaScript enabled in target browsers
[ ] Error handling configured
[ ] Security headers set
[ ] Rate limiting on API endpoints (if needed)
[ ] Logging configured for debugging
[ ] Database backups scheduled
[ ] Monitoring alerts configured
```

## Resources

- **MySQL** Documentation: https://dev.mysql.com/doc/
- **Express.js** Guide: https://expressjs.com/
- **EJS** Template Docs: https://ejs.co/
- **HTML5 Input Types**: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input

---

**Last Updated**: 2026-04-05
**Version**: 1.0
**Author**: VocationConnect Development Team
