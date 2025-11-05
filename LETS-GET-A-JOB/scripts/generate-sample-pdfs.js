#!/usr/bin/env node

/**
 * Script to generate sample PDF files for resume and cover letter
 * These are static files that are NOT connected to the application database
 */

const fs = require('fs');
const path = require('path');

async function generateSamplePDFs() {
  console.log('🚀 Starting sample PDF generation...\n');

  // Read sample data files
  const resumeDataPath = path.join(__dirname, '../public/samples/sample-resume-data.json');
  const coverLetterDataPath = path.join(__dirname, '../public/samples/sample-cover-letter-data.json');

  if (!fs.existsSync(resumeDataPath)) {
    console.error('❌ Error: sample-resume-data.json not found');
    process.exit(1);
  }

  if (!fs.existsSync(coverLetterDataPath)) {
    console.error('❌ Error: sample-cover-letter-data.json not found');
    process.exit(1);
  }

  const resumeData = JSON.parse(fs.readFileSync(resumeDataPath, 'utf-8'));
  const coverLetterData = JSON.parse(fs.readFileSync(coverLetterDataPath, 'utf-8'));

  console.log('✅ Sample data files loaded successfully\n');

  // Generate Resume PDF
  console.log('📄 Generating sample resume PDF...');
  try {
    const resumeResponse = await fetch('http://localhost:3000/api/generate-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resumeData),
    });

    if (!resumeResponse.ok) {
      const error = await resumeResponse.text();
      throw new Error(`Resume generation failed: ${error}`);
    }

    const resumeBuffer = await resumeResponse.arrayBuffer();
    const resumePath = path.join(__dirname, '../public/samples/resumes/sample-resume.pdf');
    
    // Ensure directory exists
    const resumeDir = path.dirname(resumePath);
    if (!fs.existsSync(resumeDir)) {
      fs.mkdirSync(resumeDir, { recursive: true });
    }

    fs.writeFileSync(resumePath, Buffer.from(resumeBuffer));
    console.log('✅ Sample resume PDF generated successfully');
    console.log(`   Location: ${resumePath}\n`);
  } catch (error) {
    console.error('❌ Error generating resume PDF:', error.message);
    process.exit(1);
  }

  // Generate Cover Letter PDF
  console.log('📄 Generating sample cover letter PDF...');
  try {
    // Transform data to API format
    const coverLetterApiData = {
      personalInfo: coverLetterData.personalInfo,
      recipient: coverLetterData.recipientInfo,
      content: {
        opening: coverLetterData.openingParagraph,
        bodyParagraphs: coverLetterData.bodyParagraphs,
        closing: coverLetterData.closingParagraph,
      },
      date: coverLetterData.date,
    };

    const coverLetterResponse = await fetch('http://localhost:3000/api/generate-cover-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(coverLetterApiData),
    });

    if (!coverLetterResponse.ok) {
      const error = await coverLetterResponse.text();
      throw new Error(`Cover letter generation failed: ${error}`);
    }

    const coverLetterBuffer = await coverLetterResponse.arrayBuffer();
    const coverLetterPath = path.join(__dirname, '../public/samples/cover-letters/sample-cover-letter.pdf');
    
    // Ensure directory exists
    const coverLetterDir = path.dirname(coverLetterPath);
    if (!fs.existsSync(coverLetterDir)) {
      fs.mkdirSync(coverLetterDir, { recursive: true });
    }

    fs.writeFileSync(coverLetterPath, Buffer.from(coverLetterBuffer));
    console.log('✅ Sample cover letter PDF generated successfully');
    console.log(`   Location: ${coverLetterPath}\n`);
  } catch (error) {
    console.error('❌ Error generating cover letter PDF:', error.message);
    process.exit(1);
  }

  console.log('🎉 All sample PDFs generated successfully!\n');
  console.log('📁 Sample files location:');
  console.log('   - public/samples/resumes/sample-resume.pdf');
  console.log('   - public/samples/cover-letters/sample-cover-letter.pdf\n');
}

// Run the script
generateSamplePDFs().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

