import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SSOProvider } from '@prisma/client';
import { SAML } from '@node-saml/node-saml';
import { generateServiceProviderMetadata } from '@node-saml/node-saml';

export interface GoogleProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
}

@Injectable()
export class SsoService {
  constructor(private readonly prisma: PrismaService) {}

  async getGoogleConfigByOrg(orgIdOrSlug: string) {
    const org = await this.prisma.org.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
      },
    });
    if (!org) throw new BadRequestException('Organization not found');
    const config = await this.prisma.sSOConfig.findFirst({
      where: {
        orgId: org.id,
        provider: SSOProvider.GOOGLE,
        enabled: true,
        clientId: { not: null },
        clientSecret: { not: null },
      },
    });
    if (!config || !config.clientId || !config.clientSecret)
      throw new BadRequestException('Google SSO is not configured for this organization');
    return { org, config };
  }

  async findOrCreateUserFromGoogle(orgId: string, profile: GoogleProfile) {
    const providerId = profile.id;
    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerId: { provider: SSOProvider.GOOGLE, providerId },
      },
      include: { user: true },
    });
    if (existingIdentity) {
      const u = existingIdentity.user;
      if (u.orgId !== orgId) throw new BadRequestException('This Google account is linked to another organization');
      const { passwordHash: _, ...user } = u;
      return user;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { orgId, email: profile.email?.toLowerCase() },
    });
    if (existingUser) {
      await this.prisma.userIdentity.create({
        data: {
          userId: existingUser.id,
          provider: SSOProvider.GOOGLE,
          providerId,
          profile: profile as object,
        },
      });
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: existingUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          isActive: true,
          orgId: true,
          customPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    }

    const newUser = await this.prisma.user.create({
      data: {
        orgId,
        email: profile.email?.toLowerCase() ?? `google-${providerId}@sso.local`,
        name: profile.name ?? profile.email ?? 'User',
        passwordHash: null,
        role: 'DEV',
        avatar: profile.picture ?? null,
        identities: {
          create: {
            provider: SSOProvider.GOOGLE,
            providerId,
            profile: profile as object,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        orgId: true,
        customPermissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return newUser;
  }

  async getSamlConfigByOrg(orgIdOrSlug: string) {
    const org = await this.prisma.org.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
      },
    });
    if (!org) throw new BadRequestException('Organization not found');
    const config = await this.prisma.sSOConfig.findFirst({
      where: {
        orgId: org.id,
        provider: SSOProvider.SAML,
        enabled: true,
        entryPoint: { not: null },
        issuer: { not: null },
      },
    });
    if (!config || !config.entryPoint || !config.issuer)
      throw new BadRequestException('SAML SSO is not configured for this organization');
    return { org, config };
  }

  getSamlMetadata(orgIdOrSlug: string, baseUrl: string): Promise<string> {
    return this.getSamlMetadataAsync(orgIdOrSlug, baseUrl);
  }

  private async getSamlMetadataAsync(orgIdOrSlug: string, baseUrl: string): Promise<string> {
    const { config } = await this.getSamlConfigByOrg(orgIdOrSlug);
    const callbackUrl = `${baseUrl}/auth/sso/saml/callback`;
    return generateServiceProviderMetadata({
      issuer: config.issuer!,
      callbackUrl,
      decryptionCert: null,
    });
  }

  async getSamlAuthorizeUrl(orgIdOrSlug: string, baseUrl: string): Promise<string> {
    const { org, config } = await this.getSamlConfigByOrg(orgIdOrSlug);
    if (!config.cert) throw new BadRequestException('SAML IdP certificate is not configured');
    const callbackUrl = `${baseUrl}/auth/sso/saml/callback`;
    const saml = new SAML({
      entryPoint: config.entryPoint!,
      issuer: config.issuer!,
      callbackUrl,
      idpCert: config.cert,
    });
    const relayState = org.id;
    const url = await saml.getAuthorizeUrlAsync(relayState, undefined, {});
    return url;
  }

  async validateSamlResponse(baseUrl: string, body: Record<string, string>): Promise<{ orgId: string; nameId: string; attributes?: Record<string, string> }> {
    const relayState = body.RelayState || body.relayState;
    if (!relayState) throw new BadRequestException('Missing RelayState');
    const { config } = await this.getSamlConfigByOrg(relayState);
    if (!config.cert) throw new BadRequestException('SAML IdP certificate is not configured');
    const callbackUrl = `${baseUrl}/auth/sso/saml/callback`;
    const saml = new SAML({
      entryPoint: config.entryPoint!,
      issuer: config.issuer!,
      callbackUrl,
      idpCert: config.cert,
    });
    const result = await saml.validatePostResponseAsync(body);
    if (!result.profile) throw new BadRequestException('Invalid SAML response');
    const nameId = result.profile.nameID || result.profile.nameId || (result.profile as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    if (!nameId) throw new BadRequestException('SAML response missing nameId');
    const attributes: Record<string, string> = {};
    if (result.profile.email) attributes.email = String(result.profile.email);
    const emailClaim = result.profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    if (emailClaim != null) attributes.email = String(emailClaim);
    if (result.profile.name != null) attributes.name = String(result.profile.name);
    return { orgId: relayState, nameId, attributes };
  }

  async findOrCreateUserFromSaml(orgId: string, profile: { nameId: string; attributes?: Record<string, string> }) {
    const providerId = profile.nameId;
    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerId: { provider: SSOProvider.SAML, providerId },
      },
      include: { user: true },
    });
    if (existingIdentity) {
      const u = existingIdentity.user;
      if (u.orgId !== orgId) throw new BadRequestException('This SSO account is linked to another organization');
      const { passwordHash: _, ...user } = u;
      return user;
    }
    const email = profile.attributes?.email ?? `saml-${providerId}@sso.local`;
    const name = profile.attributes?.name ?? email.split('@')[0];
    const existingUser = await this.prisma.user.findFirst({
      where: { orgId, email: email.toLowerCase() },
    });
    if (existingUser) {
      await this.prisma.userIdentity.create({
        data: {
          userId: existingUser.id,
          provider: SSOProvider.SAML,
          providerId,
          profile: profile as object,
        },
      });
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: existingUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          isActive: true,
          orgId: true,
          customPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    }
    const newUser = await this.prisma.user.create({
      data: {
        orgId,
        email: email.toLowerCase(),
        name,
        passwordHash: null,
        role: 'DEV',
        avatar: null,
        identities: {
          create: {
            provider: SSOProvider.SAML,
            providerId,
            profile: profile as object,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        orgId: true,
        customPermissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return newUser;
  }
}
