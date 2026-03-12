import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-dev-key-change-me',
        });
    }

    async validate(payload: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { 
                clientMemberships: true,
                projectMemberships: {
                    include: {
                        project: {
                            select: { clientId: true }
                        }
                    }
                }
            },
        });
        if (!user) {
            throw new UnauthorizedException();
        }
        const { passwordHash, twoFactorSecret, recoveryCodes, ...safe } = user;
        return { ...safe, twoFactorEnabled: user.twoFactorEnabled };
    }
}
