import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmState {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class UiService {
  confirmState = signal<ConfirmState | null>(null);
  toasts = signal<ToastItem[]>([]);
  private toastSeq = 0;

  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise(resolve => this.confirmState.set({ opts, resolve }));
  }

  toast(message: string, type: ToastItem['type'] = 'success', duration = 3200) {
    const id = ++this.toastSeq;
    this.toasts.set([...this.toasts(), { id, message, type }]);
    setTimeout(() => this.removeToast(id), duration);
  }

  removeToast(id: number) {
    this.toasts.set(this.toasts().filter(t => t.id !== id));
  }

  closeConfirm(result: boolean) {
    const state = this.confirmState();
    if (!state) return;
    this.confirmState.set(null);
    state.resolve(result);
  }
}