/**
 * Survey Service - Career Assessment & Opportunity Generation
 * Manages survey questions, responses, and generates personalized opportunity reports
 */

class SurveyService {
  /**
   * Get all survey questions organized by category
   * @returns {object} - Survey questions grouped by category
   */
  static getSurveyQuestions() {
    return {
      career_interest: [
        {
          id: 1,
          question_number: 1,
          category: 'career_interest',
          question_text: 'What industries interest you most?',
          question_type: 'checkbox',
          options: ['Technology', 'Finance', 'Healthcare', 'Consulting', 'Marketing', 'Education', 'Legal', 'Government', 'Retail', 'Other'],
          required: true,
          display_order: 1
        },
        {
          id: 2,
          question_number: 2,
          category: 'career_interest',
          question_text: 'What type of work environment do you prefer?',
          question_type: 'multiple_choice',
          options: ['Startup - Fast-paced, innovative', 'Large Company - Structured, established', 'Non-profit - Mission-driven', 'Remote/Flexible - Work from anywhere'],
          required: true,
          display_order: 2
        },
        {
          id: 3,
          question_number: 3,
          category: 'career_interest',
          question_text: 'What are your top career goals?',
          question_type: 'checkbox',
          options: ['Leadership/Management', 'Technical Expertise', 'Entrepreneurship', 'Work-Life Balance', 'High Salary', 'Social Impact', 'Continuous Learning'],
          required: true,
          display_order: 3
        }
      ],
      skills: [
        {
          id: 4,
          question_number: 4,
          category: 'skills',
          question_text: 'Rate your technical skills:',
          question_type: 'rating',
          options: ['Programming', 'Data Analysis', 'Project Management', 'Communication', 'Problem Solving'],
          required: true,
          display_order: 4
        },
        {
          id: 5,
          question_number: 5,
          category: 'skills',
          question_text: 'Which programming languages are you proficient in?',
          question_type: 'checkbox',
          options: ['Python', 'Java', 'JavaScript', 'C++', 'C#', 'Go', 'Ruby', 'PHP', 'SQL', 'None'],
          required: false,
          display_order: 5
        },
        {
          id: 6,
          question_number: 6,
          category: 'skills',
          question_text: 'What soft skills do you want to develop?',
          question_type: 'checkbox',
          options: ['Public Speaking', 'Leadership', 'Negotiation', 'Teamwork', 'Presentation', 'Networking', 'Decision Making'],
          required: true,
          display_order: 6
        }
      ],
      experience: [
        {
          id: 7,
          question_number: 7,
          category: 'experience',
          question_text: 'Years of professional/internship experience:',
          question_type: 'multiple_choice',
          options: ['None', 'Less than 6 months', '6 months - 1 year', '1-2 years', '2+ years'],
          required: true,
          display_order: 7
        },
        {
          id: 8,
          question_number: 8,
          category: 'experience',
          question_text: 'What experience level mentors are you looking for?',
          question_type: 'multiple_choice',
          options: ['Entry-level (0-2 years)', 'Mid-level (3-7 years)', 'Senior (8-15 years)', 'Executive (15+ years)', 'Any level'],
          required: true,
          display_order: 8
        },
        {
          id: 9,
          question_number: 9,
          category: 'experience',
          question_text: 'Describe your most relevant work experience:',
          question_type: 'text',
          options: null,
          required: false,
          display_order: 9
        }
      ],
      goals: [
        {
          id: 10,
          question_number: 10,
          category: 'goals',
          question_text: 'What is your immediate career goal? (6-12 months)',
          question_type: 'multiple_choice',
          options: ['Get first job/internship', 'Change industries', 'Advance in current role', 'Learn new skills', 'Start a business', 'Unclear/Exploring'],
          required: true,
          display_order: 10
        },
        {
          id: 11,
          question_number: 11,
          category: 'goals',
          question_text: 'What would help you most right now?',
          question_type: 'checkbox',
          options: ['Interview preparation', 'Resume review', 'Technical skill training', 'Career guidance', 'Networking connections', 'Project portfolio help'],
          required: true,
          display_order: 11
        },
        {
          id: 12,
          question_number: 12,
          category: 'goals',
          question_text: 'How important is mentorship to your career?',
          question_type: 'rating',
          options: null,
          required: true,
          display_order: 12
        }
      ],
      interview: [
        {
          id: 13,
          question_number: 13,
          category: 'interview',
          question_text: 'Are you interested in mock interview practice?',
          question_type: 'multiple_choice',
          options: ['Very interested', 'Somewhat interested', 'Not interested'],
          required: true,
          display_order: 13
        },
        {
          id: 14,
          question_number: 14,
          category: 'interview',
          question_text: 'What types of interviews do you want to practice?',
          question_type: 'checkbox',
          options: ['Behavioral interviews', 'Technical interviews', 'Case interviews', 'Product management interviews', 'General career advice'],
          required: false,
          display_order: 14
        }
      ]
    };
  }

