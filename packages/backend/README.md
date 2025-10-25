# Backend

Nest-like Node backend using TypeORM and JWT auth.

Quick start:

1. cd packages/backend
2. npm install
3. cp .env.example .env
4. npm run start:dev

Default seeded admin: admin@example.com / password

Using Docker Compose (Postgres)

From the repo root you can start Postgres and run the seed script inside a Node container:

```bash
# Compose maps Postgres to host port 6543
docker compose up
```

This will start Postgres, install backend dependencies inside the container and create the admin user in the Postgres DB.

## Backend features (summary)

This backend is a Nest-style Node API using TypeORM and JWT authentication. Key features implemented in this workspace:

- Authentication:
	- JWT-based access and refresh tokens.
	- `/auth/login` and `/auth/refresh` endpoints for obtaining and refreshing tokens.
- Users API (`/users`):
	- Listing with server-side pagination, search and ordering.
	- Get single user, create, update, and delete endpoints.
	- Create/update enforce unique email addresses and return HTTP 409 on conflict.
- CSV import/export:
	- `POST /users/import` accepts a CSV upload (handled in-memory) and is parsed server-side using PapaParse.
	- Import updates existing users by email (first/last name) and creates new users when needed. The response contains `created`, `updated`, and `errors` fields.
- Bulk delete:
	- `POST /users/bulk-delete` accepts a JSON body `{ ids: string[] }` and deletes the listed users (admin-only).
- Password handling:
	- Passwords are stored as `salt:hash` (SHA-256) and the service provides helper methods to create temporary passwords and to hash new passwords on update.

## Notes and developer tips

- Default seeded admin user: `admin@example.com` / `admin@example.com` (created by the seed step when running the Docker-based setup).
- The import endpoint expects the uploaded file in memory (`file.buffer`) — avoid filesystem reads when providing uploads.
- For client-side uploads and requests it's recommended to use Angular's `HttpClient` so any auth interceptors (token refresh) are applied automatically. Some client code in this repo currently uses `fetch` with manual Authorization headers.
- If you change the password hashing algorithm or storage format, remember to migrate existing password hashes in the database.

If you'd like, I can add a short API reference (example requests/responses for the main endpoints), or add tests for the import and bulk-delete flows.

