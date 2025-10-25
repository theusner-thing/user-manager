import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { User } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss'],
})
export class UserEditComponent implements OnChanges {
  @Input() user: User | null = null;
  @Input() visible = false;
  // optional inline error message (e.g. email already in use)
  @Input() errorMessage?: string | null = null;
  @Output() save = new EventEmitter<Partial<User>>();
  @Output() cancel = new EventEmitter<void>();

  // include an optional password in the form (not part of persisted User shape)
  form: Partial<User> & { password?: string } = {};

  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  ngOnChanges(changes: SimpleChanges & any) {
    if (changes.user) {
      if (this.user) {
        // editing existing user - populate form but clear password field
        this.form = { ...this.user, password: undefined };
      } else {
        // creating new user - default the role to 'user' and clear password
        this.form = { role: 'user', password: '' };
      }
    }

    if (changes.visible && !this.visible) {
      // dialog closed - reset form
      this.form = this.user ? { ...this.user, password: undefined } : { role: 'user', password: '' };
    }
  }

  isCreateMode() {
    return !this.user;
  }

  doSave() {
    // read the current DOM value for the email input to avoid cases where
    // an earlier value is accidentally preserved after failed save attempts.
    const domEmail = this.emailInput?.nativeElement?.value;
    const user = {
      ...this.form,
      email: domEmail ? domEmail.trim() : this.form.email,
    } as Partial<User> & { password?: string }

    this.save.emit(user);
  }

  doCancel() {
    this.cancel.emit();
  }
}