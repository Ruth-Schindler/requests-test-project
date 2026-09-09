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

export enum UserRole {
  User = 'user',
  Administrator = 'administrator',
}

export interface AuthenticatedUser {
  id: number;
  customerId: number;
  role: UserRole;
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