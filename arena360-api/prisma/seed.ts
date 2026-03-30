import {
    PrismaClient,
    GlobalRole,
    ClientStatus,
    ProjectStatus,
    ProjectHealth,
    TaskStatus,
    TaskPriority,
    MilestoneStatus,
    UpdateVisibility,
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
    FindingSeverity,
    FindingStatus,
    FindingVisibility,
    ContractStatus,
    InvoiceStatus,
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
const DEMO_SEED_MARKER = '[ARENA_DEMO_ACCESSIBILITY_AR_20260330]';
const DEMO_BASE_DATE = new Date('2026-03-30T09:00:00.000Z');

type AuditOutcome = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE' | 'NOT_TESTED';

type DemoClientPack = {
    clientName: string;
    clientUserName: string;
    clientUserEmail: string;
    contactPerson: string;
    website: string;
    projectName: string;
    platformLabel: string;
    sector: string;
    projectHealth: ProjectHealth;
    progress: number;
    contractAmount: number;
    outcomes: AuditOutcome[];
};

const DEMO_CHECKS: Array<{
    serviceName: string;
    category: string;
    subcategory: string;
    title: string;
    successDescription: string;
    issueDescription: string;
    recommendation: string;
    pagePath: string;
    failSeverity: ProjectReportEntrySeverity;
    partialSeverity: ProjectReportEntrySeverity;
}> = [
    {
        serviceName: 'الصفحة الرئيسية',
        category: 'Images',
        subcategory: 'Missing alt text',
        title: 'النصوص البديلة للصور التعريفية',
        successDescription: 'الصور التعريفية والعناصر البصرية الأساسية تحمل نصوصًا بديلة واضحة ومفهومة.',
        issueDescription: 'الصور الأساسية في الصفحة الرئيسية تظهر دون نصوص بديلة كافية، ما يضعف فهم المحتوى لمستخدمي قارئات الشاشة.',
        recommendation: 'إضافة نصوص بديلة دقيقة للصور التعريفية والمرتبطة بالمحتوى أو الإجراء المطلوب.',
        pagePath: '/home',
        failSeverity: ProjectReportEntrySeverity.HIGH,
        partialSeverity: ProjectReportEntrySeverity.MEDIUM,
    },
    {
        serviceName: 'قائمة التنقل العليا',
        category: 'Keyboard & Navigation',
        subcategory: 'Not accessible via keyboard',
        title: 'إمكانية التنقل بلوحة المفاتيح',
        successDescription: 'عناصر التنقل الرئيسية قابلة للوصول والتنقل بالكامل باستخدام لوحة المفاتيح.',
        issueDescription: 'جزء من عناصر التنقل يتطلب استخدام الفأرة أو يفقد التركيز عند التنقل بلوحة المفاتيح.',
        recommendation: 'ضمان إمكانية الوصول إلى جميع الروابط والقوائم باستخدام لوحة المفاتيح مع ترتيب منطقي للتركيز.',
        pagePath: '/navigation',
        failSeverity: ProjectReportEntrySeverity.HIGH,
        partialSeverity: ProjectReportEntrySeverity.MEDIUM,
    },
    {
        serviceName: 'صفحة الخدمات',
        category: 'Content',
        subcategory: 'Missing or incorrect headings structure (H1–H6)',
        title: 'هيكل العناوين في المحتوى',
        successDescription: 'هيكل العناوين منظم ويسهّل فهم تسلسل المحتوى والتنقل داخله.',
        issueDescription: 'تسلسل العناوين غير متسق في صفحة الخدمات، ما يسبب صعوبة في فهم بنية المحتوى.',
        recommendation: 'إعادة تنظيم مستويات العناوين لتتبع تسلسلاً منطقيًا يبدأ من العنوان الرئيسي وينتقل إلى العناوين الفرعية.',
        pagePath: '/services',
        failSeverity: ProjectReportEntrySeverity.MEDIUM,
        partialSeverity: ProjectReportEntrySeverity.LOW,
    },
    {
        serviceName: 'نموذج تسجيل الدخول',
        category: 'Forms & Inputs',
        subcategory: 'Missing labels',
        title: 'ارتباط الحقول بالتسميات النصية',
        successDescription: 'الحقول الأساسية في نموذج تسجيل الدخول مرتبطة بتسميات واضحة ويمكن لقارئات الشاشة قراءتها بشكل صحيح.',
        issueDescription: 'بعض الحقول تعتمد على النص الإرشادي فقط دون تسميات مرتبطة، ما يسبب التباسًا للمستخدم.',
        recommendation: 'ربط كل حقل إدخال بتسمية واضحة وثابتة وعدم الاكتفاء بالنص الإرشادي داخل الحقل.',
        pagePath: '/login',
        failSeverity: ProjectReportEntrySeverity.HIGH,
        partialSeverity: ProjectReportEntrySeverity.MEDIUM,
    },
    {
        serviceName: 'لوحة التحكم',
        category: 'Color & Contrast',
        subcategory: 'Low text contrast',
        title: 'تباين النصوص والعناصر الأساسية',
        successDescription: 'تباين الألوان في النصوص والأزرار الأساسية يلبّي المعايير المطلوبة ويضمن سهولة القراءة.',
        issueDescription: 'تباين النصوص الثانوية وبعض الأزرار أقل من المستوى الموصى به، ما يضعف وضوح القراءة.',
        recommendation: 'رفع تباين الألوان في النصوص والعناصر التفاعلية للوصول إلى الحدود المقبولة في WCAG AA.',
        pagePath: '/dashboard',
        failSeverity: ProjectReportEntrySeverity.MEDIUM,
        partialSeverity: ProjectReportEntrySeverity.LOW,
    },
    {
        serviceName: 'شاشة التقديم على الخدمة',
        category: 'Forms & Inputs',
        subcategory: 'Errors not explained',
        title: 'وضوح رسائل الخطأ وإرشادات التصحيح',
        successDescription: 'رسائل الخطأ تعرض بشكل واضح وتشرح للمستخدم كيفية التصحيح بدون غموض.',
        issueDescription: 'رسائل الخطأ الحالية لا توضح سبب المشكلة أو الإجراء المطلوب لتصحيحها.',
        recommendation: 'صياغة رسائل خطأ واضحة تربط الخطأ بالحقل المتأثر وتشرح خطوة التصحيح المطلوبة.',
        pagePath: '/apply',
        failSeverity: ProjectReportEntrySeverity.MEDIUM,
        partialSeverity: ProjectReportEntrySeverity.MEDIUM,
    },
    {
        serviceName: 'المكونات التفاعلية المخصصة',
        category: 'Structure & Semantics',
        subcategory: 'Inaccessible custom components',
        title: 'توافق المكونات المخصصة مع قارئات الشاشة',
        successDescription: 'المكونات التفاعلية المخصصة تُعرّف دلاليًا وتعمل بشكل مفهوم مع قارئات الشاشة.',
        issueDescription: 'بعض المكونات المخصصة لا تعلن حالتها أو دورها بشكل صحيح لقارئات الشاشة.',
        recommendation: 'تطبيق الأدوار والخصائص الدلالية المناسبة للمكونات المخصصة واختبارها مع قارئات الشاشة.',
        pagePath: '/widgets',
        failSeverity: ProjectReportEntrySeverity.HIGH,
        partialSeverity: ProjectReportEntrySeverity.MEDIUM,
    },
    {
        serviceName: 'الشرائح الإعلانية',
        category: 'Timing & Interaction',
        subcategory: 'Moving content without control',
        title: 'التحكم في المحتوى المتحرك',
        successDescription: 'المحتوى المتحرك يمكن إيقافه أو تجاوزه بسهولة ولا يعيق استخدام الصفحة.',
        issueDescription: 'المحتوى المتحرك يعمل تلقائيًا دون عناصر تحكم واضحة للإيقاف أو التجاوز.',
        recommendation: 'إتاحة أزرار واضحة لإيقاف الحركة أو إخفائها مع الحفاظ على وضوح التركيز أثناء الاستخدام.',
        pagePath: '/announcements',
        failSeverity: ProjectReportEntrySeverity.MEDIUM,
        partialSeverity: ProjectReportEntrySeverity.LOW,
    },
];

const DEMO_CLIENT_PACKS: DemoClientPack[] = [
    {
        clientName: 'وزارة التعليم',
        clientUserName: 'هند بنت صالح',
        clientUserEmail: 'hbinsaleh@gmail.com',
        contactPerson: 'هند بنت صالح',
        website: 'https://demo.gov.sa/moe',
        projectName: 'تدقيق إمكانية الوصول لمنصة نور التعليمية',
        platformLabel: 'منصة نور التعليمية',
        sector: 'التعليم',
        projectHealth: ProjectHealth.GOOD,
        progress: 86,
        contractAmount: 185000,
        outcomes: ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'FAIL'],
    },
    {
        clientName: 'وزارة الصحة',
        clientUserName: 'نورة الحربي',
        clientUserEmail: 'health.owner@arena360.local',
        contactPerson: 'نورة الحربي',
        website: 'https://demo.gov.sa/moh',
        projectName: 'تدقيق إمكانية الوصول لمنصة صحتي',
        platformLabel: 'منصة صحتي',
        sector: 'الصحة',
        projectHealth: ProjectHealth.GOOD,
        progress: 82,
        contractAmount: 178000,
        outcomes: ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PARTIAL', 'FAIL'],
    },
    {
        clientName: 'وزارة العدل',
        clientUserName: 'خالد العتيبي',
        clientUserEmail: 'justice.owner@arena360.local',
        contactPerson: 'خالد العتيبي',
        website: 'https://demo.gov.sa/moj',
        projectName: 'تدقيق إمكانية الوصول لمنصة ناجز',
        platformLabel: 'منصة ناجز',
        sector: 'العدالة',
        projectHealth: ProjectHealth.GOOD,
        progress: 76,
        contractAmount: 172500,
        outcomes: ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'FAIL', 'FAIL'],
    },
    {
        clientName: 'وزارة التجارة',
        clientUserName: 'ريم الشهري',
        clientUserEmail: 'commerce.owner@arena360.local',
        contactPerson: 'ريم الشهري',
        website: 'https://demo.gov.sa/moc',
        projectName: 'تدقيق إمكانية الوصول لمنصة الأعمال',
        platformLabel: 'منصة الأعمال',
        sector: 'التجارة',
        projectHealth: ProjectHealth.AT_RISK,
        progress: 69,
        contractAmount: 163000,
        outcomes: ['PASS', 'PASS', 'PASS', 'PASS', 'PARTIAL', 'PARTIAL', 'FAIL', 'FAIL'],
    },
    {
        clientName: 'وزارة السياحة',
        clientUserName: 'عبدالعزيز المطيري',
        clientUserEmail: 'tourism.owner@arena360.local',
        contactPerson: 'عبدالعزيز المطيري',
        website: 'https://demo.gov.sa/tourism',
        projectName: 'تدقيق إمكانية الوصول لمنصة روح السعودية',
        platformLabel: 'منصة روح السعودية',
        sector: 'السياحة',
        projectHealth: ProjectHealth.AT_RISK,
        progress: 61,
        contractAmount: 154000,
        outcomes: ['PASS', 'PASS', 'PASS', 'PASS', 'PARTIAL', 'FAIL', 'FAIL', 'FAIL'],
    },
    {
        clientName: 'وزارة النقل والخدمات اللوجستية',
        clientUserName: 'سارة القحطاني',
        clientUserEmail: 'transport.owner@arena360.local',
        contactPerson: 'سارة القحطاني',
        website: 'https://demo.gov.sa/motls',
        projectName: 'تدقيق إمكانية الوصول لبوابة النقل والخدمات اللوجستية',
        platformLabel: 'بوابة النقل والخدمات اللوجستية',
        sector: 'النقل',
        projectHealth: ProjectHealth.AT_RISK,
        progress: 54,
        contractAmount: 149500,
        outcomes: ['PASS', 'PASS', 'PASS', 'PARTIAL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'],
    },
    {
        clientName: 'وزارة الموارد البشرية والتنمية الاجتماعية',
        clientUserName: 'محمد الغامدي',
        clientUserEmail: 'hrsd.owner@arena360.local',
        contactPerson: 'محمد الغامدي',
        website: 'https://demo.gov.sa/hrsd',
        projectName: 'تدقيق إمكانية الوصول لمنصة قوى',
        platformLabel: 'منصة قوى',
        sector: 'الموارد البشرية',
        projectHealth: ProjectHealth.CRITICAL,
        progress: 41,
        contractAmount: 141000,
        outcomes: ['PASS', 'PASS', 'PASS', 'PARTIAL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'],
    },
    {
        clientName: 'وزارة الشؤون البلدية والقروية والإسكان',
        clientUserName: 'لمى السبيعي',
        clientUserEmail: 'housing.owner@arena360.local',
        contactPerson: 'لمى السبيعي',
        website: 'https://demo.gov.sa/momrah',
        projectName: 'تدقيق إمكانية الوصول لمنصة بلدي',
        platformLabel: 'منصة بلدي',
        sector: 'الإسكان والبلديات',
        projectHealth: ProjectHealth.CRITICAL,
        progress: 28,
        contractAmount: 138500,
        outcomes: ['PASS', 'PASS', 'FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'],
    },
];

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildAuditEntry(pack: DemoClientPack, outcome: AuditOutcome, checkIndex: number) {
    const check = DEMO_CHECKS[checkIndex];
    const issueTitle =
        outcome === 'PASS'
            ? `${check.title} - متوافق`
            : outcome === 'PARTIAL'
                ? `${check.title} - متوافق جزئيًا`
                : `${check.title} - بحاجة إلى معالجة`;

    const issueDescription =
        outcome === 'PASS'
            ? `تمت مراجعة ${check.serviceName} ضمن ${pack.platformLabel}، وتبين أن ${check.successDescription}`
            : outcome === 'PARTIAL'
                ? `أظهر الاختبار أن ${check.issueDescription} وقد تم رصد التزام جزئي فقط في المتطلبات الحالية.`
                : `أظهر الاختبار أن ${check.issueDescription}`;

    const recommendation =
        outcome === 'PASS'
            ? 'الاستمرار على النهج الحالي مع إعادة التحقق بعد أي تحديثات تصميمية أو تقنية لاحقة.'
            : check.recommendation;

    return {
        serviceName: check.serviceName,
        issueTitle,
        issueDescription,
        severity:
            outcome === 'FAIL'
                ? check.failSeverity
                : outcome === 'PARTIAL'
                    ? check.partialSeverity
                    : null,
        category: check.category,
        subcategory: check.subcategory,
        pageUrl: `${pack.website}${check.pagePath}`,
        recommendation,
        status:
            outcome === 'PASS'
                ? ProjectReportEntryStatus.VERIFIED
                : ProjectReportEntryStatus.OPEN,
        rowDataJson: {
            auditOutcome: outcome,
            demoMarker: DEMO_SEED_MARKER,
            language: 'ar',
        },
    };
}

