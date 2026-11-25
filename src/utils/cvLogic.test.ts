import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CVS, SAMPLE_PROFILE } from '../data/sampleData';
import {
  cloneProfileToCV,
  createHistory,
  duplicateCV,
  formatDateRange,
  pushHistoryState,
  redoHistoryState,
  renameCV,
  reorderSections,
  runLocalCVDiagnostics,
  switchCVTemplate,
  toggleSectionVisibility,
  undoHistoryState,
} from './cvLogic';
import {
  encodeCVMetadataPayload,
  extractCVMetadataFromPdfBytes,
} from './pdfMetadata';

test('cloneProfileToCV prefills all profile fields into a new CV', () => {
  const cv = cloneProfileToCV(SAMPLE_PROFILE, 'european-cv', 'My EU Application');
  assert.equal(cv.name, 'My EU Application');
  assert.equal(cv.templateId, 'european-cv');
  assert.equal(cv.personal.fullName, SAMPLE_PROFILE.personal.fullName);
  assert.equal(cv.experience.length, SAMPLE_PROFILE.experience.length);
  assert.equal(cv.skills.technical.length, SAMPLE_PROFILE.skills.technical.length);
  assert.equal(cv.drivingLicence.classes, SAMPLE_PROFILE.drivingLicence.classes);
});

test('canadian-resume and ats-friendly default to no-photo', () => {
  const ats = cloneProfileToCV(SAMPLE_PROFILE, 'ats-friendly');
  const can = cloneProfileToCV(SAMPLE_PROFILE, 'canadian-resume');
  assert.equal(ats.style.showPhoto, false);
  assert.equal(can.style.showPhoto, false);
});

test('switchCVTemplate preserves entered CV data and disables photo only if unsupported', () => {
  const initial = cloneProfileToCV(SAMPLE_PROFILE, 'modern-professional', 'Custom Name');
  initial.summary = 'Edited custom summary for test.';
  initial.style.showPhoto = true;

  const switchedToAts = switchCVTemplate(initial, 'ats-friendly');
  assert.equal(switchedToAts.templateId, 'ats-friendly');
  assert.equal(switchedToAts.summary, 'Edited custom summary for test.');
  assert.equal(switchedToAts.personal.fullName, SAMPLE_PROFILE.personal.fullName);
  assert.equal(switchedToAts.style.showPhoto, false);

  const switchedToEuropass = switchCVTemplate(switchedToAts, 'europass-inspired', true);
  assert.equal(switchedToEuropass.templateId, 'europass-inspired');
  assert.equal(switchedToEuropass.summary, 'Edited custom summary for test.');
  assert.equal(switchedToEuropass.style.showPhoto, true);
});

test('duplicateCV and renameCV create independent updated copies', () => {
  const original = SAMPLE_CVS[0];
  const copy = duplicateCV(original);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.name, `${original.name} (Copy)`);

  copy.experience[0].company = 'Modified Co';
  assert.notEqual(original.experience[0].company, 'Modified Co');

  const renamed = renameCV(copy, '  Singapore Foreman CV  ');
  assert.equal(renamed.name, 'Singapore Foreman CV');
});

test('reorderSections and toggleSectionVisibility mutate copies cleanly', () => {
  const order = ['summary', 'experience', 'education'] as const;
  const reordered = reorderSections([...order], 0, 2);
  assert.deepEqual(reordered, ['experience', 'education', 'summary']);

  const hidden1 = toggleSectionVisibility([], 'volunteer');
  assert.deepEqual(hidden1, ['volunteer']);
  const hidden2 = toggleSectionVisibility(hidden1, 'volunteer');
  assert.deepEqual(hidden2, []);
});

test('undo and redo history stack works accurately', () => {
  let h = createHistory('v1');
  h = pushHistoryState(h, 'v2');
  h = pushHistoryState(h, 'v3');
  assert.equal(h.present, 'v3');

  h = undoHistoryState(h);
  assert.equal(h.present, 'v2');
  h = undoHistoryState(h);
  assert.equal(h.present, 'v1');
  h = redoHistoryState(h);
  assert.equal(h.present, 'v2');
  h = pushHistoryState(h, 'v4');
  assert.deepEqual(h.future, []);
});

test('runLocalCVDiagnostics flags missing fields, inverted dates, and repeated lines', () => {
  const cv = cloneProfileToCV(SAMPLE_PROFILE, 'modern-professional');
  const cleanResult = runLocalCVDiagnostics(cv);
  assert.equal(cleanResult.missingInfoWarnings.length, 0);
  assert.equal(cleanResult.dateConsistencyNotes.length, 0);
  assert.ok(cleanResult.estimatedBaselineScore >= 90);

  cv.personal.email = '';
  cv.experience[0].current = false;
  cv.experience[0].startDate = '2024-05';
  cv.experience[0].endDate = '2022-01';
  cv.experience[0].responsibilities = 'Maintained switchgear daily across the tower.\nMaintained switchgear daily across the tower.';

  const flawed = runLocalCVDiagnostics(cv);
  assert.ok(flawed.missingInfoWarnings.some((w) => w.includes('Email')));
  assert.ok(flawed.dateConsistencyNotes.some((n) => n.includes('after end date')));
  assert.ok(flawed.repeatedContent.length > 0);
});

test('formatDateRange formats month-year ranges cleanly', () => {
  assert.equal(formatDateRange('2021-03', '', true), 'Mar 2021 – Present');
  assert.equal(formatDateRange('2018-02', '2021-02', false), 'Feb 2018 – Feb 2021');
});

test('pdfMetadata encodes and extracts CVDocument cleanly from raw PDF bytes', () => {
  const cv = cloneProfileToCV(SAMPLE_PROFILE, 'europass-inspired', 'Arifur EU CV');
  const marker = encodeCVMetadataPayload(cv);
  const simulatedPdfBytes = new TextEncoder().encode(
    `%PDF-1.4\n1 0 obj\n<< /Keywords (${marker}) >>\nendobj\n%%EOF`
  );
  const extracted = extractCVMetadataFromPdfBytes(simulatedPdfBytes);
  assert.ok(extracted);
  assert.equal(extracted.name, 'Arifur EU CV');
  assert.equal(extracted.templateId, 'europass-inspired');
  assert.equal(extracted.personal.fullName, SAMPLE_PROFILE.personal.fullName);
  assert.equal(extracted.experience.length, SAMPLE_PROFILE.experience.length);
});

test('Singapore template library includes construction, marine, driving, hotel, and restaurant roles', async () => {
  const { CV_TEMPLATES, filterTemplates } = await import('../data/templates');
  assert.ok(CV_TEMPLATES.length >= 23);

  const ids = new Set(CV_TEMPLATES.map((t) => t.id));
  for (const requiredId of [
    'construction-worker',
    'marine-shipyard',
    'driver-cv',
    'heavy-driver-logistics',
    'hotel-hospitality',
    'restaurant-fnb',
  ]) {
    assert.ok(ids.has(requiredId as never), `Missing template ${requiredId}`);
  }

  assert.ok(filterTemplates('All', 'welder').some((t) => t.id === 'marine-shipyard'));
  assert.ok(filterTemplates('All', 'chef').some((t) => t.id === 'restaurant-fnb'));
  assert.ok(filterTemplates('All', 'prime mover').some((t) => t.id === 'heavy-driver-logistics'));
  assert.ok(filterTemplates('All', 'housekeeping').some((t) => t.id === 'hotel-hospitality'));
});


