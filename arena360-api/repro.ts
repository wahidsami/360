
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Fetching first org...');
        const org = await prisma.org.findFirst();
        if (!org) {
            console.error('No org found. Please seed the database.');
            process.exit(1);
        }

        console.log(`Using Org: ${org.id}`);

        console.log('Fetching first user...');
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error('No user found. Please seed the database.');
            process.exit(1);
        }

        console.log(`Using User: ${user.id}`);

        console.log('Fetching first project...');
        const project = await prisma.project.findFirst();
        if (!project) {
            console.error('No project found. Please seed the database.');
            process.exit(1);
        }

        console.log(`Using Project: ${project.id}`);

        console.log('Attempting to create a test task...');
        const task = await prisma.task.create({
            data: {
                title: 'Test Task ' + new Date().toISOString(),
                projectId: project.id,
                assigneeId: user.id,
                status: 'IN_PROGRESS',
                priority: 'HIGH',
                labels: ['frontend', 'bug'],
                assigneeName: 'Test User',
                comments: []
            } as any
        });

        console.log('Successfully created task:', task.id);

        console.log('Attempting to create a task with empty string IDs (should be handled by service, but here we test raw Prisma failing OR succeeding if we pass null)...');
        try {
            const taskEmpty = await prisma.task.create({
                data: {
                    title: 'Empty ID Task ' + new Date().toISOString(),
                    projectId: project.id,
                    assigneeId: '', // THIS SHOULD FAIL WITHOUT MY FIX IF PASSED DIRECTLY TO PRISMA
                    milestoneId: '',
                } as any
            });
            console.log('Successfully created empty ID task:', taskEmpty.id);
        } catch (e) {
            console.log('✅ Caught expected Prisma error for empty string IDs:', e.message);
        }

        console.log('Attempting to create a test milestone...');
        const milestone = await prisma.milestone.create({
            data: {
                title: 'Test Milestone ' + new Date().toISOString(),
                projectId: project.id,
                orgId: org.id,
                dueDate: new Date(),
            }
        });

        console.log('Successfully created milestone:', milestone.id);

        console.log('Attempting to create a test project with new fields...');
        const newProject = await prisma.project.create({
            data: {
                name: 'Budget Test Project ' + new Date().toISOString(),
                clientId: project.clientId,
                orgId: org.id,
                budget: 50000,
                tags: ['urgent', 'strategic'],
                status: 'ACTIVE',
                health: 'GOOD'
            } as any
        });
        console.log('Successfully created project with budget:', newProject.id);

        console.log('Attempting to create a test audit log...');
        const auditLog = await prisma.auditLog.create({
            data: {
                action: 'TEST',
                entity: 'Task',
                entityId: task.id,
                orgId: org.id,
                actorId: user.id,
                afterJson: { test: true }
            }
        });
        console.log('Successfully created audit log:', auditLog.id);

    } catch (error) {
        console.error('ERROR DETECTED:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