async function ensureCanonicalAccessibilityTemplate(orgId: string, createdById: string) {
    const template = await prisma.reportBuilderTemplate.upsert({
        where: { orgId_code: { orgId, code: 'accessibility-audit' } },
        create: {
            orgId,
            name: 'قالب تدقيق إمكانية الوصول',
            code: 'accessibility-audit',
            description: 'القالب الافتراضي لتقارير تدقيق إمكانية الوصول باللغة العربية لبيانات العرض التوضيحي.',
            category: ReportBuilderTemplateCategory.ACCESSIBILITY,
            status: ReportBuilderTemplateStatus.ACTIVE,
            createdById,
        },
        update: {
            name: 'قالب تدقيق إمكانية الوصول',
            description: 'القالب الافتراضي لتقارير تدقيق إمكانية الوصول باللغة العربية لبيانات العرض التوضيحي.',
            category: ReportBuilderTemplateCategory.ACCESSIBILITY,
            status: ReportBuilderTemplateStatus.ACTIVE,
        },
    });

    let version = await prisma.reportBuilderTemplateVersion.findFirst({
        where: { templateId: template.id, isPublished: true },
        orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
        version = await prisma.reportBuilderTemplateVersion.create({
            data: {
                templateId: template.id,
                versionNumber: 1,
                isPublished: true,
                publishedById: createdById,
                publishedAt: new Date(),
                schemaJson: {
                    entryFields: [
                        { key: 'service_name', label: 'اسم الجزء المختبر', type: 'text', required: true },
                        { key: 'issue_title', label: 'عنوان نتيجة التدقيق', type: 'text', required: true },
                        { key: 'issue_description', label: 'وصف النتيجة', type: 'textarea', required: true },
                        { key: 'severity', label: 'الخطورة', type: 'select', options: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: false },
                        { key: 'category', label: 'الفئة', type: 'select', required: false },
                        { key: 'subcategory', label: 'الفئة الفرعية', type: 'text', required: false },
                        { key: 'page_url', label: 'رابط الصفحة', type: 'url', required: false },
                        { key: 'recommendation', label: 'التوصية', type: 'textarea', required: false },
                    ],
                },
                pdfConfigJson: {
                    orientation: 'landscape',
                    locale: 'ar-SA',
                    direction: 'rtl',
                    showCoverPage: true,
                    showClosingPage: true,
                },
                aiConfigJson: {
                    languageMode: 'arabic_first',
                    introductionTone: 'formal',
                    recommendationTone: 'executive',
                },
                taxonomyJson: {
                    accessibilityCategories: DEMO_CHECKS.map((check) => ({
                        value: check.category,
                        label: check.category,
                    })),
                },
            },
        });
    }

    return { template, version };
}

async function ensureDemoProjectFile(orgId: string, projectId: string, uploaderId: string, filename: string, body: string) {
    const existing = await prisma.fileAsset.findFirst({
        where: {
            orgId,
            projectId,
            scopeType: FileScopeType.PROJECT,
            filename,
            deletedAt: null,
        },
    });

    if (existing) {
        return existing;
    }

    const storageKey = `${orgId}/project/${projectId}/docs/${filename}`;
    await ensureLocalSeedFile(storageKey, body);

    return prisma.fileAsset.create({
        data: {
            orgId,
            scopeType: FileScopeType.PROJECT,
            projectId,
            uploaderId,
            category: FileCategory.DOCS,
            visibility: FileVisibility.CLIENT,
            filename,
            mimeType: 'text/plain',
            sizeBytes: Buffer.byteLength(body, 'utf8'),
            storageKey,
        },
    });
}

async function seedArabicAccessibilityDemoPack(orgId: string, users: Record<string, any>) {
    const superAdmin = users[GlobalRole.SUPER_ADMIN];
    const qaUser = users[GlobalRole.QA];
    const devUser = users[GlobalRole.DEV];
    const pmUser = users[GlobalRole.PM];
    const opsUser = users[GlobalRole.OPS];
    const financeUser = users[GlobalRole.FINANCE];

    const { template, version } = await ensureCanonicalAccessibilityTemplate(orgId, superAdmin.id);
    const demoPasswordHash = await bcrypt.hash(DEFAULT_TEAM_PASSWORD, 10);

    for (const [index, pack] of DEMO_CLIENT_PACKS.entries()) {
        const clientOwner = await prisma.user.upsert({
            where: { email: pack.clientUserEmail },
            create: {
                email: pack.clientUserEmail,
                name: pack.clientUserName,
                role: GlobalRole.CLIENT_OWNER,
                passwordHash: demoPasswordHash,
                orgId,
            },
            update: {
                name: pack.clientUserName,
                role: GlobalRole.CLIENT_OWNER,
                orgId,
            },
        });

        let client = await prisma.client.findFirst({
            where: { orgId, name: pack.clientName, deletedAt: null },
        });

        if (!client) {
            client = await prisma.client.create({
                data: {
                    orgId,
                    name: pack.clientName,
                    status: ClientStatus.ACTIVE,
                    industry: `جهة حكومية - ${pack.sector}`,
                    contactPerson: pack.contactPerson,
                    email: pack.clientUserEmail,
                    website: pack.website,
                    address: 'الرياض، المملكة العربية السعودية',
                    notes: `${DEMO_SEED_MARKER} بيانات عرض توضيحي لمشروع تدقيق إمكانية الوصول.`,
                    lastActivity: addDays(DEMO_BASE_DATE, -index),
                },
            });
        } else {
            client = await prisma.client.update({
                where: { id: client.id },
                data: {
                    status: ClientStatus.ACTIVE,
                    industry: `جهة حكومية - ${pack.sector}`,
                    contactPerson: pack.contactPerson,
                    email: pack.clientUserEmail,
                    website: pack.website,
                    address: 'الرياض، المملكة العربية السعودية',
                    notes: `${DEMO_SEED_MARKER} بيانات عرض توضيحي لمشروع تدقيق إمكانية الوصول.`,
                    lastActivity: addDays(DEMO_BASE_DATE, -index),
                },
            });
        }

        await prisma.clientMember.upsert({
            where: { clientId_userId: { clientId: client.id, userId: clientOwner.id } },
            create: {
                clientId: client.id,
                userId: clientOwner.id,
                role: GlobalRole.CLIENT_OWNER,
            },
            update: {
                role: GlobalRole.CLIENT_OWNER,
            },
        });

        const existingAssignment = await prisma.clientReportTemplateAssignment.findFirst({
            where: {
                orgId,
                clientId: client.id,
                templateId: template.id,
                templateVersionId: version.id,
            },
        });

        if (!existingAssignment) {
            await prisma.clientReportTemplateAssignment.create({
                data: {
                    id: `${client.id}-${version.id}`,
                    orgId,
                    clientId: client.id,
                    templateId: template.id,
                    templateVersionId: version.id,
                    isDefault: true,
                    isActive: true,
                    assignedById: superAdmin.id,
                },
            });
        } else {
            await prisma.clientReportTemplateAssignment.update({
                where: { id: existingAssignment.id },
                data: { isDefault: true, isActive: true, assignedById: superAdmin.id },
            });
        }

        let project = await prisma.project.findFirst({
            where: {
                orgId,
                clientId: client.id,
                name: pack.projectName,
                deletedAt: null,
            },
        });

        if (!project) {
            project = await prisma.project.create({
                data: {
                    orgId,
                    clientId: client.id,
                    name: pack.projectName,
                    status: ProjectStatus.IN_PROGRESS,
                    health: pack.projectHealth,
                    progress: pack.progress,
                    description: `${DEMO_SEED_MARKER} مشروع تدقيق إمكانية الوصول لمنصة ${pack.platformLabel} مع بيانات عربية مخصصة للعرض التنفيذي.`,
                    startDate: addDays(DEMO_BASE_DATE, -(30 + index * 3)),
                    endDate: addDays(DEMO_BASE_DATE, 30 + index * 4),
                    budget: pack.contractAmount,
                    tags: ['demo-seed', 'accessibility-audit', 'arabic', 'government'],
                },
            });
        } else {
            project = await prisma.project.update({
                where: { id: project.id },
                data: {
                    status: ProjectStatus.IN_PROGRESS,
                    health: pack.projectHealth,
                    progress: pack.progress,
                    description: `${DEMO_SEED_MARKER} مشروع تدقيق إمكانية الوصول لمنصة ${pack.platformLabel} مع بيانات عربية مخصصة للعرض التنفيذي.`,
                    startDate: addDays(DEMO_BASE_DATE, -(30 + index * 3)),
                    endDate: addDays(DEMO_BASE_DATE, 30 + index * 4),
                    budget: pack.contractAmount,
                    tags: ['demo-seed', 'accessibility-audit', 'arabic', 'government'],
                },
            });
        }

        for (const member of [
            { userId: superAdmin.id, role: GlobalRole.SUPER_ADMIN },
            { userId: pmUser.id, role: GlobalRole.PM },
            { userId: qaUser.id, role: GlobalRole.QA },
            { userId: devUser.id, role: GlobalRole.DEV },
            { userId: opsUser.id, role: GlobalRole.OPS },
            { userId: financeUser.id, role: GlobalRole.FINANCE },
            { userId: clientOwner.id, role: GlobalRole.CLIENT_OWNER },
        ]) {
            await prisma.projectMember.upsert({
                where: { projectId_userId: { projectId: project.id, userId: member.userId } },
                create: {
                    projectId: project.id,
                    userId: member.userId,
                    role: member.role,
                },
                update: {
                    role: member.role,
                },
            });
        }

        const milestoneSeeds = [
            {
                title: 'اعتماد نطاق التدقيق',
                dueDate: addDays(DEMO_BASE_DATE, -(7 - index)),
                status: MilestoneStatus.COMPLETED,
                percentComplete: 100,
                description: 'تمت مواءمة الصفحات ذات الأولوية واعتماد سيناريوهات الاختبار الأساسية.',
                ownerId: pmUser.id,
            },
            {
                title: 'تسليم التقرير الأولي',
                dueDate: addDays(DEMO_BASE_DATE, 3 + index),
                status: MilestoneStatus.IN_PROGRESS,
                percentComplete: Math.min(90, 40 + index * 5),
                description: 'جاري استكمال التقرير الأولي وإرفاق الملاحظات حسب الأولوية.',
                ownerId: qaUser.id,
            },
            {
                title: 'إغلاق الملاحظات الحرجة',
                dueDate: addDays(DEMO_BASE_DATE, 18 + index),
                status: MilestoneStatus.PENDING,
                percentComplete: Math.max(0, 10 - index),
                description: 'خطة لمعالجة الملاحظات الحرجة قبل اعتماد النسخة النهائية.',
                ownerId: devUser.id,
            },
        ];

        for (const milestoneSeed of milestoneSeeds) {
            const existingMilestone = await prisma.milestone.findFirst({
                where: {
                    orgId,
                    projectId: project.id,
                    title: milestoneSeed.title,
                    deletedAt: null,
                },
            });

            if (!existingMilestone) {
                await prisma.milestone.create({
                    data: {
                        orgId,
                        projectId: project.id,
                        title: milestoneSeed.title,
                        dueDate: milestoneSeed.dueDate,
                        status: milestoneSeed.status,
                        percentComplete: milestoneSeed.percentComplete,
                        description: milestoneSeed.description,
                        ownerId: milestoneSeed.ownerId,
                    },
                });
            }
        }

        const taskSeeds = [
            {
                title: 'مراجعة الصفحة الرئيسية وقائمة التنقل',
                description: `تنفيذ فحص يدوي مبدئي للصفحات الأساسية في ${pack.platformLabel}.`,
                status: TaskStatus.DONE,
                priority: TaskPriority.HIGH,
                assigneeId: qaUser.id,
                startDate: addDays(DEMO_BASE_DATE, -(20 + index)),
                dueDate: addDays(DEMO_BASE_DATE, -(14 + index)),
                labels: ['Accessibility', 'Audit'],
            },
            {
                title: 'اختبار النماذج باستخدام قارئ الشاشة',
                description: 'فحص نموذج تسجيل الدخول والنماذج متعددة الخطوات باستخدام NVDA وVoiceOver.',
                status: TaskStatus.IN_PROGRESS,
                priority: TaskPriority.HIGH,
                assigneeId: qaUser.id,
                startDate: addDays(DEMO_BASE_DATE, -(10 + index)),
                dueDate: addDays(DEMO_BASE_DATE, 2 + index),
                labels: ['Screen Reader', 'Forms'],
            },
            {
                title: 'معالجة النصوص البديلة والصور',
                description: 'تحديث النصوص البديلة للعناصر البصرية ذات الأولوية العالية.',
                status: TaskStatus.REVIEW,
                priority: TaskPriority.MEDIUM,
                assigneeId: devUser.id,
                startDate: addDays(DEMO_BASE_DATE, -(8 + index)),
                dueDate: addDays(DEMO_BASE_DATE, 4 + index),
                labels: ['Images', 'Remediation'],
            },
            {
                title: 'مراجعة نتائج التباين اللوني',
                description: 'توثيق نتائج التباين ومقارنتها مع معايير WCAG 2.1 AA.',
                status: TaskStatus.TODO,
                priority: TaskPriority.MEDIUM,
                assigneeId: qaUser.id,
                startDate: addDays(DEMO_BASE_DATE, -(4 + index)),
                dueDate: addDays(DEMO_BASE_DATE, 7 + index),
                labels: ['Contrast'],
            },
            {
                title: 'اعتماد التقرير ونشره للعميل',
                description: 'مراجعة التقرير النهائي وتحديد ما يمكن مشاركته مع العميل.',
                status: TaskStatus.TODO,
                priority: TaskPriority.HIGH,
                assigneeId: pmUser.id,
                startDate: addDays(DEMO_BASE_DATE, 1),
                dueDate: addDays(DEMO_BASE_DATE, 12 + index),
                labels: ['Report', 'Client'],
            },
        ];

        for (const taskSeed of taskSeeds) {
            const existingTask = await prisma.task.findFirst({
                where: {
                    projectId: project.id,
                    title: taskSeed.title,
                    deletedAt: null,
                },
            });

            if (!existingTask) {
                await prisma.task.create({
                    data: {
                        projectId: project.id,
                        title: taskSeed.title,
                        description: taskSeed.description,
                        status: taskSeed.status,
                        priority: taskSeed.priority,
                        assigneeId: taskSeed.assigneeId,
                        startDate: taskSeed.startDate,
                        dueDate: taskSeed.dueDate,
                        labels: taskSeed.labels,
                    },
                });
            }
        }

        const updateSeeds = [
            {
                title: 'بدء جولة التدقيق الأساسية',
                content: `بدأ فريق ضمان الجودة تنفيذ الجولة الأساسية لتدقيق ${pack.platformLabel} مع التركيز على الصفحة الرئيسية، التنقل، والنماذج الحرجة.`,
                visibility: UpdateVisibility.CLIENT,
                authorId: pmUser.id,
                createdAt: addDays(DEMO_BASE_DATE, -(12 + index)),
            },
            {
                title: 'تسليم النتائج الأولية',
                content: `تم توثيق النتائج الأولية الخاصة بـ ${pack.platformLabel}، وتشمل الملاحظات ذات الأولوية العالية والمتوسطة وخطة المعالجة المقترحة.`,
                visibility: UpdateVisibility.CLIENT,
                authorId: qaUser.id,
                createdAt: addDays(DEMO_BASE_DATE, -(2 + index)),
            },
        ];

        for (const updateSeed of updateSeeds) {
            const existingUpdate = await prisma.projectUpdate.findFirst({
                where: {
                    orgId,
                    projectId: project.id,
                    title: updateSeed.title,
                    deletedAt: null,
                },
            });

            if (!existingUpdate) {
                await prisma.projectUpdate.create({
                    data: {
                        orgId,
                        projectId: project.id,
                        authorId: updateSeed.authorId,
                        title: updateSeed.title,
                        content: updateSeed.content,
                        visibility: updateSeed.visibility,
                        createdAt: updateSeed.createdAt,
                    },
                });
            }
        }

        await ensureDemoProjectFile(
            orgId,
            project.id,
            pmUser.id,
            `نطاق_التدقيق_${index + 1}.txt`,
            `${DEMO_SEED_MARKER}\nمشروع: ${pack.projectName}\nالمنصة: ${pack.platformLabel}\nنطاق العمل: تدقيق الصفحة الرئيسية، التنقل، النماذج، المكونات التفاعلية، والتقارير.\n`,
        );

        let contract = await prisma.contract.findFirst({
            where: {
                orgId,
                projectId: project.id,
                title: `عقد تدقيق إمكانية الوصول - ${pack.platformLabel}`,
                deletedAt: null,
            },
        });

        if (!contract) {
            contract = await prisma.contract.create({
                data: {
                    orgId,
                    projectId: project.id,
                    title: `عقد تدقيق إمكانية الوصول - ${pack.platformLabel}`,
                    amount: pack.contractAmount,
                    currency: 'SAR',
                    startDate: addDays(DEMO_BASE_DATE, -(35 + index)),
                    endDate: addDays(DEMO_BASE_DATE, 45 + index),
                    status: ContractStatus.ACTIVE,
                    createdById: superAdmin.id,
                },
            });
        }

        const invoiceSeeds = [
            {
                invoiceNumber: `AR-${String(index + 1).padStart(2, '0')}-001`,
                amount: Math.round(pack.contractAmount * 0.4),
                status: InvoiceStatus.PAID,
                dueDate: addDays(DEMO_BASE_DATE, -(20 + index)),
                issuedAt: addDays(DEMO_BASE_DATE, -(25 + index)),
                paidAt: addDays(DEMO_BASE_DATE, -(16 + index)),
            },
            {
                invoiceNumber: `AR-${String(index + 1).padStart(2, '0')}-002`,
                amount: Math.round(pack.contractAmount * 0.35),
                status: InvoiceStatus.ISSUED,
                dueDate: addDays(DEMO_BASE_DATE, 10 + index),
                issuedAt: addDays(DEMO_BASE_DATE, -(1 + index)),
                paidAt: null,
            },
            {
                invoiceNumber: `AR-${String(index + 1).padStart(2, '0')}-003`,
                amount: Math.round(pack.contractAmount * 0.25),
                status: InvoiceStatus.OVERDUE,
                dueDate: addDays(DEMO_BASE_DATE, -(4 + index)),
                issuedAt: addDays(DEMO_BASE_DATE, -(11 + index)),
                paidAt: null,
            },
        ];

        for (const invoiceSeed of invoiceSeeds) {
            const existingInvoice = await prisma.invoice.findFirst({
                where: { invoiceNumber: invoiceSeed.invoiceNumber, deletedAt: null },
            });

            if (!existingInvoice) {
                await prisma.invoice.create({
                    data: {
                        orgId,
                        projectId: project.id,
                        contractId: contract.id,
                        invoiceNumber: invoiceSeed.invoiceNumber,
                        amount: invoiceSeed.amount,
                        currency: 'SAR',
                        dueDate: invoiceSeed.dueDate,
                        status: invoiceSeed.status,
                        issuedAt: invoiceSeed.issuedAt,
                        paidAt: invoiceSeed.paidAt,
                        createdById: financeUser.id,
                    },
                });
            }
        }

        let projectReport = await prisma.projectReport.findFirst({
            where: {
                orgId,
                projectId: project.id,
                title: `تقرير تدقيق إمكانية الوصول - ${pack.platformLabel}`,
                deletedAt: null,
            },
        });

        if (!projectReport) {
            projectReport = await prisma.projectReport.create({
                data: {
                    orgId,
                    clientId: client.id,
                    projectId: project.id,
                    templateId: template.id,
                    templateVersionId: version.id,
                    title: `تقرير تدقيق إمكانية الوصول - ${pack.platformLabel}`,
                    description: `${DEMO_SEED_MARKER} تقرير تفصيلي لنتائج تدقيق إمكانية الوصول لمنصة ${pack.platformLabel}.`,
                    outputLocale: 'ar',
                    status: ProjectReportStatus.PUBLISHED,
                    visibility: ProjectReportVisibility.CLIENT,
                    performedById: qaUser.id,
                    publishedAt: addDays(DEMO_BASE_DATE, -(1 + index)),
                    summaryJson: {
                        introduction: `يغطي هذا التقرير نتائج تدقيق إمكانية الوصول الخاصة بمنصة ${pack.platformLabel} مع التركيز على أهم الرحلات والخدمات الرقمية المستخدمة من قبل المستفيدين.`,
                        executiveSummary: 'يعرض التقرير مستوى التوافق الحالي، أبرز العوائق، والمجالات التي أظهرت التزامًا جيدًا بمعايير إمكانية الوصول الرقمية.',
                        recommendationsSummary: 'الأولوية الحالية هي معالجة الصور بدون نصوص بديلة، تحسين النماذج، وضبط ترتيب التنقل وعناصر التفاعل.',
                    },
                },
            });
        } else {
            projectReport = await prisma.projectReport.update({
                where: { id: projectReport.id },
                data: {
                    outputLocale: 'ar',
                    status: ProjectReportStatus.PUBLISHED,
                    visibility: ProjectReportVisibility.CLIENT,
                    performedById: qaUser.id,
                    publishedAt: addDays(DEMO_BASE_DATE, -(1 + index)),
                    summaryJson: {
                        introduction: `يغطي هذا التقرير نتائج تدقيق إمكانية الوصول الخاصة بمنصة ${pack.platformLabel} مع التركيز على أهم الرحلات والخدمات الرقمية المستخدمة من قبل المستفيدين.`,
                        executiveSummary: 'يعرض التقرير مستوى التوافق الحالي، أبرز العوائق، والمجالات التي أظهرت التزامًا جيدًا بمعايير إمكانية الوصول الرقمية.',
                        recommendationsSummary: 'الأولوية الحالية هي معالجة الصور بدون نصوص بديلة، تحسين النماذج، وضبط ترتيب التنقل وعناصر التفاعل.',
                    },
                },
            });
        }

        for (const [checkIndex, outcome] of pack.outcomes.entries()) {
            const entrySeed = buildAuditEntry(pack, outcome, checkIndex);
            const existingEntry = await prisma.projectReportEntry.findFirst({
                where: {
                    orgId,
                    projectReportId: projectReport.id,
                    issueTitle: entrySeed.issueTitle,
                    deletedAt: null,
                },
            });

            if (!existingEntry) {
                await prisma.projectReportEntry.create({
                    data: {
                        orgId,
                        projectReportId: projectReport.id,
                        sortOrder: checkIndex,
                        serviceName: entrySeed.serviceName,
                        issueTitle: entrySeed.issueTitle,
                        issueDescription: entrySeed.issueDescription,
                        severity: entrySeed.severity,
                        category: entrySeed.category,
                        subcategory: entrySeed.subcategory,
                        pageUrl: entrySeed.pageUrl,
                        recommendation: entrySeed.recommendation,
                        status: entrySeed.status,
                        rowDataJson: entrySeed.rowDataJson,
                        createdById: qaUser.id,
                        updatedById: qaUser.id,
                    },
                });
            }
        }

        const findingCandidates = pack.outcomes
            .map((outcome, checkIndex) => ({ outcome, checkIndex }))
            .filter((item) => item.outcome === 'FAIL' || item.outcome === 'PARTIAL')
            .slice(0, 3);

        for (const [findingIndex, candidate] of findingCandidates.entries()) {
            const entrySeed = buildAuditEntry(pack, candidate.outcome, candidate.checkIndex);
            const findingTitle = entrySeed.issueTitle.replace(' - بحاجة إلى معالجة', '').replace(' - متوافق جزئيًا', '');
            const existingFinding = await prisma.finding.findFirst({
                where: {
                    orgId,
                    projectId: project.id,
                    title: findingTitle,
                    deletedAt: null,
                },
            });

            if (!existingFinding) {
                await prisma.finding.create({
                    data: {
                        orgId,
                        projectId: project.id,
                        title: findingTitle,
                        description: entrySeed.issueDescription,
                        severity:
                            entrySeed.severity === ProjectReportEntrySeverity.CRITICAL
                                ? FindingSeverity.CRITICAL
                                : entrySeed.severity === ProjectReportEntrySeverity.HIGH
                                    ? FindingSeverity.HIGH
                                    : entrySeed.severity === ProjectReportEntrySeverity.MEDIUM
                                        ? FindingSeverity.MEDIUM
                                        : FindingSeverity.LOW,
                        status: findingIndex === 0 ? FindingStatus.OPEN : findingIndex === 1 ? FindingStatus.IN_PROGRESS : FindingStatus.READY_FOR_TESTING,
                        visibility: FindingVisibility.CLIENT,
                        remediation: entrySeed.recommendation,
                        impact: `يؤثر هذا العائق على استخدام ${pack.platformLabel} من قبل المستفيدين المعتمدين على التقنيات المساندة.`,
                        reportedById: qaUser.id,
                        assignedToId: devUser.id,
                    },
                });
            }
        }

        const discussionSeeds = [
            {
                title: 'اعتماد الصفحات ذات الأولوية في جولة التدقيق',
                body: `نقترح أن تشمل الجولة الحالية الصفحة الرئيسية، تسجيل الدخول، وصفحة تقديم الخدمة في ${pack.platformLabel}. هل هناك صفحات إضافية نحتاج إلى تضمينها قبل إصدار التقرير الأولي؟`,
                replies: [
                    { authorId: clientOwner.id, body: 'يرجى إضافة صفحة الملف الشخصي لأنها من أكثر الصفحات استخدامًا لدى المستفيدين.' },
                    { authorId: qaUser.id, body: 'تمت الإضافة إلى نطاق الجولة الحالية وسنضمّنها في التقرير الأولي.' },
                    { authorId: pmUser.id, body: 'ممتاز، سنبقي نطاق الجولة واضحًا في التحديث القادم للعميل.' },
                ],
            },
            {
                title: 'متابعة معالجة الملاحظات الحرجة',
                body: `تم رصد ملاحظات حرجة مرتبطة بالنصوص البديلة والتنقل بلوحة المفاتيح. نحتاج إلى تأكيد أولوية المعالجة قبل الانتقال إلى إعادة الاختبار.`,
                replies: [
                    { authorId: devUser.id, body: 'بدأنا العمل على النصوص البديلة اليوم، وسيتم إرسال الإصلاحات الأولى غدًا للاختبار.' },
                    { authorId: qaUser.id, body: 'سأعيد الاختبار فور استلام التحديثات وسأحدث التقرير بنفس الجولة.' },
                    { authorId: clientOwner.id, body: 'الأولوية القصوى هي الصفحة الرئيسية ثم نموذج تسجيل الدخول، ونرجو مشاركتنا بأي مخاطر تؤثر على الإطلاق.' },
                ],
            },
        ];

        for (const discussionSeed of discussionSeeds) {
            let discussion = await prisma.discussion.findFirst({
                where: {
                    orgId,
                    projectId: project.id,
                    title: discussionSeed.title,
                },
            });

            if (!discussion) {
                discussion = await prisma.discussion.create({
                    data: {
                        orgId,
                        projectId: project.id,
                        authorId: qaUser.id,
                        title: discussionSeed.title,
                        body: discussionSeed.body,
                        createdAt: addDays(DEMO_BASE_DATE, -(5 + index)),
                    },
                });
            }

            for (const replySeed of discussionSeed.replies) {
                const existingReply = await prisma.discussionReply.findFirst({
                    where: {
                        orgId,
                        discussionId: discussion.id,
                        authorId: replySeed.authorId,
                        body: replySeed.body,
                    },
                });

                if (!existingReply) {
                    await prisma.discussionReply.create({
                        data: {
                            orgId,
                            discussionId: discussion.id,
                            authorId: replySeed.authorId,
                            body: replySeed.body,
                            createdAt: addDays(DEMO_BASE_DATE, -(4 + index)),
                        },
                    });
                }
            }
        }

        const activitySeeds = [
            {
                action: 'project.report.published',
                entityType: 'project_report',
                entityId: projectReport.id,
                description: `تم نشر تقرير إمكانية الوصول الخاص بمنصة ${pack.platformLabel}.`,
                userId: qaUser.id,
                createdAt: addDays(DEMO_BASE_DATE, -(1 + index)),
            },
            {
                action: 'finding.created',
                entityType: 'finding',
                entityId: null,
                description: `تم توثيق ملاحظات إمكانية الوصول ذات الأولوية العالية في ${pack.platformLabel}.`,
                userId: qaUser.id,
                createdAt: addDays(DEMO_BASE_DATE, -(2 + index)),
            },
            {
                action: 'discussion.updated',
                entityType: 'discussion',
                entityId: null,
                description: 'تم تحديث النقاشات الخاصة بخطة المعالجة ومواعيد إعادة الاختبار.',
                userId: pmUser.id,
                createdAt: addDays(DEMO_BASE_DATE, -(3 + index)),
            },
            {
                action: 'task.progressed',
                entityType: 'task',
                entityId: null,
                description: `تقدمت مهام المعالجة والتنفيذ الخاصة بتوصيات التدقيق في ${pack.platformLabel}.`,
                userId: devUser.id,
                createdAt: addDays(DEMO_BASE_DATE, -(4 + index)),
            },
        ];

        for (const activitySeed of activitySeeds) {
            const existingActivity = await prisma.activityFeed.findFirst({
                where: {
                    orgId,
                    projectId: project.id,
                    action: activitySeed.action,
                    description: activitySeed.description,
                },
            });

            if (!existingActivity) {
                await prisma.activityFeed.create({
                    data: {
                        orgId,
                        projectId: project.id,
                        userId: activitySeed.userId,
                        action: activitySeed.action,
                        entityType: activitySeed.entityType,
                        entityId: activitySeed.entityId,
                        description: activitySeed.description,
                        metadata: { demoMarker: DEMO_SEED_MARKER },
                        createdAt: activitySeed.createdAt,
                    },
                });
            }
        }
    }

    console.log('Arabic accessibility demo pack is ready for dashboard and project demos.');
}

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
                            { value: 'Content', label: 'المحتوى النصي' },
                            { value: 'Images', label: 'الصور' },
                            { value: 'Keyboard & Navigation', label: 'عناصر التنقل' },
                        ],
                        accessibilitySubcategories: {
                            Content: [
                                { value: 'Missing or incorrect headings structure (H1-H6)', label: 'قارئ الشاشة' },
                                { value: 'Incorrect language declaration', label: 'لغة المحتوى' },
                            ],
                            Images: [
                                { value: 'Missing alt text', label: 'النص البديل' },
                            ],
                            'Keyboard & Navigation': [
                                { value: 'Incorrect tab order', label: 'ترتيب التنقل' },
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
                        category: 'Content',
                        subcategory: 'Missing or incorrect headings structure (H1-H6)',
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
                        category: 'Images',
                        subcategory: 'Missing alt text',
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
                        category: 'Keyboard & Navigation',
                        subcategory: 'Incorrect tab order',
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

    await seedArabicAccessibilityDemoPack(org.id, users);

    console.log('Seeded login credentials:');
    console.log(`  Super Admin: admin@arena360.local / ${SUPER_ADMIN_PASSWORD}`);
    console.log(`  Developer: dev@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Finance: finance@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Project Manager: pm@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  QA: qa@arena.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Client Owner: client@acme.com / ${DEFAULT_TEAM_PASSWORD}`);
    console.log(`  Demo Client Owner: hbinsaleh@gmail.com / ${DEFAULT_TEAM_PASSWORD}`);
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
