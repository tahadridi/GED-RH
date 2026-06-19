import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { SystemUser, SystemRole } from '../models/user.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: SystemRole[];
  rhResponsibilities: string[];
  active: boolean;
  employeeId: string | null;
  matricule: string | null;
  photoUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  private _user = signal<User | null>(null);
  private _profile = signal<UserProfile | null>(null);
  private _initPromise: Promise<void>;

  private _initResolved = false;

  constructor(private router: Router, private http: HttpClient) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // Wait for the first auth event (session restored or login)
    this._initPromise = new Promise<void>(resolve => {
      this._initResolve = resolve;
    });

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      this._user.set(session?.user ?? null);
      if (session?.user) {
        await this.loadProfile(session.access_token);
      } else {
        this._profile.set(null);
      }

      // Resolve on the first event (INITIAL_SESSION or SIGNED_IN)
      if (!this._initResolved) {
        this._initResolved = true;
        this._initResolve();
      }

      if (_event === 'SIGNED_OUT') {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  private _initResolve: () => void = () => {};

  /** Wait for session restore + profile load */
  async ready(): Promise<void> {
    await this._initPromise;
  }

  private async loadProfile(token: string): Promise<void> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`, { headers })
      );
      this._profile.set(profile);
    } catch {
      this._profile.set(null);
    }
  }

  get user() { return this._user; }
  get profile() { return this._profile; }

  async getSessionUser(): Promise<User | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.user ?? null;
  }

  async getToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async signIn(email: string, pass: string) {
    return await this.supabase.auth.signInWithPassword({ email, password: pass });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  /** Wait for profile to load then redirect based on role */
  async redirectAfterLogin(): Promise<void> {
    await this.ready();
    const p = this._profile();
    if (p) {
      this.router.navigate([this.getDashboardRoute(p.roles)]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  getDashboardRoute(roles: SystemRole[]): string {
    if (roles.includes('ADMINISTRATOR')) return '/dashboard';
    if (roles.includes('DIRECTION_GENERALE')) return '/dashboard/dg';
    if (roles.includes('RH')) return '/dashboard/rh';
    if (roles.includes('MANAGER')) return '/dashboard/manager';
    return '/dashboard';
  }

  hasRole(role: SystemRole): boolean {
    return this._profile()?.roles?.includes(role) ?? false;
  }

  isAdmin(): boolean { return this.hasRole('ADMINISTRATOR'); }
  isManager(): boolean { return this.hasRole('MANAGER'); }
  isRH(): boolean { return this.hasRole('RH'); }
  isDG(): boolean { return this.hasRole('DIRECTION_GENERALE'); }

  getRhResponsibilities(): string[] {
    return this._profile()?.rhResponsibilities ?? [];
  }

  async updateProfile(data: { email?: string; firstName?: string; lastName?: string }): Promise<UserProfile> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const profile = await firstValueFrom(this.http.put<UserProfile>(`${environment.apiUrl}/auth/profile`, data, { headers }));
    this._profile.set(profile);
    return profile;
  }

  async uploadPhoto(file: File): Promise<UserProfile> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const formData = new FormData();
    formData.append('file', file);
    const profile = await firstValueFrom(this.http.post<UserProfile>(`${environment.apiUrl}/auth/photo`, formData, { headers }));
    this._profile.set(profile);
    return profile;
  }

  async createReclamation(title: string, message?: string, newValue?: string, priority?: string): Promise<any> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    return firstValueFrom(this.http.post(`${environment.apiUrl}/reclamations`, { title, message, newValue, priority }, { headers }));
  }

  async updatePassword(newPassword: string): Promise<void> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/password`, { newPassword }, { headers }));
  }

  async getReclamations(): Promise<any[]> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/reclamations`, { headers }));
  }

  async getMyReclamations(): Promise<any[]> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/reclamations/mine`, { headers }));
  }

  async getTeamReclamations(): Promise<any[]> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/reclamations/team`, { headers }));
  }

  async getReclamationStatsByDepartment(): Promise<any[]> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/reclamations/stats/by-department`, { headers }));
  }

  async approveReclamation(id: string): Promise<any> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.put(`${environment.apiUrl}/reclamations/${id}/approve`, {}, { headers }));
  }

  async rejectReclamation(id: string, reason?: string, comment?: string): Promise<any> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    return firstValueFrom(this.http.put(`${environment.apiUrl}/reclamations/${id}/reject`, { reason, comment }, { headers }));
  }

  async applyEmailChange(id: string): Promise<any> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.put(`${environment.apiUrl}/reclamations/${id}/apply-email-change`, {}, { headers }));
  }

  async acknowledgeReclamation(id: string): Promise<any> {
    const token = await this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.put(`${environment.apiUrl}/reclamations/${id}/acknowledge`, {}, { headers }));
  }
}
