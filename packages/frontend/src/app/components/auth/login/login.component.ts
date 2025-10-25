import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { login, clearError } from '../../../store/auth/auth.actions';
import { AuthState } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  constructor(private fb: FormBuilder, private store: Store<{ auth: AuthState }>, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.loading$ = this.store.select('auth').pipe(map(state => state.loading));
    this.error$ = this.store.select('auth').pipe(map(state => state.error));
  }

  ngOnInit() {
    // Clear any previous errors
    this.store.dispatch(clearError());
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const credentials = this.loginForm.value;
      this.store.dispatch(login({ credentials }));

      // Subscribe to auth state changes to redirect on success
      this.store
        .select('auth')
        .pipe(map(state => state.user))
        .subscribe(user => {
          if (user) {
            this.router.navigate(['/users']);
          }
        });
    }
  }
}
