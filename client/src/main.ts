import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { LoginScreenComponent, LoginRole } from './app/components/login/login.component';
import { RequestsDashboardComponent } from './app/components/requests/requests.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginScreenComponent, RequestsDashboardComponent],
  template: `
    @if (!isLoggedIn()) {
      <app-login-screen (continue)="login($event)"></app-login-screen>
    } @else {
      <app-dashboard [role]="selectedRole()" (logout)="logout()"></app-dashboard>
    }
  `
})
export class App {
  readonly selectedRole = signal<LoginRole>('admin');
  readonly isLoggedIn = signal(false);
  private readonly jwtSecret = 'local-dev-secret';

  constructor() {
    const savedRole = localStorage.getItem('selectedRole') as LoginRole | null;
    if (savedRole === 'admin' || savedRole === 'user' || savedRole === 'demo') {
      // Refresh the token before showing the dashboard: a persisted one may have expired.
      void this.startSession(savedRole);
    }
  }

  login(role: LoginRole): void {
    void this.startSession(role);
  }

  /**
   * Issue and persist the bearer token, and only then reveal the dashboard, so the
   * first request it fires already carries an Authorization header.
   */
  private async startSession(role: LoginRole): Promise<void> {
    this.selectedRole.set(role);
    localStorage.setItem('selectedRole', role);

    const token = await this.createSignedJwt(role);
    localStorage.setItem('access_token', token);
    localStorage.setItem('token', token);

    this.isLoggedIn.set(true);
  }

  logout(): void {
    this.selectedRole.set('admin');
    this.isLoggedIn.set(false);
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
  }

  private async createSignedJwt(role: LoginRole): Promise<string> {
    // Must match what AuthenticationMiddleware.isValidPayload() expects on the server:
    // integer id > 0, integer customerId > 0, role of 'user' | 'administrator', optional exp.
    const payload = {
      id: role === 'demo' ? 42 : 1,
      customerId: role === 'user' ? 7 : 1,
      role: role === 'admin' || role === 'demo' ? 'administrator' : 'user',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    const header = { alg: 'HS256', typ: 'JWT' };
    const encode = (value: unknown) => btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    const encodedHeader = encode(header);
    const encodedPayload = encode(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    if (!globalThis.crypto?.subtle) {
      return `${signingInput}.dev-signature`;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
    const signature = this.arrayBufferToBase64Url(signatureBytes);
    return `${signingInput}.${signature}`;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}

bootstrapApplication(App, { providers: [provideHttpClient()] }).catch((error: unknown) => console.error(error));
