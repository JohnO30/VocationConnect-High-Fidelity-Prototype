# VocationConnect Alumni Search Engine

## Overview

A comprehensive, advanced search engine for discovering and connecting with alumni and professional mentors. The search system provides powerful filtering, sorting, and real-time suggestions to help students find the perfect mentor match.

## Features

### 1. **Advanced Search Filters**

#### Keyword Search
- Search across multiple fields simultaneously:
  - **Names**: First name and last name
  - **Company**: Current or past employer names
  - **Job Titles**: Professional positions
  - **Skills**: Technical and soft skills
- Case-insensitive matching with intelligent relevance ranking

#### Industry Filter
- Filter results by professional industry:
  - Technology
  - Finance
  - Healthcare
  - Education
  - Consulting
  - Marketing
  - Legal
  - Government
  - Retail
  - Other

#### Experience Range Filter
- Filter alumni by years of professional experience
- Set minimum and maximum experience thresholds
- Default range: 0-60 years
- Useful for finding mentors at different career stages

#### Graduation Year Range Filter
- Filter by graduation year from your institution
- Set minimum and maximum graduation years
- Find alumni from specific graduation cohorts
- Helps identify mentors from your class era

#### Interview Availability Filter
- Filter to show only alumni available for mock interviews
- Checkbox toggle for quick filtering
- Helps identify potential interview mentors

### 2. **Intelligent Sorting Options**

Results can be sorted by:

- **Name (A-Z)**: Alphabetical order by first name
- **Years of Experience (Most to Least)**: Find the most experienced mentors first
- **Graduation Year (Most Recent)**: Find recent graduates for relatable perspectives
- **Company (A-Z)**: Browse by company names alphabetically

### 3. **Real-Time Search Suggestions**

- Live autocomplete as you type (minimum 2 characters)
- Displays suggestions ranked by relevance:
  1. First name matches
  2. Last name matches
  3. Company matches
  4. Job title matches
  5. Skills matches
- Shows alumni name, current company, job title, and industry
- Click suggestion to auto-fill search box
- Responsive dropdown with smooth interactions

### 4. **Enhanced Results Display**

#### Active Filters Summary
- Visual badge display of all active filters
- Color-coded filter tags for quick reference:
  - Blue: Keyword search
  - Dark blue: Industry
  - Orange: Experience range
  - Green: Graduation year, Interview availability
- Quick link to modify search

#### Alumni Cards
Each result displays:
- **Profile Avatar**: Visual placeholder
- **Name**: Full name of alumni
- **Company & Job Title**: Current professional position
- **Industry & Experience**: Industry and years of experience
- **Graduation Year**: Year of graduation
- **Skills Preview**: Top 3 skills with "more" indicator
- **Interview Availability Badge**: Shows if available for mock interviews
- **Action Buttons**:
  - View Full Profile: Access complete alumni profile
  - Request Connection: Send connection request (students only)

#### Sort Dropdown
- Change sort order without re-entering filters
- Dropdown preserves all search parameters
- Instant re-sort of results

### 5. **API Endpoints**

#### Search Results
```
POST /alumni/search
```
Parameters:
- `keyword` (string): Search term
- `industry` (string): Industry filter
- `minExperience` (number): Minimum years of experience
- `maxExperience` (number): Maximum years of experience
- `minGradYear` (number): Minimum graduation year
- `maxGradYear` (number): Maximum graduation year
- `availabilityOnly` (boolean): Show only available alumni
- `sortBy` (string): Sort criteria (name, experience, graduation, company)

#### Search Suggestions (Autocomplete)
```
GET /alumni/api/search-suggestions?q={query}
```
Parameters:
- `q` (string): Search query (minimum 2 characters)

Returns JSON array of suggestions with name, company, title, and industry.

#### Available Industries
```
GET /alumni/api/industries
```
Returns JSON array of all industries in the system.

## User Interface

### Search Page (`alumni_search.ejs`)

**Layout**: Clean, organized form with clear sections

**Sections**:
1. **Keyword Search Box** - Main search input with autocomplete
2. **Advanced Filters Section** - Collapsible advanced options
   - Industry dropdown
   - Interview availability checkbox
   - Experience range inputs
   - Graduation year range inputs
