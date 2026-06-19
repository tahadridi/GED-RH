import { Injectable, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';

export interface ReclamationNotification {
  id: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private client: Client | null = null;
  connected = signal(false);

  private reclamationHandlers: Array<(n: ReclamationNotification) => void> = [];

  connect(token: string, userId: string, roles: string[]): void {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new WebSocket(environment.wsUrl),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        this.connected.set(true);

        this.client!.subscribe(`/topic/reclamations/${userId}`, msg => {
          const data: ReclamationNotification = JSON.parse(msg.body);
          this.reclamationHandlers.forEach(h => h(data));
        });

        if (roles.includes('ADMINISTRATOR')) {
          this.client!.subscribe('/topic/reclamations/admin', msg => {
            const data: ReclamationNotification = JSON.parse(msg.body);
            this.reclamationHandlers.forEach(h => h(data));
          });
        }
      },
      onDisconnect: () => this.connected.set(false),
    });

    this.client.activate();
  }

  onReclamationUpdate(handler: (n: ReclamationNotification) => void): void {
    this.reclamationHandlers.push(handler);
  }

  disconnect(): void {
    this.client?.deactivate();
    this.connected.set(false);
  }
}
