#!/usr/bin/env node

/**
 * Generate a complete resume with ALL sections filled in
 * This script creates a comprehensive example resume with realistic data
 */

const fullResumeData = {
  personalInfo: {
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/sarahchen',
    github: 'github.com/sarahchen',
    website: 'sarahchen.dev',
    city: 'San Francisco, CA'
  },

  summary: 'Results-driven Full Stack Software Engineer with 6+ years of experience building scalable web applications and leading cross-functional teams. Expertise in React, Node.js, Python, and cloud architecture. Proven track record of delivering high-impact features that drive user engagement and business growth. Passionate about clean code, mentorship, and continuous learning.',

  skillCategories: [
    { name: 'Languages', skills: 'JavaScript, TypeScript, Python, Java, SQL, HTML/CSS, Go' },
    { name: 'Frontend', skills: 'React, Next.js, Vue.js, Redux, TailwindCSS, Material-UI, Webpack' },
    { name: 'Backend', skills: 'Node.js, Express, Django, Flask, FastAPI, GraphQL, REST APIs' },
    { name: 'Databases', skills: 'PostgreSQL, MongoDB, Redis, MySQL, DynamoDB, Elasticsearch' },
    { name: 'Cloud & DevOps', skills: 'AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, CI/CD, Terraform' },
    { name: 'Tools & Practices', skills: 'Git, Agile/Scrum, TDD, Microservices, System Design, Code Review' }
  ],

  experiences: [
    {
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      dates: 'Jan 2021 -- Present',
      bullets: [
        'Led development of microservices architecture serving 2M+ daily active users, improving system reliability from 95% to 99.9% uptime',
        'Architected and implemented real-time notification system using WebSockets and Redis, reducing latency by 70%',
        'Mentored team of 5 junior engineers through code reviews, pair programming, and technical design sessions',
        'Reduced API response times by 60% through database query optimization and implementing caching strategies',
        'Spearheaded migration from monolith to microservices, resulting in 40% faster deployment cycles'
      ]
    },
    {
      title: 'Software Engineer',
      company: 'StartupXYZ',
      location: 'Remote',
      dates: 'Jun 2019 -- Dec 2020',
      bullets: [
        'Built RESTful APIs using Node.js and Express, handling 50K+ requests per minute with 99.5% uptime',
        'Developed responsive web applications with React and Redux, improving user engagement by 35%',
        'Implemented automated testing suite achieving 85% code coverage, reducing production bugs by 50%',
        'Collaborated with product and design teams to deliver 15+ features in agile sprints'
      ]
    },
    {
      title: 'Junior Software Developer',
      company: 'Digital Solutions Ltd.',
      location: 'New York, NY',
      dates: 'Jul 2018 -- May 2019',
      bullets: [
        'Developed and maintained e-commerce platform features using Django and PostgreSQL',
        'Created automated scripts for data migration, reducing manual work by 80 hours per month',
        'Fixed 100+ bugs and implemented 20+ feature requests based on user feedback'
      ]
    }
  ],

  projects: [
    {
      title: 'E-Commerce Platform',
      description: 'Full-stack marketplace with payment integration and real-time inventory management',
      bullets: [
        'Built with React, Node.js, PostgreSQL, and Stripe API',
        'Implemented real-time order tracking using WebSockets',
        'Deployed on AWS with auto-scaling and load balancing',
        'Achieved 10K+ monthly active users within 3 months of launch'
      ]
    },
    {
      title: 'AI-Powered Task Manager',
      description: 'Smart productivity app with ML-based task prioritization',
      bullets: [
        'Developed using Next.js, Python (FastAPI), and TensorFlow',
        'Integrated OpenAI API for natural language task creation',
        'Implemented collaborative features with real-time sync'
      ]
    }
  ],

  education: [
    {
      degree: 'Bachelor of Science in Computer Science',
      institution: 'University of California, Berkeley',
      location: 'Berkeley, CA',
      dates: '2014 -- 2018',
      gpa: '3.8/4.0'
    },
    {
      degree: 'Master of Science in Software Engineering',
      institution: 'Stanford University',
      location: 'Stanford, CA',
      dates: '2022 -- 2024',
      gpa: '3.9/4.0'
    }
  ],

  certifications: [
    'AWS Certified Solutions Architect - Associate (2023)',
    'Google Cloud Professional Developer (2022)',
    'Certified Kubernetes Administrator (CKA) (2021)'
  ],

  languages: [
    'English - Native',
    'Mandarin Chinese - Professional Working Proficiency',
    'Spanish - Conversational'
  ],

  awards: [
    'Employee of the Year - TechCorp Inc. (2023) - Recognized for outstanding contributions to platform scalability',
    'Hackathon Winner - TechCrunch Disrupt (2022) - Built AI-powered code review tool in 24 hours',
    'Dean\'s List - UC Berkeley (2015-2018) - Maintained GPA above 3.5 for all semesters'
  ],

  publications: [
    'Chen, S. (2023). "Optimizing Microservices Communication Patterns." IEEE Software Engineering Journal.',
    'Chen, S., & Kumar, R. (2022). "Real-time Data Synchronization in Distributed Systems." ACM Computing Surveys.'
  ],

  extracurricular: [
    'Tech Lead - Women in Tech Mentorship Program (2021-Present) - Mentor 10+ junior developers',
    'Organizer - SF JavaScript Meetup (2020-Present) - Host monthly talks with 100+ attendees',
    'Volunteer - Code for Good (2019-Present) - Build software for non-profit organizations'
  ],

  volunteer: [
    'Software Development Volunteer - Local Food Bank (2020-Present) - Built inventory management system',
    'Coding Instructor - Girls Who Code (2019-2021) - Taught Python to high school students'
  ],

  hobbies: [
    'Open Source Contributions',
    'Technical Blogging',
    'Rock Climbing',
    'Photography'
  ],

  sectionOrder: [
    { id: 'summary', enabled: true },
    { id: 'skills', enabled: true },
    { id: 'experience', enabled: true },
    { id: 'projects', enabled: true },
    { id: 'education', enabled: true },
    { id: 'certifications', enabled: true },
    { id: 'languages', enabled: true },
    { id: 'awards', enabled: true },
    { id: 'publications', enabled: true },
    { id: 'extracurricular', enabled: true },
    { id: 'volunteer', enabled: true },
    { id: 'hobbies', enabled: true }
  ]
}

