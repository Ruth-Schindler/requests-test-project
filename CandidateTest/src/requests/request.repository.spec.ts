import { RequestRepository } from './request.repository';
import { RequestSortField, SortOrder } from './request-query.dto';
import { RequestEntity, UserRole } from './request.entity';

describe('RequestRepository', () => {
  it('sorts by request number in ascending and descending order', () => {
    const repository = new RequestRepository();
    const administrator = { id: 1, customerId: 1, role: UserRole.Administrator };

    const ascending = repository.getAll({
      ...administrator,
    }, {
      sortBy: RequestSortField.RequestNumber,
      sortOrder: SortOrder.Asc,
    }) as any[];
    const descending = repository.getAll({
      ...administrator,
    }, {
      sortBy: RequestSortField.RequestNumber,
      sortOrder: SortOrder.Desc,
    }) as any[];

    expect(ascending[0].requestNumber).toBe('REQ-000001');
    expect(descending[0].requestNumber).toBe('REQ-000500');
  });

  it('restricts regular users to requests they own or are assigned to', () => {
    const repository = new RequestRepository();
    const user = { id: 3, customerId: 42, role: UserRole.User };

    const requests = repository.getAll(user) as RequestEntity[];

    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every(
        (request) => request.ownerId === user.id || request.assignedToUserId === user.id,
      ),
    ).toBe(true);
  });

  it('allows administrators to view requests across customers', () => {
    const repository = new RequestRepository();
    const administrator = { id: 1, customerId: 7, role: UserRole.Administrator };

    const requests = repository.getAll(administrator) as RequestEntity[];

    expect(requests).toHaveLength(500);
    expect(new Set(requests.map((request) => request.customerId)).size).toBeGreaterThan(1);
  });

  it('supports cursor-based pagination by createdAt', () => {
    const repository = new RequestRepository();
    const administrator = { id: 1, customerId: 1, role: UserRole.Administrator };

    const firstPage = repository.getAll(administrator, {
      sortBy: RequestSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
      limit: 2,
    }) as any;

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toBeDefined();

    const secondPage = repository.getAll(administrator, {
      sortBy: RequestSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
      limit: 2,
      cursor: firstPage.nextCursor,
    }) as any;

    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
  });

  it('paginates the full set by createdAt with no gaps or duplicates across tied timestamps', () => {
    const repository = new RequestRepository();
    const administrator = { id: 1, customerId: 1, role: UserRole.Administrator };

    const seen: number[] = [];
    let cursor: string | undefined;

    // createdAt has only 365 distinct values for 500 rows, so page boundaries land on ties.
    for (let guard = 0; guard < 100; guard += 1) {
      const page = repository.getAll(administrator, {
        sortBy: RequestSortField.CreatedAt,
        sortOrder: SortOrder.Desc,
        limit: 7,
        cursor,
      }) as any;

      seen.push(...page.items.map((request: RequestEntity) => request.id));
      if (!page.hasMore) {
        break;
      }
      cursor = page.nextCursor;
    }

    expect(seen).toHaveLength(500);
    expect(new Set(seen).size).toBe(500);
  });

  it('applies the ownerId and assignedToUserId query filters', () => {
    const repository = new RequestRepository();
    const administrator = { id: 1, customerId: 1, role: UserRole.Administrator };

    const result = repository.getAll(administrator, {
      ownerId: 2,
      assignedToUserId: 3,
      sortBy: RequestSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
      limit: 10,
    }) as any;

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((request: any) => request.ownerId === 2)).toBe(true);
    expect(result.items.every((request: any) => request.assignedToUserId === 3)).toBe(true);
  });

  it('treats a date-only toDate as inclusive of the whole day', () => {
    const repository = new RequestRepository();
    const administrator = { id: 1, customerId: 1, role: UserRole.Administrator };

    const all = repository.getAll(administrator, {
      sortBy: RequestSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
      limit: 200,
    }) as any;
    const newest: RequestEntity = all.items[0];
    const day = newest.createdAt.toISOString().slice(0, 10);

    const filtered = repository.getAll(administrator, {
      toDate: day,
      sortBy: RequestSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
      limit: 200,
    }) as any;

    expect(filtered.items.some((request: RequestEntity) => request.id === newest.id)).toBe(true);
  });
});
