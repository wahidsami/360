import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger('AuditInterceptor');

    constructor(private readonly prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, user, ip } = request;
        const userAgent = request.headers['user-agent'];
        const requestId = request['requestId'];

        // Only log write operations
        const isWriteOperation = ['POST', 'PATCH', 'DELETE'].includes(method);
        if (!isWriteOperation) {
            return next.handle();
        }

        // Determine action and entity from URL/Method
        const pathParts = url.split('/').filter((p: string) => p && p !== 'api');
        const entity = pathParts[0] || 'Unknown';
        const entityId = pathParts[1] || 'New';
        const action = method === 'POST' ? 'CREATE' : method === 'PATCH' ? 'UPDATE' : 'DELETE';

        return next.handle().pipe(
            tap(async (responseData) => {
                try {
                    // Sanitize body (removed sensitive fields)
                    const sanitizedBody = this.sanitize(body);

                    await this.prisma.auditLog.create({
                        data: {
                            orgId: user?.orgId,
                            actorId: user?.id,
                            action,
                            entity,
                            entityId: responseData?.id || entityId, // Use ID from response if available
                            afterJson: action !== 'DELETE' ? sanitizedBody : null,
                            requestId,
                            ip: ip || request.headers['x-forwarded-for'],
                            userAgent,
                        },
                    });
                } catch (error) {
                    this.logger.error(`Failed to create audit log: ${error.message}`);
                }
            }),
        );
    }

    private sanitize(data: any): any {
        if (!data || typeof data !== 'object') return data;
        const sanitized = { ...data };
        const sensitiveFields = ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'secret'];

        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
}
