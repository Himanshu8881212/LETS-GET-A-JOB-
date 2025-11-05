#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Connect to database
const db = new sqlite3.Database(path.join(__dirname, '../data/app.db'));

// Get the first resume
db.get(
  `SELECT data_json FROM resume_versions 
   WHERE version_name LIKE '%Senior Software Engineer Resume%' OR version_name LIKE '%Alexander%' 
   ORDER BY created_at DESC LIMIT 1`,
  async (err, row) => {
    if (err) {
      console.error('Error fetching resume:', err);
      return;
    }
    
    if (row) {
      const resumeData = JSON.parse(row.data_json);
      
      // Call the API to generate PDF
      const response = await fetch('http://localhost:3000/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(
          path.join(__dirname, '../public/samples/resumes/01-sample-resume.pdf'),
          Buffer.from(buffer)
        );
        console.log('✅ Sample resume generated: public/samples/resumes/01-sample-resume.pdf');
      } else {
        console.error('❌ Failed to generate resume PDF');
      }
    }
  }
);

// Get the first cover letter
db.get(
  `SELECT data_json FROM cover_letter_versions 
   WHERE version_name LIKE '%TechCorp%' OR version_name LIKE '%Alexander%' 
   ORDER BY created_at DESC LIMIT 1`,
  async (err, row) => {
    if (err) {
      console.error('Error fetching cover letter:', err);
      db.close();
      return;
    }
    
    if (row) {
      const coverLetterData = JSON.parse(row.data_json);
      
      // Transform to API format
      const apiData = {
        personalInfo: coverLetterData.personalInfo || {},
        recipient: coverLetterData.recipientInfo || {},
        content: {
          opening: coverLetterData.openingParagraph || '',
          bodyParagraphs: coverLetterData.bodyParagraphs || [],
          closing: coverLetterData.closingParagraph || ''
        }
      };
      
      // Call the API to generate PDF
      const response = await fetch('http://localhost:3000/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(
          path.join(__dirname, '../public/samples/cover-letters/01-sample-cover-letter.pdf'),
          Buffer.from(buffer)
        );
        console.log('✅ Sample cover letter generated: public/samples/cover-letters/01-sample-cover-letter.pdf');
      } else {
        console.error('❌ Failed to generate cover letter PDF');
      }
    }
    
    db.close();
  }
);

