export enum RequestStatus {
  New = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum RequestType {
  General = 1,
  Legal = 2,
  Payment = 3,
  Appeal = 4,
}

export interface RequestEntity {
  id: number;
  requestNumber: string;
  customerId: number;
  ownerId: number;
  assignedToUserId: number | null;
  status: RequestStatus;
  requestType: RequestType;
  createdAt: Date;
  updatedAt: Date;
}

// The server only supports these two sort fields (RequestSortField in request-query.dto.ts).
export type SortField = 'requestNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Filters {
  search: string;
  status: RequestStatus[];
  requestType: RequestType | 'all';
  dateFrom: string;
  dateTo: string;
  requestNumber?: string;
  ownerId?: number | null;
  assignedToUserId?: number | null;
  fromDate?: string;
  toDate?: string;
}

export interface Query extends Filters {
  sortField: SortField;
  sortDirection: SortDirection;
  // Opaque cursor returned by the previous page (server is cursor-based, not page-based).
  cursor: string | null;
  pageSize: number;
}

// Mirrors the server's PaginatedRequestResult (request.repository.ts). No total is available.
export interface PageResult {
  items: RequestEntity[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const requestStatuses = [RequestStatus.New, RequestStatus.InProgress, RequestStatus.Completed, RequestStatus.Cancelled];
export const requestTypes = [RequestType.General, RequestType.Legal, RequestType.Payment, RequestType.Appeal];
export const statusLabels: Record<RequestStatus, string> = { [RequestStatus.New]: 'חדש', [RequestStatus.InProgress]: 'בטיפול', [RequestStatus.Completed]: 'הושלם', [RequestStatus.Cancelled]: 'בוטל' };
export const requestTypeLabels: Record<RequestType, string> = { [RequestType.General]: 'כללי', [RequestType.Legal]: 'משפטי', [RequestType.Payment]: 'תשלום', [RequestType.Appeal]: 'ערעור' };
