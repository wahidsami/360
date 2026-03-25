import 'reflect-metadata';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { ProjectReportsController } from './project-reports.controller';

describe('ProjectReportsController permissions', () => {
  const controller = new ProjectReportsController({} as any);

  it('requires client report permission for published client listing', () => {
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, controller.listClientVisibleReports);
    expect(permissions).toEqual(['VIEW_CLIENT_REPORTS']);
  });

  it('requires export permission for AI summary generation', () => {
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, controller.generateProjectReportAiSummary);
    expect(permissions).toEqual(['GENERATE_PROJECT_REPORT_EXPORTS']);
  });

  it('requires entry edit permission for media upload', () => {
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, controller.uploadProjectReportEntryMedia);
    expect(permissions).toEqual(['EDIT_PROJECT_REPORT_ENTRIES']);
  });
});
