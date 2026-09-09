import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedUser, UserRole } from './request.entity';

type JwtPayload = AuthenticatedUser & { exp?: number };

// Local/dev fallback secret. Must match the value the Angular client uses to sign
// its dev JWTs (client/src/main.ts -> jwtSecret). In real deployments JWT_SECRET
// is provided by the environment and takes precedence.
const DEFAULT_DEV_JWT_SECRET = 'local-dev-secret';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  use(request: Request & { user?: AuthenticatedUser }, _response: Response, next: NextFunction): void {
    const authorization = request.header('authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const secret = process.env.JWT_SECRET ?? DEFAULT_DEV_JWT_SECRET;

    if (!token) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    request.user = this.verifyToken(token, secret);
    next();
  }

  private verifyToken(token: string, secret: string): AuthenticatedUser {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    try {
      const header = this.decodeJson<{ alg?: string; typ?: string }>(encodedHeader);
      const payload = this.decodeJson<JwtPayload>(encodedPayload);
      const expectedSignature = createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest();
      const actualSignature = Buffer.from(encodedSignature, 'base64url');

      if (
        header.alg !== 'HS256' ||
        header.typ !== 'JWT' ||
        actualSignature.length !== expectedSignature.length ||
        !timingSafeEqual(actualSignature, expectedSignature) ||
        !this.isValidPayload(payload)
      ) {
        throw new UnauthorizedException('A valid bearer token is required');
      }

      return { id: payload.id, customerId: payload.customerId, role: payload.role };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('A valid bearer token is required');
    }
  }

  private decodeJson<T>(value: string): T {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  }

  private isValidPayload(payload: JwtPayload): boolean {
    return (
      Number.isInteger(payload.id) &&
      payload.id > 0 &&
      Number.isInteger(payload.customerId) &&
      payload.customerId > 0 &&
      (payload.role === UserRole.User || payload.role === UserRole.Administrator) &&
      (payload.exp === undefined || (Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000)))
    );
  }
}