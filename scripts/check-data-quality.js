#!/usr/bin/env node

/**
 * Data Quality Check Script
 * Verifies that full text is being saved in the database
 */

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'job-tracker.db')

try {
  const db = new Database(DB_PATH, { readonly: true })

  console.log('📊 DATABASE DATA QUALITY REPORT\n')
  console.log('=' .repeat(60))

  // Check ATS Evaluations
  const evaluations = db.prepare(`
    SELECT 
      id,
      LENGTH(job_description_text) as jd_length,
      LENGTH(resume_text) as resume_length,
      LENGTH(cover_letter_text) as cover_letter_length,
      created_at
    FROM ats_evaluations
    ORDER BY created_at DESC
    LIMIT 10
  `).all()

  console.log('\n📝 ATS EVALUATIONS (Last 10):')
  console.log('-'.repeat(60))
  
  if (evaluations.length === 0) {
    console.log('⚠️  No evaluations found in database')
  } else {
    evaluations.forEach(eval => {
      console.log(`\nID: ${eval.id} | Date: ${eval.created_at}`)
      console.log(`  Job Description: ${eval.jd_length} characters`)
      console.log(`  Resume: ${eval.resume_length} characters`)
      console.log(`  Cover Letter: ${eval.cover_letter_length} characters`)
      
      // Flag potential issues
      if (eval.jd_length < 500) {
        console.log('  ⚠️  WARNING: Job description seems too short (< 500 chars)')
      }
      if (eval.resume_length < 1000) {
        console.log('  ⚠️  WARNING: Resume seems too short (< 1000 chars)')
      }
      if (eval.cover_letter_length < 500) {
        console.log('  ⚠️  WARNING: Cover letter seems too short (< 500 chars)')
      }
    })
  }

  // Check Job Applications
  const jobs = db.prepare(`
    SELECT 
      id,
      company,
      position,
      LENGTH(job_description) as jd_length,
      resume_version_id,
      cover_letter_version_id,
      created_at
    FROM job_applications
    ORDER BY created_at DESC
    LIMIT 10
  `).all()

  console.log('\n\n💼 JOB APPLICATIONS (Last 10):')
  console.log('-'.repeat(60))
  
  if (jobs.length === 0) {
    console.log('⚠️  No job applications found in database')
  } else {
    jobs.forEach(job => {
      console.log(`\nID: ${job.id} | ${job.company} - ${job.position}`)
      console.log(`  Job Description: ${job.jd_length || 0} characters`)
      console.log(`  Resume Version ID: ${job.resume_version_id || 'None'}`)
      console.log(`  Cover Letter Version ID: ${job.cover_letter_version_id || 'None'}`)
      
      if (!job.resume_version_id) {
        console.log('  ⚠️  WARNING: No resume version linked')
      }
      if (!job.cover_letter_version_id) {
        console.log('  ⚠️  WARNING: No cover letter version linked')
      }
    })
  }

  // Check Resume Versions
  const resumes = db.prepare(`
    SELECT 
      id,
      version_name,
      LENGTH(data_json) as data_size,
      created_at
    FROM resume_versions
    ORDER BY created_at DESC
    LIMIT 5
  `).all()

  console.log('\n\n📄 RESUME VERSIONS (Last 5):')
  console.log('-'.repeat(60))
  
  if (resumes.length === 0) {
    console.log('⚠️  No resume versions found in database')
  } else {
    resumes.forEach(resume => {
      console.log(`\nID: ${resume.id} | ${resume.version_name}`)
      console.log(`  Data Size: ${resume.data_size} characters`)
      
      if (resume.data_size < 500) {
        console.log('  ⚠️  WARNING: Resume data seems too small')
      }
    })
  }

  // Check Cover Letter Versions
  const coverLetters = db.prepare(`
    SELECT 
      id,
      version_name,
      LENGTH(data_json) as data_size,
      created_at
    FROM cover_letter_versions
    ORDER BY created_at DESC
    LIMIT 5
  `).all()

  console.log('\n\n✉️  COVER LETTER VERSIONS (Last 5):')
  console.log('-'.repeat(60))
  
  if (coverLetters.length === 0) {
    console.log('⚠️  No cover letter versions found in database')
  } else {
    coverLetters.forEach(cl => {
      console.log(`\nID: ${cl.id} | ${cl.version_name}`)
      console.log(`  Data Size: ${cl.data_size} characters`)
      
      if (cl.data_size < 300) {
        console.log('  ⚠️  WARNING: Cover letter data seems too small')
      }
    })
  }

  // Summary Statistics
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM ats_evaluations) as total_evaluations,
      (SELECT COUNT(*) FROM job_applications) as total_jobs,
      (SELECT COUNT(*) FROM resume_versions) as total_resumes,
      (SELECT COUNT(*) FROM cover_letter_versions) as total_cover_letters
  `).get()

  console.log('\n\n📈 SUMMARY STATISTICS:')
  console.log('='.repeat(60))
  console.log(`Total ATS Evaluations: ${stats.total_evaluations}`)
  console.log(`Total Job Applications: ${stats.total_jobs}`)
  console.log(`Total Resume Versions: ${stats.total_resumes}`)
  console.log(`Total Cover Letter Versions: ${stats.total_cover_letters}`)

  console.log('\n✅ Data quality check complete!\n')

  db.close()
} catch (error) {
  if (error.code === 'SQLITE_CANTOPEN') {
    console.log('⚠️  Database file not found. Run the app first to create it.')
  } else {
    console.error('❌ Error:', error.message)
  }
  process.exit(1)
}

