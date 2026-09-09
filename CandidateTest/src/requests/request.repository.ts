import { Injectable } from '@nestjs/common';
import {
  AuthenticatedUser,
  RequestEntity,
  RequestStatus,
  RequestType,
  UserRole,
} from './request.entity';
import { RequestQueryDto, RequestSortField, SortOrder } from './request-query.dto';

export interface PaginatedRequestResult {
  items: RequestEntity[];
  hasMore: boolean;
  nextCursor: string | null;
}

@Injectable()
export class RequestRepository {
  getById(id: number): RequestEntity | undefined {
    return this.requests.find((request) => request.id === id);
  }

  private readonly requests: RequestEntity[];

  constructor() {
    this.requests = this.seed();
  }

  getAll(user: AuthenticatedUser, query?: RequestQueryDto): RequestEntity[] | PaginatedRequestResult {
    // Requirement: a regular user only sees requests they own or that are assigned to them.
    // Administrators see everything. Enforced here, server-side, before any filtering.
    const authorizedRequests = user.role === UserRole.Administrator
      ? this.requests
      : this.requests.filter(
          (request) => request.ownerId === user.id || request.assignedToUserId === user.id,
        );

    if (!query) {
      return [...authorizedRequests];
    }

    const statuses = this.toEnumValues(query.status, RequestStatus);
    const requestType = this.toEnumValue(query.requestType, RequestType);
    const fromDate = this.parseDate(query.fromDate);
    // A date-only "toDate" (YYYY-MM-DD) is inclusive of the whole day.
    const toDate = this.parseDate(query.toDate, true);

    if ((query.fromDate && !fromDate) || (query.toDate && !toDate)) {
      return { items: [], hasMore: false, nextCursor: null };
    }

    const filteredRequests = authorizedRequests.filter((request) => {
      const matchesRequestNumber = !query.requestNumber ||
        request.requestNumber.includes(query.requestNumber);
      const matchesStatus = !query.status || statuses.includes(request.status);
      const matchesRequestType = !query.requestType || request.requestType === requestType;
      const matchesFromDate = !fromDate || request.createdAt >= fromDate;
      const matchesToDate = !toDate || request.createdAt <= toDate;
      const matchesOwner = query.ownerId === undefined || request.ownerId === query.ownerId;
      const matchesAssignedTo = query.assignedToUserId === undefined || request.assignedToUserId === query.assignedToUserId;

      return matchesRequestNumber && matchesStatus && matchesRequestType &&
        matchesFromDate && matchesToDate && matchesOwner && matchesAssignedTo;
    });

    const sortBy = query.sortBy ?? RequestSortField.CreatedAt;
    const sortDirection = query.sortOrder === SortOrder.Asc ? 1 : -1;

    const sortedRequests = [...filteredRequests].sort((left, right) => {
      const leftValue = sortBy === RequestSortField.CreatedAt
        ? left.createdAt.getTime()
        : left.requestNumber;
      const rightValue = sortBy === RequestSortField.CreatedAt
        ? right.createdAt.getTime()
        : right.requestNumber;

      if (leftValue < rightValue) {
        return -1 * sortDirection;
      }
      if (leftValue > rightValue) {
        return 1 * sortDirection;
      }
      return left.id - right.id;
    });

    const hasPagination = query.limit !== undefined || query.cursor !== undefined;
    if (!hasPagination) {
      return sortedRequests;
    }

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    if (query.cursor) {
      const cursor = this.decodeCursor(query.cursor);
      const filteredByCursor = sortedRequests.filter((request) => this.isAfterCursor(request, cursor, sortBy, query.sortOrder));
      const items = filteredByCursor.slice(0, limit);
      const hasMore = filteredByCursor.length > items.length;
      const nextCursor = hasMore && items.length > 0 ? this.encodeCursor(items[items.length - 1], sortBy) : null;

      return { items, hasMore, nextCursor };
    }

    const items = sortedRequests.slice(0, limit);
    const hasMore = sortedRequests.length > items.length;
    const nextCursor = hasMore && items.length > 0 ? this.encodeCursor(items[items.length - 1], sortBy) : null;

    return { items, hasMore, nextCursor };
  }

