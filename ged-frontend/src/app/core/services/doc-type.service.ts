import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface DocType {
  id: string;
  name: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class DocTypeService {
  constructor(private api: ApiService) {}

  list(): Promise<DocType[]> {
    return this.api.get<DocType[]>('/doc-types');
  }

  create(data: { name: string; description?: string }): Promise<DocType> {
    return this.api.post<DocType>('/doc-types', data);
  }

  delete(id: string): Promise<void> {
    return this.api.delete<void>(`/doc-types/${id}`);
  }
}
