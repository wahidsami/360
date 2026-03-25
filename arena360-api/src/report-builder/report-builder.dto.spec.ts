import { validate } from 'class-validator';
import { CreateProjectReportEntryDto } from './dto/report-builder.dto';

describe('Report Builder DTO validation', () => {
  it('accepts a valid report entry payload', async () => {
    const dto = Object.assign(new CreateProjectReportEntryDto(), {
      issueTitle: 'قارئ الشاشة لا يصف الزر',
      issueDescription: 'النص البديل غير واضح داخل النموذج.',
      pageUrl: 'https://example.com/login',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid page URL', async () => {
    const dto = Object.assign(new CreateProjectReportEntryDto(), {
      issueTitle: 'Invalid URL check',
      issueDescription: 'Entry should fail validation.',
      pageUrl: 'bad url',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'pageUrl')).toBe(true);
  });
});