  private parseDate(value?: string, endOfDay = false): Date | undefined {
    if (!value) {
      return undefined;
    }

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const normalized = isDateOnly && endOfDay ? `${value}T23:59:59.999Z` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private toEnumValues<T extends Record<string, string | number>>(
    value: string | string[] | undefined,
    enumType: T,
  ): number[] {
    const values = value ? (Array.isArray(value) ? value : [value]) : [];
    return values
      .map((item) => this.toEnumValue(item, enumType))
      .filter((item): item is number => item !== undefined);
  }

  private toEnumValue<T extends Record<string, string | number>>(
    value: string | undefined,
    enumType: T,
  ): number | undefined {
    if (!value) {
      return undefined;
    }

    const numericValue = Number(value);
    if (Object.values(enumType).includes(numericValue)) {
      return numericValue;
    }

    const enumKey = Object.keys(enumType).find(
      (key) => key.toLowerCase() === value.toLowerCase(),
    );
    return enumKey ? Number(enumType[enumKey]) : undefined;
  }

  private isAfterCursor(
    request: RequestEntity,
    cursor: { createdAt?: string; id: number; requestNumber?: string },
    sortBy: RequestSortField,
    sortOrder: SortOrder,
  ): boolean {
    const isDescending = sortOrder === SortOrder.Desc;

    // The sort comparator always breaks ties by id ascending (regardless of direction),
    // so the keyset predicate must do the same: on equal sort values, keep id > cursor.id.
    if (sortBy === RequestSortField.CreatedAt) {
      const requestValue = new Date(request.createdAt).getTime();
      const cursorValue = new Date(cursor.createdAt ?? request.createdAt).getTime();
      if (requestValue === cursorValue) {
        return request.id > cursor.id;
      }
      return isDescending ? requestValue < cursorValue : requestValue > cursorValue;
    }

    const requestValue = request.requestNumber;
    const cursorValue = cursor.requestNumber ?? request.requestNumber;
    if (requestValue === cursorValue) {
      return request.id > cursor.id;
    }
    return isDescending ? requestValue < cursorValue : requestValue > cursorValue;
  }

  private encodeCursor(request: RequestEntity, sortBy: RequestSortField): string {
    const payload = sortBy === RequestSortField.CreatedAt
      ? { id: request.id, createdAt: request.createdAt.toISOString() }
      : { id: request.id, requestNumber: request.requestNumber };

    // base64url so the cursor survives a query string round-trip untouched
    // (plain base64 '+' is decoded back to a space by Express).
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(value: string): { id: number; createdAt?: string; requestNumber?: string } {
    try {
      const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { id: number; createdAt?: string; requestNumber?: string };
      return decoded;
    } catch {
      return { id: 0 };
    }
  }

  private seed(): RequestEntity[] {
    const random = this.createSeededRandom(42);
    const statuses = Object.values(RequestStatus).filter((value): value is RequestStatus => typeof value === 'number');
    const types = Object.values(RequestType).filter((value): value is RequestType => typeof value === 'number');
    const now = Date.now();

    return Array.from({ length: 500 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        requestNumber: `REQ-${String(id).padStart(6, '0')}`,
        customerId: (id % 100) + 1,
        ownerId: (id % 5) + 1,
        assignedToUserId: id % 7 === 0 ? null : ((id + 1) % 5) + 1,
        status: statuses[Math.floor(random() * statuses.length)],
        requestType: types[Math.floor(random() * types.length)],
        createdAt: new Date(now - (id % 365) * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - (id % 100) * 24 * 60 * 60 * 1000),
      };
    });
  }

  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}