3. **Sorting Options** - Dropdown for result sorting
4. **Action Buttons**
   - Search Alumni button
   - Reset button to clear all filters

### Results Page (`alumni_search_results.ejs`)

**Layout**: Grid-based card layout responsive to screen size

**Sections**:
1. **Active Filters** - Summary of applied search filters
2. **Results Counter** - Number of results found
3. **Sort Dropdown** - Change result ordering
4. **Results Grid** - Alumni card grid
5. **No Results Message** - Helpful guidance if no matches found

## Technical Implementation

### Database Queries

All searches use parameterized queries to prevent SQL injection:

```sql
SELECT u.id, u.username, u.first_name, u.last_name, u.graduation_year,
       ap.company, ap.job_title, ap.industry, ap.years_experience, 
       ap.skills, ap.bio, ap.available_for_mock
FROM users u
JOIN alumni_profiles ap ON u.id = ap.user_id
WHERE u.user_type = 'alumni'
  AND (search conditions)
ORDER BY (sort criteria)
```

### Key Fields Indexed

For optimal search performance, the following fields have database indexes:
- `users.user_type` - Filter by alumni
- `users.graduation_year` - Filter by graduation date
- `alumni_profiles.available_for_mock` - Filter by availability
- `alumni_profiles.industry` - Filter by industry

### Frontend JavaScript

- **Autocomplete Handler**: Real-time suggestion fetching with debouncing (300ms)
- **Sort Handler**: Form submission with preserved filter parameters
- **Suggestion Click Handler**: Auto-fill search box
- **Outside Click Handler**: Hide suggestions on blur

## Search Algorithms

### Keyword Relevance Ranking

When searching, the system ranks results by relevance:

```
Priority 1: First name matches
Priority 2: Last name matches
Priority 3: Company matches
Priority 4: Job title matches
Priority 5: Skills matches
```

### Partial String Matching

- All keyword searches use LIKE with wildcards (`%keyword%`)
- Case-insensitive matching
- Handles full phrases and individual words

## Best Practices for Users

### Finding the Right Mentor

1. **Start Specific**: Use industry filter for targeted results
2. **Experience Level**: Set experience range to match your needs
3. **Recent Graduates**: Filter by graduation year for personalized insights
4. **Availability**: Filter for those available for interviews
5. **Keywords**: Search for specific skills or companies of interest

### Refining Results

If you get too many results:
- Add a keyword (name, company, skill)
- Filter by industry
- Narrow experience range
- Adjust graduation year filters

If you get too few results:
- Remove filters one by one
- Broaden keyword search
- Increase experience ranges
- Check "available for interviews" is unchecked

## Performance Considerations

- **Database Indexing**: Searches are optimized with indexes on frequently filtered fields
- **Pagination**: Consider adding pagination for large result sets
- **Caching**: Industry list is fetched dynamically but could be cached
- **Query Limits**: API suggestions limited to top 10 results

## Future Enhancements

Possible improvements for future versions:

1. **Pagination** - Add pagination for large result sets
2. **Saved Searches** - Allow users to save favorite search criteria
3. **Advanced Filters** - Add skills multi-select, location filters
4. **Results Export** - CSV/PDF export of search results
5. **Search Analytics** - Track popular searches and mentors
6. **Profile Insights** - Show alumni profile strength indicators
7. **Matching Score** - Algorithm-driven mentor match recommendations
8. **Geographic Filter** - Search by location/timezone
9. **Availability Calendar** - See specific interview time slots
10. **Email Notifications** - Notify when new mentors match criteria

## Troubleshooting

### No Results Found
- Check spelling of keywords
- Broaden your search criteria
- Try removing specific filters
- Use browse feature to see all alumni

### Suggestions Not Appearing
- Type at least 2 characters
- Check browser console for errors
- Verify JavaScript is enabled
- Clear browser cache

### Search Parameters Not Saving
- Ensure cookies are enabled
- Check form submission is working
- Verify BASE_URL is set correctly

## Support

For issues or feature requests, contact the VocationConnect development team.
