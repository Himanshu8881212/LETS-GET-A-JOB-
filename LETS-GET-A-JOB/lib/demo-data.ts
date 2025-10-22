// Professional Demo Resume Data
export const demoResumeData = {
  personalInfo: {
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@email.com",
    phone: "+1 (555) 123-4567",
    linkedin: "linkedin.com/in/sarahchen",
    github: "github.com/sarahchen",
    website: "sarahchen.dev",
    location: "San Francisco, CA"
  },
  
  summary: "Results-driven Full Stack Software Engineer with 5+ years of experience building scalable web applications and leading cross-functional teams. Expertise in React, Node.js, and cloud architecture. Proven track record of delivering high-impact features that improved user engagement by 40% and reduced system latency by 60%. Passionate about writing clean, maintainable code and mentoring junior developers.",
  
  skillCategories: [
    {
      name: "Programming Languages",
      skills: "JavaScript, TypeScript, Python, Java, Go, SQL"
    },
    {
      name: "Frontend",
      skills: "React, Next.js, Vue.js, Redux, TailwindCSS, HTML5, CSS3"
    },
    {
      name: "Backend",
      skills: "Node.js, Express, Django, FastAPI, GraphQL, REST APIs"
    },
    {
      name: "Databases",
      skills: "PostgreSQL, MongoDB, Redis, MySQL, DynamoDB"
    },
    {
      name: "Cloud & DevOps",
      skills: "AWS (EC2, S3, Lambda), Docker, Kubernetes, CI/CD, GitHub Actions"
    },
    {
      name: "Tools & Practices",
      skills: "Git, Agile/Scrum, TDD, System Design, Microservices"
    }
  ],
  
  experiences: [
    {
      title: "Senior Software Engineer",
      company: "TechCorp Inc.",
      location: "San Francisco, CA",
      startDate: "Jan 2022",
      endDate: "Present",
      bullets: [
        "Led development of real-time collaboration platform serving 500K+ users, resulting in 40% increase in user engagement",
        "Architected microservices infrastructure using Node.js and AWS Lambda, reducing API response time by 60%",
        "Mentored team of 5 junior engineers, conducting code reviews and establishing best practices for React development",
        "Implemented comprehensive testing strategy (Jest, Cypress) achieving 85% code coverage and reducing production bugs by 50%"
      ]
    },
    {
      title: "Software Engineer",
      company: "StartupXYZ",
      location: "Remote",
      startDate: "Jun 2020",
      endDate: "Dec 2021",
      bullets: [
        "Built customer-facing dashboard using React and TypeScript, processing 1M+ transactions daily",
        "Designed and implemented RESTful APIs with Node.js/Express, serving 10K requests per minute",
        "Optimized database queries and implemented Redis caching, improving page load time by 70%",
        "Collaborated with product team to define technical requirements and deliver features on tight deadlines"
      ]
    },
    {
      title: "Junior Software Developer",
      company: "Digital Solutions Ltd.",
      location: "New York, NY",
      startDate: "Jul 2019",
      endDate: "May 2020",
      bullets: [
        "Developed responsive web applications using React, HTML5, and CSS3 for enterprise clients",
        "Integrated third-party APIs (Stripe, Twilio, SendGrid) to enhance application functionality",
        "Participated in Agile ceremonies and contributed to sprint planning and retrospectives",
        "Fixed critical bugs and implemented new features based on user feedback and analytics"
      ]
    }
  ],
  
  projects: [
    {
      name: "DevConnect - Developer Networking Platform",
      technologies: "Next.js, TypeScript, PostgreSQL, Prisma, TailwindCSS",
      bullets: [
        "Built full-stack social platform for developers with real-time messaging and project collaboration features",
        "Implemented authentication using NextAuth.js with OAuth providers (GitHub, Google)",
        "Deployed on Vercel with CI/CD pipeline, achieving 99.9% uptime"
      ]
    },
    {
      name: "AI Code Review Assistant",
      technologies: "Python, FastAPI, OpenAI API, Docker, AWS",
      bullets: [
        "Created AI-powered tool that analyzes code quality and suggests improvements using GPT-4",
        "Processed 10K+ code reviews with 92% accuracy in identifying common issues",
        "Containerized application with Docker and deployed on AWS ECS"
      ]
    }
  ],
  
  education: [
    {
      degree: "Bachelor of Science in Computer Science",
      school: "University of California, Berkeley",
      location: "Berkeley, CA",
      graduationDate: "May 2019",
      gpa: "3.8/4.0",
      details: "Relevant Coursework: Data Structures, Algorithms, Database Systems, Web Development, Machine Learning"
    }
  ],
  
  certifications: [
    "AWS Certified Solutions Architect - Associate (2023)",
    "Google Cloud Professional Developer (2022)",
    "Meta Front-End Developer Professional Certificate (2021)"
  ],
  
  languages: [
    "English (Native)",
    "Mandarin Chinese (Fluent)",
    "Spanish (Conversational)"
  ],
  
  awards: [
    "TechCorp Innovation Award for Outstanding Technical Achievement (2023)",
    "Hackathon Winner - Best Full Stack Application, SF Tech Week (2022)",
    "Dean's List, UC Berkeley (2017-2019)"
  ],
  
  sectionOrder: [
    { id: 'summary', enabled: true },
    { id: 'skills', enabled: true },
    { id: 'experience', enabled: true },
    { id: 'projects', enabled: true },
    { id: 'education', enabled: true },
    { id: 'certifications', enabled: true },
    { id: 'languages', enabled: true },
    { id: 'awards', enabled: true }
  ]
}

// Professional Demo Cover Letter Data
export const demoCoverLetterData = {
  personalInfo: {
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@email.com",
    phone: "+1 (555) 123-4567",
    address: "123 Tech Street, San Francisco, CA 94102"
  },
  
  recipient: {
    name: "Alex Johnson",
    title: "Engineering Manager",
    company: "InnovateTech Solutions",
    address: "456 Innovation Drive, San Francisco, CA 94103"
  },
  
  content: {
    opening: "I am writing to express my strong interest in the Senior Full Stack Engineer position at InnovateTech Solutions. With over 5 years of experience building scalable web applications and a proven track record of delivering high-impact features, I am excited about the opportunity to contribute to your team's mission of revolutionizing enterprise software.",
    
    bodyParagraphs: [
      "In my current role as Senior Software Engineer at TechCorp Inc., I led the development of a real-time collaboration platform that serves over 500,000 users daily. By architecting a microservices infrastructure using Node.js and AWS Lambda, I reduced API response times by 60% while maintaining 99.9% uptime. This experience has given me deep expertise in building distributed systems that scale efficiently—skills that directly align with InnovateTech's focus on enterprise-grade solutions.",
      
      "What particularly excites me about InnovateTech is your commitment to innovation and technical excellence. I was impressed by your recent launch of the AI-powered analytics platform, which demonstrates the kind of cutting-edge work I'm passionate about. My experience building an AI Code Review Assistant using Python and OpenAI's API has prepared me to contribute meaningfully to similar initiatives at InnovateTech.",
      
      "Beyond technical skills, I bring strong leadership and mentoring abilities. I've successfully mentored 5 junior engineers, established best practices for React development, and implemented comprehensive testing strategies that reduced production bugs by 50%. I believe in fostering collaborative environments where teams can do their best work, and I'm excited about the opportunity to contribute to InnovateTech's engineering culture."
    ],
    
    closing: "I would welcome the opportunity to discuss how my experience in full-stack development, cloud architecture, and team leadership can contribute to InnovateTech's continued success. Thank you for considering my application. I look forward to speaking with you soon."
  },
  
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

