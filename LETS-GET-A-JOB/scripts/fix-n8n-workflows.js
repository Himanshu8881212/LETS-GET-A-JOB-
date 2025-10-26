#!/usr/bin/env node

/**
 * Fix n8n Workflow Input Configurations
 *
 * This script fixes the AI Agent input in all 4 workflows to properly
 * read data from the webhook node.
 *
 * Problem: AI Agent is trying to read $json.jobUrl but webhook data
 * is in $('Webhook').item.json.body.jobUrl
 *
 * Solution: Update the AI Agent node's input expression for each workflow
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const DB_PATH = path.join(os.homedir(), '.n8n', 'database.sqlite');

console.log('🔧 n8n Workflow Input Fixer\n');
console.log(`📂 Database: ${DB_PATH}\n`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to n8n database\n');
});

// Workflow fixes configuration
const WORKFLOW_FIXES = [
  {
    name: 'Job Desc',
    description: 'Job Description Processing',
    aiAgentInput: '={{ $("Webhook").item.json.body.jobUrl }}',
    explanation: 'Reads jobUrl from webhook POST body'
  },
  {
    name: 'Resume',
    description: 'Resume PDF Processing',
    aiAgentInput: '={{ $("Webhook").item.binary.data }}',
    explanation: 'Reads PDF file from webhook binary upload (field name: data)'
  },
  {
    name: 'Cover Letter',
    description: 'Cover Letter PDF Processing',
    aiAgentInput: '={{ $("Webhook").item.binary.data }}',
    explanation: 'Reads PDF file from webhook binary upload (field name: data)'
  },
  {
    name: 'Eval',
    description: 'ATS Evaluation',
    aiAgentInput: '={{ $("Webhook").item.json.body }}',
    explanation: 'Reads entire body with resume_text, cover_letter_text, job_description'
  }
];

async function getWorkflow(name) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, name, nodes FROM workflow_entity WHERE name = ?',
      [name],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

async function updateWorkflow(id, nodes) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE workflow_entity SET nodes = ? WHERE id = ?',
      [JSON.stringify(nodes), id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function fixWorkflow(config) {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 Fixing: ${config.name} (${config.description})`);

  try {
    // Get workflow
    const workflow = await getWorkflow(config.name);

    if (!workflow) {
      console.log(`❌ Workflow "${config.name}" not found\n`);
      return false;
    }

    // Parse nodes
    const nodes = JSON.parse(workflow.nodes);

    // Find AI Agent node
    const aiAgentNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');

    if (!aiAgentNode) {
      console.log(`❌ AI Agent node not found in workflow\n`);
      return false;
    }

    // Show current input
    const currentInput = aiAgentNode.parameters.text || 'Not set';
    console.log(`   Current input: ${currentInput}`);

    // Update input
    aiAgentNode.parameters.text = config.aiAgentInput;
    console.log(`   New input:     ${config.aiAgentInput}`);
    console.log(`   Explanation:   ${config.explanation}`);

    // Save workflow
    await updateWorkflow(workflow.id, nodes);

    console.log(`✅ Fixed successfully!\n`);
    return true;

  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  let successCount = 0;
  let failCount = 0;

  for (const config of WORKFLOW_FIXES) {
    const success = await fixWorkflow(config);
    if (success) successCount++;
    else failCount++;
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${WORKFLOW_FIXES.length}\n`);

  if (successCount === WORKFLOW_FIXES.length) {
    console.log(`🎉 All workflows fixed successfully!`);
    console.log(`\n🔄 Next steps:`);
    console.log(`   1. Restart n8n (if running)`);
    console.log(`   2. Test webhooks using: open scripts/test-n8n-webhooks.html`);
    console.log(`   3. Verify all 4 workflows return 200 OK\n`);
  } else {
    console.log(`⚠️  Some workflows failed to fix. Check errors above.\n`);
  }

  db.close();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  db.close();
  process.exit(1);
});

