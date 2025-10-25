# Primeng Quickstart

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version ^20.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:5200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Frontend features (summary)

This frontend is a small user-management app built with Angular and PrimeNG. Key features implemented in this workspace:

- User list with server-side pagination, searching and sorting (table lazy loading).
- Create / Edit user modal (dialog) with template-driven form validation:
	- Required fields: first name, last name, email. Password is required for creation and optional on edit.
	- Inline handling of duplicate-email conflicts (HTTP 409): the error is shown under the Email field and the dialog remains open (no global toast for that case).
- Delete user with confirmation dialog and a bulk-delete action for selected rows (skips the currently logged-in user).
- CSV import and export:
	- Export: download all users as CSV (uses server `total` to request full list).
	- Import: upload CSV (parsed server-side with PapaParse). Existing users (by email) are updated; new users are created. The import response contains separate `created` and `updated` counts and row-level errors.
- Auth integration:
	- Protected routes with JWT, automatic handling of 401/refresh in effects/interceptors (where configured).
	- App menubar hides when no authenticated user is present.
- UX polishing:
	- Toast messages for successes/errors (with special-case suppression for inline email conflicts).
	- Confirm dialogs and friendly inline validation messages.

Dependencies used by the frontend:

- Angular 20
- PrimeNG (UI components: Table, Dialog, Toast, ConfirmDialog, Menubar, Buttons, Inputs)
- NgRx (store + effects) for state and side-effect handling

If you'd like, I can add a short developer setup section (commands to run backend + frontend together), convert fetch-based file uploads to HttpClient to reuse interceptors, or add unit/e2e tests for the flows above.
