// Test script to generate a complete cover letter with all sections

const fullCoverLetterData = {
  personalInfo: {
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/sarahchen',
    address: 'San Francisco, CA'
  },
  recipient: {
    hiringManager: 'John Smith',
    company: 'Tech Innovations Inc.',
    address: '123 Innovation Drive',
    city: 'San Francisco, CA 94105',
    role: 'Senior Software Engineer'
  },
  content: {
    opening: 'I am writing to express my strong interest in the Senior Software Engineer position at Tech Innovations Inc. With over 8 years of experience in full-stack development and a proven track record of delivering scalable solutions, I am excited about the opportunity to contribute to your team.',
    bodyParagraphs: [
      'In my current role as Lead Software Engineer at DataFlow Systems, I have successfully led the development of a microservices architecture that improved system performance by 40% and reduced deployment time by 60%. My expertise in React, Node.js, and cloud technologies has enabled me to build robust applications that serve over 2 million users daily.',
      'What particularly excites me about Tech Innovations Inc. is your commitment to pushing the boundaries of AI-driven solutions. My recent work on implementing machine learning models for predictive analytics aligns perfectly with your company\'s vision. I have experience working with TensorFlow and PyTorch, and I\'m passionate about leveraging AI to solve real-world problems.',
      'Beyond technical skills, I bring strong leadership and collaboration abilities. I have mentored junior developers, conducted code reviews, and fostered a culture of continuous learning within my team. I believe in writing clean, maintainable code and following best practices to ensure long-term project success.'
    ],
    closing: 'I am enthusiastic about the possibility of bringing my technical expertise and passion for innovation to Tech Innovations Inc. I would welcome the opportunity to discuss how my background and skills align with your team\'s needs. Thank you for considering my application.'
  }
}

// Function to call the API
async function generateCoverLetter() {
  console.log('🚀 Generating complete cover letter...\n')

  try {
    const response = await fetch('http://localhost:3000/api/generate-cover-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullCoverLetterData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate cover letter')
    }

    // Save the PDF
    const buffer = await response.arrayBuffer()
    const fs = require('fs')
    const path = require('path')
    
    const outputPath = path.join(__dirname, '..', 'complete-cover-letter-example.pdf')
    fs.writeFileSync(outputPath, Buffer.from(buffer))

    console.log('✅ Cover letter generated successfully!')
    console.log(`📄 Saved to: ${outputPath}`)
    console.log('\n📊 Cover letter includes:')
    console.log(`   ✓ Personal Info: ${fullCoverLetterData.personalInfo.firstName} ${fullCoverLetterData.personalInfo.lastName}`)
    console.log(`   ✓ Recipient: ${fullCoverLetterData.recipient.hiringManager} at ${fullCoverLetterData.recipient.company}`)
    console.log(`   ✓ Opening paragraph`)
    console.log(`   ✓ Body paragraphs: ${fullCoverLetterData.content.bodyParagraphs.length}`)
    console.log(`   ✓ Closing paragraph`)
    console.log(`   ✓ Signature`)
    console.log('\n🎉 Cover letter complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the function
generateCoverLetter()

