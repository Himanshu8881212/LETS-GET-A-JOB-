#!/usr/bin/env node

/**
 * Quick script to activate all n8n workflows
 */

const http = require('http');

const N8N_HOST = 'localhost';
const N8N_PORT = 5678;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

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

async function activateAllWorkflows() {
  console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   Activating n8n Workflows${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

  try {
    // Get all workflows
    console.log(`${colors.blue}Fetching workflows...${colors.reset}`);
    const response = await makeRequest('GET', '/api/v1/workflows');
    const workflows = response.data;

    if (!workflows || workflows.length === 0) {
      console.log(`${colors.yellow}No workflows found${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ Found ${workflows.length} workflows${colors.reset}\n`);

    let activated = 0;
    let alreadyActive = 0;
    let failed = 0;

    for (const workflow of workflows) {
      console.log(`${colors.cyan}${workflow.name}${colors.reset} (ID: ${workflow.id})`);

      if (workflow.active) {
        console.log(`  ${colors.green}✓ Already active${colors.reset}`);
        alreadyActive++;
        continue;
      }

      try {
        // Activate the workflow
        workflow.active = true;
        await makeRequest('PUT', `/api/v1/workflows/${workflow.id}`, workflow);
        console.log(`  ${colors.green}✓ Activated${colors.reset}`);
        activated++;
      } catch (error) {
        console.log(`  ${colors.red}✗ Failed: ${error.message}${colors.reset}`);
        failed++;
      }
    }

    console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}   Done!${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

    console.log(`${colors.green}✓ Activated: ${activated}${colors.reset}`);
    console.log(`${colors.blue}• Already active: ${alreadyActive}${colors.reset}`);
    if (failed > 0) {
      console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
    }

    console.log(`\n${colors.bright}Next step:${colors.reset}`);
    console.log(`Run: ${colors.cyan}npm run dev${colors.reset}\n`);

  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);

    if (error.message.includes('401') || error.message.includes('API-KEY')) {
      console.log(`\n${colors.yellow}Note: Your n8n instance requires authentication.${colors.reset}`);
      console.log(`Restart n8n with: ${colors.cyan}docker stop n8n && docker rm n8n${colors.reset}`);
      console.log(`${colors.cyan}docker run -d --name n8n -p 5678:5678 -e N8N_USER_MANAGEMENT_DISABLED=true -v n8n_data:/home/node/.n8n n8nio/n8n:latest${colors.reset}\n`);
    }

    process.exit(1);
  }
}

activateAllWorkflows();
