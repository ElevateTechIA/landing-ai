/**
 * Centralized Knowledge Base for Domain-Restricted Chatbot
 *
 * This knowledge base contains all information the chatbot is allowed to discuss.
 * The chatbot must ONLY use information from this source.
 */

export interface KnowledgeSection {
  id: string;
  category: string;
  keywords: string[];
  content: string;
  priority: number; // Higher priority = more relevant for general queries
}

export const knowledgeBase: KnowledgeSection[] = [
  // SERVICES
  {
    id: 'services-overview',
    category: 'services',
    keywords: ['services', 'offer', 'provide', 'do', 'what', 'capabilities'],
    priority: 10,
    content: `We offer five core services:

1. Custom Software Development - We build tailored solutions from scratch to solve your specific business problems. This includes desktop applications, command-line tools, and specialized software.

2. Web Applications - We create modern, responsive web applications using the latest technologies. Our web apps are fast, secure, and designed for real users.

3. Backend & APIs - We develop robust server-side systems, databases, and APIs that power your applications and integrate with your existing infrastructure.

4. AI Automation - We implement AI solutions to automate repetitive tasks, analyze data, and add intelligent features to your systems. This includes natural language processing, data analysis, and process automation.

5. System Integrations - We connect your different tools and platforms so they work together seamlessly, eliminating manual data transfer and reducing errors.`,
  },
  {
    id: 'services-custom-software',
    category: 'services',
    keywords: ['custom software', 'bespoke', 'tailored', 'specific solution'],
    priority: 7,
    content: `Custom Software Development: We build software solutions designed specifically for your business needs. Unlike off-the-shelf products, our custom software is built from the ground up to solve your unique challenges. This service is ideal when existing tools don't fit your workflow or when you need complete control over features and functionality.`,
  },
  {
    id: 'services-web-apps',
    category: 'services',
    keywords: ['web app', 'web application', 'website', 'online platform'],
    priority: 7,
    content: `Web Applications: We create modern web applications that work across all devices and browsers. Our web apps are built with performance, security, and user experience in mind. We use cutting-edge frameworks like React and Next.js to deliver fast, responsive applications that your users will love.`,
  },
  {
    id: 'services-backend',
    category: 'services',
    keywords: ['backend', 'api', 'database', 'server', 'infrastructure'],
    priority: 7,
    content: `Backend & APIs: We develop the server-side systems that power your applications. This includes databases, APIs, authentication systems, and business logic. Our backend solutions are scalable, secure, and built to handle growth. We can create new APIs or improve existing ones to better serve your needs.`,
  },
  {
    id: 'services-ai',
    category: 'services',
    keywords: ['ai', 'artificial intelligence', 'automation', 'machine learning', 'intelligent'],
    priority: 8,
    content: `AI Automation: We integrate AI into your business processes to save time and reduce manual work. Our AI solutions include document processing, data analysis, chatbots, and workflow automation. We use proven AI technologies to deliver real, measurable results - not hype. Our AI implementations are practical, reliable, and designed to solve specific business problems.`,
  },
  {
    id: 'services-integration',
    category: 'services',
    keywords: ['integration', 'connect', 'sync', 'combine', 'link systems'],
    priority: 7,
    content: `System Integrations: We connect your different software tools so they communicate automatically. This eliminates manual data entry, reduces errors, and saves your team hours of work. We can integrate CRMs, payment systems, databases, and third-party APIs to create a unified technology ecosystem.`,
  },

  // SCOPE AND LIMITATIONS
  {
    id: 'scope-what-we-do',
    category: 'scope',
    keywords: ['scope', 'focus', 'specialize', 'expertise'],
    priority: 6,
    content: `Our focus is on custom software development and AI integration for businesses. We specialize in solving real problems with technology - from automating manual processes to building entirely new platforms. We work best with businesses that know they have a problem that technology can solve, even if they're not sure exactly what the solution should look like.`,
  },
  {
    id: 'scope-what-we-dont-do',
    category: 'scope',
    keywords: ['not do', 'don\'t do', 'limitations', 'out of scope'],
    priority: 6,
    content: `We focus exclusively on software development and AI services. We don't provide IT support, hardware sales, or general consulting services. We're developers and engineers, not a full-service IT department.`,
  },
  {
    id: 'scope-ideal-projects',
    category: 'scope',
    keywords: ['ideal', 'best fit', 'good match', 'right for'],
    priority: 5,
    content: `We're the right fit if you need custom software built, existing systems improved, or AI integrated into your workflow. We excel at projects where off-the-shelf solutions don't work and you need something built specifically for your needs.`,
  },

  // HOW WE WORK
  {
    id: 'process-overview',
    category: 'process',
    keywords: ['process', 'how work', 'methodology', 'approach', 'steps'],
    priority: 9,
    content: `Our 5-step process:

1. Discovery - We start by understanding your problem, current workflow, and what success looks like. We ask questions to get clear on requirements.

2. Design - We create a detailed plan showing what we'll build, how it will work, and what it will look like. You approve this before we write any code.

3. Build - We develop your solution in phases, keeping you updated throughout. You'll see progress regularly, not just at the end.

4. Launch - We deploy your software and make sure everything works smoothly in the real environment.

5. Improve - After launch, we monitor performance and make adjustments based on real usage. We're available for updates and improvements.`,
  },
  {
    id: 'process-discovery',
    category: 'process',
    keywords: ['discovery', 'initial', 'start', 'requirements', 'understand'],
    priority: 5,
    content: `Discovery Phase: We begin every project by understanding your business, the problem you're trying to solve, and your goals. This involves interviews, workflow analysis, and requirement gathering. We don't jump into coding until we're confident we understand what needs to be built.`,
  },
  {
    id: 'process-timeline',
    category: 'process',
    keywords: ['timeline', 'how long', 'duration', 'time', 'fast'],
    priority: 6,
    content: `Project timelines vary based on complexity. A simple integration might take a few weeks, while a full custom platform could take several months. We provide a realistic timeline after the discovery phase, and we keep you updated throughout the project. We prioritize quality over speed - rushed projects often fail.`,
  },
  {
    id: 'process-communication',
    category: 'process',
    keywords: ['communication', 'updates', 'contact', 'meetings', 'reports'],
    priority: 5,
    content: `We believe in transparent, regular communication. You'll have a direct line to our team, and we provide regular progress updates. We're responsive via email and schedule calls as needed. You're never left wondering what's happening with your project.`,
  },

  // TECHNOLOGY STACK
  {
    id: 'tech-stack-overview',
    category: 'technology',
    keywords: ['technology', 'tech stack', 'tools', 'use', 'frameworks'],
    priority: 7,
    content: `Our technology stack includes:

- React & Next.js for modern web applications
- Python for AI, automation, and backend systems
- Node.js for scalable server applications
- AWS for cloud infrastructure and hosting
- PostgreSQL and MongoDB for databases
- RESTful APIs and GraphQL for integrations

We choose technologies based on what's best for your project, not what's trendy. Every tool we use is proven, well-supported, and appropriate for production environments.`,
  },
  {
    id: 'tech-react-nextjs',
    category: 'technology',
    keywords: ['react', 'next.js', 'nextjs', 'frontend', 'web framework'],
    priority: 5,
    content: `We use React and Next.js for web applications because they deliver fast, modern user experiences. These frameworks are used by major companies worldwide and have excellent long-term support. They enable us to build responsive, accessible web apps that work great on any device.`,
  },
  {
    id: 'tech-python',
    category: 'technology',
    keywords: ['python', 'ai', 'automation', 'backend'],
    priority: 5,
    content: `Python is our go-to for AI integration and automation because it has the best ecosystem for AI/ML work. It's also excellent for data processing, scripting, and backend development. Python's readability and extensive libraries make it ideal for solving complex problems quickly.`,
  },
  {
    id: 'tech-aws',
    category: 'technology',
    keywords: ['aws', 'cloud', 'hosting', 'infrastructure', 'deployment'],
    priority: 5,
    content: `We use AWS (Amazon Web Services) for cloud infrastructure because it's reliable, scalable, and offers everything needed to run production applications. AWS provides security, monitoring, and global availability out of the box. We handle all deployment and infrastructure setup.`,
  },

  // CONTACT AND ENGAGEMENT
  {
    id: 'contact-how',
    category: 'contact',
    keywords: ['contact', 'reach', 'get in touch', 'talk', 'consultation'],
    priority: 10,
    content: `You can contact us through the contact form on this website. Fill out the form with your name, email, and a brief description of your project or question. We typically respond within 24 hours on business days. We offer free initial consultations to discuss your needs.`,
  },
  {
    id: 'contact-consultation',
    category: 'contact',
    keywords: ['consultation', 'call', 'meeting', 'discuss', 'free'],
    priority: 7,
    content: `We offer free initial consultations. During this conversation, we'll discuss your project, answer your questions, and determine if we're the right fit. There's no obligation - it's just a conversation to see if we can help. Use the contact form to request a consultation.`,
  },
  {
    id: 'contact-pricing',
    category: 'contact',
    keywords: ['price', 'cost', 'budget', 'pricing', 'quote'],
    priority: 8,
    content: `Project pricing depends on scope, complexity, and timeline. We don't have fixed packages because every project is different. After understanding your needs in the discovery phase, we provide a detailed quote. We're transparent about costs and work within your budget constraints when possible. Contact us to discuss your specific project for accurate pricing.`,
  },
  {
    id: 'contact-location',
    category: 'contact',
    keywords: ['location', 'where', 'based', 'office', 'remote'],
    priority: 4,
    content: `We work with clients remotely, which means we can serve businesses anywhere. Most communication happens via email, video calls, and project management tools. This remote-first approach keeps costs down and gives you access to our expertise regardless of location.`,
  },

  // BENEFITS AND VALUE
  {
    id: 'benefits-why-us',
    category: 'benefits',
    keywords: ['why choose', 'benefits', 'advantage', 'different'],
    priority: 6,
    content: `What sets us apart:

1. We're honest - If we can't solve your problem, we'll tell you upfront. We don't overpromise or sell you services you don't need.

2. We build for the real world - Our solutions are practical, maintainable, and built to last. No cutting corners or temporary fixes.

3. We speak plain language - No jargon, no confusing technical talk. We explain things clearly so you understand what you're getting.

4. We stay available - Projects don't end at launch. We're here for ongoing support and improvements.`,
  },
  {
    id: 'benefits-custom-vs-offtheshelf',
    category: 'benefits',
    keywords: ['custom', 'vs', 'off-the-shelf', 'saas', 'ready-made'],
    priority: 5,
    content: `Custom software makes sense when off-the-shelf products don't fit your workflow, when you need features that don't exist, or when you want full control over your data and functionality. Pre-built solutions are great when they work, but custom development is worth it when your needs are unique or when buying software forces you to change how you work.`,
  },

  // AI-SPECIFIC INFORMATION
  {
    id: 'ai-capabilities',
    category: 'ai',
    keywords: ['ai capabilities', 'ai features', 'what ai can do'],
    priority: 6,
    content: `Our AI capabilities include:
- Document processing and data extraction
- Natural language processing for text analysis
- Intelligent automation of repetitive tasks
- Chatbots and conversational interfaces
- Predictive analytics and pattern recognition
- Content generation and summarization

We focus on practical AI applications that deliver measurable ROI, not experimental or unproven technologies.`,
  },
  {
    id: 'ai-approach',
    category: 'ai',
    keywords: ['ai approach', 'ai philosophy', 'how ai works'],
    priority: 5,
    content: `Our AI approach is pragmatic: we use AI where it makes sense, not everywhere. We integrate proven AI models and APIs rather than training models from scratch (unless your project specifically requires it). We're honest about what AI can and can't do - it's a powerful tool, but not magic. Every AI implementation we build has clear success metrics and delivers real value.`,
  },
];

/**
 * Get all categories in the knowledge base
 */
export function getCategories(): string[] {
  return Array.from(new Set(knowledgeBase.map(section => section.category)));
}

/**
 * Get all sections for a specific category
 */
export function getSectionsByCategory(category: string): KnowledgeSection[] {
  return knowledgeBase.filter(section => section.category === category);
}

/**
 * Search knowledge base by keywords
 */
export function searchKnowledgeBase(query: string): KnowledgeSection[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Score each section based on keyword matches
  const scoredSections = knowledgeBase.map(section => {
    let score = 0;

    // Check if any keywords match
    section.keywords.forEach(keyword => {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });

    // Check if query words match content
    queryWords.forEach(word => {
      if (word.length > 3 && section.content.toLowerCase().includes(word)) {
        score += 2;
      }
    });

    // Add priority as a tiebreaker
    score += section.priority * 0.1;

    return { section, score };
  });

  // Filter sections with score > 0 and sort by score
  return scoredSections
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.section);
}
