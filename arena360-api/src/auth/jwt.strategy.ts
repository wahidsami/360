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
        let user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { 
                clientMemberships: {
                    orderBy: { createdAt: 'desc' }
                },
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

        if (user.role.startsWith('CLIENT_') && user.clientMemberships.length > 1) {
            const [primaryMembership, ...staleMemberships] = user.clientMemberships;
            await this.prisma.clientMember.deleteMany({
                where: {
                    userId: user.id,
                    id: { in: staleMemberships.map((membership) => membership.id) },
                },
            });

            user = {
                ...user,
                clientMemberships: [primaryMembership],
            };
        }

        const { passwordHash, twoFactorSecret, recoveryCodes, ...safe } = user;
        return { ...safe, twoFactorEnabled: user.twoFactorEnabled };
    }
}
