import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestsService } from '../../requests.service';
import {
  Filters,
  PageResult,
  Query,
  RequestEntity,
  RequestStatus,
  requestTypeLabels,
  requestTypes,
  requestStatuses,
  SortDirection,
  SortField,
  statusLabels
} from '../../models';
import { LoginRole } from '../login/login.component';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .status-picker { position: relative; }
    .status-trigger {
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      width:100%; height:40px; border:1px solid #d7e1ec; background:#fff; border-radius:10px;
      padding:0 12px; color:#34496a; font-size:13px; cursor:pointer;
      transition:border-color .18s ease, box-shadow .18s ease;
    }
    .status-trigger > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .status-trigger:hover, .status-trigger:focus-visible { border-color:#73a2ef; box-shadow:0 0 0 3px #e5efff; outline:none; }
    .status-trigger.open { border-color:#73a2ef; box-shadow:0 0 0 3px #e5efff; }
    .chevron { color:#6c7f98; font-size:12px; transition:transform .18s ease; flex:none; }
    .status-trigger.open .chevron { transform:rotate(180deg); }
    .status-menu {
      position:absolute; top:calc(100% + 6px); inset-inline:0; z-index:10;
      background:#fff; border:1px solid #d7e1ec; border-radius:12px; box-shadow:0 18px 32px rgba(20, 35, 58, .14);
      padding:6px; display:flex; flex-direction:column; gap:2px;
    }
    .status-option {
      display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px;
      font-size:13px; color:#34496a; cursor:pointer; transition:background .15s ease;
    }
    .status-option:hover { background:#f4f9ff; }
    .status-option input { accent-color:#2368e8; width:15px; height:15px; }
    .status-option.selected { background:#eef4ff; color:#1f4ea8; font-weight:600; }
    .date-range { display:flex; align-items:center; gap:8px; }
    .date-sep { flex:none; color:#9fb0c4; font-size:13px; }
    .date-range input {
      flex:1; min-width:0; height:40px; border:1px solid #d7e1ec; border-radius:10px; background:#fff;
      padding:0 10px; color:#34496a; font-size:13px; outline:none;
      transition:border-color .18s ease, box-shadow .18s ease;
    }
    .date-range input::-webkit-calendar-picker-indicator { margin-inline-start:0; opacity:.55; cursor:pointer; }
    .date-range input:focus { border-color:#73a2ef; box-shadow:0 0 0 3px #e5efff; }
  `],
  template: `
    <section class="filter-card">
      <div class="section-heading"><div><span class="eyebrow">ניהול פניות</span><h2>חיפוש וסינון פניות</h2></div><span class="filter-icon">⌇</span></div>
      <div class="filter-grid">
        <label class="field search-field"><span>חיפוש</span><div class="input-wrap"><span class="input-icon">⌕</span><input [(ngModel)]="draft.search" (keyup.enter)="apply.emit()" placeholder="מספר פנייה..." /></div></label>
        <label class="field"><span>טווח תאריכים</span>
          <div class="date-range">
            <input type="date" aria-label="מתאריך" [(ngModel)]="draft.dateFrom" />
            <span class="date-sep">–</span>
            <input type="date" aria-label="עד תאריך" [(ngModel)]="draft.dateTo" />
          </div>
        </label>
        <label class="field"><span>סטטוס</span>
          <div class="status-picker">
            <button type="button" class="status-trigger" [class.open]="statusOpen" (click)="statusOpen = !statusOpen">
              <span>{{ selectedStatusesSummary }}</span>
              <span class="chevron">▾</span>
            </button>
            <div class="status-menu" *ngIf="statusOpen">
              <label class="status-option" *ngFor="let status of statuses" [class.selected]="isStatusSelected(status)">
                <input type="checkbox" [checked]="isStatusSelected(status)" (change)="toggleStatus(status)" />
                <span>{{ statusLabels[status] }}</span>
              </label>
            </div>
          </div>
        </label>
        <label class="field"><span>סוג פנייה</span><select [(ngModel)]="draft.requestType"><option value="all">כל הסוגים</option><option *ngFor="let type of types" [ngValue]="type">{{ requestTypeLabels[type] }}</option></select></label>
      </div>
      <div class="filter-actions"><button class="btn btn-primary" (click)="apply.emit()"><span>⌕</span> החל מסננים</button><button class="btn btn-ghost" (click)="reset.emit()">אפס מסננים</button></div>
    </section>
  `
})
export class FilterPanelComponent {
  readonly statuses = requestStatuses;
  readonly types = requestTypes;
  readonly statusLabels = statusLabels;
  readonly requestTypeLabels = requestTypeLabels;
  statusOpen = false;

  @Output() readonly apply = new EventEmitter<void>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: Filters = { search: '', status: [], requestType: 'all', dateFrom: '', dateTo: '' };

  get selectedStatusesSummary(): string {
    return this.draft.status.length === 0 ? 'כל הסטטוסים' : this.draft.status.map((status) => this.statusLabels[status]).join(', ');
  }

  toggleStatus(status: RequestStatus): void {
    const exists = this.draft.status.includes(status);
    this.draft.status = exists
      ? this.draft.status.filter((item) => item !== status)
      : [...this.draft.status, status];
  }

  isStatusSelected(status: RequestStatus): boolean {
    return this.draft.status.includes(status);
  }
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="pagination"><div class="page-summary">מציג <strong>{{ count }}</strong> פניות · עמוד <strong>{{ page }}</strong></div><div class="page-controls"><label>שורות לעמוד <select [ngModel]="pageSize" (ngModelChange)="sizeChange.emit(+$event)"><option [value]="8">8</option><option [value]="12">12</option><option [value]="20">20</option></select></label><button class="page-btn" [disabled]="page === 1" (click)="prev.emit()">‹</button><button class="page-btn current">{{ page }}</button><button class="page-btn" [disabled]="!hasMore" (click)="next.emit()">›</button></div></div>`
})
export class PaginationComponent {
  // The server paginates by opaque cursor: no total count and no random page access.
  @Input() count = 0;
  @Input() page = 1;
  @Input() pageSize = 8;
  @Input() hasMore = false;

  @Output() readonly prev = new EventEmitter<void>();
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly sizeChange = new EventEmitter<number>();
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, FilterPanelComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.css']
})
export class RequestsDashboardComponent {
  @Input() role: LoginRole = 'admin';
  @Output() readonly logout = new EventEmitter<void>();
  @ViewChild(FilterPanelComponent) private filterPanel?: FilterPanelComponent;
  private readonly service = inject(RequestsService);

  readonly requests = signal<RequestEntity[]>([]);
  readonly hasMore = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly sortField = signal<SortField>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly page = signal(1);
  readonly pageSize = signal(8);

  // cursorForPage[i] is the cursor param that loads page i+1 (index 0 => first page => null).
  private cursorForPage: (string | null)[] = [null];
  readonly skeletonRows = Array.from({ length: 6 });
  readonly statusLabels = statusLabels;
  readonly requestTypeLabels = requestTypeLabels;

  private static readonly EMPTY_FILTERS: Filters = {
    search: '', status: [], requestType: 'all', dateFrom: '', dateTo: '',
  };

  constructor() {
    // Load after the first change-detection pass so the @ViewChild filter panel exists.
    setTimeout(() => this.load(), 0);
  }

  load(): void {
    const filters = this.filterPanel?.draft ?? { ...RequestsDashboardComponent.EMPTY_FILTERS };
    this.loading.set(true);
    this.error.set(false);

    const cursor = this.cursorForPage[this.page() - 1] ?? null;
    const query: Query = { ...filters, sortField: this.sortField(), sortDirection: this.sortDirection(), cursor, pageSize: this.pageSize() };

    this.service.search(query, this.role).subscribe({
      next: (result: PageResult) => {
        this.requests.set(result.items);
        this.hasMore.set(result.hasMore);
        if (result.hasMore && result.nextCursor) {
          this.cursorForPage[this.page()] = result.nextCursor;
        }
        this.loading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.hasMore.set(false);
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  /** Any change to filters/sort/page size invalidates the cursor chain. */
  private resetPaging(): void {
    this.cursorForPage = [null];
    this.page.set(1);
  }

  applyFilters(): void {
    this.resetPaging();
    this.load();
  }

  resetFilters(): void {
    if (this.filterPanel) {
      this.filterPanel.draft = { ...RequestsDashboardComponent.EMPTY_FILTERS, status: [] };
    }
    this.resetPaging();
    this.load();
  }

  changeSortField(field: SortField): void {
    this.sortField.set(field);
    this.resetPaging();
    this.load();
  }

  toggleDirection(): void {
    this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
    this.resetPaging();
    this.load();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.page.update((current) => current + 1);
    this.load();
  }

  prevPage(): void {
    if (this.page() === 1) return;
    this.page.update((current) => current - 1);
    this.load();
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.resetPaging();
    this.load();
  }

  logOut(): void {
    this.logout.emit();
  }
}
