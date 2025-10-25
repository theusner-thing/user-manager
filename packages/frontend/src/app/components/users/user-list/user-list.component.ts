import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { Observable, Subject, Subscription, firstValueFrom } from 'rxjs';
import { AuthState, logout, User } from '../../../store/auth/auth.actions';
import { Store } from '@ngrx/store';
import { clearUsersError, loadUsers, updateUser, deleteUser, createUser, UsersState,
  createUserSuccess, createUserFailure, updateUserSuccess, updateUserFailure,
  deleteUserSuccess, deleteUserFailure } from '../../../store/users/users.actions';
import { ActionsSubject } from '@ngrx/store';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {UserEditComponent} from "../user-edit/user-edit.component";
import {IconField} from "primeng/iconfield";
import {InputIcon} from "primeng/inputicon";
import { ConfirmDialog } from "primeng/confirmdialog";

@Component({
  selector: "app-user-list",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    ToastModule,
    ProgressSpinnerModule,
    CardModule,
    ToolbarModule,
    TagModule,
    TooltipModule,
    UserEditComponent,
    IconField,
    InputIcon,
    ConfirmDialog,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: "./user-list.component.html",
  styleUrls: ["./user-list.component.scss"],
})
export class UserListComponent implements OnDestroy {
  users$: Observable<User[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  total$: Observable<number>;
  currentUser$: Observable<User | null>;
  isAdmin$: Observable<boolean>;

  searchTerm = "";
  editDialogVisible = false;
  selectedUser: User | null = null;
  // inline error shown inside the edit modal (e.g. 409 email conflict)
  inlineError: string | null = null;
  // track whether a save is in-flight so we don't close the modal until success/failure handled
  pendingSave = false;

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private actionsSub?: Subscription;
  private currentOrder?: string;
  @ViewChild('importInput') importInput?: ElementRef<HTMLInputElement>;
  selectedUsers!: User[] | undefined;

  constructor(
    private store: Store<{ auth: AuthState; users: UsersState }>,
    private actionsSubject: ActionsSubject,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.users$ = this.store.select(
      (state: { auth: AuthState; users: UsersState }) => state.users.users
    );
    this.loading$ = this.store.select(
      (state: { auth: AuthState; users: UsersState }) => state.users.loading
    );
    this.error$ = this.store.select(
      (state: { auth: AuthState; users: UsersState }) => state.users.error
    );
    this.total$ = this.store.select(
      (state: { auth: AuthState; users: UsersState }) => state.users.total
    );
    this.currentUser$ = this.store.select(
      (state: { auth: AuthState; users: UsersState }) => state.auth.user
    );
    this.isAdmin$ = this.store.select(
      (state: { auth: AuthState; users: UsersState }) =>
        state.auth.user?.role === "admin"
    );

    // subscribe to debounced search
    this.searchSub = this.searchSubject
      .pipe(debounceTime(500))
      .subscribe((term: string) => {
        this.searchTerm = term;
        this.loadUsers();
      });

    this.loadUsers();
    this.store.dispatch(clearUsersError());

    // show toast for success/failure actions, but surface 409 conflicts inline in the modal
    this.actionsSub = (this.actionsSubject as any).subscribe((action: any) => {
      try {
        // successful save -> if there was a pending save, close the modal and clear state
        if (
          action.type === updateUserSuccess.type ||
          action.type === createUserSuccess.type
        ) {
          if (this.pendingSave) {
            this.editDialogVisible = false;
            this.selectedUser = null;
            this.pendingSave = false;
            this.inlineError = null;
          }

          // show toast for successes
          const summary =
            action.type === createUserSuccess.type ? "Created" : "Updated";
          this.messageService.add({
            severity: "success",
            summary,
            detail: `User ${summary.toLowerCase()} successfully`,
          });

          return;
        }

        if (action.type === deleteUserSuccess.type) {
          this.messageService.add({
            severity: "success",
            summary: "Deleted",
            detail: "User deleted successfully",
          });
          return;
        }

        // failures
        if (
          action.type === updateUserFailure.type ||
          action.type === createUserFailure.type
        ) {
          // extract error
          const err =
            action.error ||
            action.err ||
            (action.payload && action.payload.error) ||
            {};

          // normalize message text for heuristic checks (some effects may emit a string)
          const messageText =
            typeof err === "string" ? err : err?.message || "";

          // if it's a 409 conflict (email in use) or the message mentions the email conflict,
          // surface it inline in the modal and keep it open (do not show toast)
          const status =
            err?.status || (err?.response && err.response.status) || null;
          if (status === 409 || messageText.toLowerCase().includes("email")) {
            this.inlineError = "Email address already in use";
            this.pendingSave = false;
            return; // do not show toast for this case
          }

          // other failures - show toast and clear pending state
          this.pendingSave = false;
          const detail = messageText || String(err);
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail,
          });
          return;
        }

        if (action.type === deleteUserFailure.type) {
          const err =
            action.error ||
            action.err ||
            (action.payload && action.payload.error) ||
            "An error occurred";
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: err?.message || String(err),
          });
          return;
        }
      } catch (e) {
        // swallow any toast errors
        console.error("Error processing action for toast", e);
      }
    });

    // also show transient store error messages
    this.error$.pipe(filter((e: any) => !!e)).subscribe((err: any) => {
      try {
        // if the error is a 409 conflict we handle it inline in the modal (do not show toast)
        const status =
          err?.status || (err?.response && err.response.status) || null;
        const messageText = typeof err === "string" ? err : err?.message || "";
        if (status === 409 || messageText?.toLowerCase().includes("email")) {
          // surface inline and clear the store error so it doesn't repeat
          this.inlineError = "Email address already in use";
          this.store.dispatch(clearUsersError());
          return;
        }

        // other errors still show a toast
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: messageText || String(err),
        });
        this.store.dispatch(clearUsersError());
      } catch (e) {
        console.error("Error handling store error observable", e);
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.actionsSub?.unsubscribe();
  }

  deleteSelectedUsers(): void {
    if (!this.selectedUsers || !this.selectedUsers.length) return;

    // confirm bulk delete
    const count = this.selectedUsers.length;
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${count} selected user${count === 1 ? '' : 's'}? This action cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const current = await firstValueFrom(this.currentUser$);

          // filter out the current user if present
          const filtered = (this.selectedUsers || []).filter(u => !(current && current.id === u.id));

          const idsToDelete = filtered.map((u) => u.id);
          if (idsToDelete.length === 0) return;

          const authState: any = await firstValueFrom(this.store.select('auth'));
          if (!authState?.accessToken) {
            this.messageService.add({ severity: 'error', summary: 'Not authenticated', detail: 'Cannot delete users without authentication' });
            return;
          }

          const res = await fetch(`${environment.apiUrl}/users/bulk-delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authState.accessToken}`,
            },
            body: JSON.stringify({ ids: idsToDelete }),
          });

          if (!res.ok) {
            const text = await res.text();
            this.messageService.add({ severity: 'error', summary: 'Delete failed', detail: text || `HTTP ${res.status}` });
            return;
          }

          const data = await res.json();
          const deleted = Number(data.deleted || 0);
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${deleted} user${deleted === 1 ? '' : 's'} deleted` });
          this.selectedUsers = [];
          this.loadUsers();
        } catch (e) {
          this.messageService.add({ severity: 'error', summary: 'Delete error', detail: String(e) });
        }
      },
      reject: () => {
        // no-op
      },
    });
  }

  loadUsers() {
    this.store.dispatch(
      loadUsers({
        page: 1,
        limit: 10,
        search: this.searchTerm || undefined,
        order: this.currentOrder,
      })
    );
  }

  onSearch(value?: string) {
    this.searchSubject.next(value ?? this.searchTerm);
  }

  clearSearch() {
    this.searchTerm = "";
    this.searchSubject.next("");
  }

  onLazyLoad(event: {
    first?: number | null;
    rows?: number | null;
    page?: number;
    sortField?: string | string[] | null;
    sortOrder?: number | null; // 1 = asc, -1 = desc
  }) {
    const first = event.first || 0;
    const rows = event.rows || 10;
    const page = event.page || Math.floor(first / rows) + 1;

    // compute order string if sorting requested
    const sortField = Array.isArray(event.sortField)
      ? (event.sortField as string[])[0]
      : (event.sortField as string | null);
    if (sortField) {
      const dir = event.sortOrder === 1 ? "ASC" : "DESC";
      this.currentOrder = `${sortField}:${dir}`;
    } else {
      this.currentOrder = undefined;
    }

    this.store.dispatch(
      loadUsers({
        page,
        limit: rows,
        search: this.searchTerm || undefined,
        order: this.currentOrder,
      })
    );
  }

  editUser(user: User) {
    this.selectedUser = user;
    this.editDialogVisible = true;
  }

  createNewUser() {
    // open the user-edit modal with no selected user to create a new one
    this.selectedUser = null;
    this.editDialogVisible = true;
  }

  downloadUsers() {
    (async () => {
      try {
        // ensure we have the total number of users from the server
        // wait for total to be > 0
        const total = await firstValueFrom(
          this.total$.pipe(filter((t: number) => t > 0))
        );

        // get auth state to read access token
        const authState: any = await firstValueFrom(this.store.select("auth"));
        if (!authState?.accessToken) {
          // can't download without token
          return;
        }

        // Use the existing NgRx flow to load users (so auth headers, paging, and errors
        // are handled consistently by effects). Request all users by using the server
        // reported `total` as the limit.
        this.store.dispatch(loadUsers({ page: 1, limit: total }));

        // Wait for loading to finish, then read the users list from the store.
        await firstValueFrom(
          this.loading$.pipe(filter((l: boolean) => l === false))
        );
        const items: any[] = await firstValueFrom(this.users$);

        // choose headers
        const headers = [
          "id",
          "firstName",
          "lastName",
          "email",
          "role",
          "createdAt",
        ];

        const escape = (v: any) => {
          if (v == null) return "";
          const s = String(v);
          if (s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
          if (s.includes(",") || s.includes("\n") || s.includes("\r"))
            return `"${s}"`;
          return s;
        };

        const rows = [headers.join(",")].concat(
          items.map((i) => headers.map((h) => escape(i[h])).join(","))
        );

        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlBlob = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlBlob;
        a.download = "users.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlBlob);
      } catch (e) {
        console.error("Error downloading users", e);
      }
    })();
  }

  onUserSaved(updated: Partial<User>) {
    if (this.selectedUser) {
      // existing user -> update
      this.store.dispatch(
        updateUser({ id: this.selectedUser.id, user: updated })
      );
    } else {
      // new user -> create
      this.store.dispatch(createUser({ user: updated }));
    }
    // set pending save so we don't immediately close the modal — we'll close on success
    this.pendingSave = true;
    this.inlineError = null; // clear any previous inline error
  }

  onCancelEdit() {
    // clear inline error and pending state when user cancels the dialog
    this.inlineError = null;
    this.pendingSave = false;
    this.editDialogVisible = false;
    this.selectedUser = null;
  }

  async onDelete(user: User) {
    const current = await firstValueFrom(this.currentUser$);
    if (current && current.id === user.id) {
      // don't allow deleting current user
      return;
    }
    this.store.dispatch(deleteUser({ id: user.id }));
  }

  /** Show confirmation dialog before deleting the user */
  confirmDelete(user: User) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${user.firstName || ""} ${
        user.lastName || ""
      } (${user.email})? This action cannot be undone.`,
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      accept: () => this.onDelete(user),
      reject: () => {
        // no-op on reject
      },
    });
  }

  onLogout() {
    this.store.dispatch(logout());
  }

  async onImportSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.csv')) {
      this.messageService.add({ severity: 'error', summary: 'Invalid file', detail: 'Please select a CSV file' });
      input.value = '';
      return;
    }

    try {
      const authState: any = await firstValueFrom(this.store.select('auth'));
      if (!authState?.accessToken) {
        this.messageService.add({ severity: 'error', summary: 'Not authenticated', detail: 'Cannot import without authentication' });
        input.value = '';
        return;
      }

      const form = new FormData();
      form.append('file', file, file.name);

      const res = await fetch(`${environment.apiUrl}/users/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authState.accessToken}`,
        },
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        this.messageService.add({ severity: 'error', summary: 'Import failed', detail: text || `HTTP ${res.status}` });
        input.value = '';
        return;
      }

      const data = await res.json();
      const created = Number(data.created || 0);
      const updated = Number(data.updated || 0);
      if (created > 0) {
        this.messageService.add({ severity: 'success', summary: 'Users created', detail: `${created} user${created === 1 ? '' : 's'} created` });
      }
      if (updated > 0) {
        this.messageService.add({ severity: 'info', summary: 'Users updated', detail: `${updated} user${updated === 1 ? '' : 's'} updated` });
      }
      if (created === 0 && updated === 0) {
        this.messageService.add({ severity: 'warn', summary: 'No changes', detail: 'No users were created or updated' });
      }
      if (data.errors && data.errors.length) {
        const details = data.errors.slice(0, 5).map((e: any) => `Line ${e.line}: ${e.error}${e.email ? ` (${e.email})` : ''}`).join('; ');
        this.messageService.add({ severity: 'warn', summary: 'Import warnings', detail: details });
      }

      // refresh the list
      this.loadUsers();
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Import error', detail: String(e) });
    } finally {
      input.value = '';
    }
  }
}
