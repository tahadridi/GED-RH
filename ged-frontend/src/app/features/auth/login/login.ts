import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styles: [`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :host {
      display: block;
      min-height: 100vh;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }

    .login-shell {
      position: relative;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      padding: 1.5rem;
      background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 32%),
                  radial-gradient(circle at right bottom, rgba(0, 0, 139, 0.12), transparent 34%),
                  linear-gradient(145deg, #f8fafc 0%, #eef2ff 100%);
    }

    .login-aurora {
      position: absolute;
      inset: auto auto 10% -8%;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: rgba(30, 58, 138, 0.08);
      filter: blur(18px);
      pointer-events: none;
    }

    .login-card {
      position: relative;
      background: #FFFFFF;
      border-radius: 24px;
      width: 100%;
      max-width: 520px;
      padding: 2rem;
      box-shadow: 0 28px 70px -24px rgba(15, 23, 42, 0.32), 0 8px 24px -16px rgba(30, 64, 175, 0.2);
      border: 1px solid rgba(226, 232, 240, 0.9);
      backdrop-filter: blur(8px);
    }

    .logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 1.5rem;
      padding: 0.5rem;
      background: transparent;
      border-radius: 18px;
    }

    .logo-image {
      max-width: 200px;
      height: auto;
      display: block;
    }

    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.05em;
      margin: 0;
    }

    .login-sub {
      text-align: center;
      font-size: 0.92rem;
      color: #64748b;
      margin-top: 0.35rem;
    }

    .form-group {
      margin-bottom: 1.3rem;
    }

    label {
      display: inline-flex;
      margin-bottom: 0.55rem;
      font-weight: 600;
      font-size: 0.86rem;
      color: #1e293b;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 16px;
      pointer-events: none;
      opacity: 0.75;
      color: #64748b;
    }

    .form-control {
      width: 100%;
      padding: 0.95rem 2.85rem 0.95rem 2.85rem;
      border: 1.5px solid #E2E8F0;
      border-radius: 14px;
      font-size: 0.95rem;
      font-family: inherit;
      background: #FFFFFF;
      color: #0F172A;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
      outline: none;
      font-weight: 500;
    }

    .form-control:focus {
      border-color: #1d4ed8;
      box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
      transform: translateY(-1px);
    }

    .form-control.is-invalid {
      border-color: #E53E3E;
      background-color: #FFF9F9;
    }

    .toggle-password {
      position: absolute;
      right: 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      opacity: 0.7;
    }

    .toggle-password:hover {
      opacity: 1;
    }

    .toggle-password svg {
      stroke: #64748b;
      transition: stroke 0.2s;
    }

    .toggle-password:hover svg {
      stroke: #1e3a8a;
    }

    .error-message {
      color: #E53E3E;
      font-size: 0.78rem;
      font-weight: 500;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .error-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(229, 62, 62, 0.1);
      color: #dc2626;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .error-dot.alert {
      background: rgba(220, 38, 38, 0.12);
    }

    .error-alert {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
      padding: 0.9rem 1rem;
      border-radius: 14px;
      margin-bottom: 1.1rem;
      font-size: 0.84rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-submit {
      width: 100%;
      padding: 0.98rem 1rem;
      background: linear-gradient(105deg, #00008B 0%, #1D4ED8 100%);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 0.25rem;
      box-shadow: 0 14px 24px -16px rgba(30, 58, 138, 0.6);
    }

    .btn-submit:hover:not(:disabled) {
      background: linear-gradient(105deg, #000066 0%, #1e40af 100%);
      transform: translateY(-2px);
      box-shadow: 0 18px 30px -18px rgba(30, 58, 138, 0.65);
    }

    .btn-submit:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      opacity: 0.7;
      box-shadow: none;
    }

    .submit-loading {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.65s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .signup-link {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.88rem;
      color: #475569;
      border-top: 1px solid #E2E8F0;
      padding-top: 1.25rem;
    }

    .signup-link a {
      color: #00008B;
      text-decoration: none;
      font-weight: 700;
    }

    .signup-link a:hover {
      color: #1D4ED8;
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .login-shell {
        padding: 1rem;
      }

      .login-card {
        padding: 1.25rem;
        border-radius: 18px;
      }

      .logo-image {
        max-width: 150px;
      }

      h2 {
        font-size: 1.4rem;
      }
    }
  `]
})
export class Login {
  loginForm: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    const { error } = await this.authService.signIn(email, password);

    this.isLoading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
    } else {
      await this.authService.redirectAfterLogin();
    }
  }
}