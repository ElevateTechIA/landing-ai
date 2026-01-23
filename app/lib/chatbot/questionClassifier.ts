/**
 * Question Classifier
 *
 * Determines if a user question is within the allowed domain scope.
 * Prevents the chatbot from answering off-topic questions.
 */

export type QuestionClassification = {
  isAllowed: boolean;
  category?: 'services' | 'process' | 'technology' | 'contact' | 'benefits' | 'scope' | 'ai';
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
};

// Keywords that indicate on-topic questions
const ALLOWED_PATTERNS = {
  services: [
    'service', 'offer', 'provide', 'do you', 'can you', 'build',
    'develop', 'create', 'make', 'software', 'application', 'app',
    'web', 'mobile', 'integration', 'api', 'backend', 'frontend',
    // Spanish
    'servicio', 'servicios', 'ofrecer', 'ofrecen', 'pueden', 'hacen',
    'desarrollar', 'crear', 'hacer', 'aplicación', 'aplicaciones'
  ],
  process: [
    'process', 'how work', 'methodology', 'approach', 'timeline',
    'long take', 'start', 'steps', 'phases', 'discovery', 'project'
  ],
  technology: [
    'technology', 'tech stack', 'tools', 'framework', 'language',
    'react', 'python', 'node', 'aws', 'database', 'use what'
  ],
  contact: [
    'contact', 'reach', 'email', 'phone', 'consultation', 'meeting',
    'talk', 'discuss', 'get in touch', 'schedule', 'call',
    // Spanish
    'contacto', 'contactar', 'correo', 'teléfono', 'reunión', 'reuniones',
    'hablar', 'consulta', 'agendar', 'cita', 'llamar'
  ],
  benefits: [
    'why', 'benefit', 'advantage', 'better', 'different', 'choose',
    'best', 'good', 'value', 'worth',
    // Spanish
    'por qué', 'beneficio', 'ventaja', 'mejor', 'diferente', 'elegir',
    'bueno', 'valor', 'información', 'info', 'saber'
  ],
  scope: [
    'scope', 'focus', 'specialize', 'expertise', 'limitations',
    'not do', 'don\'t do', 'can\'t do', 'won\'t do'
  ],
  ai: [
    'ai', 'artificial intelligence', 'machine learning', 'ml',
    'automation', 'intelligent', 'smart', 'chatbot', 'nlp',
    // Spanish
    'inteligencia artificial', 'aprendizaje automático', 'automatización',
    'inteligente', 'automático'
  ]
};

// Patterns that indicate off-topic questions
const BLOCKED_PATTERNS = [
  // General knowledge
  'what is', 'who is', 'when was', 'where is', 'history of',
  'define', 'explain', 'tell me about',

  // Personal requests
  'write me', 'write a', 'create me', 'generate',

  // Non-business topics
  'weather', 'news', 'politics', 'sports', 'entertainment',
  'recipe', 'health', 'medical', 'legal', 'financial advice',

  // Technical help for other systems
  'how to use', 'how do i', 'tutorial', 'guide for',

  // Coding help
  'code', 'programming', 'debug', 'error', 'fix',

  // Pricing for competitors or other services
  'price of', 'cost of', 'how much is'
];

// Questions about our company are allowed
const COMPANY_INDICATORS = [
  'you', 'your', 'company', 'business', 'team', 'we', 'us'
];

/**
 * Classify a user question to determine if it's within allowed scope
 */
export function classifyQuestion(question: string): QuestionClassification {
  const questionLower = question.toLowerCase().trim();

  // Empty or very short questions
  if (questionLower.length < 3) {
    return {
      isAllowed: false,
      confidence: 'high',
      reason: 'Question too short'
    };
  }

  // Check for blocked patterns first (unless it's about our company)
  const hasCompanyIndicator = COMPANY_INDICATORS.some(indicator =>
    questionLower.includes(indicator)
  );

  if (!hasCompanyIndicator) {
    for (const pattern of BLOCKED_PATTERNS) {
      if (questionLower.includes(pattern)) {
        return {
          isAllowed: false,
          confidence: 'high',
          reason: `Off-topic: appears to be a general knowledge or non-business question`
        };
      }
    }
  }

  // Check for allowed patterns and determine category
  let bestMatch: { category: string; count: number } | null = null;

  for (const [category, patterns] of Object.entries(ALLOWED_PATTERNS)) {
    const matchCount = patterns.filter(pattern =>
      questionLower.includes(pattern)
    ).length;

    if (matchCount > 0 && (!bestMatch || matchCount > bestMatch.count)) {
      bestMatch = { category, count: matchCount };
    }
  }

  // If we found matches, question is allowed
  if (bestMatch && bestMatch.count > 0) {
    return {
      isAllowed: true,
      category: bestMatch.category as any,
      confidence: bestMatch.count >= 2 ? 'high' : 'medium',
      reason: `Matches ${bestMatch.category} category`
    };
  }

  // Check if it's a greeting or general question about the company
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'];
  const generalCompanyQuestions = [
    'what do you do', 'who are you', 'about you', 'your company',
    'tell me about', 'what is this', 'what\'s this'
  ];

  if (greetings.some(g => questionLower.includes(g))) {
    return {
      isAllowed: true,
      category: 'services',
      confidence: 'high',
      reason: 'Greeting - will provide introduction'
    };
  }

  if (generalCompanyQuestions.some(q => questionLower.includes(q))) {
    return {
      isAllowed: true,
      category: 'services',
      confidence: 'medium',
      reason: 'General company inquiry'
    };
  }

  // Default: reject if we're not confident it's on-topic
  return {
    isAllowed: false,
    confidence: 'low',
    reason: 'Unable to determine if question is about our services'
  };
}

/**
 * Get a rejection message for off-topic questions
 */
export function getOffTopicResponse(classification: QuestionClassification): string {
  const baseMessage = "I can help with questions about our software and AI services, but not with that topic.";

  const suggestions = [
    "I can answer questions about:",
    "- Our services (custom software, web apps, AI automation, etc.)",
    "- How we work and our process",
    "- Our technology stack",
    "- How to get in touch with our team",
    "",
    "Feel free to ask about any of these topics!"
  ].join('\n');

  return `${baseMessage}\n\n${suggestions}`;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove potential prompt injection patterns
  let sanitized = input.replace(/system:|assistant:|user:/gi, '');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Limit length
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}
