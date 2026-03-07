import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const requestId = req.headers['x-request-id'] || uuidv4();

        // Add to request object for use in interceptors/controllers
        (req as any)['requestId'] = requestId;

        // Add to response header
        res.setHeader('x-request-id', requestId);

        next();
    }
}
