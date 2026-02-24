#!/bin/bash
#
# Example: AI Agent Virtual Environment Setup for Robert Extension Testing
#
# This script demonstrates how an AI agent can configure the Robert extension
# with Rally connection settings via environment variables in a virtual/automated environment.
#
# Usage:
#   source test/example-ai-agent-setup.sh
#   # or
#   bash test/example-ai-agent-setup.sh
#

set -e

echo "🤖 Setting up Robert Extension for AI Agent Testing"
echo "=================================================="

# Rally Configuration for the AI agent's testing environment
# In a real scenario, these would come from secrets management system:
export ROBERT_RALLY_API_KEY="${RALLY_API_KEY:-}"
export ROBERT_RALLY_INSTANCE="${RALLY_INSTANCE:-https://rally1.rallydev.com}"
export ROBERT_RALLY_PROJECT_NAME="${RALLY_PROJECT_NAME:-}"

# Extension Debug Settings
export ROBERT_DEBUG_MODE="true"
export ROBERT_AUTO_REFRESH="true"

# Collaboration Settings (usually disabled for automated testing)
export ROBERT_COLLABORATION_ENABLED="false"
export ROBERT_COLLABORATION_AUTO_CONNECT="false"

# Show configuration (without exposing sensitive API key)
echo ""
echo "✅ Environment Variables Configured:"
echo "   • ROBERT_RALLY_INSTANCE: $ROBERT_RALLY_INSTANCE"
echo "   • ROBERT_RALLY_PROJECT_NAME: $ROBERT_RALLY_PROJECT_NAME"
echo "   • ROBERT_RALLY_API_KEY: ${ROBERT_RALLY_API_KEY:+***$(echo $ROBERT_RALLY_API_KEY | tail -c 4)}"
echo "   • ROBERT_DEBUG_MODE: $ROBERT_DEBUG_MODE"
echo "   • ROBERT_COLLABORATION_ENABLED: $ROBERT_COLLABORATION_ENABLED"
echo ""

# Validation
if [ -z "$ROBERT_RALLY_API_KEY" ]; then
    echo "⚠️  Warning: ROBERT_RALLY_API_KEY is not set"
    echo "   Set RALLY_API_KEY environment variable before sourcing this script"
    exit 1
fi

if [ -z "$ROBERT_RALLY_PROJECT_NAME" ]; then
    echo "⚠️  Warning: ROBERT_RALLY_PROJECT_NAME is not set"
    echo "   Set RALLY_PROJECT_NAME environment variable before sourcing this script"
    exit 1
fi

echo "✅ Robert Extension is ready for AI agent testing!"
echo ""
echo "Now you can:"
echo "  • Launch VS Code: code ."
echo "  • Run extension tests: npm test"
echo "  • Build the extension: npm run build"
echo ""
