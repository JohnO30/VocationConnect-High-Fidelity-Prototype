# Running and Testing the Algorithmic Search Engine

## Quick Start

### 1. Start Your Application

```bash
cd vocationconnect
npm start
```

Your app runs at: `http://localhost:3000`

### 2. Test the Search Engine

Navigate to: `http://localhost:3000/alumni/search`

Try these searches:
- ✓ Type `software engineer` - exact match search
- ✓ Type `jon smith` - fuzzy matching (finds "John Smith")
- ✓ Type `machin lerning` - typo tolerance
- ✓ Type `g` then `go` then `goo` - real-time autocomplete

### 3. View Search Analytics

```
GET http://localhost:3000/alumni/api/search-analytics
```

Returns:
```json
{
  "totalSearches": 523,
  "cacheSize": 45,
  "maxCacheSize": 100,
  "popularSearches": [
    {"keyword": "software engineer", "count": 28}
  ]
}
```

## Running Tests

### Prerequisites

Ensure `tests/` directory exists:
```bash
mkdir -p tests
```

### Run Test Suite

```bash
node tests/searchEngine.test.js
```

**Expected Output:**
```
============================================================
VOCATIONCONNECT - ALGORITHMIC SEARCH ENGINE TESTS
============================================================

TEST 1: Levenshtein Distance (Typo Tolerance)
============================================================

Testing edit distance calculations:
✓ "john" → "jon": distance = 1 (expected: 1)
✓ "smith" → "smth": distance = 1 (expected: 1)
✓ "google" → "gogle": distance = 1 (expected: 1)
✓ "engineer" → "enginer": distance = 1 (expected: 1)
✓ "kitten" → "sitting": distance = 3 (expected: 3)

TEST 2: Similarity Scoring (0-1 scale)
...
```

## Testing Specific Algorithms

### Test Levenshtein Distance

Create `test-levenshtein.js`:

```javascript
const searchEngine = require('./utils/searchEngine');

const tests = [
  ['john', 'jon'],
  ['smith', 'smth'],
  ['engineer', 'enginer'],
  ['gogle', 'google']
];

tests.forEach(([str1, str2]) => {
  const dist = searchEngine.levenshteinDistance(str1, str2);
  console.log(`${str1} → ${str2}: distance = ${dist}`);
});
```

Run:
```bash
node test-levenshtein.js
```

### Test Similarity Scoring

Create `test-similarity.js`:

```javascript
const searchEngine = require('./utils/searchEngine');

const pairs = [
  ['john', 'john'],
  ['jon', 'john'],
  ['smth', 'smith'],
  ['machine', 'machin']
];

pairs.forEach(([str1, str2]) => {
  const sim = searchEngine.calculateSimilarity(str1, str2);
  console.log(`${str1} ≈ ${str2}: ${(sim * 100).toFixed(0)}% similar`);
});
```

Run:
```bash
node test-similarity.js
```

### Test Relevance Scoring

Create `test-relevance.js`:

```javascript
const searchEngine = require('./utils/searchEngine');

const alumni = {
  id: 1,
  first_name: 'John',
  last_name: 'Smith',
  company: 'Google',
  job_title: 'Software Engineer',
  industry: 'Technology',
  years_experience: 8,
  skills: 'Python, JavaScript, React',
  bio: 'Passionate about coding'
};

const score = searchEngine.calculateRelevanceScore(alumni, 'software engineer', {});
console.log(`Relevance Score: ${score.toFixed(1)}/100`);

// With filters
const scoreWithFilters = searchEngine.calculateRelevanceScore(alumni, 'software engineer', {
  industry: 'Technology',
  availabilityOnly: true
});
console.log(`With Filters: ${scoreWithFilters.toFixed(1)}/100`);
```

Run:
```bash
node test-relevance.js
```

## Integration Testing

### Test POST /alumni/search

Create `test-integration.js`:

```javascript
const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sessionId=test' // Add real session if needed
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test search
(async () => {
  console.log('Testing /alumni/api/search-suggestions...');
  const result = await makeRequest('/alumni/api/search-suggestions?q=joh');
  console.log('Status:', result.status);
  console.log('Response:', result.body);
})();
```

Run:
```bash
node test-integration.js
```

## Manual Testing Checklist

### Basic Search
- [ ] Search: "John" → Should find "John Smith", "Jonathan Lee", etc.
- [ ] Search: "Google" → Should find people at Google
- [ ] Search: "Python" → Should find people with Python skills

### Typo Testing
- [ ] Search: "jon" → Should find "john"
- [ ] Search: "smth" → Should find "smith"
- [ ] Search: "goog" → Should find "google"
- [ ] Search: "sophtwer" → Should find "software"

### Filter Testing
- [ ] Apply Industry filter "Technology"
- [ ] Apply Experience range "5-15 years"
- [ ] Apply Graduation year "2020-2022"
- [ ] Check "Available for Interviews"
- [ ] Combine multiple filters

### Sorting Testing
- [ ] Sort by "Relevance" (default)
- [ ] Sort by "Experience"
- [ ] Sort by "Graduation Year"
- [ ] Sort by "Company"
- [ ] Sort by "Name"

