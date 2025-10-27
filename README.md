![User Manager Logo](./packages/frontend/src/assets/logo.png)

# User Manager

Monorepo containing a small user-management application:

- packages/backend — Nest-style Node API (TypeORM, JWT auth)
- packages/frontend — Angular 20 single-page app using PrimeNG and NgRx

## Quick start (development)

Prerequisites: Docker (optional), Node.js, npm.

Run backend and frontend locally (dev mode):

- Start backend (from repo root):
  cd packages/backend
  npm install
  cp .env.example .env
  npm run start:dev

- Start frontend (from repo root):
  cd packages/frontend
  npm install
  npm run start

Or run the Docker Compose dev stack (Postgres + backend + frontend):

```bash
# from repo root
docker compose -f docker/docker-compose.yml up
```

The compose file will start Postgres (mapped to host port 6543), the backend API (port 3333) and the frontend dev server (port 5200).

## Backend (summary)

- Nest-style API using TypeORM and PostgreSQL.
- Authentication using JWT (access + refresh tokens): `/auth/login`, `/auth/refresh`.
- Users endpoints: list (pagination/search/sort), get, create, update, delete.
- CSV import endpoint: `POST /users/import` (server-side PapaParse). Existing users (by email) are updated, new users are created; response contains `created`, `updated`, and `errors`.
- CSV import endpoint: `POST /users/import` (server-side PapaParse). Existing users (by email) are updated, new users are created; response contains `created`, `updated`, and `errors`.
  - A sample CSV suitable for import is included at `resources/user-import.csv` and can be used with the frontend import UI.
- Bulk delete endpoint: `POST /users/bulk-delete` accepts `{ ids: string[] }` (admin-only).
- Passwords are stored as `salt:hash` (SHA-256). The service offers helpers to create temporary passwords and to hash passwords on create/update.

See `packages/backend/README.md` for more details and developer notes.

## Frontend (summary)

- Angular 20 app using PrimeNG components and NgRx for state.
- User list with server-side pagination, search and sorting.
- Create / Edit dialog with template-driven validation:
  - Required fields: first name, last name, email. Password required on create, optional on edit.
  - Inline handling of duplicate-email (HTTP 409): error shown under the Email field; dialog stays open.
- Delete (single + bulk) with confirmation. Bulk-delete skips the currently logged-in user.
- CSV export/import: export uses server `total` to request all users; import uploads CSV to backend which parses and returns `created`/`updated` counts.
- Menubar hides when there's no authenticated user or when on the `/login` route.

See `packages/frontend/README.md` for more details.

## Test coverage

- Current status: unit tests have been implemented only for the user list component. The implemented spec is:
  - `packages/frontend/src/app/components/users/user-list/user-list.component.spec.ts` — covers lazy-load ordering, the debounced search dispatch, and the delete / bulk-delete confirmation flow (including PrimeNG service mocks).

- Backend tests: a small unit test suite has been added for the users service:
  - `packages/backend/test/users.service.test.ts` — unit tests for `UsersService` covering create conflict handling, temporary password creation, password hashing on update, import input validation, and bulk-delete input validation.

Other components and behaviors (create/update 409 modal behavior, import flows, backend endpoints) do not yet have unit or integration tests and should be covered in follow-up work.

## Possible improvements

- Enforce password strength / pattern (server + client validation).
- Send a temporary password email to newly created users (or when an admin resets a password).
- Force users to change temporary passwords on first login.
- Admin functionality: reset a user's password (generate a new temporary password and email it to the user).
- Add language support
- Implement Login Strategy to support external login providers (AWS, EntraID, etc...)

## Notes

- Default seeded admin user (when using the provided DB seed): `admin@silenceapi.com` / `admin@silenceapi.com`.
- The docker compose stack mounts local source directories into containers for hot-reload during development. Consider creating Dockerfiles and image builds for CI or production use.
