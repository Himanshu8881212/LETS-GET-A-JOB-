# Resume Generation Scripts

This directory contains scripts to help you generate resumes programmatically.

## 📄 Available Scripts

### `generate-full-resume.js`

Generates a **complete resume with ALL sections filled in** with realistic example data.

**Usage:**

```bash
# Make sure the dev server is running first
npm run dev

# In another terminal, run:
npm run generate:full-resume
```

**What it generates:**

- ✅ Personal Information (Name, Email, Phone, LinkedIn, GitHub, Website)
- ✅ Professional Summary
- ✅ Skills (6 categories: Languages, Frontend, Backend, Databases, Cloud & DevOps, Tools)
- ✅ Experience (3 positions with detailed bullet points)
- ✅ Projects (2 projects with descriptions and bullets)
- ✅ Education (2 degrees with GPA)
- ✅ Certifications (3 professional certifications)
- ✅ Languages (3 languages with proficiency levels)
- ✅ Awards (3 awards with descriptions)
- ✅ Publications (2 academic publications)
- ✅ Extracurricular Activities (3 activities)
- ✅ Volunteer Experience (2 volunteer roles)
- ✅ Hobbies & Interests (4 hobbies)

**Output:**

The script generates a PDF file: `complete-resume-example.pdf` in the project root.

---

## 🛠️ Creating Your Own Script

You can create your own script to generate custom resumes. Here's a template:

```javascript
#!/usr/bin/env node

const myResumeData = {
  personalInfo: {
    firstName: 'Your',
    lastName: 'Name',
    email: 'your.email@example.com',
    phone: '+1 (555) 000-0000',
    linkedin: 'linkedin.com/in/yourname',
    github: 'github.com/yourname',
    website: 'yourwebsite.com',
    city: 'Your City, State'
  },

  summary: 'Your professional summary here...',

  skillCategories: [
    { name: 'Category 1', skills: 'Skill1, Skill2, Skill3' },
    { name: 'Category 2', skills: 'Skill4, Skill5, Skill6' }
  ],

  experiences: [
    {
      title: 'Job Title',
      company: 'Company Name',
      location: 'City, State',
      dates: 'Start Date -- End Date',
      bullets: [
        'Achievement 1',
        'Achievement 2',
        'Achievement 3'
      ]
    }
  ],

  projects: [
    {
      title: 'Project Name',
      description: 'Brief description',
      bullets: [
        'Feature 1',
        'Feature 2'
      ]
    }
  ],

  education: [
    {
      degree: 'Degree Name',
      institution: 'University Name',
      location: 'City, State',
      dates: 'Start Year -- End Year',
      gpa: '3.8/4.0'
    }
  ],

  certifications: [
    'Certification 1',
    'Certification 2'
  ],

  languages: [
    'Language 1 - Proficiency',
    'Language 2 - Proficiency'
  ],

  awards: [
    'Award 1 - Description',
    'Award 2 - Description'
  ],

  publications: [
    'Publication 1 citation',
    'Publication 2 citation'
  ],

  extracurricular: [
    'Activity 1 - Description',
    'Activity 2 - Description'
  ],

  volunteer: [
    'Volunteer Role 1 - Description',
    'Volunteer Role 2 - Description'
  ],

  hobbies: [
    'Hobby 1',
    'Hobby 2',
    'Hobby 3'
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

async function generateMyResume() {
  const response = await fetch('http://localhost:3001/api/generate-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(myResumeData),
  })

  const buffer = await response.arrayBuffer()
  const fs = require('fs')
  fs.writeFileSync('my-resume.pdf', Buffer.from(buffer))
  console.log('✅ Resume generated: my-resume.pdf')
}

generateMyResume()
```

---

## 💡 Tips

1. **Enable/Disable Sections**: Set `enabled: false` in `sectionOrder` to hide sections
2. **Reorder Sections**: Change the order in the `sectionOrder` array
3. **Dynamic Content**: Only include sections with data - empty sections won't appear
4. **Bullet Points**: Add as many bullets as needed - the system is fully dynamic
5. **Multiple Experiences**: Add as many experiences, projects, or education entries as you want

---

## 🚀 Quick Start

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Generate a full example resume:
   ```bash
   npm run generate:full-resume
   ```

3. Open `complete-resume-example.pdf` to see the result!

---

## 📝 Notes

- The dev server must be running on `http://localhost:3001` for scripts to work
- Scripts use the same API endpoint as the web interface
- Generated PDFs are saved in the project root directory
- All sections are optional - only filled sections will appear in the PDF

