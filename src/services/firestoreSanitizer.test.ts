import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CVS, SAMPLE_PROFILE } from '../data/sampleData';
import {
  buildFirestoreCVPayload,
  buildFirestoreProfilePayload,
  sanitizeFirestoreId,
} from './firestoreSanitizer';

test('sanitizeFirestoreId strips invalid characters and bounds length to 128', () => {
  assert.equal(sanitizeFirestoreId('cv/123.abc?'), 'cv-123-abc-');
  assert.equal(sanitizeFirestoreId('x'.repeat(200)).length, 128);
});

test('buildFirestoreProfilePayload enforces exact blueprint keys and bounds', () => {
  const oversized = {
    ...structuredClone(SAMPLE_PROFILE),
    summary: 'a'.repeat(7000),
    personal: {
      ...SAMPLE_PROFILE.personal,
      fullName: 'N'.repeat(300),
    },
  };
  const payload = buildFirestoreProfilePayload(oversized, 'uid_123');
  assert.equal(payload.ownerId, 'uid_123');
  assert.equal(payload.summary.length, 5000);
  assert.equal(payload.personal.fullName.length, 140);
  assert.deepEqual(Object.keys(payload).sort(), [
    'careerObjective',
    'certifications',
    'drivingLicence',
    'education',
    'experience',
    'languages',
    'ownerId',
    'personal',
    'projects',
    'references',
    'skills',
    'summary',
    'training',
    'volunteer',
  ]);
});

test('buildFirestoreCVPayload ensures non-empty name, valid id, and exact schema keys', () => {
  const sample = structuredClone(SAMPLE_CVS[0]);
  sample.name = '   ';
  const payload = buildFirestoreCVPayload(sample, 'uid_abc');
  assert.equal(payload.name, 'Untitled CV');
  assert.equal(payload.ownerId, 'uid_abc');
  assert.equal(typeof payload.useObjectiveInsteadOfSummary, 'boolean');
  assert.equal(payload.style.fontSize, sample.style.fontSize);
  assert.deepEqual(Object.keys(payload).sort(), [
    'careerObjective',
    'certifications',
    'drivingLicence',
    'education',
    'experience',
    'id',
    'languages',
    'name',
    'ownerId',
    'personal',
    'projects',
    'references',
    'skills',
    'style',
    'summary',
    'templateId',
    'training',
    'useObjectiveInsteadOfSummary',
    'volunteer',
  ]);
});
