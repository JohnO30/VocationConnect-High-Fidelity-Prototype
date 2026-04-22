/**
 * Search Engine Cache and Performance Monitor
 * Optimizes search performance and tracks metrics
 */

class SearchCache {
  constructor(maxSize = 100, ttl = 3600000) { // 1 hour TTL
    this.cache = new Map();
    this.stats = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl; // Time to live in milliseconds
  }

  /**
   * Generate cache key from search parameters
   * @param {string} keyword - Search keyword
   * @param {object} filters - Filter parameters
   * @returns {string} - Cache key
   */
  generateKey(keyword, filters = {}) {
    const key = JSON.stringify({
      keyword: (keyword || '').toLowerCase().trim(),
      industry: filters.industry || 'all',
      minExp: filters.minExperience || 0,
      maxExp: filters.maxExperience || 100,
      minYear: filters.minGradYear || 1990,
      maxYear: filters.maxGradYear || new Date().getFullYear(),
      avail: filters.availabilityOnly || false
    });
    return Buffer.from(key).toString('base64');
  }

  /**
   * Get cached search results
   * @param {string} keyword - Search keyword
   * @param {object} filters - Filter parameters
   * @returns {object|null} - Cached results or null if expired/not found
   */
  get(keyword, filters) {
    const key = this.generateKey(keyword, filters);
    const cached = this.cache.get(key);

    if (!cached) {
      this.recordMiss(key);
      return null;
    }

    // Check if cache expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.recordMiss(key);
      return null;
    }

    this.recordHit(key);
    return cached.data;
  }

  /**
   * Set cached search results
   * @param {string} keyword - Search keyword
   * @param {object} filters - Filter parameters
   * @param {array} results - Search results
   */
  set(keyword, filters, results) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.delete(firstKey);
    }

    const key = this.generateKey(keyword, filters);
    this.cache.set(key, {
      data: results,
      timestamp: Date.now()
    });
  }

  /**
   * Record cache hit for analytics
   * @param {string} key - Cache key
   */
  recordHit(key) {
    if (!this.stats.has(key)) {
      this.stats.set(key, { hits: 0, misses: 0 });
    }
    const stat = this.stats.get(key);
    stat.hits++;
  }

  /**
   * Record cache miss for analytics
   * @param {string} key - Cache key
   */
  recordMiss(key) {
    if (!this.stats.has(key)) {
      this.stats.set(key, { hits: 0, misses: 0 });
    }
    const stat = this.stats.get(key);
    stat.misses++;
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    let totalHits = 0;
    let totalMisses = 0;
    const topQueries = [];

    for (const [key, stat] of this.stats.entries()) {
      totalHits += stat.hits;
      totalMisses += stat.misses;
      topQueries.push({
        key,
        hits: stat.hits,
        misses: stat.misses,
        hitRate: (stat.hits / (stat.hits + stat.misses) * 100).toFixed(2)
      });
    }

    topQueries.sort((a, b) => b.hits - a.hits);

    return {
      totalSearches: totalHits + totalMisses,
      cacheHits: totalHits,
      cacheMisses: totalMisses,
      hitRate: (totalHits / (totalHits + totalMisses) * 100).toFixed(2),
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      topQueries: topQueries.slice(0, 10)
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.stats.clear();
  }
}

