import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoginRole = 'admin' | 'user' | 'demo';

@Component({
  selector: 'app-login-screen',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginScreenComponent {
  readonly selectedRole = signal<LoginRole>('admin');
  @Output() readonly continue = new EventEmitter<LoginRole>();

  selectRole(role: LoginRole): void {
    this.selectedRole.set(role);
  }

  continueToDashboard(): void {
    this.continue.emit(this.selectedRole());
  }
}
