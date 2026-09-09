import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PageResult, Query, RequestEntity, RequestStatus, RequestType } from './models';
import { LoginRole } from './components/login/login.component';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);
  private readonly testEndpoint = 'http://localhost:3000/api/requests/test';
  private readonly requestEndpoint = 'http://localhost:3000/api/requests';

  search(query: Query, role: LoginRole = 'admin'): Observable<PageResult> {
    const endpoint = this.buildEndpoint(role);
    const params = this.buildRequestParams(query, role);

    return this.http.get<RequestEntity[] | PageResult>(endpoint, {
      params,
      headers: this.authHeaders(),
    }).pipe(
      map((response) => this.normalizeResponse(response)),
    );
  }

  private normalizeResponse(response: RequestEntity[] | PageResult): PageResult {
    if (Array.isArray(response)) {
      return { items: response, hasMore: false, nextCursor: null };
    }

    return {
      items: Array.isArray(response.items) ? response.items : [],
      hasMore: response.hasMore === true,
      nextCursor: typeof response.nextCursor === 'string' ? response.nextCursor : null,
    };
  }

  private buildEndpoint(role: LoginRole): string {
    return role === 'demo' ? this.testEndpoint : this.requestEndpoint;
  }

  private buildRequestParams(query: Query, role: LoginRole): HttpParams {
    const requestNumber = (query.requestNumber ?? query.search ?? '').trim();
    const ownerId = query.ownerId ?? null;
    const assignedToUserId = query.assignedToUserId ?? null;
    const fromDate = query.fromDate ?? query.dateFrom ?? '';
    const toDate = query.toDate ?? query.dateTo ?? '';

    let params = new HttpParams()
      .set('limit', String(query.pageSize))
      .set('sortBy', query.sortField)
      .set('sortOrder', query.sortDirection.toUpperCase());

    // The cursor is opaque and issued by the server's previous response (nextCursor).
    // Omit it on the first page so the server starts from the top.
    if (query.cursor) {
      params = params.set('cursor', query.cursor);
    }

    if (requestNumber) {
      params = params.set('requestNumber', requestNumber);
    }

    if (ownerId != null) {
      params = params.set('ownerId', String(ownerId));
    }

    if (assignedToUserId != null) {
      params = params.set('assignedToUserId', String(assignedToUserId));
    }

    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }

    if (toDate) {
      params = params.set('toDate', toDate);
    }

    if (query.requestType !== 'all') {
      params = params.set('requestType', this.toApiRequestType(query.requestType));
    }

    for (const status of query.status) {
      params = params.append('status', this.toApiStatus(status));
    }

    // userId / isAdmin belong ONLY to the /api/requests/test endpoint (TestRequestQueryDto).
    // The authenticated /api/requests endpoint rejects them (forbidNonWhitelisted).
    if (role === 'demo') {
      params = params
        .set('userId', '42')
        .set('isAdmin', 'true');
    }

    return params;
  }

  private toApiStatus(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.New:
        return 'New';
      case RequestStatus.InProgress:
        return 'InProgress';
      case RequestStatus.Completed:
        return 'Completed';
      case RequestStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'New';
    }
  }

  private toApiRequestType(type: RequestType): string {
    switch (type) {
      case RequestType.General:
        return 'General';
      case RequestType.Legal:
        return 'Legal';
      case RequestType.Payment:
        return 'Payment';
      case RequestType.Appeal:
        return 'Appeal';
      default:
        return 'General';
    }
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') ?? localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
