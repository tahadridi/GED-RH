import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { LucideSend, LucideCheck, LucideX, LucideRefreshCw, LucideAlertTriangle, LucideClock, LucideMegaphone, LucideInbox, LucideCheckCircle2, LucideXCircle, LucideUser, LucideUserCheck, LucideUserCog, LucideFileText, LucideMessageSquareWarning } from '@lucide/angular';
import { getErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-user-reclamations',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucideSend, LucideCheck, LucideX, LucideRefreshCw, LucideAlertTriangle,
    LucideClock, LucideMegaphone, LucideInbox, LucideCheckCircle2, LucideXCircle,
LucideUser, LucideUserCheck, LucideUserCog, LucideFileText,
    LucideMessageSquareWarning
  ],
  template: `
    <div class="min-h-screen bg-[#f7f9fc] text-[#17233c] font-[Inter,system-ui,Arial,sans-serif]">

      <!-- Breadcrumb -->
      <div class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div class="flex items-center gap-2.5 text-[14px] text-[#9aa5b7]">
          <span>GED</span>
          <span>&rsaquo;</span>
          <b class="font-semibold text-[#66738a]">Réclamations</b>
        </div>
      </div>

      <div class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">

        <!-- Heading -->
        <section class="flex justify-between items-end gap-6 flex-wrap pb-7 mb-6" style="border-bottom:1px solid #e7ecf2">
          <div class="flex items-center gap-4">
            <div class="w-[50px] h-[50px] rounded-[15px] bg-[#edf4ff] text-[#2563eb] flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_rgba(37,99,235,.08)]">
              <svg lucideMessageSquareWarning class="w-[22px] h-[22px]"></svg>
            </div>
            <div>
              
              <h1 class="text-[29px] font-extrabold mb-2" style="letter-spacing:-1px">Réclamations</h1>
              <p class="text-[14px] text-[#8793a6]">Suivez et gérez les réclamations de votre organisation.</p>
            </div>
          </div>
          <button (click)="refreshData()" class="h-[42px] px-[17px] rounded-[9px] bg-white border border-[#e7ecf2] text-[#17233c] text-[13px] font-semibold shadow-[0_1px_2px_rgba(16,24,40,.03)] hover:bg-[#fafbfc] transition-colors inline-flex items-center gap-2">
            <svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingAll() || loadingTeam() || loadingDeptStats()"></svg>
            Actualiser
          </button>
        </section>

        <!-- Stats KPI -->
        @if (hasData()) {
          <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[13px] mb-6">
            <article class="bg-white border border-[#e7ecf2] rounded-[14px] p-[17px] shadow-[0_6px_22px_rgba(19,35,68,.03)]">
              <div class="flex justify-between">
                <div>
                  <label class="text-[13px] text-[#748197]">Total des réclamations</label>
                  <h2 class="text-[28px] font-bold mt-1" style="letter-spacing:-.8px">{{ totalCount() }}</h2>
                </div>
                <div class="w-[37px] h-[37px] rounded-[10px] bg-[#edf4ff] text-[#2563eb] flex items-center justify-center">
                  <svg lucideInbox class="w-4 h-4"></svg>
                </div>
              </div>
              <div class="text-[12px] text-[#a0aabb] mt-2.5">Toutes les réclamations</div>
            </article>

            <article class="bg-white border border-[#e7ecf2] rounded-[14px] p-[17px] shadow-[0_6px_22px_rgba(19,35,68,.03)]">
              <div class="flex justify-between">
                <div>
                  <label class="text-[13px] text-[#748197]">En attente</label>
                  <h2 class="text-[28px] font-bold mt-1" style="letter-spacing:-.8px">{{ pendingCount() }}</h2>
                </div>
                <div class="w-[37px] h-[37px] rounded-[10px] bg-[#fff5dd] text-[#b45309] flex items-center justify-center">
                  <svg lucideClock class="w-4 h-4"></svg>
                </div>
              </div>
              <div class="text-[12px] text-[#a0aabb] mt-2.5">Nécessitent une action</div>
            </article>

            <article class="bg-white border border-[#e7ecf2] rounded-[14px] p-[17px] shadow-[0_6px_22px_rgba(19,35,68,.03)]">
              <div class="flex justify-between">
                <div>
                  <label class="text-[13px] text-[#748197]">Approuvées</label>
                  <h2 class="text-[28px] font-bold mt-1" style="letter-spacing:-.8px">{{ approvedCount() }}</h2>
                </div>
                <div class="w-[37px] h-[37px] rounded-[10px] bg-[#eaf8ef] text-[#16a34a] flex items-center justify-center">
                  <svg lucideCheckCircle2 class="w-4 h-4"></svg>
                </div>
              </div>
              <div class="text-[12px] text-[#a0aabb] mt-2.5">Traitement effectué</div>
            </article>

            <article class="bg-white border border-[#e7ecf2] rounded-[14px] p-[17px] shadow-[0_6px_22px_rgba(19,35,68,.03)]">
              <div class="flex justify-between">
                <div>
                  <label class="text-[13px] text-[#748197]">Rejetées</label>
                  <h2 class="text-[28px] font-bold mt-1" style="letter-spacing:-.8px">{{ rejectedCount() }}</h2>
                </div>
                <div class="w-[37px] h-[37px] rounded-[10px] bg-[#fff0f0] text-[#dc2626] flex items-center justify-center">
                  <svg lucideXCircle class="w-4 h-4"></svg>
                </div>
              </div>
              <div class="text-[12px] text-[#a0aabb] mt-2.5">Non retenues</div>
            </article>
          </section>
        }

        <!-- Nouvelle réclamation (soumission) -->
        @if (!isAdmin) {
          <section class="bg-white border border-[#e7ecf2] rounded-[16px] shadow-[0_6px_22px_rgba(19,35,68,.04)] overflow-hidden mb-6">
            <div class="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-[#f2f4f7]">
              <div class="w-[46px] h-[46px] rounded-[12px] bg-[#eaf2ff] text-[#2563eb] flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_rgba(37,99,235,.08)]">
                <svg lucideMessageSquareWarning class="w-5 h-5"></svg>
              </div>
              <div class="min-w-0">
                <div class="text-[10px] font-bold uppercase tracking-[.1em] text-[#9aa5b7] mb-1">Soumission</div>
                <h2 class="text-[18px] font-bold text-[#15213d] leading-snug" style="letter-spacing:-.3px">Nouvelle réclamation</h2>
                <p class="text-[12px] text-[#9aa5b7] mt-0.5">Envoyez une réclamation à votre manager.</p>
              </div>
            </div>
            <div class="px-6 py-6 space-y-5">
              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#17233c] mb-2">Titre *</label>
                <input [(ngModel)]="title" type="text" placeholder="Titre de la réclamation"
                  class="w-full px-[13px] h-[44px] border border-[#e1e7ef] rounded-[11px] text-[13.5px] text-[#15213d] placeholder:text-[#b6c0cf] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/15 focus:border-[#2563eb] transition-colors bg-[#fbfcfe]">
              </div>
              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#17233c] mb-2">Description *</label>
                <textarea [(ngModel)]="message" rows="4" placeholder="Décrivez votre réclamation en détail..."
                  class="w-full px-[13px] py-[10px] border border-[#e1e7ef] rounded-[11px] text-[13.5px] text-[#15213d] placeholder:text-[#b6c0cf] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/15 focus:border-[#2563eb] transition-colors bg-[#fbfcfe] resize-y"></textarea>
              </div>
              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#17233c] mb-2.5">Priorité</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button type="button" (click)="priority = 'FAIBLE'"
                    class="h-[42px] rounded-[11px] border text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-2"
                    [ngClass]="priority === 'FAIBLE' ? 'bg-[#f1f3f6] text-[#68758a] border-[#d8dee8] shadow-[inset_0_0_0_1px_#d8dee8]' : 'bg-white text-[#17233c] border-[#e7ecf2] hover:bg-[#f8fafc]'">
                    <span class="w-[8px] h-[8px] rounded-full shrink-0"
                      [ngClass]="priority === 'FAIBLE' ? 'bg-[#68758a]' : 'bg-[#c3ccd9]'"></span>
                    Faible
                  </button>
                  <button type="button" (click)="priority = 'MOYENNE'"
                    class="h-[42px] rounded-[11px] border text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-2"
                    [ngClass]="priority === 'MOYENNE' ? 'bg-[#eaf2ff] text-[#2563eb] border-[#a9c8f8] shadow-[inset_0_0_0_1px_#a9c8f8]' : 'bg-white text-[#17233c] border-[#e7ecf2] hover:bg-[#f8fafc]'">
                    <span class="w-[8px] h-[8px] rounded-full shrink-0"
                      [ngClass]="priority === 'MOYENNE' ? 'bg-[#2563eb]' : 'bg-[#c3ccd9]'"></span>
                    Moyenne
                  </button>
                  <button type="button" (click)="priority = 'HAUTE'"
                    class="h-[42px] rounded-[11px] border text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-2"
                    [ngClass]="priority === 'HAUTE' ? 'bg-[#fff5dd] text-[#f59e0b] border-[#f5d58a] shadow-[inset_0_0_0_1px_#f5d58a]' : 'bg-white text-[#17233c] border-[#e7ecf2] hover:bg-[#f8fafc]'">
                    <span class="w-[8px] h-[8px] rounded-full shrink-0"
                      [ngClass]="priority === 'HAUTE' ? 'bg-[#f59e0b]' : 'bg-[#c3ccd9]'"></span>
                    Haute
                  </button>
                  <button type="button" (click)="priority = 'CRITIQUE'"
                    class="h-[42px] rounded-[11px] border text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-2"
                    [ngClass]="priority === 'CRITIQUE' ? 'bg-[#fff0f0] text-[#ef4444] border-[#f3c4c4] shadow-[inset_0_0_0_1px_#f3c4c4]' : 'bg-white text-[#17233c] border-[#e7ecf2] hover:bg-[#f8fafc]'">
                    <span class="w-[8px] h-[8px] rounded-full shrink-0"
                      [ngClass]="priority === 'CRITIQUE' ? 'bg-[#ef4444]' : 'bg-[#c3ccd9]'"></span>
                    Critique
                  </button>
                </div>
              </div>
              @if (submitError) {
                <div class="flex items-center gap-2.5 text-[#dc2626] text-[13px] bg-[#fdeaea] px-3.5 py-2.5 rounded-[10px]">
                  <svg lucideAlertTriangle class="w-4 h-4 shrink-0"></svg>
                  {{ submitError }}
                </div>
              }
              <div class="flex flex-wrap items-center gap-3 pt-1">
                <button (click)="submit()" [disabled]="!title || !message || submitting"
                  class="h-[42px] px-[18px] rounded-[11px] bg-[#2563eb] text-white text-[13px] font-bold shadow-[0_4px_12px_rgba(37,99,235,.18)] hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  <svg lucideSend class="w-4 h-4"></svg>
                  {{ submitting ? 'Envoi...' : 'Envoyer la réclamation' }}
                </button>
                @if (submitSuccess) {
                  <span class="flex items-center gap-2 text-[13px] font-semibold text-[#16a34a]">
                    <span class="w-[22px] h-[22px] rounded-full bg-[#e9f9ef] flex items-center justify-center shrink-0">
                      <svg lucideCheck class="w-3.5 h-3.5"></svg>
                    </span>
                    Réclamation envoyée avec succès
                  </span>
                }
              </div>
            </div>
          </section>
        }

        <!-- Admin: répartition par département -->
        @if (isAdmin) {
          <section class="bg-white border border-[#e7ecf2] rounded-[14px] shadow-[0_6px_22px_rgba(19,35,68,.03)] overflow-hidden mb-6">
            <div class="flex justify-between items-center px-[19px] py-[18px] border-b border-[#e7ecf2]">
              <div>
                <div class="text-[18px] font-extrabold">Réclamations par origine</div>
                <div class="text-[12px] text-[#9aa5b7] mt-1">Qui a envoyé les réclamations (Ressources Humaines / Manager / Employé)</div>
              </div>
              <button (click)="loadDeptStats()" class="w-[36px] h-[36px] rounded-[9px] bg-[#f5f7fa] text-[#8a97aa] hover:bg-[#edf4ff] hover:text-[#2563eb] transition-colors flex items-center justify-center">
                <svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingDeptStats()"></svg>
              </button>
            </div>
            <div class="px-[19px] py-5">
              @if (loadingDeptStats()) {
                <div class="text-center text-[#8d99aa] text-[13px] py-4">Chargement...</div>
              } @else if (deptStats().length === 0) {
                <div class="text-center text-[#8d99aa] text-[13px] py-4">Aucune réclamation</div>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[13px]">
                  @for (s of deptStats(); track s.department) {
                    <div class="bg-[#fafbfd] border border-[#e7ecf2] rounded-[12px] p-4">
                      <div class="flex items-center gap-2.5 mb-3">
                        <div class="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
                          [class]="originIconClass(s.department)">
                          @if (s.department === 'Manager') {
                            <svg lucideUserCheck class="w-4 h-4"></svg>
                          } @else if (s.department === 'Ressources Humaines') {
                            <svg lucideUserCog class="w-4 h-4"></svg>
                          } @else {
                            <svg lucideUser class="w-4 h-4"></svg>
                          }
                        </div>
                        <h4 class="text-[14px] font-bold text-[#17233c]">{{ s.department }}</h4>
                      </div>
                      <div class="flex justify-between items-center py-1 text-[13px]">
                        <span class="text-[#7b8799]">Total</span>
                        <span class="font-bold text-[#17233c]">{{ s.total }}</span>
                      </div>
                      <div class="flex justify-between items-center py-1 text-[13px]">
                        <span class="text-[#b45309]">En attente</span>
                        <span class="font-bold text-[#b45309]">{{ s.pending }}</span>
                      </div>
                      <div class="flex justify-between items-center py-1 text-[13px]">
                        <span class="text-[#16a34a]">Approuvées</span>
                        <span class="font-bold text-[#16a34a]">{{ s.approved }}</span>
                      </div>
                      <div class="flex justify-between items-center py-1 text-[13px]">
                        <span class="text-[#dc2626]">Rejetées</span>
                        <span class="font-bold text-[#dc2626]">{{ s.rejected }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>

          <!-- Admin: toutes les réclamations -->
          <section class="bg-white border border-[#e7ecf2] rounded-[14px] shadow-[0_6px_22px_rgba(19,35,68,.03)] overflow-hidden mb-6">
            <div class="flex justify-between items-center px-[19px] py-[18px] border-b border-[#e7ecf2]">
              <div>
                <div class="text-[18px] font-extrabold">Toutes les réclamations</div>
                <div class="text-[12px] text-[#9aa5b7] mt-1">Historique complet des réclamations</div>
              </div>
              <button (click)="loadAll()" class="w-[36px] h-[36px] rounded-[9px] bg-[#f5f7fa] text-[#8a97aa] hover:bg-[#edf4ff] hover:text-[#2563eb] transition-colors flex items-center justify-center">
                <svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingAll()"></svg>
              </button>
            </div>
            @if (loadingAll()) {
              <div class="text-center text-[#8d99aa] text-[13px] py-8">Chargement...</div>
            } @else if (allReclamations().length === 0) {
              <div class="text-center text-[#8d99aa] text-[13px] py-8">Aucune réclamation</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[880px]" style="border-collapse:collapse">
                  <thead>
                    <tr class="bg-[#fcfdff]" style="border-bottom:1px solid #e7ecf2">
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Date</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Employé</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Matricule</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Priorité</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Titre</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Statut</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Traité par</th>
                      <th *ngIf="hasPending()" class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let r of allReclamations()">
                      <tr class="hover:bg-[#fbfcff] transition-colors" style="border-bottom:1px solid #f0f3f7">
                        <td class="px-[18px] py-[14px] text-[13px] text-[#53627a] whitespace-nowrap">{{ formatDate(r.createdAt) }}</td>
                        <td class="px-[18px] py-[14px] text-[13px]">
                          <span class="font-bold text-[#293751]">{{ r.employeeFirstName }} {{ r.employeeLastName }}</span>
                        </td>
                        <td class="px-[18px] py-[14px] text-[13px] text-[#68768c]">{{ r.employeeMatricule || '—' }}</td>
                        <td class="px-[18px] py-[14px]">
                          <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold whitespace-nowrap ' + priorityClass(r.priority)">{{ priorityLabel(r.priority) }}</span>
                        </td>
                        <td class="px-[18px] py-[14px]">
                          <button (click)="openDetail(r)" class="text-left text-[13px] text-[#15213d] font-semibold inline-flex items-center gap-1.5 hover:text-[#2563eb] hover:underline transition-colors">
                            <svg lucideFileText class="w-3.5 h-3.5 text-[#8a97aa] shrink-0"></svg>
                            {{ r.title }}
                          </button>
                        </td>
                        <td class="px-[18px] py-[14px]">
                          <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                        </td>
                        <td class="px-[18px] py-[14px] text-[13px] text-[#68768c]">{{ r.processedByName || '—' }}</td>
                        <td *ngIf="r.status === 'PENDING'" class="px-[18px] py-[14px]">
                          <div class="flex gap-[5px]">
                            <button (click)="approve(r.id)" title="Approuver"
                              class="w-[30px] h-[30px] rounded-[7px] bg-[#eaf8ef] text-[#16a34a] hover:bg-[#d4f0dd] transition-colors flex items-center justify-center">
                              <svg lucideCheck class="w-4 h-4"></svg>
                            </button>
                            <button (click)="openReject(r.id)" title="Rejeter"
                              class="w-[30px] h-[30px] rounded-[7px] bg-[#fff0f0] text-[#dc2626] hover:bg-[#ffe0e0] transition-colors flex items-center justify-center">
                              <svg lucideX class="w-4 h-4"></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr *ngIf="r.status === 'REJECTED' && r.rejectionReason" style="background:#fef6f6">
                        <td colspan="8" class="px-[18px] py-2.5 text-[12px] text-[#b91c1c]" style="border-bottom:1px solid #ffe0e0">
                          <strong>Motif : {{ rejectionLabel(r.rejectionReason) }}</strong>
                          <span *ngIf="r.rejectionComment" class="ml-1 font-normal">— {{ r.rejectionComment }}</span>
                        </td>
                      </tr>
                    </ng-container>
                  </tbody>
                </table>
              </div>
            }
            @if (adminError) {
              <div class="mx-[19px] mt-4 px-3 py-2.5 rounded-[9px] bg-[#fff0f0] text-[#b91c1c] text-[13px]">{{ adminError }}</div>
            }
          </section>
        }

        <!-- Manager: réclamations de l'équipe -->
        @if (isManager && !isAdmin) {
          <section class="bg-white border border-[#e7ecf2] rounded-[14px] shadow-[0_6px_22px_rgba(19,35,68,.03)] overflow-hidden mb-6">
            <div class="flex justify-between items-center px-[19px] py-[18px] border-b border-[#e7ecf2]">
              <div>
                <div class="text-[18px] font-extrabold">Réclamations de mon équipe</div>
                <div class="text-[12px] text-[#9aa5b7] mt-1">Les réclamations de vos collaborateurs</div>
              </div>
              <button (click)="loadTeam()" class="w-[36px] h-[36px] rounded-[9px] bg-[#f5f7fa] text-[#8a97aa] hover:bg-[#edf4ff] hover:text-[#2563eb] transition-colors flex items-center justify-center">
                <svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingTeam()"></svg>
              </button>
            </div>
            @if (loadingTeam()) {
              <div class="text-center text-[#8d99aa] text-[13px] py-8">Chargement...</div>
            } @else if (teamReclamations().length === 0) {
              <div class="text-center text-[#8d99aa] text-[13px] py-8">Aucune réclamation de votre équipe</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[880px]" style="border-collapse:collapse">
                  <thead>
                    <tr class="bg-[#fcfdff]" style="border-bottom:1px solid #e7ecf2">
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Date</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Employé</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Matricule</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Priorité</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Titre</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Statut</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Traité par</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let r of teamReclamations()">
                      <tr class="hover:bg-[#fbfcff] transition-colors" style="border-bottom:1px solid #f0f3f7">
                        <td class="px-[18px] py-[14px] text-[13px] text-[#53627a] whitespace-nowrap">{{ formatDate(r.createdAt) }}</td>
                        <td class="px-[18px] py-[14px] text-[13px]">
                          <span class="font-bold text-[#293751]">{{ r.employeeFirstName }} {{ r.employeeLastName }}</span>
                        </td>
                        <td class="px-[18px] py-[14px] text-[13px] text-[#68768c]">{{ r.employeeMatricule || '—' }}</td>
                        <td class="px-[18px] py-[14px]">
                          <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold whitespace-nowrap ' + priorityClass(r.priority)">{{ priorityLabel(r.priority) }}</span>
                        </td>
                        <td class="px-[18px] py-[14px]">
                          <button (click)="openDetail(r)" class="text-left text-[13px] text-[#15213d] font-semibold inline-flex items-center gap-1.5 hover:text-[#2563eb] hover:underline transition-colors">
                            <svg lucideFileText class="w-3.5 h-3.5 text-[#8a97aa] shrink-0"></svg>
                            {{ r.title }}
                          </button>
                        </td>
                        <td class="px-[18px] py-[14px]">
                          <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                        </td>
                        <td *ngIf="r.status === 'PENDING'" class="px-[18px] py-[14px]">
                          <div class="flex gap-[5px]">
                            <button (click)="approveTeam(r.id)" title="Approuver"
                              class="w-[30px] h-[30px] rounded-[7px] bg-[#eaf8ef] text-[#16a34a] hover:bg-[#d4f0dd] transition-colors flex items-center justify-center">
                              <svg lucideCheck class="w-4 h-4"></svg>
                            </button>
                            <button (click)="openReject(r.id)" title="Rejeter"
                              class="w-[30px] h-[30px] rounded-[7px] bg-[#fff0f0] text-[#dc2626] hover:bg-[#ffe0e0] transition-colors flex items-center justify-center">
                              <svg lucideX class="w-4 h-4"></svg>
                            </button>
                          </div>
                        </td>
                        <td *ngIf="r.status !== 'PENDING'" class="px-[18px] py-[14px] text-[13px] text-[#68768c]">{{ r.processedByName || '—' }}</td>
                      </tr>
                      <tr *ngIf="r.status === 'REJECTED' && r.rejectionReason" style="background:#fef6f6">
                        <td colspan="7" class="px-[18px] py-2.5 text-[12px] text-[#b91c1c]" style="border-bottom:1px solid #ffe0e0">
                          <strong>Motif : {{ rejectionLabel(r.rejectionReason) }}</strong>
                          <span *ngIf="r.rejectionComment" class="ml-1 font-normal">— {{ r.rejectionComment }}</span>
                        </td>
                      </tr>
                    </ng-container>
                  </tbody>
                </table>
              </div>
            }
            @if (teamError) {
              <div class="mx-[19px] mt-4 px-3 py-2.5 rounded-[9px] bg-[#fff0f0] text-[#b91c1c] text-[13px]">{{ teamError }}</div>
            }
          </section>
        }

        <!-- Mes réclamations -->
        @if (!isAdmin) {
          <section class="bg-white border border-[#e7ecf2] rounded-[14px] shadow-[0_6px_22px_rgba(19,35,68,.03)] overflow-hidden">
            <div class="px-[19px] py-[18px] border-b border-[#e7ecf2]">
              <div class="text-[18px] font-extrabold">Mes réclamations</div>
              <div class="text-[12px] text-[#9aa5b7] mt-1">L'historique de vos réclamations</div>
            </div>
            @if (myReclamations().length === 0) {
              <div class="text-center text-[#8d99aa] text-[13px] py-8">Aucune réclamation</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[880px]" style="border-collapse:collapse">
                  <thead>
                    <tr class="bg-[#fcfdff]" style="border-bottom:1px solid #e7ecf2">
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Date</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Titre</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Priorité</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Statut</th>
                      <th class="text-left px-[18px] py-[13px] text-[12px] font-extrabold tracking-[.05em] text-[#7b8799]">Traité par</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let r of myReclamations()">
                      <tr class="hover:bg-[#fbfcff] transition-colors" style="border-bottom:1px solid #f0f3f7">
                        <td class="px-[18px] py-[14px] text-[13px] text-[#53627a] whitespace-nowrap">{{ formatDate(r.createdAt) }}</td>
                        <td class="px-[18px] py-[14px]">
                          <button (click)="openDetail(r)" class="text-left text-[13px] text-[#15213d] font-semibold inline-flex items-center gap-1.5 hover:text-[#2563eb] hover:underline transition-colors">
                            <svg lucideFileText class="w-3.5 h-3.5 text-[#8a97aa] shrink-0"></svg>
                            {{ r.title }}
                          </button>
                        </td>
                        <td class="px-[18px] py-[14px]">
                          <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold whitespace-nowrap ' + priorityClass(r.priority)">{{ priorityLabel(r.priority) }}</span>
                        </td>
                        <td class="px-[18px] py-[14px]">
                          <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                        </td>
                        <td class="px-[18px] py-[14px] text-[13px] text-[#68768c]">{{ r.processedByName || '—' }}</td>
                      </tr>
                      <tr *ngIf="r.status === 'REJECTED' && r.rejectionReason" style="background:#fef6f6">
                        <td colspan="5" class="px-[18px] py-2.5 text-[12px] text-[#b91c1c]" style="border-bottom:1px solid #ffe0e0">
                          <strong>Motif : {{ rejectionLabel(r.rejectionReason) }}</strong>
                          <span *ngIf="r.rejectionComment" class="ml-1 font-normal">— {{ r.rejectionComment }}</span>
                        </td>
                      </tr>
                    </ng-container>
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        
      </div>
    </div>

    <!-- Reject modal -->
    @if (showRejectModal) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4" (click)="showRejectModal = false">
        <div class="bg-white rounded-[14px] p-6 w-full max-w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]" (click)="$event.stopPropagation()">
          <h3 class="text-[18px] font-extrabold text-[#17233c] mb-4">Motif du rejet</h3>
          <div class="flex flex-col gap-2.5">
            <label *ngFor="let opt of rejectOptions" class="flex items-center gap-2 text-[14px] cursor-pointer">
              <input type="radio" name="rejectReason" [value]="opt.value" [(ngModel)]="rejectReason" style="accent-color:#2563eb">
              <span>{{ opt.label }}</span>
            </label>
          </div>
          <div class="mt-3" *ngIf="rejectReason === 'AUTRE'">
            <label class="block text-[12px] font-bold text-[#56647b] uppercase tracking-wider mb-1.5">Commentaire</label>
            <textarea [(ngModel)]="rejectComment" rows="3" placeholder="Précisez le motif..."
              class="w-full px-3 py-2 border border-[#e0e6ee] rounded-[9px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/5 focus:border-[#8eaff0] resize-y"></textarea>
          </div>
          <div class="flex gap-2 justify-end mt-5">
            <button (click)="showRejectModal = false" class="h-10 px-4 rounded-[9px] bg-white border border-[#d1d5db] text-[#374151] text-[13px] hover:bg-[#f3f4f6] transition-colors">Annuler</button>
            <button (click)="confirmReject()" [disabled]="!rejectReason"
              class="h-10 px-4 rounded-[9px] bg-[#dc2626] text-white text-[13px] font-semibold hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirmer le rejet</button>
          </div>
        </div>
      </div>
    }

    <!-- Detail modal -->
    @if (selectedRec) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4" (click)="selectedRec = null">
        <div class="bg-white rounded-[14px] w-full max-w-[640px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-start px-[22px] py-[18px] border-b border-[#e7ecf2] bg-[#fcfdff]">
            <div class="min-w-0 pr-3">
              <div class="text-[11px] font-extrabold tracking-[.08em] text-[#7b8799] uppercase mb-1">Réclamation</div>
              <h3 class="text-[18px] font-extrabold text-[#17233c] break-words">{{ selectedRec.title }}</h3>
            </div>
            <button (click)="selectedRec = null" class="w-[32px] h-[32px] rounded-[8px] bg-white border border-[#e7ecf2] text-[#8a97aa] hover:text-[#17233c] hover:border-[#d1d8e3] transition-colors flex items-center justify-center shrink-0">
              <svg lucideX class="w-4 h-4"></svg>
            </button>
          </div>

          <div class="px-[22px] py-5">
            <div class="flex flex-wrap gap-2 mb-5">
              <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold ' + statusClass(selectedRec.status)">{{ statusLabel(selectedRec.status) }}</span>
              <span [class]="'inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold whitespace-nowrap ' + priorityClass(selectedRec.priority)">{{ priorityLabel(selectedRec.priority) }}</span>
              @if (selectedRec.newValue) {
                <span class="inline-block rounded-full px-[9px] py-[5px] text-[11px] font-bold bg-[#f2edff] text-[#7c3aed] whitespace-nowrap">Changement d'email</span>
              }
            </div>

            <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-5 text-[13px]">
              <div>
                <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-1">Auteur</div>
                <div class="font-bold text-[#293751]">{{ selectedRec.employeeFirstName }} {{ selectedRec.employeeLastName }}</div>
                <div class="text-[#68768c]">{{ selectedRec.employeeEmail }}</div>
                <div class="text-[#68768c]" *ngIf="selectedRec.employeeMatricule">Matricule : {{ selectedRec.employeeMatricule }}</div>
              </div>
              <div>
                <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-1">Date</div>
                <div class="font-bold text-[#293751]">{{ formatDate(selectedRec.createdAt) }}</div>
              </div>
              <div *ngIf="selectedRec.employeeManagerName">
                <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-1">Manager</div>
                <div class="font-bold text-[#293751]">{{ selectedRec.employeeManagerName }}</div>
              </div>
              <div>
                <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-1">Traité par</div>
                <div class="font-bold text-[#293751]">{{ selectedRec.processedByName || '—' }}</div>
              </div>
            </div>

            <div class="mb-5">
              <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-2">Contenu</div>
              <div class="bg-[#fafbfd] border border-[#e7ecf2] rounded-[10px] px-4 py-3.5 text-[14px] leading-relaxed text-[#3d4c63] whitespace-pre-wrap break-words">
                {{ selectedRec.message || '—' }}
              </div>
            </div>

            @if (selectedRec.newValue) {
              <div class="mb-5">
                <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-2">Nouvel email demandé</div>
                <div class="bg-[#fafbfd] border border-[#e7ecf2] rounded-[10px] px-4 py-3.5 text-[14px] text-[#3d4c63] break-words">{{ selectedRec.newValue }}</div>
              </div>
            }

            @if (selectedRec.status === 'REJECTED' && selectedRec.rejectionReason) {
              <div>
                <div class="text-[11px] font-bold uppercase tracking-wider text-[#9aa5b7] mb-2">Motif du rejet</div>
                <div class="bg-[#fef6f6] border border-[#ffe0e0] rounded-[10px] px-4 py-3.5 text-[13px] text-[#b91c1c]">
                  <strong>{{ rejectionLabel(selectedRec.rejectionReason) }}</strong>
                  <span *ngIf="selectedRec.rejectionComment" class="block mt-1 font-normal">{{ selectedRec.rejectionComment }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class UserReclamations implements OnInit, OnDestroy {
  title = '';
  message = '';
  priority = 'MOYENNE';
  submitting = false;
  submitSuccess = false;
  submitError = '';

  isAdmin = false;
  isManager = false;
  allReclamations = signal<any[]>([]);
  loadingAll = signal(false);
  adminError = '';

  deptStats = signal<any[]>([]);
  loadingDeptStats = signal(false);

  teamReclamations = signal<any[]>([]);
  loadingTeam = signal(false);
  teamError = '';

  myReclamations = signal<any[]>([]);

  hasData = computed(() =>
    this.allReclamations().length > 0 ||
    this.teamReclamations().length > 0 ||
    this.myReclamations().length > 0 ||
    this.deptStats().length > 0
  );

  totalCount = computed(() => {
    if (this.isAdmin) return this.deptStats().reduce((sum, s) => sum + (s.total ?? 0), 0);
    if (this.isManager) return this.teamReclamations().length;
    return this.myReclamations().length;
  });

  pendingCount = computed(() => {
    if (this.isAdmin) return this.deptStats().reduce((sum, s) => sum + (s.pending ?? 0), 0);
    if (this.isManager) return this.teamReclamations().filter(r => r.status === 'PENDING').length;
    return this.myReclamations().filter(r => r.status === 'PENDING').length;
  });

  approvedCount = computed(() => {
    if (this.isAdmin) return this.deptStats().reduce((sum, s) => sum + (s.approved ?? 0), 0);
    if (this.isManager) return this.teamReclamations().filter(r => r.status === 'APPROVED').length;
    return this.myReclamations().filter(r => r.status === 'APPROVED').length;
  });

  rejectedCount = computed(() => {
    if (this.isAdmin) return this.deptStats().reduce((sum, s) => sum + (s.rejected ?? 0), 0);
    if (this.isManager) return this.teamReclamations().filter(r => r.status === 'REJECTED').length;
    return this.myReclamations().filter(r => r.status === 'REJECTED').length;
  });

  showRejectModal = false;
  rejectTargetId = '';
  rejectReason = '';
  rejectComment = '';
  selectedRec: any = null;
  rejectOptions = [
    { value: 'HORS_PERIMETRE', label: 'Hors périmètre' },
    { value: 'INFOS_INSUFFISANTES', label: 'Informations insuffisantes' },
    { value: 'DEJA_TRAITEE', label: 'Réclamation déjà traitée' },
    { value: 'NON_JUSTIFIEE', label: 'Non justifiée' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  constructor(
    private authService: AuthService,
    private webSocketService: WebSocketService
  ) {}

  async ngOnInit() {
    await this.authService.ready();
    const p = this.authService.profile();
    this.isAdmin = p?.roles?.includes('ADMINISTRATOR') ?? false;
    this.isManager = p?.roles?.includes('MANAGER') ?? false;
    if (this.isAdmin) {
      this.loadAll();
      this.loadDeptStats();
    } else if (this.isManager) {
      this.loadTeam();
    }
    try {
      this.myReclamations.set(await this.authService.getMyReclamations());
    } catch (_) {}

    this.webSocketService.onReclamationUpdate(() => {
      this.refreshData();
    });
  }

  ngOnDestroy() {}

  async refreshData() {
    if (this.isAdmin) {
      await Promise.all([this.loadAll(), this.loadDeptStats()]);
    } else if (this.isManager) {
      await this.loadTeam();
    }
    try {
      this.myReclamations.set(await this.authService.getMyReclamations());
    } catch (_) {}
  }

  async submit() {
    if (!this.title || !this.message) return;
    this.submitting = true;
    this.submitSuccess = false;
    this.submitError = '';
    try {
      await this.authService.createReclamation(this.title, this.message, undefined, this.priority);
      this.submitSuccess = true;
      this.title = '';
      this.message = '';
      this.priority = 'MOYENNE';
      setTimeout(() => this.submitSuccess = false, 4000);
      try {
        this.myReclamations.set(await this.authService.getMyReclamations());
      } catch (_) {}
      if (this.isAdmin) await this.loadAll();
    } catch (e: any) {
      this.submitError = getErrorMessage(e, 'Erreur lors de l\'envoi');
    } finally {
      this.submitting = false;
    }
  }

  async loadAll() {
    this.loadingAll.set(true);
    this.adminError = '';
    try {
      this.allReclamations.set(await this.authService.getReclamations());
    } catch (e: any) {
      this.adminError = 'Erreur de chargement';
    } finally {
      this.loadingAll.set(false);
    }
  }

  async loadTeam() {
    this.loadingTeam.set(true);
    this.teamError = '';
    try {
      this.teamReclamations.set(await this.authService.getTeamReclamations());
    } catch (e: any) {
      this.teamError = 'Erreur de chargement';
    } finally {
      this.loadingTeam.set(false);
    }
  }

  async loadDeptStats() {
    this.loadingDeptStats.set(true);
    try {
      this.deptStats.set(await this.authService.getReclamationStatsByDepartment());
    } catch (_) {}
    finally { this.loadingDeptStats.set(false); }
  }

  hasPending() { return this.allReclamations().some(r => r.status === 'PENDING'); }

  originIconClass(origin: string): string {
    switch (origin) {
      case 'Manager': return 'bg-[#f2edff] text-[#7c3aed]';
      case 'Ressources Humaines': return 'bg-[#eaf8ef] text-[#16a34a]';
      default: return 'bg-[#edf4ff] text-[#2563eb]';
    }
  }

  async approve(id: string) {
    await this.authService.approveReclamation(id);
    await this.loadAll();
  }

  async reject(id: string) {
    await this.authService.rejectReclamation(id);
    await this.loadAll();
  }

  async approveTeam(id: string) {
    await this.authService.approveReclamation(id);
    await this.loadTeam();
  }

  async rejectTeam(id: string) {
    await this.authService.rejectReclamation(id);
    await this.loadTeam();
  }

  openReject(id: string) {
    this.rejectTargetId = id;
    this.rejectReason = '';
    this.rejectComment = '';
    this.showRejectModal = true;
  }

  async confirmReject() {
    if (!this.rejectReason || !this.rejectTargetId) return;
    this.showRejectModal = false;
    const id = this.rejectTargetId;
    const reason = this.rejectReason;
    const comment = this.rejectReason === 'AUTRE' ? this.rejectComment : '';
    await this.authService.rejectReclamation(id, reason, comment);
    if (this.isAdmin) await this.loadAll();
    else await this.loadTeam();
  }

  openDetail(r: any) {
    this.selectedRec = r;
  }

  statusClass(s: string) {
    switch (s) {
      case 'PENDING': return 'bg-[#fff5dd] text-[#b45309]';
      case 'APPROVED': return 'bg-[#eaf8ef] text-[#16a34a]';
      case 'REJECTED': return 'bg-[#fff0f0] text-[#dc2626]';
      default: return 'bg-[#f1f3f6] text-[#8d99aa]';
    }
  }
  statusLabel(s: string) {
    switch (s) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      default: return s;
    }
  }

  priorityClass(p: string) {
    switch ((p || 'MOYENNE').toUpperCase()) {
      case 'FAIBLE': return 'bg-[#eaf2ff] text-[#2563eb]';
      case 'MOYENNE': return 'bg-[#fff5dd] text-[#b45309]';
      case 'HAUTE': return 'bg-[#ffedd5] text-[#c2410c]';
      case 'CRITIQUE': return 'bg-[#fff0f0] text-[#dc2626]';
      default: return 'bg-[#f1f3f6] text-[#8d99aa]';
    }
  }
  priorityLabel(p: string) {
    switch (p) {
      case 'FAIBLE': return 'Faible';
      case 'MOYENNE': return 'Moyenne';
      case 'HAUTE': return 'Haute';
      case 'CRITIQUE': return 'Critique';
      default: return p || 'Moyenne';
    }
  }

  formatDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  rejectionLabel(reason: string): string {
    switch (reason) {
      case 'HORS_PERIMETRE': return 'Hors périmètre';
      case 'INFOS_INSUFFISANTES': return 'Informations insuffisantes';
      case 'DEJA_TRAITEE': return 'Réclamation déjà traitée';
      case 'NON_JUSTIFIEE': return 'Non justifiée';
      case 'AUTRE': return 'Autre';
      default: return '';
    }
  }
}