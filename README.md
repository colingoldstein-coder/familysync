# FamilySync

Family task management and help request coordination app. Parents assign tasks, children request help, everyone stays in sync.

## Tech Stack

- **Frontend:** React 19, Vite, React Router
- **Backend:** Node.js, Express, Knex
- **Database:** SQLite (dev), PostgreSQL (production)
- **Auth:** JWT with bcrypt password hashing

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Set up environment
cp .env.example server/.env
# Edit server/.env and set JWT_SECRET (generate with: openssl rand -hex 64)

# Run development servers
npm run dev
```

The app will be available at `http://localhost:5173` with the API at `http://localhost:3001`.

## Project Structure

```
familysync/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── api.js           # API client
│       ├── context/         # Auth context
│       ├── components/      # Shared components
│       └── pages/           # Route pages
├── server/          # Express backend
│   ├── routes/      # API route handlers
│   ├── middleware/   # Auth middleware
│   ├── migrations/  # Knex database migrations
│   ├── tests/       # API tests
│   └── server.js    # Entry point
└── docker-compose.yml
```

## Testing

```bash
cd server && npm test
```

## Production Deployment

### With Docker

```bash
# Set environment variables
export JWT_SECRET=$(openssl rand -hex 64)
export CLIENT_URL=https://yourdomain.com

docker compose up -d
```

### With Railway

1. Connect your GitHub repository to Railway
2. Add a PostgreSQL database service
3. Set environment variables: `JWT_SECRET`, `CLIENT_URL`, `DATABASE_URL`, `RESEND_API_KEY`
4. Deploy

### Manual

```bash
cd client && npm run build
cd ../server && NODE_ENV=production npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Token signing key (min 64 hex chars) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Production |
| `CLIENT_URL` | Frontend URL for email links | Yes |
| `RESEND_API_KEY` | Resend API key for transactional email | Production |
| `EMAIL_FROM` | From address for emails | Production |
| `PORT` | Server port (default: 3001) | No |
| `SENTRY_DSN` | Sentry error tracking DSN | No |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register-family` | No | Register family + admin |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user info |
| GET | `/api/auth/family-members` | Yes | List family members |
| POST | `/api/auth/invite` | Admin | Send invitation |
| GET | `/api/auth/invite/:token` | No | Get invite details |
| POST | `/api/auth/accept-invite` | No | Accept invitation |
| GET | `/api/auth/invitations` | Admin | List invitations |
| POST | `/api/tasks` | Parent | Create task |
| GET | `/api/tasks` | Yes | List tasks |
| PATCH | `/api/tasks/:id/status` | Yes | Update task status |
| DELETE | `/api/tasks/:id` | Parent | Delete task |
| POST | `/api/requests` | Child | Create help request |
| GET | `/api/requests` | Yes | List help requests |
| PATCH | `/api/requests/:id/respond` | Parent | Respond to request |
| GET | `/health` | No | Health check |
