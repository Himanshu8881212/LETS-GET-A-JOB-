-- SQL Script to Fix n8n Workflow Input Configurations
-- This fixes the AI Agent input to properly read from webhook body

-- Backup current workflows first
-- Run this in n8n database: ~/.n8n/database.sqlite

-- Fix 1: Job Description Workflow
-- Change AI Agent input from $json.jobUrl to $('Webhook').item.json.body.jobUrl
UPDATE workflow_entity
SET nodes = json_replace(
  nodes,
  '$[0].parameters.text',
  '={{ $("Webhook").item.json.body.jobUrl }}'
)
WHERE name = 'Job Desc';

-- Fix 2: Resume Workflow  
-- Change AI Agent input to read from webhook file upload
-- The file comes in as $('Webhook').item.binary.data
UPDATE workflow_entity
SET nodes = json_replace(
  nodes,
  '$[0].parameters.text',
  '={{ $("Webhook").item.binary.data }}'
)
WHERE name = 'Resume';

-- Fix 3: Cover Letter Workflow
-- Change AI Agent input to read from webhook file upload
UPDATE workflow_entity
SET nodes = json_replace(
  nodes,
  '$[0].parameters.text',
  '={{ $("Webhook").item.binary.data }}'
)
WHERE name = 'Cover Letter';

-- Fix 4: ATS Evaluation Workflow
-- Change AI Agent input to read all three fields from webhook body
-- Input should be: resume_text, cover_letter_text, job_description
UPDATE workflow_entity
SET nodes = json_replace(
  nodes,
  '$[0].parameters.text',
  '={{ $("Webhook").item.json.body }}'
)
WHERE name = 'Eval';

-- Verify the changes
SELECT name, 
       json_extract(nodes, '$[0].parameters.text') as ai_agent_input
FROM workflow_entity
WHERE name IN ('Job Desc', 'Resume', 'Cover Letter', 'Eval');

