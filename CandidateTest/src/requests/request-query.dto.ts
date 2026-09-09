import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus, RequestType } from './request.entity';

export enum RequestSortField {
  CreatedAt = 'createdAt',
  RequestNumber = 'requestNumber',
}

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

const enumQueryValues = (enumType: object): string[] => [
  ...Object.keys(enumType).filter((key) => Number.isNaN(Number(key))),
  ...Object.values(enumType).map(String),
];

export class RequestQueryDto {
  @ApiPropertyOptional({ description: 'Partial request number filter', example: 'REQ-000123' })
  @IsOptional()
  @IsString()
  requestNumber?: string;

  @ApiPropertyOptional({ description: 'Filter by owner user id', example: 7, type: Number })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === undefined || value === null || value === '' ? undefined : Number(value))
  ownerId?: number;

  @ApiPropertyOptional({ description: 'Filter by assigned user id', example: 9, type: Number })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === undefined || value === null || value === '' ? undefined : Number(value))
  assignedToUserId?: number;

  @ApiPropertyOptional({
    description: 'Filter by status value or list of values',
    example: 'New',
    type: [String],
  })
  @IsOptional()
  @IsIn(enumQueryValues(RequestStatus), { each: true })
  status?: string | string[];

  @ApiPropertyOptional({ description: 'Start date filter in ISO format', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date filter in ISO format', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by request type', example: 'General' })
  @IsOptional()
  @IsIn(enumQueryValues(RequestType))
  requestType?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 20,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(({ value }) => value === undefined || value === null || value === '' ? undefined : Number(value))
  limit?: number;

  @ApiPropertyOptional({ description: 'Pagination cursor returned by a previous page', example: 'eyJpZCI6MX0=' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Sort field', enum: RequestSortField, example: RequestSortField.CreatedAt })
  @IsOptional()
  @IsIn(Object.values(RequestSortField))
  sortBy?: RequestSortField;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortOrder, example: SortOrder.Desc, default: SortOrder.Desc })
  @IsOptional()
  @IsIn(Object.values(SortOrder))
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  sortOrder: SortOrder = SortOrder.Desc;
}

export class TestRequestQueryDto extends RequestQueryDto {
  @ApiPropertyOptional({ description: 'Test user id to impersonate', example: 42, type: Number })
  @IsDefined()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => value === undefined || value === null || value === '' ? undefined : Number(value))
  userId?: number;

  @ApiPropertyOptional({ description: 'Whether the test user should be treated as an administrator', example: true, type: Boolean })
  @IsDefined()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'admin'].includes(value.toLowerCase());
    }
    return Boolean(value);
  })
  isAdmin?: boolean;
}