/**
 * Script to regenerate the sample resume PDF
 * Run with: node scripts/regenerate-sample-pdf.js
 */

const fs = require('fs')
const path = require('path')

async function regenerateSamplePDF() {
  const baseUrl = 'http://localhost:3001'
  
  // Read the sample resume data
  const sampleDataPath = path.join(__dirname, '../public/samples/sample-resume-data.json')
  const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'))
  
  console.log('Generating sample resume PDF...')
  
  try {
    const response = await fetch(`${baseUrl}/api/generate-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to generate PDF: ${error}`)
    }

    // Save the PDF
    const pdfBuffer = await response.arrayBuffer()
    const outputPath = path.join(__dirname, '../public/samples/resumes/sample-resume.pdf')
    fs.writeFileSync(outputPath, Buffer.from(pdfBuffer))
    
    console.log('✓ Sample resume PDF generated successfully!')
    console.log(`  Saved to: ${outputPath}`)
  } catch (error) {
    console.error('✗ Error generating sample PDF:', error.message)
    process.exit(1)
  }
}

// Run the script
regenerateSamplePDF().catch(console.error)

