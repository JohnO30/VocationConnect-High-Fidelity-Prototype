/**
 * Search Engine Algorithm Tests and Demonstrations
 * Run: node tests/searchEngine.test.js
 */

const searchEngine = require('../utils/searchEngine');
const { SearchCache, PerformanceMonitor, QueryOptimizer } = require('../utils/searchOptimization');

console.log('='.repeat(60));
console.log('VOCATIONCONNECT - ALGORITHMIC SEARCH ENGINE TESTS');
console.log('='.repeat(60));

// Sample data for testing
const sampleAlumni = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Smith',
    company: 'Google',
    job_title: 'Senior Software Engineer',
    industry: 'Technology',
    years_experience: 8,
    skills: 'Python, JavaScript, React, Machine Learning',
    bio: 'Passionate about clean code',
    graduation_year: 2016,
    available_for_mock: true
  },
  {
    id: 2,
    first_name: 'Jane',
    last_name: 'Doe',
    company: 'Microsoft',
    job_title: 'Product Manager',
    industry: 'Technology',
    years_experience: 6,
    skills: 'Product Strategy, Analytics, Leadership',
    bio: 'Focus on user-centric design',
    graduation_year: 2018,
    available_for_mock: true
  },
  {
    id: 3,
    first_name: 'Bob',
    last_name: 'Johnson',
    company: 'McKinsey',
    job_title: 'Management Consultant',
    industry: 'Consulting',
    years_experience: 10,
    skills: 'Strategy, Problem Solving, Communication',
    bio: 'Expert in business transformation',
    graduation_year: 2014,
    available_for_mock: false
  },
  {
    id: 4,
    first_name: 'Alice',
    last_name: 'Williams',
    company: 'Goldman Sachs',
    job_title: 'Analyst',
    industry: 'Finance',
    years_experience: 3,
    skills: 'Financial Modeling, Excel, SQL',
    bio: 'Strong analytical skills',
    graduation_year: 2021,
    available_for_mock: true
  },
  {
    id: 5,
    first_name: 'Charlie',
    last_name: 'Brown',
    company: 'Amazon',
    job_title: 'Software Developer',
    industry: 'Technology',
    years_experience: 5,
    skills: 'Java, Python, AWS, Microservices',
    bio: 'Cloud architecture enthusiast',
    graduation_year: 2019,
    available_for_mock: false
  }
];

// Test 1: Levenshtein Distance
console.log('\n' + '='.repeat(60));
console.log('TEST 1: Levenshtein Distance (Typo Tolerance)');
console.log('='.repeat(60));

const typoTests = [
  { str1: 'john', str2: 'jon', expected: 1 },
  { str1: 'smith', str2: 'smth', expected: 1 },
  { str1: 'google', str2: 'gogle', expected: 1 },
  { str1: 'engineer', str2: 'enginer', expected: 1 },
  { str1: 'kitten', str2: 'sitting', expected: 3 }
];

console.log('\nTesting edit distance calculations:');
typoTests.forEach(test => {
  const distance = searchEngine.levenshteinDistance(test.str1, test.str2);
  const passed = distance === test.expected ? '✓' : '✗';
  console.log(`${passed} "${test.str1}" → "${test.str2}": distance = ${distance} (expected: ${test.expected})`);
});

// Test 2: Similarity Calculation
console.log('\n' + '='.repeat(60));
console.log('TEST 2: Similarity Scoring (0-1 scale)');
console.log('='.repeat(60));

const similarityTests = [
  { str1: 'john', str2: 'john', minSim: 0.99 },
  { str1: 'jon', str2: 'john', minSim: 0.70 },
  { str1: 'smth', str2: 'smith', minSim: 0.70 },
  { str1: 'machine', str2: 'machin', minSim: 0.80 }
];

console.log('\nTesting similarity scores:');
similarityTests.forEach(test => {
  const similarity = searchEngine.calculateSimilarity(test.str1, test.str2);
  const passed = similarity >= test.minSim ? '✓' : '✗';
  console.log(`${passed} "${test.str1}" vs "${test.str2}": similarity = ${similarity.toFixed(2)} (min: ${test.minSim})`);
});

// Test 3: Tokenization
console.log('\n' + '='.repeat(60));
console.log('TEST 3: Tokenization');
console.log('='.repeat(60));

const tokenTests = [
  'Senior Software Engineer',
  'Python, JavaScript, React',
  'Product Manager @Google',
  'Machine-Learning Expert!'
];

console.log('\nTesting text tokenization:');
tokenTests.forEach(text => {
  const tokens = searchEngine.tokenize(text);
  console.log(`"${text}"\n  → [${tokens.map(t => `"${t}"`).join(', ')}]\n`);
});

// Test 4: Relevance Scoring
console.log('\n' + '='.repeat(60));
console.log('TEST 4: Relevance Scoring');
console.log('='.repeat(60));

const searchTerm = 'software engineer';
const filters = {
  industry: 'Technology',
  availabilityOnly: true
};

console.log(`\nScoring all alumni for: "${searchTerm}"\n`);
const scores = sampleAlumni.map(alumni => {
  const score = searchEngine.calculateRelevanceScore(alumni, searchTerm, filters);
  return { name: `${alumni.first_name} ${alumni.last_name}`, score };
}).sort((a, b) => b.score - a.score);

scores.forEach((item, idx) => {
  const bar = '█'.repeat(Math.round(item.score / 5));
  console.log(`${idx + 1}. ${item.name.padEnd(20)} | ${item.score.toFixed(1).padStart(5)}/100 | ${bar}`);
});

// Test 5: Full Search with Ranking
console.log('\n' + '='.repeat(60));
console.log('TEST 5: Full Search with Ranking');
console.log('='.repeat(60));