/**
 * Search Performance Monitor
 * Tracks execution times and performance metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 1000;
  }

  /**
   * Start timing a search operation
   * @returns {object} - Timer handle
   */
  startTimer() {
    return {
      startTime: performance.now()
    };
  }

  /**
   * End timing and record metric
   * @param {object} timer - Timer handle from startTimer()
   * @param {string} operation - Operation name
   * @param {object} metadata - Additional metadata
   */
  recordMetric(timer, operation, metadata = {}) {
    const duration = performance.now() - timer.startTime;
    
    const metric = {
      timestamp: new Date(),
      operation,
      duration: parseFloat(duration.toFixed(2)),
      ...metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    return duration;
  }

  /**
   * Get performance statistics
   * @param {string} operation - Filter by operation (optional)
   * @returns {object} - Performance statistics
   */
  getStatistics(operation = null) {
    const filtered = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filtered.length === 0) {
      return { count: 0, message: 'No metrics recorded' };
    }

    const durations = filtered.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const median = this.calculateMedian(durations);

    return {
      operation: operation || 'all',
      count: filtered.length,
      avgTime: parseFloat(avg.toFixed(2)),
      minTime: parseFloat(min.toFixed(2)),
      maxTime: parseFloat(max.toFixed(2)),
      medianTime: parseFloat(median.toFixed(2)),
      unit: 'milliseconds'
    };
  }

  /**
   * Calculate median value
   * @param {array} values - Array of values
   * @returns {number} - Median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Get all recorded metrics
   * @returns {array} - All metrics
   */
  getAllMetrics() {
    return this.metrics;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Get performance report
   * @returns {string} - Human-readable report
   */
  getReport() {
    const operations = new Set(this.metrics.map(m => m.operation));
    let report = 'Performance Report\n' + '='.repeat(50) + '\n';

    for (const op of operations) {
      const stats = this.getStatistics(op);
      report += `\n${op}:\n`;
      report += `  Total: ${stats.count} operations\n`;
      report += `  Average: ${stats.avgTime}ms\n`;
      report += `  Min: ${stats.minTime}ms\n`;
      report += `  Max: ${stats.maxTime}ms\n`;
      report += `  Median: ${stats.medianTime}ms\n`;
    }

    return report;
  }
}

/**
 * Query Optimizer
 * Suggests optimizations for search queries
 */
class QueryOptimizer {
  /**
   * Analyze search query for optimization suggestions
   * @param {string} keyword - Search keyword
   * @param {object} filters - Applied filters
   * @param {number} resultCount - Number of results
   * @returns {object} - Optimization suggestions
   */
  static analyzeQuery(keyword, filters, resultCount) {
    const suggestions = [];

    // Check keyword length
    if (!keyword || keyword.trim().length === 0) {
      suggestions.push({
        type: 'warning',
        message: 'Empty keyword - consider adding search terms for better results'
      });
    } else if (keyword.length < 3) {
      suggestions.push({
        type: 'info',
        message: 'Short keyword - more specific terms might improve results'
      });
    }

    // Check result count
    if (resultCount === 0) {
      suggestions.push({
        type: 'suggestion',
        message: 'No results found - try fewer filters or broader terms'
      });
    } else if (resultCount > 1000) {
      suggestions.push({
        type: 'suggestion',
        message: 'Large result set - consider more specific keywords or filters'
      });
    }

    // Check filters
    const activeFilters = Object.entries(filters).filter(([key, val]) => {
      if (key === 'minExperience' && val === 0) return false;
      if (key === 'maxExperience' && val === 100) return false;
      if (key === 'availabilityOnly' && val === false) return false;
      if (!val) return false;
      return true;
    }).length;

    if (activeFilters > 3) {
      suggestions.push({
        type: 'info',
        message: 'Many filters applied - results may be limited'
      });
    }

    return {
      timestamp: new Date(),
      query: keyword,
      filters: Object.keys(filters).length,
      resultCount,
      suggestions
    };
  }

  /**
   * Get optimization tips based on query
   * @param {string} keyword - Search keyword
   * @returns {array} - Tips for better search
   */
  static getOptimizationTips(keyword) {
    const tips = [
      'Use specific job titles: "Senior Software Engineer" vs "engineer"',
      'Try company names: "Google", "Microsoft", "IBM"',
      'Search for skills: "Python", "React", "Machine Learning"',
      'Use industry filters for better results',
      'Combine with graduation year for recent graduates',
      'Check "Available for Interviews" for mentors'
    ];

    return tips;
  }
}

module.exports = {
  SearchCache,
  PerformanceMonitor,
  QueryOptimizer
};
