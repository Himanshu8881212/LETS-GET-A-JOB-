/**
 * Seed demo resume data into the database
 * Run with: npx tsx scripts/seed-demo-resumes.ts
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'app.db')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(DB_PATH)

// Demo resume data
const demoResumes = [
  {
    version_name: 'Software Engineer Resume v1.0',
    description: 'Initial version for software engineering positions',
    branch_name: 'main',
    version_number: 'v1.0',
    data_json: JSON.stringify({
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1 (555) 123-4567',
        linkedin: 'linkedin.com/in/johndoe',
        github: 'github.com/johndoe'
      },
      summary: 'Experienced Software Engineer with 5+ years of expertise in full-stack development, cloud architecture, and agile methodologies. Proven track record of delivering scalable solutions and leading cross-functional teams.',
      skillCategories: [
        {
          id: '1',
          name: 'Programming Languages',
          skills: 'Python, JavaScript, TypeScript, Java, Go, SQL'
        },
        {
          id: '2',
          name: 'Frameworks & Libraries',
          skills: 'React, Node.js, Next.js, Django, Flask, Spring Boot'
        },
        {
          id: '3',
          name: 'Cloud & DevOps',
          skills: 'AWS, Docker, Kubernetes, CI/CD, Terraform, Jenkins'
        }
      ],
      experiences: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          dates: 'Jan 2021 - Present',
          bullets: [
            'Led development of microservices architecture serving 10M+ users, improving system reliability by 40%',
            'Architected and implemented real-time data pipeline processing 500K events/second using Kafka and Spark',
            'Mentored team of 5 junior engineers, conducting code reviews and technical design sessions',
            'Reduced deployment time by 60% through implementation of automated CI/CD pipelines'
          ]
        },
        {
          title: 'Software Engineer',
          company: 'StartupXYZ',
          location: 'New York, NY',
          dates: 'Jun 2019 - Dec 2020',
          bullets: [
            'Built RESTful APIs and GraphQL services handling 1M+ daily requests',
            'Implemented authentication and authorization system using OAuth 2.0 and JWT',
            'Optimized database queries reducing response time by 70%',
            'Collaborated with product team to deliver features in 2-week sprints'
          ]
        }
      ],
      projects: [
        {
          title: 'Open Source Contribution - React Performance Tools',
          description: 'Contributed performance monitoring utilities to popular React library with 50K+ GitHub stars'
        }
      ],
      education: [
        {
          degree: 'Bachelor of Science in Computer Science',
          institution: 'University of California, Berkeley',
          location: 'Berkeley, CA',
          dates: '2015 - 2019',
          gpa: '3.8/4.0'
        }
      ],
      certifications: ['AWS Certified Solutions Architect', 'Certified Kubernetes Administrator (CKA)'],
      languages: [],
      awards: [],
      hobbies: [],
      publications: [],
      extracurricular: [],
      volunteer: []
    })
  },
  {
    version_name: 'Data Scientist Resume v1.0',
    description: 'Specialized for data science and ML roles',
    branch_name: 'data-science',
    version_number: 'v1.0',
    data_json: JSON.stringify({
      personalInfo: {
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@email.com',
        phone: '+1 (555) 987-6543',
        linkedin: 'linkedin.com/in/sarahchen',
        github: 'github.com/sarahchen'
      },
      summary: 'Data Scientist with 4+ years of experience in machine learning, statistical modeling, and big data analytics. Expertise in building predictive models and deriving actionable insights from complex datasets.',
      skillCategories: [
        {
          id: '1',
          name: 'Programming & Tools',
          skills: 'Python, R, SQL, Scala, Git, Jupyter'
        },
        {
          id: '2',
          name: 'ML & Data Science',
          skills: 'TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy, XGBoost'
        },
        {
          id: '3',
          name: 'Big Data & Cloud',
          skills: 'Spark, Hadoop, AWS SageMaker, Databricks, Snowflake'
        }
      ],
      experiences: [
        {
          title: 'Senior Data Scientist',
          company: 'AI Innovations Inc',
          location: 'Boston, MA',
          dates: 'Mar 2021 - Present',
          bullets: [
            'Developed recommendation system using collaborative filtering, increasing user engagement by 35%',
            'Built NLP models for sentiment analysis processing 100K+ customer reviews daily',
            'Implemented A/B testing framework resulting in 20% improvement in conversion rates',
            'Led data science team of 4 in delivering ML solutions for business stakeholders'
          ]
        },
        {
          title: 'Data Scientist',
          company: 'Analytics Pro',
          location: 'Seattle, WA',
          dates: 'Jul 2019 - Feb 2021',
          bullets: [
            'Created predictive models for customer churn with 85% accuracy using ensemble methods',
            'Designed and deployed real-time fraud detection system reducing losses by $2M annually',
            'Performed exploratory data analysis on datasets with 10M+ records',
            'Collaborated with engineering team to productionize ML models'
          ]
        }
      ],
      projects: [
        {
          title: 'COVID-19 Prediction Model',
          description: 'Developed time-series forecasting model for pandemic trends, published in peer-reviewed journal'
        }
      ],
      education: [
        {
          degree: 'Master of Science in Data Science',
          institution: 'MIT',
          location: 'Cambridge, MA',
          dates: '2017 - 2019',
          gpa: '3.9/4.0'
        },
        {
          degree: 'Bachelor of Science in Mathematics',
          institution: 'Stanford University',
          location: 'Stanford, CA',
          dates: '2013 - 2017',
          gpa: '3.7/4.0'
        }
      ],
      certifications: ['Google Cloud Professional Data Engineer', 'Deep Learning Specialization (Coursera)'],
      languages: [],
      awards: ['Best Paper Award - International Conference on Machine Learning 2022'],
      hobbies: [],
      publications: [
        {
          title: 'Deep Learning Approaches for Time Series Forecasting',
          details: 'Journal of Machine Learning Research, 2022'
        }
      ],
      extracurricular: [],
      volunteer: []
    })
  },
  {
    version_name: 'Product Manager Resume v1.0',
    description: 'Tailored for product management positions',
    branch_name: 'product',
    version_number: 'v1.0',
    data_json: JSON.stringify({
      personalInfo: {
        firstName: 'Michael',
        lastName: 'Rodriguez',
        email: 'michael.r@email.com',
        phone: '+1 (555) 456-7890',
        linkedin: 'linkedin.com/in/michaelrodriguez',
        github: ''
      },
      summary: 'Strategic Product Manager with 6+ years of experience driving product vision and execution. Proven ability to launch successful products, manage cross-functional teams, and deliver measurable business impact.',
      skillCategories: [
        {
          id: '1',
          name: 'Product Management',
          skills: 'Product Strategy, Roadmap Planning, User Research, A/B Testing, Analytics'
        },
        {
          id: '2',
          name: 'Technical Skills',
          skills: 'SQL, Python, Tableau, Mixpanel, Google Analytics, JIRA'
        },
        {
          id: '3',
          name: 'Business Skills',
          skills: 'Stakeholder Management, Agile/Scrum, Go-to-Market Strategy, P&L Management'
        }
      ],
      experiences: [
        {
          title: 'Senior Product Manager',
          company: 'SaaS Solutions Co',
          location: 'Austin, TX',
          dates: 'Jan 2020 - Present',
          bullets: [
            'Led product strategy for B2B platform serving 500+ enterprise clients, generating $50M ARR',
            'Launched 3 major features resulting in 40% increase in user retention and 25% revenue growth',
            'Managed product roadmap and prioritized features based on customer feedback and business goals',
            'Collaborated with engineering, design, and sales teams to deliver products on time and within budget',
            'Conducted user interviews and usability testing with 100+ customers to inform product decisions'
          ]
        },
        {
          title: 'Product Manager',
          company: 'Mobile App Startup',
          location: 'Los Angeles, CA',
          dates: 'Jun 2018 - Dec 2019',
          bullets: [
            'Owned product lifecycle from ideation to launch for consumer mobile app with 2M+ downloads',
            'Increased DAU by 60% through data-driven feature optimization and user engagement strategies',
            'Defined and tracked KPIs including retention, engagement, and monetization metrics',
            'Worked with UX designers to create intuitive user experiences based on user research'
          ]
        }
      ],
      projects: [],
      education: [
        {
          degree: 'MBA - Product Management',
          institution: 'Harvard Business School',
          location: 'Boston, MA',
          dates: '2016 - 2018',
          gpa: ''
        },
        {
          degree: 'Bachelor of Science in Business Administration',
          institution: 'UC Berkeley',
          location: 'Berkeley, CA',
          dates: '2012 - 2016',
          gpa: '3.6/4.0'
        }
      ],
      certifications: ['Certified Scrum Product Owner (CSPO)', 'Product Management Certificate - General Assembly'],
      languages: ['English (Native)', 'Spanish (Fluent)'],
      awards: [],
      hobbies: [],
      publications: [],
      extracurricular: [],
      volunteer: []
    })
  }
]

// Demo job applications for statistics
const demoJobs = [
  // Jobs for Software Engineer Resume (v1.0)
  { resume_version_id: 1, company: 'Google', position: 'Senior SWE', status: 'offer', applied_date: '2024-01-15' },
  { resume_version_id: 1, company: 'Meta', position: 'Software Engineer', status: 'interview', applied_date: '2024-01-20' },
  { resume_version_id: 1, company: 'Amazon', position: 'SDE II', status: 'interview', applied_date: '2024-01-25' },
  { resume_version_id: 1, company: 'Microsoft', position: 'Software Engineer', status: 'rejected', applied_date: '2024-02-01' },
  { resume_version_id: 1, company: 'Apple', position: 'Software Engineer', status: 'applied', applied_date: '2024-02-05' },
  
  // Jobs for Data Scientist Resume (v1.0)
  { resume_version_id: 2, company: 'Netflix', position: 'Senior Data Scientist', status: 'offer', applied_date: '2024-01-10' },
  { resume_version_id: 2, company: 'Airbnb', position: 'Data Scientist', status: 'offer', applied_date: '2024-01-18' },
  { resume_version_id: 2, company: 'Uber', position: 'ML Engineer', status: 'interview', applied_date: '2024-01-22' },
  { resume_version_id: 2, company: 'LinkedIn', position: 'Data Scientist', status: 'applied', applied_date: '2024-02-03' },
  
  // Jobs for Product Manager Resume (v1.0)
  { resume_version_id: 3, company: 'Stripe', position: 'Senior PM', status: 'interview', applied_date: '2024-01-12' },
  { resume_version_id: 3, company: 'Shopify', position: 'Product Manager', status: 'interview', applied_date: '2024-01-19' },
  { resume_version_id: 3, company: 'Salesforce', position: 'Product Manager', status: 'rejected', applied_date: '2024-01-28' },
  { resume_version_id: 3, company: 'Adobe', position: 'Senior PM', status: 'applied', applied_date: '2024-02-06' }
]

console.log('🌱 Seeding demo resume data...\n')

try {
  // Insert demo resumes
  const insertResume = db.prepare(`
    INSERT INTO resume_versions 
    (user_id, version_name, description, data_json, parent_version_id, 
     version_number, branch_name, is_active, is_favorite, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
  `)

  demoResumes.forEach((resume, index) => {
    const result = insertResume.run(
      1, // user_id
      resume.version_name,
      resume.description,
      resume.data_json,
      null, // parent_version_id
      resume.version_number,
      resume.branch_name,
      1, // is_active
      index === 0 ? 1 : 0, // is_favorite (first one is favorite)
      30 - (index * 10) // created days ago (30, 20, 10)
    )
    console.log(`✅ Created resume: ${resume.version_name} (ID: ${result.lastInsertRowid})`)
  })

  // Insert demo job applications
  const insertJob = db.prepare(`
    INSERT INTO job_applications 
    (user_id, company, position, status, location, job_url, notes, 
     resume_version_id, applied_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
  `)

  demoJobs.forEach((job, index) => {
    const daysAgo = Math.floor(Math.random() * 30) + 1
    const result = insertJob.run(
      1, // user_id
      job.company,
      job.position,
      job.status,
      'Remote', // location
      `https://${job.company.toLowerCase()}.com/careers`, // job_url
      `Applied with ${job.resume_version_id === 1 ? 'Software Engineer' : job.resume_version_id === 2 ? 'Data Scientist' : 'Product Manager'} resume`, // notes
      job.resume_version_id,
      job.applied_date,
      daysAgo
    )
    console.log(`✅ Created job application: ${job.company} - ${job.position} (${job.status})`)
  })

  console.log('\n🎉 Demo data seeded successfully!')
  console.log('\n📊 Summary:')
  console.log(`   - ${demoResumes.length} resume versions created`)
  console.log(`   - ${demoJobs.length} job applications created`)
  console.log('\n💡 You can now view the version history and lineage in the Resume Builder!')

} catch (error) {
  console.error('❌ Error seeding data:', error)
  process.exit(1)
} finally {
  db.close()
}

