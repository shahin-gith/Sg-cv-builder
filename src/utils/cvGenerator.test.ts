import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeneratedCVFromAI,
  resolveSafeAccentColor,
  resolveValidTemplateId,
} from './cvGenerator';

test('resolveValidTemplateId accepts known templates and falls back safely by market', () => {
  assert.equal(resolveValidTemplateId('marine-shipyard', 'singapore'), 'marine-shipyard');
  assert.equal(resolveValidTemplateId('invalid-id', 'europe'), 'europass-inspired');
  assert.equal(resolveValidTemplateId('invalid-id', 'canada'), 'canadian-resume');
  assert.equal(resolveValidTemplateId(undefined, 'auto'), 'modern-professional');
});

test('resolveSafeAccentColor accepts valid hex and rejects invalid values', () => {
  assert.equal(resolveSafeAccentColor('#0E7490', '#1D4ED8'), '#0E7490');
  assert.equal(resolveSafeAccentColor('blue', '#1D4ED8'), '#1D4ED8');
  assert.equal(resolveSafeAccentColor('#12345', '#0F766E'), '#0F766E');
});

test('buildGeneratedCVFromAI builds a customizable CVDocument with valid IDs and photo rules', () => {
  const doc = buildGeneratedCVFromAI(
    {
      cvName: 'Kamrul — Marine Welder',
      recommendedTemplateId: 'marine-shipyard',
      recommendedAccentColor: '#0E7490',
      personal: {
        fullName: 'Kamrul Hasan',
        professionalTitle: 'Marine Welder (6G)',
        phone: '+65 8745 2190',
        email: 'kamrul@example.com',
      },
      summary: 'Experienced 6G marine welder with SSIC safety ticket.',
      experience: [
        {
          company: 'Seatrium',
          jobTitle: 'Marine Welder',
          location: 'Singapore',
          startDate: '2021-03',
          endDate: '',
          current: true,
          responsibilities: 'Performed 6G SMAW and TIG pipe welding.',
          achievements: 'Zero safety incidents across 3 years.',
        },
      ],
      skills: {
        technical: ['6G Pipe Welding', 'TIG Welding', '6G Pipe Welding'],
        soft: ['Teamwork'],
        industry: ['Hot Work Safety'],
      },
      certifications: [
        { name: 'SSIC', issuer: 'MOM', date: '2021-02', credentialId: '' },
      ],
    },
    { includePhoto: true, existingPhotoUrl: 'data:image/jpeg;base64,abc' }
  );

  assert.equal(doc.templateId, 'marine-shipyard');
  assert.equal(doc.style.accentColor, '#0E7490');
  assert.equal(doc.style.showPhoto, true);
  assert.equal(doc.personal.photoUrl, 'data:image/jpeg;base64,abc');
  assert.equal(doc.experience.length, 1);
  assert.ok(doc.experience[0].id.startsWith('exp-'));
  assert.deepEqual(doc.skills.technical, ['6G Pipe Welding', 'TIG Welding']);
  assert.equal(doc.certifications.length, 1);
  assert.ok(doc.style.sectionOrder.length >= 10);

  // Photo-free template like canadian-resume disables photo automatically
  const canadaDoc = buildGeneratedCVFromAI(
    {
      recommendedTemplateId: 'canadian-resume',
      personal: { fullName: 'Test Candidate' },
    },
    { includePhoto: true, existingPhotoUrl: 'data:image/jpeg;base64,abc' }
  );
  assert.equal(canadaDoc.style.showPhoto, false);
  assert.equal(canadaDoc.personal.photoUrl, '');
});
