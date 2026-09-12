# DreamozTech Connect

DreamozTech Connect is the portal behind [dreamoztech.com](https://dreamoztech.com). It gives users a secure workspace to create and manage web apps, then consume each published app through a simple API.

The portal is intended for software teams and businesses that need to manage website content in one place while allowing other applications, websites, or services to retrieve that content programmatically.

## What the portal provides

- Account signup, login, sessions, and profile information
- A dashboard for managing web app projects
- Web app details such as title, description, contact email, public link, and enabled status
- Page and sub-page content management with rich text and media support
- Branding and general app settings, including logos and favicons
- Shipping-rate configuration for commerce-oriented web apps
- Per-app API credentials with secret rotation
- Administrator tools for managing users and reviewing all web apps

## API integration

Each web app has its own credentials. They are generated from the app's API tab after signing in and are shown only to the authorized account. Do not commit credentials to this repository, include them in browser code, or share them publicly.

The API uses a two-step flow:

1. Exchange an app's API key and API secret for a short-lived bearer token.
2. Send that token in the `Authorization` header when retrieving the app payload.

### Obtain a token

`POST /api/public/wa/token`

Request body:

```json
{
	"apiKey": "YOUR_APP_API_KEY",
	"apiSecret": "YOUR_APP_API_SECRET"
}
```

Successful responses include a bearer token and its expiry period. Keep the secret exchange on a trusted server whenever possible.

### Retrieve a web app

`GET /api/public/wa/webapp`

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The response contains the configured web app and its published pages. Requests without a valid bearer token receive `401 Unauthorized`.

### Check deployment health

`GET /api/public/health`

This endpoint reports whether the deployment has its required configuration. It returns variable names only and never exposes their values.

## Technology

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite
- Turso / LibSQL for persistence
- Tailwind CSS and Radix UI primitives
- Vercel-compatible serverless API handlers

## Local development

### Prerequisites

- Node.js 20 or newer
- npm
- A Turso database for authenticated development

### Setup

```sh
git clone <repository-url>
cd dreamoz-connect
npm install
npm run dev
```

The development server is normally available at `http://localhost:5173`.

### Environment variables

Create a local `.env` file or configure these values in the deployment provider. Never commit `.env` files or real credentials.

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso or LibSQL database URL |
| `TURSO_AUTH_TOKEN` | Database authentication token, when required |
| `SESSION_SECRET` | Secret used to sign user sessions and API tokens |
| `DREAMOZ_API_KEY` | Server-side integration key, when enabled by the deployment |
| `DREAMOZ_API_SECRET` | Server-side integration secret, when enabled by the deployment |
| `RESEND_API_KEY` | Email delivery provider key, when email delivery is configured |
| `MAIL_FROM` | Sender address for application email |

Use strong, unique production values and rotate secrets through your hosting provider or the portal's API settings. The repository contains no production credentials.

## Available commands

```sh
npm run dev       # Start the local development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
npm run format    # Format the project with Prettier
```

## Deployment

The project is configured for Vercel-compatible deployment. Set the required environment variables in the hosting provider, deploy the application, and verify the deployment with `/api/public/health`. After deployment, create or rotate per-app credentials from the authenticated API settings panel.

## Security notes

- Treat API secrets, database tokens, session secrets, and email provider keys as sensitive credentials.
- Use server-side code for the credential-to-token exchange; do not expose API secrets in frontend bundles.
- Rotate an app secret immediately if it may have been exposed.
- Keep production credentials in environment variables or a managed secret store.
