import {
    PrismaClient,
    GlobalRole,
    ClientStatus,
    ProjectStatus,
    TaskStatus,
    TaskPriority,
    ReportBuilderTemplateCategory,
    ReportBuilderTemplateStatus,
    ProjectReportStatus,
    ProjectReportVisibility,
    ProjectReportEntrySeverity,
    ProjectReportEntryStatus,
    FileCategory,
    FileScopeType,
    FileVisibility,
    ProjectReportMediaType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ========== SEEDED LOGIN CREDENTIALS ==========
// After running: npx prisma db seed
//
// Super Admin (Full Access)
//   Email:    admin@arena360.local
//   Password: Arena360Admin!
//
// Team Members (Password: password123)
//   Developer:       dev@arena.com      (lands on Tasks/My Work flow)
//   Finance:         finance@arena.com  (lands on Financials flow)
//   Project Manager: pm@arena.com       (lands on Overview/Admin flow)
//   QA:              qa@arena.com
//
// Client Access (Password: password123)
//   Client Owner:    client@acme.com
//
// Additional seeded helpers kept for internal demos:
//   Ops:             ops@arena.com
//   Client Manager:  manager@acme.com
const SUPER_ADMIN_EMAIL = 'admin@arena360.local';
const SUPER_ADMIN_PASSWORD = 'Arena360Admin!';
const DEFAULT_ORG_SLUG = 'default';
const DEFAULT_TEAM_PASSWORD = 'password123';

async function ensureLocalSeedFile(storageKey: string, contents: string) {
    const filePath = path.join(process.cwd(), 'uploads', storageKey);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents, 'utf8');
}

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
    const passwordHash = await bcrypt.hash(DEFAULT_TEAM_PASSWORD, 10);

    const usersData = [
        { email: 'ops@arena.com', role: GlobalRole.OPS, name: 'Ops User' },
        { email: 'pm@arena.com', role: GlobalRole.PM, name: 'Project Manager' },
        { email: 'dev@arena.com', role: GlobalRole.DEV, name: 'Developer' },
        { email: 'qa@arena.com', role: GlobalRole.QA, name: 'QA Engineer' },
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

    const acmeClient = await prisma.client.findFirst({
        where: { orgId: org.id, name: 'Acme Corp', deletedAt: null },
    });
    const websiteProject = await prisma.project.findFirst({
        where: { orgId: org.id, name: 'Website Redesign', deletedAt: null },
    });
    const qaUser = await prisma.user.findFirst({
        where: { orgId: org.id, role: GlobalRole.QA, isActive: true },
    });
    const clientOwner = await prisma.user.findFirst({
        where: { orgId: org.id, role: GlobalRole.CLIENT_OWNER, isActive: true },
    });

    if (acmeClient && websiteProject && qaUser && clientOwner) {
        const template = await prisma.reportBuilderTemplate.upsert({
            where: { orgId_code: { orgId: org.id, code: 'accessibility-audit-ar' } },
            create: {
                orgId: org.id,
                name: 'Accessibility Audit',
                code: 'accessibility-audit-ar',
                description: 'Arabic-first accessibility audit template with client-safe export layout.',
                category: ReportBuilderTemplateCategory.ACCESSIBILITY,
                status: ReportBuilderTemplateStatus.ACTIVE,
                createdById: superAdmin.id,
            },
            update: {
                name: 'Accessibility Audit',
                description: 'Arabic-first accessibility audit template with client-safe export layout.',
                status: ReportBuilderTemplateStatus.ACTIVE,
            },
        });

        let version = await prisma.reportBuilderTemplateVersion.findFirst({
            where: { templateId: template.id, versionNumber: 1 },
        });
        if (!version) {
            version = await prisma.reportBuilderTemplateVersion.create({
                data: {
                    templateId: template.id,
                    versionNumber: 1,
                    isPublished: true,
                    publishedById: superAdmin.id,
                    publishedAt: new Date(),
                    schemaJson: {
                        entryFields: [
                            { key: 'service_name', label: 'اسم الخدمة', type: 'text', required: true },
                            { key: 'issue_title', label: 'عنوان المشكلة', type: 'text', required: true },
                            { key: 'issue_description', label: 'وصف المشكلة', type: 'textarea', required: true },
                            { key: 'severity', label: 'الأهمية', type: 'select', options: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: true },
                            { key: 'category', label: 'التصنيف', type: 'select', required: true },
                            { key: 'subcategory', label: 'التصنيف الفرعي', type: 'dependent_select', dependsOn: 'category', required: true },
                            { key: 'page_url', label: 'رابط الصفحة', type: 'url' },
                            { key: 'recommendation', label: 'التوصية', type: 'textarea' },
                        ],
                        tableColumns: ['id', 'service_name', 'issue_title', 'issue_description', 'severity', 'page_url', 'evidence', 'recommendation'],
                    },
                    pdfConfigJson: {
                        orientation: 'landscape',
                        locale: 'ar-SA',
                        direction: 'rtl',
                        showCoverPage: true,
                        showClosingPage: true,
                    },
                    aiConfigJson: {
                        introductionTone: 'formal',
                        recommendationTone: 'actionable',
                        languageMode: 'arabic_first',
                    },
                    taxonomyJson: {
                        accessibilityCategories: [
                            { value: 'content', label: 'المحتوى النصي' },
                            { value: 'images', label: 'الصور' },
                            { value: 'navigation', label: 'عناصر التنقل' },
                        ],
                        accessibilitySubcategories: {
                            content: [
                                { value: 'screen-reader', label: 'قارئ الشاشة' },
                                { value: 'language', label: 'لغة المحتوى' },
                            ],
                            images: [
                                { value: 'alt-text', label: 'النص البديل' },
                            ],
                            navigation: [
                                { value: 'focus-order', label: 'ترتيب التنقل' },
                            ],
                        },
                    },
                },
            });
        } else if (!version.isPublished) {
            version = await prisma.reportBuilderTemplateVersion.update({
                where: { id: version.id },
                data: { isPublished: true, publishedById: superAdmin.id, publishedAt: new Date() },
            });
        }

        await prisma.clientReportTemplateAssignment.upsert({
            where: { id: `${acmeClient.id}-${version.id}` },
            create: {
                id: `${acmeClient.id}-${version.id}`,
                orgId: org.id,
                clientId: acmeClient.id,
                templateId: template.id,
                templateVersionId: version.id,
                isDefault: true,
                isActive: true,
                assignedById: superAdmin.id,
            },
            update: {
                isDefault: true,
                isActive: true,
                assignedById: superAdmin.id,
            },
        });

        let seededReport = await prisma.projectReport.findFirst({
            where: {
                orgId: org.id,
                projectId: websiteProject.id,
                title: 'تقرير إمكانية الوصول - الإصدار التجريبي',
                deletedAt: null,
            },
        });

        if (!seededReport) {
            seededReport = await prisma.projectReport.create({
                data: {
                    orgId: org.id,
                    clientId: acmeClient.id,
                    projectId: websiteProject.id,
                    templateId: template.id,
                    templateVersionId: version.id,
                    title: 'تقرير إمكانية الوصول - الإصدار التجريبي',
                    description: 'تقرير مرجعي مملوء ببيانات عربية لاختبار معاينة التصدير والنسخة المخصصة للعميل.',
                    status: ProjectReportStatus.PUBLISHED,
                    visibility: ProjectReportVisibility.CLIENT,
                    performedById: qaUser.id,
                    publishedAt: new Date(),
                    summaryJson: {
                        introduction: 'يغطي هذا التقرير تجربة إمكانية الوصول في الشاشات الأساسية للمشروع مع التركيز على القراءة بالعربية وتوافق قارئات الشاشة.',
                        executiveSummary: 'تم رصد عدد من الملاحظات ذات الأولوية العالية والمتوسطة في النصوص البديلة، وصف الأزرار، وترتيب التنقل داخل الواجهة.',
                        recommendationsSummary: 'يوصى بمعالجة النصوص البديلة أولاً، ثم تحسين أوصاف العناصر التفاعلية، ومراجعة التسلسل المنطقي لعناصر التنقل.',
                    },
                },
            });
        }

        const seededEntryTitles = [
            'قارئ الشاشة يصف المحتوى بشكل غير مكتمل',
            'الصور داخل الصفحة لا تحتوي على نص بديل مناسب',
            'ترتيب التنقل عبر لوحة المفاتيح غير منطقي في صفحة الحجز',
        ];

        const existingSeedEntries = await prisma.projectReportEntry.count({
            where: { orgId: org.id, projectReportId: seededReport.id, deletedAt: null },
        });

        if (existingSeedEntries === 0) {
            const entries = await prisma.$transaction([
                prisma.projectReportEntry.create({
                    data: {
                        orgId: org.id,
                        projectReportId: seededReport.id,
                        sortOrder: 0,
                        serviceName: 'شاشة تسجيل الدخول',
                        issueTitle: seededEntryTitles[0],
                        issueDescription: 'عند قراءة الحقول التفاعلية لا يعلن قارئ الشاشة الوصف الكامل للعناصر، مما يسبب غموضاً في فهم الوظيفة.',
                        severity: ProjectReportEntrySeverity.HIGH,
                        category: 'content',
                        subcategory: 'screen-reader',
                        pageUrl: 'https://example.com/login',
                        recommendation: 'إضافة أوصاف دقيقة للعناصر التفاعلية وتحديث خصائص الوصول لتتوافق مع قارئات الشاشة.',
                        status: ProjectReportEntryStatus.OPEN,
                        createdById: qaUser.id,
                        updatedById: qaUser.id,
                    },
                }),
                prisma.projectReportEntry.create({
                    data: {
                        orgId: org.id,
                        projectReportId: seededReport.id,
                        sortOrder: 1,
                        serviceName: 'معرض الصور',
                        issueTitle: seededEntryTitles[1],
                        issueDescription: 'عدد من الصور الجوهرية داخل الصفحة يظهر بدون نص بديل واضح، وهو ما يمنع المستخدم من فهم المحتوى أو الغرض منها.',
                        severity: ProjectReportEntrySeverity.HIGH,
                        category: 'images',
                        subcategory: 'alt-text',
                        pageUrl: 'https://example.com/gallery',
                        recommendation: 'إضافة نص بديل وصفي لكل صورة مرتبطة بالمحتوى أو بالإجراء المطلوب من المستخدم.',
                        status: ProjectReportEntryStatus.OPEN,
                        createdById: qaUser.id,
                        updatedById: qaUser.id,
                    },
                }),
                prisma.projectReportEntry.create({
                    data: {
                        orgId: org.id,
                        projectReportId: seededReport.id,
                        sortOrder: 2,
                        serviceName: 'صفحة الحجز',
                        issueTitle: seededEntryTitles[2],
                        issueDescription: 'التنقل عبر لوحة المفاتيح ينتقل بين العناصر بترتيب غير متوقع، مما يربك المستخدم ويطيل وقت تنفيذ المهمة.',
                        severity: ProjectReportEntrySeverity.MEDIUM,
                        category: 'navigation',
                        subcategory: 'focus-order',
                        pageUrl: 'https://example.com/booking',
                        recommendation: 'مراجعة ترتيب التركيز وربط العناصر التفاعلية بتسلسل منطقي يتماشى مع تدفق الصفحة.',
                        status: ProjectReportEntryStatus.OPEN,
                        createdById: qaUser.id,
                        updatedById: qaUser.id,
                    },
                }),
            ]);

            const sampleSvg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1280\" height=\"720\" viewBox=\"0 0 1280 720\"><rect width=\"1280\" height=\"720\" fill=\"#f6f2ec\"/><rect x=\"48\" y=\"48\" width=\"1184\" height=\"624\" rx=\"24\" fill=\"#ffffff\" stroke=\"#8a1538\" stroke-width=\"6\"/><text x=\"640\" y=\"180\" text-anchor=\"middle\" font-size=\"52\" font-family=\"Tahoma, Arial\" fill=\"#8a1538\">Accessibility Evidence</text><text x=\"640\" y=\"270\" text-anchor=\"middle\" font-size=\"34\" font-family=\"Tahoma, Arial\" fill=\"#2d1b0f\">شاهد توضيحي للملاحظة</text><text x=\"640\" y=\"360\" text-anchor=\"middle\" font-size=\"26\" font-family=\"Tahoma, Arial\" fill=\"#6b7280\">Arabic-first seeded media for report preview/export QA</text></svg>`;
            const storageKey = `${org.id}/project/${websiteProject.id}/evidence/seeded_accessibility_evidence.svg`;
            await ensureLocalSeedFile(storageKey, sampleSvg);

            const evidenceAsset = await prisma.fileAsset.create({
                data: {
                    orgId: org.id,
                    scopeType: FileScopeType.PROJECT,
                    projectId: websiteProject.id,
                    uploaderId: qaUser.id,
                    category: FileCategory.EVIDENCE,
                    visibility: FileVisibility.CLIENT,
                    filename: 'seeded_accessibility_evidence.svg',
                    mimeType: 'image/svg+xml',
                    sizeBytes: Buffer.byteLength(sampleSvg, 'utf8'),
                    storageKey,
                },
            });

            await prisma.projectReportEntryMedia.create({
                data: {
                    entryId: entries[0].id,
                    fileAssetId: evidenceAsset.id,
                    mediaType: ProjectReportMediaType.IMAGE,
                    caption: 'دليل مرئي تجريبي',
                    sortOrder: 0,
                },
            });
        }

        await prisma.clientMember.upsert({
            where: { clientId_userId: { clientId: acmeClient.id, userId: clientOwner.id } },
            create: { clientId: acmeClient.id, userId: clientOwner.id, role: GlobalRole.CLIENT_OWNER },
            update: { role: GlobalRole.CLIENT_OWNER },
        });

        console.log('Report builder seed data is ready for Arabic accessibility preview/export QA.');
    }

    console.log('Seeded login credentials:');
    console.log(`  Super Admin: admin@arena360.local / ${SUPER_ADMIN_PASSWORD}`);
    console.log(`  Developer: dev@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Finance: finance@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Project Manager: pm@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  QA: qa@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Client Owner: client@acme.com / ${DEFAULT_TEAM_PASSWORD}`);
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