  /**
   * Analyze survey responses and generate opportunity recommendations
   * @param {object} responses - User's survey responses
   * @param {array} alumni - Available alumni in system
   * @returns {object} - Opportunity report with recommendations
   */
  static generateOpportunities(responses, alumni) {
    const report = {
      totalScore: 0,
      careerReadiness: 0,
      topIndustries: [],
      topRoles: [],
      skillGaps: [],
      recommendedMentors: [],
      interviewOpportunities: 0,
      careerRecommendations: {},
      summary: ''
    };

    // Step 1: Analyze industry interests
    report.topIndustries = this.analyzeIndustryInterests(responses);

    // Step 2: Analyze skills and identify gaps
    const skillAnalysis = this.analyzeSkillsAndGaps(responses);
    report.skillGaps = skillAnalysis.gaps;
    report.skillScore = skillAnalysis.score;

    // Step 3: Determine suitable roles
    report.topRoles = this.determineSuitableRoles(responses, report.topIndustries);

    // Step 4: Match with alumni
    report.recommendedMentors = this.matchWithAlumni(responses, alumni, report.topIndustries, report.topRoles);
    report.interviewOpportunities = report.recommendedMentors.filter(m => m.available_for_mock).length;

    // Step 5: Generate career recommendations
    report.careerRecommendations = this.generateCareerRecommendations(responses, report);

    // Step 6: Calculate overall score
    report.totalScore = this.calculateOverallScore(responses, report);
    report.careerReadiness = report.totalScore;

    // Step 7: Generate summary text
    report.summary = this.generateSummary(report, responses);

    return report;
  }

