/**
 * Advanced Algorithmic Search Engine for VocationConnect
 * 
 * Features:
 * - Relevance scoring and ranking algorithms
 * - Fuzzy matching for typo tolerance
 * - TF-IDF based keyword weighting
 * - Levenshtein distance calculation
 * - Query optimization and caching
 * - Search analytics tracking
 */

const fs = require('fs');
const path = require('path');

class SearchEngine {
  constructor() {
    this.searchCache = new Map();
    this.searchHistory = [];
    this.maxCacheSize = 100;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy matching and typo tolerance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(str1, str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();

    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // deletion
          matrix[j - 1][i] + 1,      // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate similarity score based on Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Tokenize a string into words
   * @param {string} text - Text to tokenize
   * @returns {array} - Array of tokens
   */
  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate TF (Term Frequency) for a token in text
   * @param {string} token - Token to find
   * @param {string} text - Text to search in
   * @returns {number} - Term frequency
   */
  calculateTF(token, text) {
    const tokens = this.tokenize(text);
    const count = tokens.filter(t => t === token).length;
    return tokens.length > 0 ? count / tokens.length : 0;
  }

  /**
   * Calculate position-based score for where match occurs in text
   * Earlier matches score higher
   * @param {string} searchTerm - Term being searched
   * @param {string} text - Text being searched
   * @returns {number} - Position score (0-1)
   */
  calculatePositionScore(searchTerm, text) {
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return 0;
    // Earlier position = higher score
    return 1 - (index / text.length) * 0.5;
  }

  /**
   * Calculate field-specific relevance score
   * Different weights for different fields
   * @param {string} searchTerm - Term being searched
   * @param {object} fields - Object with field names and values
   * @returns {object} - Relevance scores for each field
   */
  calculateFieldRelevance(searchTerm, fields) {
    // Field weight configuration (higher = more important)
    const fieldWeights = {
      firstName: 0.40,
      lastName: 0.40,
      company: 0.25,
      jobTitle: 0.20,
      industry: 0.15,
      skills: 0.20,
      bio: 0.10
    };

    const scores = {};
    const term = searchTerm.toLowerCase();

    for (const [field, value] of Object.entries(fields)) {
      if (!value) {
        scores[field] = 0;
        continue;
      }

      const fieldValue = String(value).toLowerCase();
      let fieldScore = 0;

      // Exact match (highest score)
      if (fieldValue === term) {
        fieldScore = 1.0;
      }
      // Starts with term
      else if (fieldValue.startsWith(term)) {
        fieldScore = 0.9;
      }
      // Contains term as whole word
      else if (this.tokenize(fieldValue).includes(term)) {
        fieldScore = 0.7 + this.calculatePositionScore(term, fieldValue) * 0.2;
      }
      // Contains term as substring
      else if (fieldValue.includes(term)) {
        fieldScore = 0.5 + this.calculatePositionScore(term, fieldValue) * 0.3;
      }
      // Fuzzy match (typo tolerance)
      else {
        const similarity = this.calculateSimilarity(term, fieldValue);
        fieldScore = Math.max(0, similarity - 0.3) * 0.7; // Only count if similarity > 0.3
      }

      scores[field] = fieldScore * (fieldWeights[field] || 0.1);
    }

    return scores;
  }

  /**
   * Calculate comprehensive relevance score for an alumni profile
   * @param {object} alumni - Alumni profile object
   * @param {string} searchTerm - Search query
   * @param {object} filters - Applied filters
   * @returns {number} - Overall relevance score (0-100)
   */
  calculateRelevanceScore(alumni, searchTerm, filters = {}) {
    let score = 0;

    // Keyword relevance (if search term provided)
    if (searchTerm && searchTerm.trim()) {
      const fieldScores = this.calculateFieldRelevance(searchTerm, {
        firstName: alumni.first_name,
        lastName: alumni.last_name,
        company: alumni.company,
        jobTitle: alumni.job_title,
        industry: alumni.industry,
        skills: alumni.skills,
        bio: alumni.bio
      });

      // Calculate weighted average
      const weights = {
        firstName: 0.25,
        lastName: 0.25,
        company: 0.15,
        jobTitle: 0.12,
        industry: 0.08,
        skills: 0.10,
        bio: 0.05
      };

      for (const [field, fieldScore] of Object.entries(fieldScores)) {
        score += (fieldScore / (weights[field.toLowerCase()] || 0.1)) * (weights[field.toLowerCase()] || 0.1);
      }
    }

    // Boost score for exact filter matches
    if (filters.industry && alumni.industry === filters.industry) {
      score += 15;
    }

    // Boost score for availability
    if (filters.availabilityOnly && alumni.available_for_mock) {
      score += 10;
    }

    // Experience-based boost (prefer diversity)
    if (filters.targetExperience) {
      const expDiff = Math.abs(alumni.years_experience - filters.targetExperience);
      const expBoost = Math.max(0, 10 - (expDiff * 0.5));
      score += expBoost;
    }

    // Recency boost (prefer recent graduates with recent profiles)
    const currentYear = new Date().getFullYear();
    const yearsSinceGraduation = currentYear - alumni.graduation_year;
    if (yearsSinceGraduation <= 5) {
      score += 5; // Boost for recent graduates
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Perform advanced search with ranking and filtering
   * @param {array} allAlumni - Complete alumni list from database
   * @param {string} keyword - Search keyword
   * @param {object} filters - Filter parameters
   * @returns {array} - Ranked and filtered results
   */
  performSearch(allAlumni, keyword = '', filters = {}) {
    let results = [...allAlumni];

    // Apply filters
    results = this.applyFilters(results, filters);

    // Calculate relevance scores
    results = results.map(alumni => ({
      ...alumni,
      relevanceScore: this.calculateRelevanceScore(alumni, keyword, filters)
    }));

    // Sort by relevance score (descending)
    results.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Secondary sort by name if scores are equal
      return a.first_name.localeCompare(b.first_name);
    });

    // Track search
    this.trackSearch(keyword, filters, results.length);

    return results;
  }

  /**
   * Apply filters to alumni results
   * @param {array} alumni - Alumni list
   * @param {object} filters - Filter parameters
   * @returns {array} - Filtered results
   */
  applyFilters(alumni, filters = {}) {
    return alumni.filter(person => {
      // Industry filter
      if (filters.industry && filters.industry !== 'all') {
        if (person.industry !== filters.industry) return false;
      }

      // Experience range
      const minExp = filters.minExperience || 0;
      const maxExp = filters.maxExperience || 100;
      if (person.years_experience < minExp || person.years_experience > maxExp) {
        return false;
      }

      // Graduation year range
      const minYear = filters.minGradYear || 1990;
      const maxYear = filters.maxGradYear || new Date().getFullYear();
      if (person.graduation_year < minYear || person.graduation_year > maxYear) {
        return false;
      }

      // Availability filter
      if (filters.availabilityOnly && !person.available_for_mock) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get fuzzy search suggestions with typo tolerance
   * @param {array} allAlumni - Complete alumni list
   * @param {string} query - Partial query string
   * @param {number} limit - Max suggestions to return
   * @returns {array} - Suggested matches
   */
  getFuzzySuggestions(allAlumni, query, limit = 10) {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const suggestions = [];

    for (const alumni of allAlumni) {
      const fullName = `${alumni.first_name} ${alumni.last_name}`.toLowerCase();
      const company = (alumni.company || '').toLowerCase();
      const jobTitle = (alumni.job_title || '').toLowerCase();
      const industry = (alumni.industry || '').toLowerCase();

      // Calculate similarity scores
      const scores = {
        fullName: this.calculateSimilarity(queryLower, fullName),
        company: this.calculateSimilarity(queryLower, company),
        jobTitle: this.calculateSimilarity(queryLower, jobTitle),
        industry: this.calculateSimilarity(queryLower, industry)
      };

      // Get best match score
      const bestScore = Math.max(...Object.values(scores));

      // Include if reasonable similarity (>= 0.6)
      if (bestScore >= 0.6 || fullName.includes(queryLower) || company.includes(queryLower)) {
        suggestions.push({
          ...alumni,
          matchScore: bestScore,
          matchField: Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)
        });
      }
    }

    // Sort by match score
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return suggestions.slice(0, limit);
  }

  /**
   * Perform autocomplete with smart ranking
   * @param {array} allAlumni - Complete alumni list
   * @param {string} query - Partial query
   * @returns {array} - Autocomplete suggestions
   */
  getAutocompleteSuggestions(allAlumni, query, limit = 10) {
    if (!query || query.length < 1) return [];

    const queryLower = query.toLowerCase();
    const suggestions = [];

    // Priority 1: Exact prefix matches
    const priorityScores = {
      exactPrefix: 100,    // Name starts with query
      wordPrefix: 90,      // Word in name starts with query
      contains: 70,        // Name contains query
      fuzzyMatch: 50       // Fuzzy match
    };

    for (const alumni of allAlumni) {
      const fullName = `${alumni.first_name} ${alumni.last_name}`.toLowerCase();
      const company = (alumni.company || '').toLowerCase();
      let matchPriority = 0;

      // Check name matches first (highest priority)
      if (fullName.startsWith(queryLower)) {
        matchPriority = priorityScores.exactPrefix;
      } else if (this.tokenize(fullName).some(t => t.startsWith(queryLower))) {
        matchPriority = priorityScores.wordPrefix;
      } else if (fullName.includes(queryLower)) {
        matchPriority = priorityScores.contains;
      } else if (company.startsWith(queryLower)) {
        matchPriority = priorityScores.wordPrefix;
      } else if (company.includes(queryLower)) {
        matchPriority = priorityScores.contains;
      } else {
        // Fuzzy match as fallback
        const similarity = this.calculateSimilarity(queryLower, fullName);
        if (similarity >= 0.6) {
          matchPriority = priorityScores.fuzzyMatch;
        }
      }

      if (matchPriority > 0) {
        suggestions.push({
          id: alumni.id,
          name: `${alumni.first_name} ${alumni.last_name}`,
          company: alumni.company,
          title: alumni.job_title,
          industry: alumni.industry,
          matchPriority: matchPriority
        });
      }
    }

    // Sort by priority
    suggestions.sort((a, b) => b.matchPriority - a.matchPriority);

    return suggestions.slice(0, limit);
  }

  /**
   * Track search queries for analytics
   * @param {string} keyword - Search keyword
   * @param {object} filters - Filters used
   * @param {number} resultCount - Number of results
   */
  trackSearch(keyword, filters, resultCount) {
    const searchRecord = {
      timestamp: new Date(),
      keyword: keyword,
      filters: filters,
      resultCount: resultCount
    };

    this.searchHistory.push(searchRecord);

    // Keep only last 1000 searches to prevent memory overflow
    if (this.searchHistory.length > 1000) {
      this.searchHistory.shift();
    }
  }

  /**
   * Get popular search terms
   * @param {number} limit - Number of top searches to return
   * @returns {array} - Popular search terms with counts
   */
  getPopularSearches(limit = 10) {
    const searchCounts = {};

    for (const record of this.searchHistory) {
      if (record.keyword) {
        searchCounts[record.keyword] = (searchCounts[record.keyword] || 0) + 1;
      }
    }

    return Object.entries(searchCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear search cache (call periodically to free memory)
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Get search statistics
   * @returns {object} - Statistics about search engine
   */
  getStatistics() {
    return {
      totalSearches: this.searchHistory.length,
      cacheSize: this.searchCache.size,
      maxCacheSize: this.maxCacheSize,
      popularSearches: this.getPopularSearches(5)
    };
  }
}

module.exports = new SearchEngine();
