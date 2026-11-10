#!/bin/bash
#
# Example: AI Agent Virtual Environment Setup for Robert Extension Testing
#
# This script demonstrates how an AI agent can configure the Robert extension
# with Jira connection settings via environment variables in a virtual/automated environment.
#
# Usage:
#   source test/example-ai-agent-setup.sh
#   # or
#   bash test/example-ai-agent-setup.sh
#

set -e

echo "🤖 Setting up Robert Extension for AI Agent Testing"
echo "=================================================="

# Jira Configuration for the AI agent's testing environment
# In a real scenario, these would come from secrets management system:
export ROBERT_JIRA_EMAIL="${JIRA_EMAIL:-}"
export ROBERT_JIRA_API_TOKEN="${JIRA_API_TOKEN:-}"
export ROBERT_JIRA_BASE_URL="${JIRA_BASE_URL:-https://your-site.atlassian.net}"
export ROBERT_JIRA_PROJECT_KEY="${JIRA_PROJECT_KEY:-DSS}"

# Extension Debug Settings
export ROBERT_DEBUG_MODE="true"
export ROBERT_AUTO_REFRESH="true"

# Collaboration Settings (usually disabled for automated testing)
export ROBERT_COLLABORATION_ENABLED="false"
export ROBERT_COLLABORATION_AUTO_CONNECT="false"

# Show configuration (without exposing sensitive API token)
echo ""
echo "✅ Environment Variables Configured:"
echo "   • ROBERT_JIRA_BASE_URL: $ROBERT_JIRA_BASE_URL"
echo "   • ROBERT_JIRA_EMAIL: $ROBERT_JIRA_EMAIL"
echo "   • ROBERT_JIRA_PROJECT_KEY: $ROBERT_JIRA_PROJECT_KEY"
echo "   • ROBERT_JIRA_API_TOKEN: ${ROBERT_JIRA_API_TOKEN:+***$(echo $ROBERT_JIRA_API_TOKEN | tail -c 4)}"
echo "   • ROBERT_DEBUG_MODE: $ROBERT_DEBUG_MODE"
echo "   • ROBERT_COLLABORATION_ENABLED: $ROBERT_COLLABORATION_ENABLED"
echo ""

# Validation
if [ -z "$ROBERT_JIRA_EMAIL" ]; then
    echo "⚠️  Warning: ROBERT_JIRA_EMAIL is not set"
    echo "   Set JIRA_EMAIL environment variable before sourcing this script"
    exit 1
fi

if [ -z "$ROBERT_JIRA_API_TOKEN" ]; then
    echo "⚠️  Warning: ROBERT_JIRA_API_TOKEN is not set"
    echo "   Set JIRA_API_TOKEN environment variable before sourcing this script"
    exit 1
fi

if [ -z "$ROBERT_JIRA_PROJECT_KEY" ]; then
    echo "⚠️  Warning: ROBERT_JIRA_PROJECT_KEY is not set"
    echo "   Set JIRA_PROJECT_KEY environment variable before sourcing this script"
    exit 1
fi

echo "✅ Robert Extension is ready for AI agent testing!"
echo ""
echo "Now you can:"
echo "  • Launch VS Code: code ."
echo "  • Run extension tests: npm test"
echo "  • Build the extension: npm run build"
echo ""
