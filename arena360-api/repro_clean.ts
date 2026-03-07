
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        const org = await prisma.org.findFirst();
        const user = await prisma.user.findFirst();
        const project = await prisma.project.findFirst();

        if (!org || !user || !project) {
            console.error('Missing seed data');
            return;
        }

        console.log('Testing clean Task creation with milestoneId...');
        const task = await prisma.task.create({
            data: {
                title: 'Clean Test Task with Milestone',
                projectId: project.id,
                assigneeId: user.id,
                milestoneId: null, // Test null
                status: 'TODO',
                priority: 'LOW',
                labels: ['test']
            }
        });
        console.log('✅ Successfully created task:', task.id);

        console.log('Testing clean Project creation with budget and tags...');
        const newProject = await prisma.project.create({
            data: {
                name: 'Clean Budget Project',
                clientId: project.clientId,
                orgId: org.id,
                budget: 75000,
                tags: ['final-check', 'verified'],
                status: 'ACTIVE',
                health: 'GOOD'
            }
        });
        console.log('✅ Successfully created project with budget:', newProject.id);

    } catch (e) {
        console.error('❌ Database Test Failed:');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
