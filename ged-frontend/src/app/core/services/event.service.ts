import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type EventPriority = 'NORMALE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  priority: EventPriority;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  priority?: EventPriority;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  constructor(private api: ApiService) {}

  list(): Promise<CalendarEvent[]> {
    return this.api.get<CalendarEvent[]>('/events');
  }

  upcoming(from?: string): Promise<CalendarEvent[]> {
    const q = from ? `?from=${from}` : '';
    return this.api.get<CalendarEvent[]>(`/events/upcoming${q}`);
  }

  get(id: string): Promise<CalendarEvent> {
    return this.api.get<CalendarEvent>(`/events/${id}`);
  }

  create(req: CreateEventRequest): Promise<CalendarEvent> {
    return this.api.post<CalendarEvent>('/events', req);
  }

  update(id: string, req: CreateEventRequest): Promise<CalendarEvent> {
    return this.api.put<CalendarEvent>(`/events/${id}`, req);
  }

  delete(id: string): Promise<void> {
    return this.api.delete<void>(`/events/${id}`);
  }
}