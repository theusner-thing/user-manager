import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { AuthState } from '../../store/auth/auth.actions';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private store: Store<{ auth: AuthState }>, private router: Router) {}

  canActivate() {
    return this.store.select('auth').pipe(
      take(1),
      map(authState => {
        if (authState.accessToken && authState.user) {
          return true;
        }
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
