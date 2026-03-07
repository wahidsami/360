
import { PrismaClient, GlobalRole, ClientStatus, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';

const prisma = new PrismaClient();

async function runAudit() {
    console.log('--- STARTING COMPREHENSIVE BACKEND AUDIT ---');
    try {
        const org = await prisma.org.findFirst();
        const user = await prisma.user.findFirst({ where: { role: GlobalRole.SUPER_ADMIN } });
        if (!org || !user) throw new Error('Org or Admin User not found. Run seed first.');

        // 1. CLIENT CRUD
        console.log('1. Testing Client CRUD...');
        const client = await prisma.client.create({
            data: { name: 'Audit Test Client', orgId: org.id, status: ClientStatus.ACTIVE }
        });
        console.log('✅ Created Client:', client.id);

        const updatedClient = await prisma.client.update({
            where: { id: client.id },
            data: { name: 'Audit Test Client Updated' }
        });
        console.log('✅ Updated Client:', updatedClient.name);

        // 2. PROJECT CRUD
        console.log('2. Testing Project CRUD...');
        const project = await prisma.project.create({
            data: {
                name: 'Audit Test Project',
                clientId: client.id,
                orgId: org.id,
                status: ProjectStatus.ACTIVE,
                budget: 10000,
                tags: ['audit', 'test']
            }
        });
        console.log('✅ Created Project:', project.id);

        const updatedProject = await prisma.project.update({
            where: { id: project.id },
            data: { name: 'Audit Test Project Updated', health: 'GOOD' }
        });
        console.log('✅ Updated Project:', updatedProject.name);

        // 3. MILESTONE CRUD
        console.log('3. Testing Milestone CRUD...');
        const milestone = await prisma.milestone.create({
            data: {
                title: 'Audit Test Milestone',
                projectId: project.id,
                orgId: org.id,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        console.log('✅ Created Milestone:', milestone.id);

        const updatedMilestone = await prisma.milestone.update({
            where: { id: milestone.id },
            data: { title: 'Audit Test Milestone Updated' }
        });
        console.log('✅ Updated Milestone:', updatedMilestone.title);

        // 4. TASK CRUD
        console.log('4. Testing Task CRUD...');
        const task = await prisma.task.create({
            data: {
                title: 'Audit Test Task',
                projectId: project.id,
                status: TaskStatus.TODO,
                priority: TaskPriority.MEDIUM,
                assigneeId: user.id,
                milestoneId: milestone.id,
                labels: ['audit']
            }
        });
        console.log('✅ Created Task:', task.id);

        const updatedTask = await prisma.task.update({
            where: { id: task.id },
            data: { title: 'Audit Test Task Updated', status: TaskStatus.IN_PROGRESS }
        });
        console.log('✅ Updated Task:', updatedTask.title);

        // 5. DELETE / CLEANUP (Optional, but let's verify delete works)
        console.log('5. Testing Cleanup (Soft-Delete where applicable)...');
        await prisma.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
        console.log('✅ Soft-deleted Task');

        await prisma.milestone.delete({ where: { id: milestone.id } });
        console.log('✅ Deleted Milestone');

        await prisma.project.update({ where: { id: project.id }, data: { deletedAt: new Date() } });
        console.log('✅ Soft-deleted Project');

        await prisma.client.delete({ where: { id: client.id } });
        console.log('✅ Deleted Client');

        console.log('--- BACKEND AUDIT COMPLETED SUCCESSFULLY ---');

    } catch (e) {
        console.error('❌ AUDIT FAILED:');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

runAudit();
