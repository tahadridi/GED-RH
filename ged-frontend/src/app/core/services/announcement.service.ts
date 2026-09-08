import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type AnnouncementPriority = 'NORMALE' | 'HAUTE' | 'CRITIQUE';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole?: 'ADMINISTRATOR' | 'DIRECTION_GENERALE' | string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  constructor(private api: ApiService) {}

  list(): Promise<Announcement[]> {
    return this.api.get<Announcement[]>('/announcements');
  }

  create(req: CreateAnnouncementRequest): Promise<Announcement> {
    return this.api.post<Announcement>('/announcements', req);
  }

  update(id: string, req: CreateAnnouncementRequest): Promise<Announcement> {
    return this.api.put<Announcement>(`/announcements/${id}`, req);
  }

  delete(id: string): Promise<void> {
    return this.api.delete<void>(`/announcements/${id}`);
  }
}
