import { GlobalRole, User, ClientMember } from '@prisma/client';

export type UserWithRoles = User & { clientMemberships: ClientMember[] };

export class ScopeUtils {
    static isInternal(user: User): boolean {
        const internalRoles: GlobalRole[] = [
            GlobalRole.SUPER_ADMIN,
            GlobalRole.OPS,
            GlobalRole.PM,
            GlobalRole.DEV,
            GlobalRole.FINANCE,
            GlobalRole.QA,
        ];
        return internalRoles.includes(user.role);
    }

    static isClient(user: User): boolean {
        const clientRoles: GlobalRole[] = [
            GlobalRole.CLIENT_OWNER,
            GlobalRole.CLIENT_MANAGER,
            GlobalRole.CLIENT_MEMBER,
            GlobalRole.VIEWER,
        ];
        return clientRoles.includes(user.role);
    }

    /**
     * Returns a Prisma 'where' clause fragment for Org scoping.
     * Always apply this.
     */
    static orgScope(user: User) {
        return { orgId: user.orgId };
    }

    /**
     * Returns a list of Client IDs the user is allowed to access.
     * Returns null if user is Internal (access all).
     */
    static getAccessibleClientIds(user: UserWithRoles): string[] | null {
        if (this.isInternal(user)) return null;
        return user.clientMemberships.map((m) => m.clientId);
    }

    /**
     * Helper to merge Org scope and Client scope for Client/Project queries.
     * @param user 
     * @param fieldName defaults to 'id' for Client model, 'clientId' for Project model
     */
    static clientScope(user: UserWithRoles, fieldName = 'id'): any {
        const base = this.orgScope(user);
        const clientIds = this.getAccessibleClientIds(user);

        if (clientIds === null) return base; // Internal: just org scope

        // Client: org scope AND client list scope
        return {
            ...base,
            [fieldName]: { in: clientIds },
        };
    }
}
