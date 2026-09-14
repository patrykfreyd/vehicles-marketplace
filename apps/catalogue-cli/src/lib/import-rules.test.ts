import { describe, expect, it } from 'vitest';
import { buildCompletenessIssues, resolveImportStatus } from './import-rules';

describe('buildCompletenessIssues', () => {
  it('returns one WARNING per missing field', () => {
    const issues = buildCompletenessIssues({
      engineCapacityCc: 1968,
      cylinders: 4,
      configuration: 'INLINE_4',
      aspiration: 'TURBO',
      engineFamily: undefined,
      powerBhp: 148,
      torqueNm: undefined,
      transmissions: ['AUTOMATIC'],
      zeroToSixtyTwoSeconds: undefined,
      topSpeedMph: 130,
    });
    expect(issues).toEqual([
      { severity: 'WARNING', message: 'Missing engineFamily' },
      { severity: 'WARNING', message: 'Missing torqueNm' },
      { severity: 'WARNING', message: 'Missing zeroToSixtyTwoSeconds' },
    ]);
  });

  it('returns no issues for a fully complete record', () => {
    const issues = buildCompletenessIssues({
      engineCapacityCc: 2993,
      cylinders: 6,
      configuration: 'INLINE_6',
      aspiration: 'TWIN_TURBO',
      engineFamily: 'S58',
      powerBhp: 503,
      torqueNm: 650,
      transmissions: ['AUTOMATIC'],
      zeroToSixtyTwoSeconds: 3.5,
      topSpeedMph: 180,
    });
    expect(issues).toEqual([]);
  });
});

describe('resolveImportStatus', () => {
  it('defaults to IMPORTED when the file set no status and there are no issues', () => {
    expect(resolveImportStatus({ rawStatus: undefined, hasIssues: false })).toEqual({
      status: 'IMPORTED',
      rejectedApproval: false,
    });
  });

  it('downgrades an unset status to REVIEW_REQUIRED when there are issues', () => {
    expect(resolveImportStatus({ rawStatus: undefined, hasIssues: true })).toEqual({
      status: 'REVIEW_REQUIRED',
      rejectedApproval: false,
    });
  });

  it('downgrades an explicit AI_DRAFT to REVIEW_REQUIRED when there are issues', () => {
    expect(resolveImportStatus({ rawStatus: 'AI_DRAFT', hasIssues: true })).toEqual({
      status: 'REVIEW_REQUIRED',
      rejectedApproval: false,
    });
  });

  it('keeps an explicit AI_DRAFT when there are no issues', () => {
    expect(resolveImportStatus({ rawStatus: 'AI_DRAFT', hasIssues: false })).toEqual({
      status: 'AI_DRAFT',
      rejectedApproval: false,
    });
  });

  it('does not downgrade an already-advanced SOURCE_CONFIRMED status just for a completeness gap', () => {
    expect(resolveImportStatus({ rawStatus: 'SOURCE_CONFIRMED', hasIssues: true })).toEqual({
      status: 'SOURCE_CONFIRMED',
      rejectedApproval: false,
    });
  });

  it('never grants APPROVED via import, regardless of issues', () => {
    expect(resolveImportStatus({ rawStatus: 'APPROVED', hasIssues: false })).toEqual({
      status: 'REVIEW_REQUIRED',
      rejectedApproval: true,
    });
  });
});
