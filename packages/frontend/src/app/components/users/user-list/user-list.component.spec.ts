import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { Store } from '@ngrx/store';
import { ActionsSubject } from '@ngrx/store';
import { MessageService, ConfirmationService } from 'primeng/api';
import { loadUsers } from '../../../store/users/users.actions';

class MockStore {
  dispatch = jasmine.createSpy('dispatch');
  select = (selector: any) => {
    // provide sensible defaults based on selector function or key
    try {
      const state = {
        auth: { user: { id: 'current', role: 'admin', firstName: 'T', lastName: 'U' }, accessToken: 'token' },
        users: { users: [], loading: false, error: null, total: 0 },
      } as any;
      if (typeof selector === 'function') {
        return of(selector(state));
      }
      if (selector === 'auth') return of(state.auth);
      if (selector === 'users') return of(state.users);
    } catch (e) {
      // fallback
    }
    return of(null as any);
  };
}

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let store: MockStore;
  let actions$: ActionsSubject;
  let msg: jasmine.SpyObj<MessageService>;
  let confirm: jasmine.SpyObj<ConfirmationService>;

  beforeEach(async () => {
    store = new MockStore();
    actions$ = new ActionsSubject();
    const messageSubject = new Subject<any>();
    const clearSubject = new Subject<any>();
    msg = {
      messageObserver: messageSubject.asObservable(),
      clearObserver: clearSubject.asObservable(),
      add: jasmine.createSpy('add').and.callFake((m: any) => messageSubject.next(m)),
      clear: jasmine.createSpy('clear').and.callFake((k?: any) => clearSubject.next(k)),
    } as any;
    // Minimal ConfirmationService mock expected by PrimeNG ConfirmDialog
    const requireConfirmation$ = new Subject<any>();
    confirm = {
      requireConfirmation$,
      confirm: jasmine.createSpy('confirm').and.callFake((opts: any) => {
        // when confirm() is called, emit into requireConfirmation$ so ConfirmDialog instance can react
        requireConfirmation$.next(opts);
      }),
    } as any;

    // override providers so component-level providers are replaced by our spies/mocks
    TestBed.overrideProvider(Store, { useValue: store });
    TestBed.overrideProvider(ActionsSubject, { useValue: actions$ });
    TestBed.overrideProvider(MessageService, { useValue: msg });
    TestBed.overrideProvider(ConfirmationService, { useValue: confirm });

    await TestBed.configureTestingModule({
      imports: [UserListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onLazyLoad should compute order and dispatch loadUsers', () => {
    component.onLazyLoad({ first: 0, rows: 20, page: 1, sortField: 'email', sortOrder: 1 });
    expect(store.dispatch).toHaveBeenCalled();
    const dispatched = (store.dispatch as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatched.type).toBe(loadUsers.type);
    expect(dispatched.page).toBe(1);
    expect(dispatched.limit).toBe(20);
    expect(dispatched.order).toBe('email:ASC');
  });

  it('onSearch should debounce and call loadUsers', fakeAsync(() => {
    // reset any previous dispatches (constructor triggers a loadUsers)
    (store.dispatch as jasmine.Spy).calls.reset();
    component.onSearch('bob');
    // not yet dispatched due to debounce
    expect(store.dispatch).not.toHaveBeenCalledWith(jasmine.objectContaining({ type: loadUsers.type }));
    tick(500);
    // after debounce
    expect(store.dispatch).toHaveBeenCalled();
    const dispatched = (store.dispatch as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatched.type).toBe(loadUsers.type);
  }));

  it('deleteSelectedUsers should return early when no selection', () => {
    component.selectedUsers = undefined;
    component.deleteSelectedUsers();
    expect(confirm.confirm).not.toHaveBeenCalled();
  });

  it('deleteSelectedUsers should call confirmation and show not-authenticated when no token', async () => {
    // prepare one selected user
    component.selectedUsers = [{ id: 'u2', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'user' } as any];

    // make store.select('auth') return a value without accessToken
    (store.select as any) = (selector: any) => {
      if (selector === 'auth') return of({ accessToken: undefined });
      if (typeof selector === 'function') return of(selector({ auth: { user: { id: 'current' } }, users: { users: [], loading: false, error: null, total: 0 } }));
      return of(null as any);
    };

    let captured: any;
    (confirm as any).confirm.and.callFake((opts: any) => {
      captured = opts;
      // simulate user accepted the confirmation
      opts.accept();
    });

    await component.deleteSelectedUsers();
    // accept handler is async; let microtasks run so it can complete
    await Promise.resolve();
    expect(confirm.confirm).toHaveBeenCalled();
    expect(msg.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', summary: 'Not authenticated' }));
  });
});
