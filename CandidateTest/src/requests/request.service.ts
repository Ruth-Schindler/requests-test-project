import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, RequestEntity, UserRole } from './request.entity';
import { RequestQueryDto } from './request-query.dto';
import { PaginatedRequestResult, RequestRepository } from './request.repository';

type RequestReader = Pick<RequestRepository, 'getAll' | 'getById'>;

@Injectable()
export class RequestService {
  constructor(@Inject(RequestRepository) private readonly repository: RequestReader) {}

  getRequests(
    user: AuthenticatedUser,
    query?: RequestQueryDto,
  ): RequestEntity[] | PaginatedRequestResult {
    this.assertValidDateRange(query);
    return this.repository.getAll(user, query);
  }

  getRequestsForTest(
    userId: number,
    isAdmin: boolean,
    query?: RequestQueryDto,
  ): RequestEntity[] | PaginatedRequestResult {
    this.assertValidDateRange(query);

    const user: AuthenticatedUser = {
      id: userId,
      customerId: userId,
      role: isAdmin ? UserRole.Administrator : UserRole.User,
    };

    return this.repository.getAll(user, query);
  }

  /** A reversed creation-date range is invalid input, not an empty result. */
  private assertValidDateRange(query?: RequestQueryDto): void {
    if (
      query?.fromDate &&
      query?.toDate &&
      new Date(query.fromDate).getTime() > new Date(query.toDate).getTime()
    ) {
      throw new BadRequestException('fromDate must be on or before toDate');
    }
  }
}