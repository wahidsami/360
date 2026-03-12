import { GlobalRole, User, ClientMember, ProjectMember } from '@prisma/client';

export type UserWithRoles = User & { 
    clientMemberships: ClientMember[],
    projectMemberships: (ProjectMember & { project?: { clientId: string } })[]
};

export class ScopeUtils {
    /** Roles that see everything in the Org by default */
    static isInternal(user: User): boolean {
        const internalRoles: GlobalRole[] = [
            GlobalRole.SUPER_ADMIN,
            GlobalRole.OPS,
            GlobalRole.PM,
        ];
        return internalRoles.includes(user.role);
    }

    /** Roles that are internal but restricted to assigned projects/clients */
    static isRestrictedInternal(user: User): boolean {
        const restrictedRoles: GlobalRole[] = [
            GlobalRole.DEV,
            GlobalRole.QA,
            GlobalRole.FINANCE,
        ];
        return restrictedRoles.includes(user.role);
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
     * Returns null if user is fully Internal (access all).
     */
    static getAccessibleClientIds(user: UserWithRoles): string[] | null {
        if (this.isInternal(user)) return null;

        const clientIds = new Set<string>();
        
        // Direct client memberships
        user.clientMemberships.forEach(m => clientIds.add(m.clientId));

        // Indirect client access via project assignments (for QA/DEV)
        user.projectMemberships.forEach(m => {
            if (m.project?.clientId) {
                clientIds.add(m.project.clientId);
            }
        });
        
        return Array.from(clientIds);
    }

    /**
     * Returns a list of Project IDs the user is allowed to access.
     * Returns null if user is fully Internal.
     */
    static getAccessibleProjectIds(user: UserWithRoles): string[] | null {
        if (this.isInternal(user)) return null;

        // For QA/DEV, they see projects they are assigned to
        const projectIds = new Set<string>(user.projectMemberships.map(m => m.projectId));

        // Also see projects belonging to clients they have membership in
        // (Wait, usually a client lead sees all projects under that client)
        // For now, let's keep it strict: assigned projects only for internal restricted.
        
        return Array.from(projectIds);
    }

    /**
     * Helper to merge Org scope and Client/Project scope.
     */
    static clientScope(user: UserWithRoles, fieldName = 'id'): any {
        const base = this.orgScope(user);
        const clientIds = this.getAccessibleClientIds(user);

        if (clientIds === null) return base;

        return {
            ...base,
            [fieldName]: { in: clientIds },
        };
    }

    /**
     * Scope for Project queries.
     */
    static projectScope(user: UserWithRoles): any {
        const base = this.orgScope(user);
        const projectIds = this.getAccessibleProjectIds(user);
        const clientIds = this.getAccessibleClientIds(user);

        if (projectIds === null && clientIds === null) return base;

        const filters: any[] = [];
        if (projectIds && projectIds.length > 0) filters.push({ id: { in: projectIds } });
        if (clientIds && clientIds.length > 0) filters.push({ clientId: { in: clientIds } });

        if (filters.length === 0) return { ...base, id: 'none' }; // No access

        return {
            ...base,
            OR: filters
        };
    }

    /**
     * Scope for entities linked to a project (Findings, Tasks, etc.)
     */
    static nestedProjectScope(user: UserWithRoles, projectFieldName = 'projectId'): any {
        const base = this.orgScope(user);
        const projectIds = this.getAccessibleProjectIds(user);
        const clientIds = this.getAccessibleClientIds(user);

        if (projectIds === null && clientIds === null) return base;

        const filters: any[] = [];
        if (projectIds && projectIds.length > 0) filters.push({ [projectFieldName]: { in: projectIds } });
        if (clientIds && clientIds.length > 0) {
            filters.push({ 
                project: { clientId: { in: clientIds } } 
            });
        }

        if (filters.length === 0) return { ...base, id: 'none' };

        return {
            ...base,
            OR: filters
        };
    }
}