### Autocomplete Testing
- [ ] Type "j" → See suggestions starting with J
- [ ] Type "jo" → See John, Jonathan, etc.
- [ ] Type "joh" → See more specific matches
- [ ] Type with typo "jhon" → Still see John

### Performance Testing
- [ ] Search should return within 1 second
- [ ] Autocomplete suggestions within 500ms
- [ ] Fuzzy search within 1 second

### Edge Cases
- [ ] Search with empty keyword
- [ ] Search with very long keyword
- [ ] Search with special characters: @#$%^
- [ ] Search with numbers: "123"
- [ ] All filters applied at once

## Performance Benchmarking

Create `benchmark.js`:

```javascript
const searchEngine = require('./utils/searchEngine');
const { PerformanceMonitor } = require('./utils/searchOptimization');

// Generate test data
function generateAlumni(count) {
  const companies = ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta'];
  const industries = ['Technology', 'Finance', 'Consulting', 'Healthcare'];
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
  const lastNames = ['Smith', 'Doe', 'Johnson', 'Williams', 'Brown'];

  const alumni = [];
  for (let i = 0; i < count; i++) {
    alumni.push({
      id: i,
      first_name: firstNames[i % firstNames.length],
      last_name: lastNames[i % lastNames.length],
      company: companies[i % companies.length],
      job_title: 'Software Engineer',
      industry: industries[i % industries.length],
      years_experience: (i % 30) + 1,
      skills: 'Python, JavaScript, React',
      graduation_year: 2015 + (i % 10),
      available_for_mock: i % 2 === 0
    });
  }
  return alumni;
}

const monitor = new PerformanceMonitor();

// Benchmark with different alumni counts
[100, 1000, 5000].forEach(count => {
  const alumni = generateAlumni(count);
  
  const timer = monitor.startTimer();
  searchEngine.performSearch(alumni, 'software engineer', {});
  monitor.recordMetric(timer, `search-${count}-alumni`, { count });
  
  console.log(`Search (${count} alumni):`, monitor.getStatistics(`search-${count}-alumni`));
});
```

Run:
```bash
node benchmark.js
```

## Debugging

### Enable Verbose Logging

Modify `utils/searchEngine.js` to add logging:

```javascript
// In performSearch method
console.log('Filtering alumni...');
results = this.applyFilters(results, filters);
console.log(`After filter: ${results.length} results`);

console.log('Calculating relevance scores...');
results = results.map(alumni => ({
  ...alumni,
  relevanceScore: this.calculateRelevanceScore(alumni, keyword, filters)
}));

console.log('Sorting by relevance...');
// ... rest of code
```

### Check Search Cache

Add endpoint in `routes/alumni.js`:

```javascript
router.get('/api/cache-stats', redirectLogin, (req, res) => {
  const cache = new (require('../utils/searchOptimization')).SearchCache();
  res.json(cache.getStats());
});
```

Visit: `http://localhost:3000/alumni/api/cache-stats`

## Common Issues

### Issue: Search returns no results

**Solution:**
1. Check if alumni data exists in database
2. Verify fuzzy matching threshold (default: 0.6)
3. Try broader search terms
4. Check filter criteria

### Issue: Slow search performance

**Solution:**
1. Check alumni count in database
2. Enable search cache
3. Consider Elasticsearch for 10,000+ alumni
4. Add database indexes on frequently searched fields

### Issue: Autocomplete suggestions not appearing

**Solution:**
1. Type at least 1 character
2. Check browser console for errors
3. Verify API endpoint is working: `/alumni/api/search-suggestions?q=test`
4. Check network requests in DevTools

### Issue: Typo matching not working

**Solution:**
1. Verify Levenshtein distance calculation
2. Check similarity threshold (default: 60%)
3. Try different typos to test
4. Add console logging to debug

## Production Deployment

### Enable Caching

```javascript
// In routes/alumni.js
const { SearchCache } = require('../utils/searchOptimization');
const cache = new SearchCache(1000, 3600000); // 1 hour TTL

router.post('/search', redirectLogin, (req, res, next) => {
  const cacheKey = generateCacheKey(req.body);
  const cached = cache.get(req.body.keyword, req.body);
  
  if (cached) {
    return res.json(cached);
  }
  
  // ... perform search
  cache.set(req.body.keyword, req.body, results);
});
```

### Monitor Performance

```javascript
// Add metrics endpoint
router.get('/api/metrics', (req, res) => {
  const stats = searchEngine.getStatistics();
  const perf = monitor.getStatistics();
  res.json({ search: stats, performance: perf });
});
```

### Database Optimization

Add indexes for search fields:

```sql
-- Add search indexes
ALTER TABLE users ADD INDEX idx_first_name (first_name);
ALTER TABLE users ADD INDEX idx_last_name (last_name);
ALTER TABLE alumni_profiles ADD INDEX idx_company (company);
ALTER TABLE alumni_profiles ADD INDEX idx_job_title (job_title);
ALTER TABLE alumni_profiles ADD INDEX idx_skills (skills(100));
```

## Next Steps

1. ✓ Run the test suite
2. ✓ Test in browser manually
3. ✓ Check performance metrics
4. ✓ Review search analytics
5. ✓ Deploy to production with caching
6. ✓ Monitor search patterns
7. ✓ Optimize based on real usage data

---

Happy testing! 🧪
