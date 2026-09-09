import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser, RequestEntity } from './request.entity';
import { RequestQueryDto, TestRequestQueryDto } from './request-query.dto';
import { PaginatedRequestResult } from './request.repository';
import { RequestService } from './request.service';

@ApiTags('Requests')
@Controller('api/requests')
export class RequestsController {
  constructor(private readonly service: RequestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accessible requests for the authenticated user' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'requestNumber', required: false, type: String, description: 'Partial request number filter' })
  @ApiQuery({ name: 'ownerId', required: false, type: Number, description: 'Filter by owner user id' })
  @ApiQuery({ name: 'assignedToUserId', required: false, type: Number, description: 'Filter by assigned user id' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by request status' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Start date filter in ISO format' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'End date filter in ISO format' })
  @ApiQuery({ name: 'requestType', required: false, description: 'Filter by request type' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results to return' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Pagination cursor returned by a previous page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort direction' })
  @ApiResponse({ status: 200, description: 'List of accessible requests' })
  @ApiResponse({ status: 401, description: 'User is not authenticated' })
  getRequests(
    @Req() request: Request & { user?: AuthenticatedUser },
    @Query() query?: RequestQueryDto,
  ): RequestEntity[] | PaginatedRequestResult {
    if (!request.user) {
      throw new UnauthorizedException('Authenticated user context is required');
    }

    return this.service.getRequests(request.user, query);
  }

  @Get('test')
  @ApiOperation({ summary: 'Get requests without bearer token using a test user' })
  @ApiQuery({ name: 'userId', required: true, type: Number, description: 'Test user id to impersonate', example: 42 })
  @ApiQuery({ name: 'isAdmin', required: true, type: Boolean, description: 'Whether the test user should be treated as an administrator', example: true })
  @ApiResponse({ status: 200, description: 'Requests for the test user' })
  @ApiResponse({ status: 400, description: 'userId or isAdmin is invalid' })
  getTestRequests(
    @Query('userId') userId: string | undefined,
    @Query('isAdmin') isAdmin: string | boolean | undefined,
    @Query() query?: TestRequestQueryDto,
  ): RequestEntity[] | PaginatedRequestResult {
    // Demo aid only: this route skips authentication, so it must not exist in production.
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const parsedUserId = Number(userId);
    if (!userId || !Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new BadRequestException('Query param userId must be a positive integer');
    }

    const isAdminFlag = typeof isAdmin === 'string'
      ? ['true', '1', 'yes', 'admin'].includes(isAdmin.toLowerCase())
      : !!isAdmin;

    return this.service.getRequestsForTest(parsedUserId, isAdminFlag, query);
  }
}