import { makeCredentials, QA_EMAIL_DOMAIN } from '../src/attendance/M17QaAccountProvisionScreen';

describe('M1.7 QA account provisioning contract', () => {
  test('generates a Supabase-valid synthetic email domain', () => {
    const credentials = makeCredentials();
    expect(credentials.email).toMatch(new RegExp(`^m17-qa-[a-z0-9]+@${QA_EMAIL_DOMAIN.replace('.', '\\.')}$`));
    expect(credentials.email).not.toContain('@example.test');
    expect(credentials.password.length).toBeGreaterThanOrEqual(12);
  });
});
