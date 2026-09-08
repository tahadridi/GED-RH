import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../core/services/ui.service';
import { LucideAlertTriangle, LucideCheckCircle2, LucideInfo, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-ui-dialogs',
  standalone: true,
  imports: [CommonModule, LucideAlertTriangle, LucideCheckCircle2, LucideInfo, LucideX],
  template: `
    <!-- Confirm dialog -->
    <div *ngIf="ui.confirmState() as state"
         class="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-[#0B1220]/45 backdrop-blur-[2px]" (click)="ui.closeConfirm(false)"></div>
      <div class="relative bg-white rounded-[16px] border border-[#E7ECF2] shadow-[0_24px_60px_rgba(16,24,40,.25)] w-full max-w-[420px] p-6">
        <div class="flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0"
               [ngClass]="state.opts.danger ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#EDF4FF] text-[#2563EB]'">
            <svg lucideAlertTriangle *ngIf="state.opts.danger" class="w-5 h-5"></svg>
            <svg lucideInfo *ngIf="!state.opts.danger" class="w-5 h-5"></svg>
          </div>
          <div class="min-w-0 flex-1 pt-1">
            <h3 class="text-[16px] font-bold text-[#15213D]" style="letter-spacing:-.2px">{{ state.opts.title }}</h3>
            <p class="text-[13px] text-[#8A96A9] mt-1.5 leading-relaxed">{{ state.opts.message }}</p>
          </div>
          <button type="button" (click)="ui.closeConfirm(false)"
            class="w-7 h-7 flex items-center justify-center rounded-[8px] text-[#9AA5B7] hover:bg-[#F7F9FC] hover:text-[#15213D] transition shrink-0">
            <svg lucideX class="w-4 h-4"></svg>
          </button>
        </div>
        <div class="flex justify-end gap-2.5 mt-6">
          <button type="button" (click)="ui.closeConfirm(false)"
            class="px-4 h-[38px] rounded-[9px] bg-white border border-[#E7ECF2] text-[#15213D] text-[13px] font-semibold hover:bg-[#F7F9FC] hover:border-[#D3DBE8] transition">
            {{ state.opts.cancelLabel || 'Annuler' }}
          </button>
          <button type="button" (click)="ui.closeConfirm(true)"
            class="px-4 h-[38px] rounded-[9px] text-[13px] font-semibold text-white transition"
            [ngClass]="state.opts.danger ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'">
            {{ state.opts.confirmLabel || 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="fixed top-5 right-5 z-[95] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-2rem)]">
      <div *ngFor="let t of ui.toasts()"
           class="flex items-start gap-3 bg-white border border-[#E7ECF2] rounded-[12px] shadow-[0_12px_32px_rgba(16,24,40,.12)] px-4 py-3.5">
        <span class="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
              [ngClass]="{ 'bg-[#EAFCF1] text-[#16A34A]': t.type === 'success', 'bg-[#FEF2F2] text-[#DC2626]': t.type === 'error', 'bg-[#EDF4FF] text-[#2563EB]': t.type === 'info' }">
          <svg lucideCheckCircle2 *ngIf="t.type === 'success'" class="w-4 h-4"></svg>
          <svg lucideAlertTriangle *ngIf="t.type === 'error'" class="w-4 h-4"></svg>
          <svg lucideInfo *ngIf="t.type === 'info'" class="w-4 h-4"></svg>
        </span>
        <p class="text-[13px] text-[#15213D] leading-relaxed flex-1 py-0.5">{{ t.message }}</p>
        <button type="button" (click)="ui.removeToast(t.id)"
          class="w-6 h-6 flex items-center justify-center rounded-[7px] text-[#9AA5B7] hover:bg-[#F7F9FC] hover:text-[#15213D] transition shrink-0">
          <svg lucideX class="w-3.5 h-3.5"></svg>
        </button>
      </div>
    </div>
  `
})
export class UiDialogs {
  constructor(public ui: UiService) {}
}