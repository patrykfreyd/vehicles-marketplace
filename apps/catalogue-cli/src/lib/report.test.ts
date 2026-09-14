import { describe, expect, it } from 'vitest';
import {
  averageCompleteness,
  formatMakeReport,
  sortByIncompletenessDescending,
  summarizeModelStatus,
  type MakeReport,
} from './report';

describe('summarizeModelStatus', () => {
  it('is Complete when every derivative is 100% with no open issue', () => {
    expect(
      summarizeModelStatus([
        { completenessScore: 100, hasOpenIssue: false },
        { completenessScore: 100, hasOpenIssue: false },
      ]),
    ).toBe('Complete');
  });

  it('is Warning when any derivative has an open issue, even at 100%', () => {
    expect(summarizeModelStatus([{ completenessScore: 100, hasOpenIssue: true }])).toBe('Warning');
  });

  it('is In Progress when incomplete but no open issue', () => {
    expect(summarizeModelStatus([{ completenessScore: 70, hasOpenIssue: false }])).toBe(
      'In Progress',
    );
  });

  it('is In Progress for a model with no derivatives yet', () => {
    expect(summarizeModelStatus([])).toBe('In Progress');
  });
});

describe('averageCompleteness', () => {
  it('rounds the mean completeness score', () => {
    expect(
      averageCompleteness([
        { completenessScore: 100, hasOpenIssue: false },
        { completenessScore: 70, hasOpenIssue: false },
        { completenessScore: 90, hasOpenIssue: false },
      ]),
    ).toBe(87);
  });

  it('returns 0 for no derivatives', () => {
    expect(averageCompleteness([])).toBe(0);
  });
});

describe('formatMakeReport', () => {
  it('formats a tree matching the idea doc §32 shape', () => {
    const report: MakeReport = {
      id: 'bmw',
      name: 'BMW',
      averageCompleteness: 92,
      models: [
        { name: '1 Series', status: 'Complete', averageCompleteness: 100, derivativeCount: 4 },
        { name: '5 Series', status: 'In Progress', averageCompleteness: 80, derivativeCount: 6 },
      ],
    };
    expect(formatMakeReport(report)).toBe(
      ['BMW 92%', '  1 Series  Complete (100%)', '  5 Series  In Progress (80%)'].join('\n'),
    );
  });
});

describe('sortByIncompletenessDescending', () => {
  it('orders the least-complete make first', () => {
    const reports: MakeReport[] = [
      { id: 'bmw', name: 'BMW', averageCompleteness: 92, models: [] },
      { id: 'audi', name: 'Audi', averageCompleteness: 40, models: [] },
      { id: 'kia', name: 'Kia', averageCompleteness: 70, models: [] },
    ];
    expect(sortByIncompletenessDescending(reports).map((r) => r.id)).toEqual([
      'audi',
      'kia',
      'bmw',
    ]);
  });
});
