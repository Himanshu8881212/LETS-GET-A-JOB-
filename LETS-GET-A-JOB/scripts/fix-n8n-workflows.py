#!/usr/bin/env python3

"""
Fix n8n Workflow Input Configurations

This script fixes the AI Agent input in all 4 workflows to properly
read data from the webhook node.

Problem: AI Agent is trying to read $json.jobUrl but webhook data
is in $('Webhook').item.json.body.jobUrl

Solution: Update the AI Agent node's input expression for each workflow
"""

import sqlite3
import json
import os
from pathlib import Path

DB_PATH = Path.home() / '.n8n' / 'database.sqlite'

# Workflow fixes configuration
WORKFLOW_FIXES = [
    {
        'name': 'Job Desc',
        'description': 'Job Description Processing',
        'ai_agent_input': '={{ $("Webhook").item.json.body.jobUrl }}',
        'explanation': 'Reads jobUrl from webhook POST body'
    },
    {
        'name': 'Resume',
        'description': 'Resume PDF Processing',
        'ai_agent_input': '={{ $("Webhook").item.binary.data }}',
        'explanation': 'Reads PDF file from webhook binary upload (field name: data)'
    },
    {
        'name': 'Cover Letter',
        'description': 'Cover Letter PDF Processing',
        'ai_agent_input': '={{ $("Webhook").item.binary.data }}',
        'explanation': 'Reads PDF file from webhook binary upload (field name: data)'
    },
    {
        'name': 'Eval',
        'description': 'ATS Evaluation',
        'ai_agent_input': '={{ $("Webhook").item.json.body }}',
        'explanation': 'Reads entire body with resume_text, cover_letter_text, job_description'
    }
]

def fix_workflow(conn, config):
    """Fix a single workflow's AI Agent input"""
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"🔍 Fixing: {config['name']} ({config['description']})")
    
    try:
        # Get workflow
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, name, nodes FROM workflow_entity WHERE name = ?',
            (config['name'],)
        )
        row = cursor.fetchone()
        
        if not row:
            print(f"❌ Workflow \"{config['name']}\" not found\n")
            return False
        
        workflow_id, name, nodes_json = row
        
        # Parse nodes
        nodes = json.loads(nodes_json)
        
        # Find AI Agent node
        ai_agent_node = None
        for node in nodes:
            if node.get('type') == '@n8n/n8n-nodes-langchain.agent':
                ai_agent_node = node
                break
        
        if not ai_agent_node:
            print(f"❌ AI Agent node not found in workflow\n")
            return False
        
        # Show current input
        current_input = ai_agent_node.get('parameters', {}).get('text', 'Not set')
        print(f"   Current input: {current_input}")
        
        # Update input
        if 'parameters' not in ai_agent_node:
            ai_agent_node['parameters'] = {}
        ai_agent_node['parameters']['text'] = config['ai_agent_input']
        
        print(f"   New input:     {config['ai_agent_input']}")
        print(f"   Explanation:   {config['explanation']}")
        
        # Save workflow
        cursor.execute(
            'UPDATE workflow_entity SET nodes = ? WHERE id = ?',
            (json.dumps(nodes), workflow_id)
        )
        conn.commit()
        
        print(f"✅ Fixed successfully!\n")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}\n")
        return False

def main():
    print('🔧 n8n Workflow Input Fixer\n')
    print(f'📂 Database: {DB_PATH}\n')
    
    if not DB_PATH.exists():
        print(f'❌ Database not found at {DB_PATH}')
        print('   Make sure n8n is installed and has been run at least once.')
        return
    
    # Connect to database
    conn = sqlite3.connect(str(DB_PATH))
    print('✅ Connected to n8n database\n')
    
    success_count = 0
    fail_count = 0
    
    for config in WORKFLOW_FIXES:
        if fix_workflow(conn, config):
            success_count += 1
        else:
            fail_count += 1
    
    conn.close()
    
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"\n📊 Summary:")
    print(f"   ✅ Fixed: {success_count}")
    print(f"   ❌ Failed: {fail_count}")
    print(f"   📝 Total: {len(WORKFLOW_FIXES)}\n")
    
    if success_count == len(WORKFLOW_FIXES):
        print(f"🎉 All workflows fixed successfully!")
        print(f"\n🔄 Next steps:")
        print(f"   1. Restart n8n (if running)")
        print(f"   2. Test webhooks using: open scripts/test-n8n-webhooks.html")
        print(f"   3. Verify all 4 workflows return 200 OK\n")
    else:
        print(f"⚠️  Some workflows failed to fix. Check errors above.\n")

if __name__ == '__main__':
    main()

