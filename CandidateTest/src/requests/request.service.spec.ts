import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RequestService } from './request.service';
import { AuthenticatedUser, RequestEntity, RequestStatus, RequestType, UserRole } from './request.entity';
import { RequestQueryDto, RequestSortField, SortOrder, TestRequestQueryDto } from './request-query.dto';

describe('RequestService', () => {
  const create = (id: number, ownerId: number, assignedToUserId: number): RequestEntity => ({
    id,
    requestNumber: `REQ-${String(id).padStart(3, '0')}`,
    customerId: id,
    ownerId,
    assignedToUserId,
    status: RequestStatus.New,
    requestType: RequestType.General,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const user: AuthenticatedUser = { id: 1, customerId: 1, role: UserRole.User };

  it('passes the authenticated user to the repository', () => {
    const requests = [create(1, 1, 2), create(2, 3, 4)];
    const getAll = jest.fn().mockReturnValue(requests);
    const getById = jest.fn();
    const service = new RequestService({ getAll, getById });

    expect(service.getRequests(user)).toHaveLength(2);
    expect(getAll).toHaveBeenCalledWith(user, undefined);
  });

  it('passes search filters to the repository so visibility is enforced there', () => {
    const requests = [create(1, 1, 5)];
    const query: RequestQueryDto = {
      requestNumber: '001',
      status: 'New',
      sortBy: RequestSortField.RequestNumber,
      sortOrder: SortOrder.Asc,
    };
    const getAll = jest.fn().mockReturnValue(requests);
    const getById = jest.fn();
    const service = new RequestService({ getAll, getById });

    const admin: AuthenticatedUser = { id: 1, customerId: 1, role: UserRole.Administrator };
    expect(service.getRequests(admin, query)).toEqual(requests);
    expect(getAll).toHaveBeenCalledWith(admin, query);
  });

  it('passes cursor paging arguments to the repository', () => {
    const requests = [create(1, 1, 5)];
    const query: RequestQueryDto = {
      sortBy: RequestSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
      limit: 10,
      cursor: 'eyJpZCI6MSwiY3JlYXRlZEF0IjoiMjAyNi0wMS0wMVQwMDowMDowMC4wMDBaIn0',
    };
    const getAll = jest.fn().mockReturnValue({ items: requests, hasMore: false, nextCursor: null });
    const getById = jest.fn();
    const service = new RequestService({ getAll, getById });

    expect(service.getRequests(user, query)).toEqual({ items: requests, hasMore: false, nextCursor: null });
    expect(getAll).toHaveBeenCalledWith(user, query);
  });

  it('builds an administrator test user from userId and isAdmin without requiring a token', () => {
    const requests = [create(1, 1, 5)];
    const getAll = jest.fn().mockReturnValue(requests);
    const getById = jest.fn();
    const service = new RequestService({ getAll, getById });

    expect(service.getRequestsForTest(42, true)).toEqual(requests);
    expect(getAll).toHaveBeenCalledWith(
      { id: 42, customerId: 42, role: UserRole.Administrator },
      undefined,
    );
  });

  it('rejects a reversed creation-date range as invalid input', () => {
    const getAll = jest.fn().mockReturnValue([]);
    const getById = jest.fn();
    const service = new RequestService({ getAll, getById });

    expect(() =>
      service.getRequests(user, { fromDate: '2025-06-01', toDate: '2025-01-01' } as RequestQueryDto),
    ).toThrow(BadRequestException);
    expect(getAll).not.toHaveBeenCalled();
  });

  it('builds a regular test user when isAdmin is false', () => {
    const getAll = jest.fn().mockReturnValue([]);
    const getById = jest.fn();
    const service = new RequestService({ getAll, getById });

    service.getRequestsForTest(9, false);
    expect(getAll).toHaveBeenCalledWith(
      { id: 9, customerId: 9, role: UserRole.User },
      undefined,
    );
  });

  it('allows the test route query params userId and isAdmin through validation', async () => {
    const dto = plainToInstance(TestRequestQueryDto, {
      userId: '42',
      isAdmin: 'true',
      status: 'New',
      sortBy: RequestSortField.RequestNumber,
      sortOrder: SortOrder.Asc,
    }) as TestRequestQueryDto;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.userId).toBe(42);
    expect(dto.isAdmin).toBe(true);
  });

  it('rejects an unsupported sort field', async () => {
    const dto = plainToInstance(RequestQueryDto, {
      sortBy: 'updatedAt',
      sortOrder: SortOrder.Desc,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'sortBy')).toBe(true);
  });
});
