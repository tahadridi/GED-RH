import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private async authHeaders(): Promise<HttpHeaders> {
    const token = await this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const headers = await this.authHeaders();
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => { if (v) httpParams = httpParams.set(k, v); });
    }
    return firstValueFrom(this.http.get<T>(`${this.base}${path}`, { headers, params: httpParams }));
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const headers = await this.authHeaders();
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, body, { headers }));
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const headers = await this.authHeaders();
    return firstValueFrom(this.http.put<T>(`${this.base}${path}`, body, { headers }));
  }

  async delete<T>(path: string): Promise<T> {
    const headers = await this.authHeaders();
    return firstValueFrom(this.http.delete<T>(`${this.base}${path}`, { headers }));
  }

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const headers = await this.authHeaders();
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, formData, { headers }));
  }

  async postFormDataVersion<T>(path: string, formData: FormData): Promise<T> {
    const headers = await this.authHeaders();
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, formData, { headers }));
  }

  async downloadBlob(path: string): Promise<Blob> {
    const headers = await this.authHeaders();
    return firstValueFrom(this.http.get(`${this.base}${path}`, { headers, responseType: 'blob' }));
  }
}
