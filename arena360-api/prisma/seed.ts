import { PrismaClient, GlobalRole, ClientStatus, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ========== SUPER ADMIN (and default org) ==========
// After running: npx prisma db seed
// Login with:
//   Email:    admin@arena360.local
//   Password: Arena360Admin!
const SUPER_ADMIN_EMAIL = 'admin@arena360.local';
const SUPER_ADMIN_PASSWORD = 'Arena360Admin!';
const DEFAULT_ORG_SLUG = 'default';

async function main() {
    console.log('Seeding database...');

    // 1. Create or update default Org (so super admin has an org)
    const org = await prisma.org.upsert({
        where: { slug: DEFAULT_ORG_SLUG },
        create: {
            name: 'Arena360 Default Org',
            slug: DEFAULT_ORG_SLUG,
        },
        update: {},
    });
    console.log('Org:', org.name, '(', org.id, ')');

    // 2. Create or update Super Admin (so credentials are always known)
    const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: SUPER_ADMIN_EMAIL },
        create: {
            email: SUPER_ADMIN_EMAIL,
            name: 'Super Admin',
            role: GlobalRole.SUPER_ADMIN,
            passwordHash: superAdminHash,
            orgId: org.id,
        },
        update: { passwordHash: superAdminHash, orgId: org.id },
    });
    console.log('Super Admin:', superAdmin.email, '(use password above to login)');

    // 3. Create other demo users (skip if already exist to avoid duplicates)
    const passwordHash = await bcrypt.hash('password123', 10);

    const usersData = [
        { email: 'ops@arena.com', role: GlobalRole.OPS, name: 'Ops User' },
        { email: 'pm@arena.com', role: GlobalRole.PM, name: 'PM User' },
        { email: 'dev@arena.com', role: GlobalRole.DEV, name: 'Dev User' },
        { email: 'finance@arena.com', role: GlobalRole.FINANCE, name: 'Finance User' },
        { email: 'client@acme.com', role: GlobalRole.CLIENT_OWNER, name: 'Client Owner' },
        { email: 'manager@acme.com', role: GlobalRole.CLIENT_MANAGER, name: 'Client Manager' },
    ];

    const users: Record<string, any> = { [GlobalRole.SUPER_ADMIN]: superAdmin };
    for (const u of usersData) {
        users[u.role] = await prisma.user.upsert({
            where: { email: u.email },
            create: {
                email: u.email,
                name: u.name,
                role: u.role,
                passwordHash,
                orgId: org.id,
            },
            update: { orgId: org.id },
        });
        console.log(`User: ${u.email}`);
    }

    // 4. Demo data: clients, projects, tasks (only if this org has no clients yet)
    const existingClients = await prisma.client.count({ where: { orgId: org.id } });
    if (existingClients === 0) {
        const clientA = await prisma.client.create({
            data: { name: 'Acme Corp', orgId: org.id, status: ClientStatus.ACTIVE },
        });
        const clientB = await prisma.client.create({
            data: { name: 'Beta Inc', orgId: org.id, status: ClientStatus.ACTIVE },
        });
        await prisma.clientMember.create({
            data: { clientId: clientA.id, userId: users[GlobalRole.CLIENT_OWNER].id, role: GlobalRole.CLIENT_OWNER },
        });
        await prisma.clientMember.create({
            data: { clientId: clientA.id, userId: users[GlobalRole.CLIENT_MANAGER].id, role: GlobalRole.CLIENT_MANAGER },
        });
        const projectA1 = await prisma.project.create({
            data: { name: 'Website Redesign', clientId: clientA.id, orgId: org.id, status: ProjectStatus.ACTIVE },
        });
        await prisma.project.create({
            data: { name: 'Mobile App', clientId: clientA.id, orgId: org.id, status: ProjectStatus.ON_HOLD },
        });
        const projectB1 = await prisma.project.create({
            data: { name: 'Audit Log System', clientId: clientB.id, orgId: org.id, status: ProjectStatus.ACTIVE },
        });
        await prisma.task.create({
            data: {
                projectId: projectA1.id,
                title: 'Design Home Page',
                status: TaskStatus.IN_PROGRESS,
                priority: TaskPriority.HIGH,
                assigneeId: users[GlobalRole.DEV].id,
                dueDate: new Date(Date.now() + 86400000),
            },
        });
        await prisma.task.create({
            data: {
                projectId: projectA1.id,
                title: 'Setup CI/CD',
                status: TaskStatus.TODO,
                priority: TaskPriority.MEDIUM,
                assigneeId: users[GlobalRole.DEV].id,
            },
        });
        await prisma.task.create({
            data: {
                projectId: projectB1.id,
                title: 'Database Schema',
                status: TaskStatus.DONE,
                priority: TaskPriority.URGENT,
                assigneeId: users[GlobalRole.DEV].id,
            },
        });
        console.log('Demo clients, projects, and tasks created.');
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
