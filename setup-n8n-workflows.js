#!/usr/bin/env node

/**
 * n8n Workflow Setup Script
 *
 * This script:
 * 1. Prompts for n8n API key and workflow API keys (Groq and Tavily)
 * 2. Creates credentials in n8n
 * 3. Imports workflows from n8n-workflows folder
 * 4. Updates workflows to use the created credentials
 * 5. Activates workflows in PRODUCTION mode
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const http = require('http');

// Configuration
const N8N_HOST = 'localhost';
const N8N_PORT = 5678;
const N8N_BASE_URL = `http://${N8N_HOST}:${N8N_PORT}`;
const WORKFLOWS_DIR = path.join(__dirname, 'n8n-workflows');

let N8N_API_KEY = null;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper function to make HTTP requests to n8n API
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: N8N_HOST,
      port: N8N_PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add API key if available
    if (N8N_API_KEY) {
      options.headers['X-N8N-API-KEY'] = N8N_API_KEY;
    }

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonBody.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Create readline interface for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Prompt user for input
function prompt(question) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Check if n8n is running and test API access
async function checkN8nAccess() {
  console.log(`${colors.blue}Checking n8n connection...${colors.reset}`);
  try {
    await makeRequest('GET', '/healthz');
    console.log(`${colors.green}✓ n8n is running${colors.reset}`);

    // Test API access
    try {
      await makeRequest('GET', '/api/v1/workflows');
      console.log(`${colors.green}✓ API access working${colors.reset}\n`);
      return true;
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('API-KEY')) {
        console.log(`${colors.yellow}⚠ API authentication required${colors.reset}\n`);
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.log(`${colors.red}✗ n8n is not running at ${N8N_BASE_URL}${colors.reset}`);
    console.log(`${colors.yellow}Please start n8n first with: docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n:latest${colors.reset}\n`);
    return null;
  }
}

// Print instructions for getting n8n API key
function printApiKeyInstructions() {
  console.log(`${colors.bright}${colors.yellow}n8n API Key Required${colors.reset}\n`);
  console.log(`${colors.bright}Option 1: Restart n8n without authentication (Recommended)${colors.reset}`);
  console.log(`Stop and restart n8n with authentication disabled:\n`);
  console.log(`${colors.cyan}docker stop n8n && docker rm n8n${colors.reset}`);
  console.log(`${colors.cyan}docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest${colors.reset}`);
  console.log(`\nThen run this script again.\n`);
  console.log(`${colors.bright}Option 2: Use API key${colors.reset}`);
  console.log(`1. Open n8n at ${colors.cyan}${N8N_BASE_URL}${colors.reset}`);
  console.log(`2. Complete initial setup (create owner account)`);
  console.log(`3. Go to: ${colors.cyan}Settings → API${colors.reset}`);
  console.log(`4. Click ${colors.cyan}"Create an API key"${colors.reset}`);
  console.log(`5. Copy and paste it below\n`);
}

// Create Groq credential
async function createGroqCredential(apiKey) {
  console.log(`${colors.blue}Creating Groq credential...${colors.reset}`);

  const credentialData = {
    name: 'Groq account',
    type: 'groqApi',
    data: {
      apiKey: apiKey,
    },
  };

  try {
    const result = await makeRequest('POST', '/api/v1/credentials', credentialData);
    console.log(`${colors.green}✓ Groq credential created (ID: ${result.id})${colors.reset}`);
    return result.id;
  } catch (error) {
    console.log(`${colors.yellow}⚠ Could not create Groq credential: ${error.message}${colors.reset}`);
    // Try to find existing credential
    try {
      const credentials = await makeRequest('GET', '/api/v1/credentials');
      const existingCred = credentials.data.find(c => c.type === 'groqApi' && c.name === 'Groq account');
      if (existingCred) {
        console.log(`${colors.green}✓ Using existing Groq credential (ID: ${existingCred.id})${colors.reset}`);
        return existingCred.id;
      }
    } catch (e) {
      // Ignore
    }
    throw error;
  }
}

// Update workflow to use credentials
async function updateWorkflowCredentials(workflowId, groqCredId) {
  try {
    // Get the workflow
    const workflow = await makeRequest('GET', `/api/v1/workflows/${workflowId}`);

    let updated = false;

    // Update Groq credentials in all nodes
    workflow.nodes.forEach(node => {
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatGroq') {
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials.groqApi = {
          id: groqCredId,
          name: 'Groq account',
        };
        updated = true;
      }
    });

    if (updated) {
      // Clean workflow for PUT - only include accepted properties (NOT active - it's read-only)
      const cleanWorkflow = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
      };
      if (workflow.staticData) {
        cleanWorkflow.staticData = workflow.staticData;
      }
      if (workflow.tags && workflow.tags.length > 0) {
        cleanWorkflow.tags = workflow.tags;
      }

      // Update the workflow using PUT
      await makeRequest('PUT', `/api/v1/workflows/${workflowId}`, cleanWorkflow);
      console.log(`  ${colors.green}✓ Credentials configured${colors.reset}`);
    } else {
      console.log(`  ${colors.blue}• No credentials to update${colors.reset}`);
    }

    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Import workflow
async function importWorkflow(workflowPath) {
  const workflowName = path.basename(workflowPath, '.json');
  console.log(`\n${colors.cyan}Importing workflow: ${workflowName}${colors.reset}`);

  try {
    // Read workflow file
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // Remove metadata properties that n8n API doesn't accept
    delete workflowData.id;
    delete workflowData.versionId;
    delete workflowData.meta;
    delete workflowData.updatedAt;
    delete workflowData.createdAt;

    // Clean up tags if empty
    if (workflowData.tags && workflowData.tags.length === 0) {
      delete workflowData.tags;
    }

    // Create clean workflow object with only accepted properties
    // NOTE: 'active' is read-only during creation, we'll activate it separately
    const cleanWorkflow = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {},
    };

    // Add optional properties if they exist
    if (workflowData.staticData) {
      cleanWorkflow.staticData = workflowData.staticData;
    }
    if (workflowData.tags && workflowData.tags.length > 0) {
      cleanWorkflow.tags = workflowData.tags;
    }

    // Import the workflow
    const result = await makeRequest('POST', '/api/v1/workflows', cleanWorkflow);
    console.log(`${colors.green}✓ Workflow imported (ID: ${result.id})${colors.reset}`);

    return result.id;
  } catch (error) {
    console.log(`${colors.red}✗ Failed to import workflow: ${error.message}${colors.reset}`);
    return null;
  }
}

// Activate workflow
async function activateWorkflow(workflowId) {
  try {
    // Try to activate using PATCH with only the active field
    await makeRequest('PATCH', `/api/v1/workflows/${workflowId}`, { active: true });
    console.log(`  ${colors.green}✓ Activated (production mode)${colors.reset}`);
    return true;
  } catch (patchError) {
    // If PATCH fails, try alternative: GET full workflow, clean it, and PUT back with modifications
    try {
      const workflow = await makeRequest('GET', `/api/v1/workflows/${workflowId}`);

      // Manually toggle via web interface or use settings
      // Since active is read-only, we can't set it via API
      // Workflows imported should already be inactive by default
      console.log(`  ${colors.yellow}⚠ Cannot activate via API (active field is read-only)${colors.reset}`);
      console.log(`  ${colors.yellow}  Please activate manually at http://localhost:5678${colors.reset}`);
      return false;
    } catch (error) {
      console.log(`  ${colors.red}✗ Failed: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

// Main setup function
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   n8n Workflow Setup Script${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

  // Check if n8n is running and test API access
  const accessStatus = await checkN8nAccess();
  if (accessStatus === null) {
    process.exit(1);
  }

  // If API access requires authentication, prompt for API key
  if (accessStatus === false) {
    printApiKeyInstructions();
    N8N_API_KEY = await prompt('Enter your n8n API key: ');

    if (!N8N_API_KEY) {
      console.log(`${colors.red}✗ n8n API key is required${colors.reset}`);
      process.exit(1);
    }

    // Test the API key
    console.log(`${colors.blue}Testing API key...${colors.reset}`);
    try {
      await makeRequest('GET', '/api/v1/workflows');
      console.log(`${colors.green}✓ API key is valid${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}✗ Invalid API key: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  // Prompt for workflow API keys
  console.log(`${colors.bright}Workflow API Keys Setup${colors.reset}`);
  console.log(`${colors.yellow}You'll need a Groq API key for the workflows to function.${colors.reset}\n`);

  const groqApiKey = await prompt('Enter your Groq API key (get from https://console.groq.com/keys): ');
  if (!groqApiKey) {
    console.log(`${colors.red}✗ Groq API key is required${colors.reset}`);
    process.exit(1);
  }

  console.log('');

  // Create Groq credential
  let groqCredId;
  try {
    groqCredId = await createGroqCredential(groqApiKey);
  } catch (error) {
    console.log(`${colors.red}✗ Failed to create Groq credential: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  console.log('');

  // Get workflow files
  const workflowFiles = [
    'Cover Letter.json',
    'Eval.json',
    'Job Desc.json',
    'Resume.json',
  ];

  // Step 1: Import all workflows
  console.log(`${colors.bright}Step 1: Importing Workflows${colors.reset}\n`);

  const importedWorkflows = [];

  for (const filename of workflowFiles) {
    const workflowPath = path.join(WORKFLOWS_DIR, filename);

    if (!fs.existsSync(workflowPath)) {
      console.log(`${colors.yellow}⚠ Workflow file not found: ${filename}${colors.reset}`);
      continue;
    }

    const workflowId = await importWorkflow(workflowPath);

    if (workflowId) {
      importedWorkflows.push({ filename, id: workflowId });
    }
  }

  if (importedWorkflows.length === 0) {
    console.log(`${colors.red}✗ No workflows were imported${colors.reset}`);
    process.exit(1);
  }

  // Step 2: Update credentials in all workflows
  console.log(`\n${colors.bright}Step 2: Configuring Credentials${colors.reset}\n`);

  let credentialsUpdated = 0;
  for (const { filename, id } of importedWorkflows) {
    console.log(`${colors.cyan}${filename}${colors.reset}`);
    const success = await updateWorkflowCredentials(id, groqCredId);
    if (success) {
      credentialsUpdated++;
    }
  }

  console.log(`${colors.green}✓ Configured credentials for ${credentialsUpdated}/${importedWorkflows.length} workflows${colors.reset}`);

  // Step 3: Activate all workflows
  console.log(`\n${colors.bright}Step 3: Activating Workflows${colors.reset}\n`);

  let activated = 0;
  for (const { filename, id } of importedWorkflows) {
    console.log(`${colors.cyan}${filename}${colors.reset}`);
    const success = await activateWorkflow(id);
    if (success) {
      activated++;
    }
  }

  console.log(`${colors.green}✓ Activated ${activated}/${importedWorkflows.length} workflows${colors.reset}`);

  // Summary
  console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.green}   Setup Complete!${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Imported:      ${importedWorkflows.length} workflows${colors.reset}`);
  console.log(`  ${colors.green}✓ Configured:    ${credentialsUpdated} workflows${colors.reset}`);
  console.log(`  ${colors.green}✓ Activated:     ${activated} workflows${colors.reset}\n`);

  if (activated === importedWorkflows.length) {
    console.log(`${colors.green}${colors.bright}All workflows are ready and running in production mode!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some workflows failed to activate. Check errors above.${colors.reset}\n`);
  }

  console.log(`${colors.bright}Imported Workflows:${colors.reset}`);
  importedWorkflows.forEach(({ filename, id }) => {
    console.log(`  • ${filename} ${colors.dim}(${id})${colors.reset}`);
  });

  console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
  console.log(`1. Start your application: ${colors.cyan}npm run dev${colors.reset}`);
  console.log(`2. Test the webhooks to verify they work`);
  console.log(`3. Check workflows at: ${colors.cyan}${N8N_BASE_URL}${colors.reset}\n`);

  console.log(`${colors.bright}Webhook Endpoints:${colors.reset}`);
  console.log(`  • Job Description:   ${N8N_BASE_URL}/webhook/process-jd`);
  console.log(`  • Resume:            ${N8N_BASE_URL}/webhook/process-resume`);
  console.log(`  • Cover Letter:      ${N8N_BASE_URL}/webhook/process-cover-letter`);
  console.log(`  • ATS Evaluation:    ${N8N_BASE_URL}/webhook/evaluate-ats`);
  console.log('');
}

// Run the script
main().catch((error) => {
  console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