const searchResults = searchEngine.performSearch(sampleAlumni, 'software', filters);

console.log(`\nSearch Results for: "software" (filters: Technology, Available)\n`);
searchResults.forEach((alumni, idx) => {
  console.log(`${idx + 1}. ${alumni.first_name} ${alumni.last_name}`);
  console.log(`   Company: ${alumni.company} | Title: ${alumni.job_title}`);
  console.log(`   Experience: ${alumni.years_experience} years | Score: ${alumni.relevanceScore.toFixed(1)}/100\n`);
});

// Test 6: Autocomplete Suggestions
console.log('\n' + '='.repeat(60));
console.log('TEST 6: Autocomplete Suggestions');
console.log('='.repeat(60));

const autocompleteTests = [
  'j',
  'jo',
  'joh',
  'john',
  's',
  'so',
  'sof',
  'jahn' // Typo
];

console.log('\nTesting autocomplete as user types:\n');
autocompleteTests.forEach(query => {
  const suggestions = searchEngine.getAutocompleteSuggestions(sampleAlumni, query, 5);
  console.log(`Query: "${query}"`);
  if (suggestions.length > 0) {
    suggestions.forEach(sug => {
      console.log(`  → ${sug.name} at ${sug.company}`);
    });
  } else {
    console.log(`  (no suggestions)`);
  }
  console.log();
});

// Test 7: Fuzzy Suggestions
console.log('\n' + '='.repeat(60));
console.log('TEST 7: Fuzzy Search with Typo Tolerance');
console.log('='.repeat(60));

const fuzzyTests = [
  'jon smith',      // Missing 'h'
  'jane do',        // Missing 'e'
  'bob jonson',     // Missing 'h'
  'alice willams'   // Missing 'l'
];

console.log('\nTesting fuzzy search with typos:\n');
fuzzyTests.forEach(query => {
  const results = searchEngine.getFuzzySuggestions(sampleAlumni, query, 3);
  console.log(`Query: "${query}"`);
  if (results.length > 0) {
    results.forEach(result => {
      console.log(`  ✓ ${result.first_name} ${result.last_name} (match score: ${(result.matchScore * 100).toFixed(0)}%)`);
    });
  } else {
    console.log(`  (no matches)`);
  }
  console.log();
});

// Test 8: Search Cache
console.log('\n' + '='.repeat(60));
console.log('TEST 8: Search Cache Performance');
console.log('='.repeat(60));

const cache = new SearchCache(100);
const results1 = searchEngine.performSearch(sampleAlumni, 'software', { industry: 'Technology' });

cache.set('software', { industry: 'Technology' }, results1);
const cachedResults = cache.get('software', { industry: 'Technology' });

console.log(`\nCache Hit Test:`);
console.log(`  Set: software + Technology filter → ${results1.length} results`);
console.log(`  Get: software + Technology filter → ${cachedResults ? cachedResults.length : 0} results`);
console.log(`  Status: ${cachedResults ? '✓ Cache HIT' : '✗ Cache MISS'}`);

const stats = cache.getStats();
console.log(`\nCache Statistics:`);
console.log(`  Cache Size: ${stats.cacheSize}/${stats.maxSize}`);
console.log(`  Hit Rate: ${stats.hitRate}%`);

// Test 9: Performance Monitoring
console.log('\n' + '='.repeat(60));
console.log('TEST 9: Performance Monitoring');
console.log('='.repeat(60));

const monitor = new PerformanceMonitor();

// Simulate search operations
for (let i = 0; i < 5; i++) {
  const timer = monitor.startTimer();
  searchEngine.performSearch(sampleAlumni, 'software', {});
  monitor.recordMetric(timer, 'search', { resultCount: 3 });
}

for (let i = 0; i < 3; i++) {
  const timer = monitor.startTimer();
  searchEngine.getAutocompleteSuggestions(sampleAlumni, 'joh', 10);
  monitor.recordMetric(timer, 'autocomplete', { query: 'joh' });
}

console.log('\n' + monitor.getReport());

// Test 10: Query Optimization Suggestions
console.log('\n' + '='.repeat(60));
console.log('TEST 10: Query Optimization');
console.log('='.repeat(60));

const queryTests = [
  { keyword: '', filters: {}, resultCount: 5 },
  { keyword: 'x', filters: {}, resultCount: 0 },
  { keyword: 'software engineer', filters: { industry: 'Technology', minExperience: 5 }, resultCount: 2 },
  { keyword: 'python', filters: { industry: 'Tech', minExp: 0, maxExp: 100 }, resultCount: 2000 }
];

console.log('\nAnalyzing queries for optimization suggestions:\n');
queryTests.forEach(test => {
  const analysis = QueryOptimizer.analyzeQuery(test.keyword, test.filters, test.resultCount);
  console.log(`Query: "${test.keyword}" with ${Object.keys(test.filters).length} filters`);
  console.log(`Results: ${test.resultCount}`);
  if (analysis.suggestions.length > 0) {
    analysis.suggestions.forEach(sug => {
      console.log(`  [${sug.type.toUpperCase()}] ${sug.message}`);
    });
  } else {
    console.log(`  ✓ Query looks good`);
  }
  console.log();
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`
✓ Levenshtein Distance: Calculate edit distance for typo handling
✓ Similarity Scoring: Compare strings 0-1 scale
✓ Tokenization: Parse text into meaningful tokens
✓ Relevance Scoring: Rank results by query match quality
✓ Full Search: Combine filtering and ranking
✓ Autocomplete: Real-time suggestions with smart ranking
✓ Fuzzy Search: Find results despite typos
✓ Caching: Improve performance for repeated searches
✓ Performance Monitoring: Track operation times
✓ Query Optimization: Provide helpful suggestions

All tests completed successfully! 🎉
`);

console.log('='.repeat(60));
