import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ReportBuilderService } from './report-builder.service';

describe('ReportBuilderService', () => {
  const user = {
    id: 'user-1',
    orgId: 'org-1',
    role: 'PM',
    clientMemberships: [],
    projectMemberships: [],
  } as any;

  const prisma = {
    projectReport: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    projectReportEntry: {
      count: jest.fn(),
    },
  } as any;

  const storage = {} as any;
  const config = {
    get: jest.fn(),
  } as any;
  const aiService = {
    generateProjectReportNarratives: jest.fn(),
  } as any;
  const activity = {
    create: jest.fn().mockResolvedValue(undefined),
  } as any;

  let service: ReportBuilderService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((_key: string) => undefined);
    service = new ReportBuilderService(prisma, storage, config, aiService, activity);
  });

  it('lists only published client-visible reports for client users', async () => {
    prisma.projectReport.findMany.mockResolvedValue([]);

    await service.listClientVisibleReports(user);

    expect(prisma.projectReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: 'org-1',
          visibility: 'CLIENT',
          status: 'PUBLISHED',
        }),
      }),
    );
  });

  it('rejects AI summary generation when the report has no entries', async () => {
    jest.spyOn(service as any, 'ensureProjectReportAccess').mockResolvedValue({ id: 'report-1', projectId: 'project-1' });
    prisma.projectReportEntry.count.mockResolvedValue(0);

    await expect(service.generateProjectReportAiSummary('report-1', user)).rejects.toBeInstanceOf(BadRequestException);
    expect(aiService.generateProjectReportNarratives).not.toHaveBeenCalled();
  });

  it('fails export with a deployment-safe error when the configured browser path is missing', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'PUPPETEER_EXECUTABLE_PATH') return 'Z:/missing/chrome.exe';
      return undefined;
    });
    jest.spyOn(service as any, 'buildProjectReportPreviewData').mockResolvedValue({
      report: { title: 'Demo', projectId: 'project-1', visibility: 'CLIENT' },
      entries: [],
    });
    jest.spyOn(service as any, 'renderProjectReportHtml').mockResolvedValue('<html></html>');

    await expect(service.exportProjectReportPdf('report-1', user)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