// Function to call the API
async function generateResume() {
  console.log('🚀 Generating complete resume with ALL sections...\n')

  try {
    const response = await fetch('http://localhost:3000/api/generate-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullResumeData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate resume')
    }

    // Save the PDF
    const buffer = await response.arrayBuffer()
    const fs = require('fs')
    const path = require('path')

    const outputPath = path.join(__dirname, '..', 'complete-resume-example.pdf')
    fs.writeFileSync(outputPath, Buffer.from(buffer))

    console.log('✅ Resume generated successfully!')
    console.log(`📄 Saved to: ${outputPath}`)
    console.log('\n📊 Resume includes:')
    console.log(`   ✓ Personal Info: ${fullResumeData.personalInfo.firstName} ${fullResumeData.personalInfo.lastName}`)
    console.log(`   ✓ Professional Summary`)
    console.log(`   ✓ Skills: ${fullResumeData.skillCategories.length} categories`)
    console.log(`   ✓ Experience: ${fullResumeData.experiences.length} positions`)
    console.log(`   ✓ Projects: ${fullResumeData.projects.length} projects`)
    console.log(`   ✓ Education: ${fullResumeData.education.length} degrees`)
    console.log(`   ✓ Certifications: ${fullResumeData.certifications.length} certs`)
    console.log(`   ✓ Languages: ${fullResumeData.languages.length} languages`)
    console.log(`   ✓ Awards: ${fullResumeData.awards.length} awards`)
    console.log(`   ✓ Publications: ${fullResumeData.publications.length} publications`)
    console.log(`   ✓ Extracurricular: ${fullResumeData.extracurricular.length} activities`)
    console.log(`   ✓ Volunteer: ${fullResumeData.volunteer.length} experiences`)
    console.log(`   ✓ Hobbies: ${fullResumeData.hobbies.length} interests`)
    console.log('\n🎉 All sections included!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  generateResume()
}

module.exports = { fullResumeData, generateResume }

