# Collaboration Features

The Robert extension includes collaboration features that allow team members to discuss and resolve questions about user stories directly within VS Code.

## Overview

The collaboration system enables:
- Posting messages/questions about specific user stories
- Receiving real-time notifications when team members respond
- Threaded conversations with replies
- Filtering messages by user story

## Setup

### 1. Start the Collaboration Server

The collaboration server must be running for these features to work. See [server/README.md](server/README.md) for setup instructions.

### 2. Configure Extension Settings

Open VS Code settings and configure:

- `robert.collaboration.serverUrl` - URL of the collaboration server (default: `http://localhost:3001`)
- `robert.collaboration.enabled` - Enable collaboration features (default: `false`)
- `robert.collaboration.autoConnect` - Automatically connect on startup (default: `true`)

### 3. Database Setup

Ensure PostgreSQL is configured and the server can connect. The server will automatically create required tables on first startup.

## Using Collaboration

### Accessing the Collaboration Tab

1. Open the Robert extension view
2. Click on the "Collaboration" tab in the navigation bar

### Creating a Message

1. In the Collaboration tab, scroll to "New Message"
2. Enter the User Story ID (e.g., `US123`)
3. Type your question or message
4. Click "Post Message"

### Viewing Messages

Messages are automatically filtered by the selected User Story ID. You can:
- Filter by entering a User Story ID in the filter box
- View all messages by clearing the filter
- Expand/collapse message threads to see replies

### Replying to Messages

1. Scroll to the message you want to reply to
2. Type your reply in the text area below the message
3. Click "Reply"

### Notifications

When someone:
- Creates a message on a user story you've commented on
- Replies to your message
- Resolves a message

You'll receive a notification in the Collaboration tab. Click on notifications to mark them as read, or use "Mark all as read" to clear all notifications.

## Real-time Updates

When the collaboration server is running and WebSocket connection is active, you'll receive real-time updates for:
- New messages on subscribed user stories
- New replies to your messages
- New notifications

## Troubleshooting

### Messages Not Loading

1. Check that the collaboration server is running
2. Verify `robert.collaboration.serverUrl` is correct
3. Check the "Robert" output channel for error messages
4. Ensure `robert.collaboration.enabled` is set to `true`

### Notifications Not Appearing

1. Verify WebSocket connection is active (check output channel)
2. Ensure you're subscribed to the relevant user stories
3. Check server logs for WebSocket errors

### Server Connection Issues

1. Verify the server URL is accessible
2. Check firewall settings
3. Ensure CORS is configured correctly on the server
4. Check the "Robert" output channel for connection errors

## Architecture

The collaboration system consists of:

- **Backend Server** (`server/`) - Node.js/Express server with PostgreSQL
- **Collaboration Client** (`src/libs/collaboration/`) - HTTP and WebSocket clients
- **Collaboration View** (`src/webview/components/common/CollaborationView.tsx`) - React UI component
- **Message Handlers** (`src/RobertWebviewProvider.ts`) - Bridge between webview and extension

## Security

- User identification via Rally User ID
- Messages are scoped to user stories
- Only message authors can edit/delete their messages
- Input validation and sanitization on server

## Future Enhancements

Potential future features:
- @mentions in messages
- File attachments
- Message search
- Message reactions
- Integration with Rally discussions