  /**
   * Analyze industry interests from survey responses
   * @param {object} responses - Survey responses
   * @returns {array} - Top industries ranked
   */
  static analyzeIndustryInterests(responses) {
    const industriesResponse = responses['q1']; // Question 1 - industries checkbox
    if (!industriesResponse) return [];

    const industries = Array.isArray(industriesResponse) ? industriesResponse : [industriesResponse];

    return industries.map((industry, index) => ({
      name: industry,
      priority: industries.length - index,
      matchScore: 100 - (index * 15)
    })).sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Analyze skills and identify gaps
   * @param {object} responses - Survey responses
   * @returns {object} - Skill gaps and score
   */
  static analyzeSkillsAndGaps(responses) {
    const skills = {
      technical: responses['q5'] || [], // Programming languages
      soft: responses['q6'] || [], // Soft skills
      tools: ['Excel', 'Git', 'SQL', 'APIs', 'Cloud Services']
    };

    const gaps = [];
    const commonSkills = [
      'Python', 'Java', 'JavaScript', 'SQL', 'Git',
      'Communication', 'Leadership', 'Problem Solving',
      'Project Management', 'Data Analysis'
    ];

    for (const skill of commonSkills) {
      const hasSkill = skills.technical.includes(skill) || skills.soft.includes(skill);
      if (!hasSkill) {
        gaps.push({
          skill: skill,
          proficiency: this.determineProficiencyLevel(skill),
          importance: this.calculateSkillImportance(skill),
          learningResources: this.getSkillResources(skill)
        });
      }
    }

    const skillScore = Math.max(0, 100 - (gaps.length * 10));

    return {
      gaps: gaps.sort((a, b) => b.importance - a.importance),
      score: skillScore
    };
  }

  /**
   * Determine proficiency level needed
   * @param {string} skill - Skill name
   * @returns {string} - Proficiency level
   */
  static determineProficiencyLevel(skill) {
    const technicalSkills = ['Python', 'Java', 'JavaScript', 'SQL', 'Git'];
    if (technicalSkills.includes(skill)) return 'intermediate';
    return 'beginner';
  }

  /**
   * Calculate skill importance
   * @param {string} skill - Skill name
   * @returns {number} - Importance 1-10
   */
  static calculateSkillImportance(skill) {
    const importanceMap = {
      'Communication': 10,
      'Python': 9,
      'SQL': 8,
      'Git': 7,
      'JavaScript': 8,
      'Leadership': 8,
      'Project Management': 7,
      'Problem Solving': 9,
      'Excel': 6,
      'Data Analysis': 8
    };

    return importanceMap[skill] || 5;
  }

  /**
   * Get learning resources for skill
   * @param {string} skill - Skill name
   * @returns {array} - Resource recommendations
   */
  static getSkillResources(skill) {
    return [
      { type: 'online_course', name: `Learn ${skill}`, platform: 'Coursera' },
      { type: 'practice', name: `${skill} Projects`, platform: 'GitHub' },
      { type: 'mentor', name: `Find ${skill} mentor`, platform: 'VocationConnect' }
    ];
  }

  /**
   * Determine suitable job roles based on interests and skills
   * @param {object} responses - Survey responses
   * @param {array} industries - Top industries
   * @returns {array} - Recommended job roles
   */
  static determineSuitableRoles(responses, industries) {
    const rolesByIndustry = {
      'Technology': ['Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'UX Designer'],
      'Finance': ['Financial Analyst', 'Risk Manager', 'Investment Banker', 'Trader', 'Auditor'],
      'Healthcare': ['Healthcare Administrator', 'Data Analyst', 'Project Manager', 'Medical Coder', 'Consultant'],
      'Consulting': ['Management Consultant', 'Business Analyst', 'Strategy Consultant', 'Implementation Specialist'],
      'Marketing': ['Marketing Manager', 'Data Analyst', 'Content Strategist', 'Brand Manager', 'Digital Marketer'],
      'Education': ['Educator', 'Curriculum Designer', 'Education Administrator', 'Learning Specialist'],
      'Legal': ['Lawyer', 'Paralegal', 'Legal Analyst', 'Compliance Officer'],
      'Government': ['Policy Analyst', 'Program Manager', 'Administrator', 'Data Analyst'],
      'Retail': ['Store Manager', 'Buyer', 'Marketing Manager', 'Operations Manager'],
      'Other': ['Business Analyst', 'Project Manager', 'Consultant']
    };

    const roles = [];
    for (const industry of industries.slice(0, 3)) {
      const industryRoles = rolesByIndustry[industry.name] || [];
      roles.push(...industryRoles.map(role => ({
        title: role,
        industry: industry.name,
        matchScore: industry.matchScore - 10
      })));
    }

    return roles.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  /**
   * Match user with suitable alumni mentors
   * @param {object} responses - Survey responses
   * @param {array} alumni - Available alumni
   * @param {array} topIndustries - User's top industries
   * @param {array} topRoles - Recommended roles
   * @returns {array} - Matched alumni sorted by match score
   */
  static matchWithAlumni(responses, alumni, topIndustries, topRoles) {
    if (!alumni || alumni.length === 0) return [];

    const industryNames = topIndustries.map(ind => ind.name);
    const roleKeywords = topRoles.map(role => role.title.toLowerCase());

    return alumni.map(alumnus => {
      let matchScore = 0;

      // Industry match
      if (alumnus.industry && industryNames.includes(alumnus.industry)) {
        matchScore += 30;
      }

      // Role match
      const jobTitleLower = (alumnus.job_title || '').toLowerCase();
      for (const keyword of roleKeywords) {
        if (jobTitleLower.includes(keyword)) {
          matchScore += 25;
          break;
        }
      }

      // Experience level match
      const userExperience = responses['q7'] || 'None';
      const alumniExp = alumnus.years_experience || 0;

      if (userExperience === 'None' && alumniExp >= 3) {
        matchScore += 20; // Entry-level users want experienced mentors
      } else if (userExperience.includes('1-2') && alumniExp >= 5) {
        matchScore += 15;
      }

      // Interview availability match
      if (responses['q13'] === 'Very interested' && alumnus.available_for_mock) {
        matchScore += 15;
      }

      // Interview type match
      if (responses['q14']) {
        matchScore += 10;
      }

      return {
        ...alumnus,
        matchScore: Math.min(100, matchScore)
      };
    }).filter(a => a.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }

  /**
   * Generate personalized career recommendations
   * @param {object} responses - Survey responses
   * @param {object} report - Current report object
   * @returns {object} - Career recommendations
   */
  static generateCareerRecommendations(responses, report) {
    const immediateGoal = responses['q10'];
    const goals = responses['q11'] || [];

    return {
      immediate: {
        timeframe: '6-12 months',
        focus: immediateGoal,
        actions: this.getActionItems(immediateGoal),
        priority: 1
      },
      shortTerm: {
        timeframe: '1-2 years',
        focus: `Become proficient in top skills and establish yourself in ${report.topIndustries[0]?.name || 'your chosen industry'}`,
        actions: [
          'Complete 2-3 skill development projects',
          'Build professional network',
          'Get relevant certifications if needed'
        ],
        priority: 2
      },
      mediumTerm: {
        timeframe: '3-5 years',
        focus: `Advance into ${report.topRoles[0]?.title || 'a senior role'}`,
        actions: [
          'Take on leadership responsibilities',
          'Develop expertise in specialization',
          'Mentor junior professionals'
        ],
        priority: 3
      },
      keyMilestones: [
        'Connect with 3-5 mentors from target industry',
        'Complete mock interviews with alumni',
        'Build portfolio or case studies',
        'Achieve target skill proficiency levels'
      ]
    };
  }

  /**
   * Get action items based on career goal
   * @param {string} goal - Career goal
   * @returns {array} - Recommended actions
   */
  static getActionItems(goal) {
    const actions = {
      'Get first job/internship': [
        'Optimize resume and LinkedIn profile',
        'Practice technical interviews',
        'Attend networking events',
        'Apply to 5-10 positions weekly'
      ],
      'Change industries': [
        'Research target industry thoroughly',
        'Acquire relevant skills',
        'Find mentors in new industry',
        'Consider relevant courses or certifications'
      ],
      'Advance in current role': [
        'Identify advancement requirements',
        'Develop leadership skills',
        'Seek challenging projects',
        'Find mentor in leadership position'
      ],
      'Learn new skills': [
        'Choose skills aligned with career goals',
        'Enroll in relevant courses',
        'Work on projects using new skills',
        'Share learning with team'
      ],
      'Start a business': [
        'Validate business idea',
        'Learn business fundamentals',
        'Build network of advisors/investors',
        'Develop business plan'
      ]
    };

    return actions[goal] || ['Explore career options', 'Connect with mentors', 'Develop key skills'];
  }

  /**
   * Calculate overall career readiness score
   * @param {object} responses - Survey responses
   * @param {object} report - Report data
   * @returns {number} - Overall score 0-100
   */
  static calculateOverallScore(responses, report) {
    let score = 50; // Base score

    // Experience score
    const experience = responses['q7'] || 'None';
    const expScores = {
      'None': 40,
      'Less than 6 months': 50,
      '6 months - 1 year': 60,
      '1-2 years': 70,
      '2+ years': 80
    };
    score += (expScores[experience] - 50) * 0.2;

    // Skills score
    score += Math.min(20, report.skillScore / 5);

    // Goal clarity score
    if (responses['q10']) score += 10;

    // Mentorship interest score
    if (responses['q13'] === 'Very interested') score += 5;

    // Adjustment for opportunities
    if (report.recommendedMentors.length > 5) score += 10;
    if (report.skillGaps.length < 3) score += 5;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Generate human-readable summary
   * @param {object} report - Report data
   * @param {object} responses - Survey responses
   * @returns {string} - Summary text
   */
  static generateSummary(report, responses) {
    const topIndustry = report.topIndustries[0]?.name || 'your chosen field';
    const topRole = report.topRoles[0]?.title || 'a relevant role';
    const skillCount = report.skillGaps.length;
    const mentorCount = report.recommendedMentors.length;
    const score = report.totalScore;

    let summary = `Based on your survey responses, here's your career assessment:\n\n`;

    summary += `📊 **Overall Career Readiness: ${score}/100**\n`;

    if (score >= 80) {
      summary += `You are well-prepared for your career goals with strong skills and clear direction.\n`;
    } else if (score >= 60) {
      summary += `You have good foundation with some areas to develop. With focused effort, you'll be ready for your goals.\n`;
    } else {
      summary += `There's an opportunity to strengthen your profile. Let's focus on key development areas.\n`;
    }

    summary += `\n🎯 **Your Focus Areas:**\n`;
    summary += `• **Primary Industry:** ${topIndustry}\n`;
    summary += `• **Target Role:** ${topRole}\n`;
    summary += `• **Skill Gaps to Address:** ${skillCount} key areas\n`;
    summary += `• **Potential Mentors:** ${mentorCount} alumni matches available\n`;

    summary += `\n✅ **What's Next:**\n`;
    summary += `1. Review your ${mentorCount} recommended mentors\n`;
    summary += `2. Work on the top ${Math.min(3, skillCount)} skill gaps\n`;
    summary += `3. Schedule mock interviews with available mentors\n`;
    summary += `4. Follow your ${score >= 70 ? 'short-term' : 'immediate'} action plan\n`;

    return summary;
  }

  /**
   * Calculate percentage of survey completion
   * @param {object} responses - Submitted responses
   * @returns {number} - Percentage (0-100)
   */
  static calculateCompletion(responses) {
    const totalQuestions = 14;
    const answeredQuestions = Object.keys(responses).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  }
}

module.exports = SurveyService;
