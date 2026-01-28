# Robert Collaboration Server

Backend server for the Robert VS Code extension collaboration features. This server provides REST API endpoints and WebSocket support for real-time messaging and notifications related to Rally user stories.

## Features

- REST API for messages, notifications, and user management
- WebSocket support for real-time notifications
- PostgreSQL database for data persistence
- User authentication via Rally User ID
- Message threads with replies
- Notification system

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ database
- Environment variables configured (see `.env.example`)

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Database

Create a PostgreSQL database:

```sql
CREATE DATABASE robert_collaboration;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/robert_collaboration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*
```

Replace `USERNAME` and `PASSWORD` with your actual PostgreSQL credentials.

### 4. Build and Run

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

The server will automatically create database tables on first startup.

## API Endpoints

### Messages

- `GET /api/messages?userStoryId={id}` - Get messages for a user story
- `POST /api/messages` - Create a new message
- `PUT /api/messages/:id` - Update a message
- `DELETE /api/messages/:id` - Delete a message
- `POST /api/messages/:id/replies` - Add a reply to a message

### Notifications

- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/count` - Get unread notification count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

### Users

- `GET /api/users/me` - Get current user info
- `POST /api/users` - Create/update user

### Health Check

- `GET /health` - Server health status

## WebSocket Events

### Client → Server

- `authenticate` - Authenticate with Rally User ID
- `subscribe:notifications` - Subscribe to notifications
- `subscribe:userStory` - Subscribe to messages for a user story
- `unsubscribe:userStory` - Unsubscribe from user story messages

### Server → Client

- `authenticated` - Authentication successful
- `notification:new` - New notification received
- `message:new` - New message in subscribed user story
- `message:updated` - Message updated
- `message:deleted` - Message deleted

## Authentication

The server uses Rally User ID for authentication. Include the following headers in API requests:

```
X-Rally-User-Id: <rally_user_id>
X-Display-Name: <display_name>
```

For WebSocket connections, send an `authenticate` message after connecting:

```json
{
  "type": "authenticate",
  "rallyUserId": "<rally_user_id>",
  "displayName": "<display_name>"
}
```

## Database Schema

The server automatically creates the following tables:

- `users` - User information
- `messages` - Messages linked to user stories
- `notifications` - User notifications
- `message_replies` - Replies to messages

## Development

### Running Migrations

Migrations run automatically on server startup. To manually run:

```bash
npm run migrate
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Configuration

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS allowed origin (default: *)

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and the connection string in `.env` is correct:

```bash
psql -U user -d robert_collaboration -c "SELECT NOW();"
```

### Port Already in Use

Change the `PORT` in `.env` or stop the process using port 3001.

### WebSocket Connection Issues

Check that:
1. The server is running
2. The WebSocket URL is correct (ws://localhost:3001/ws)
3. CORS is configured correctly
4. Authentication message is sent after connection

## License

For IBM internal use only.
