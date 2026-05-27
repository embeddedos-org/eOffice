import { describe, it, expect } from 'vitest';
import { PROVIDER_PRESETS } from '../services/email-service';

describe('Email Service', () => {
  describe('PROVIDER_PRESETS', () => {
    it('has Gmail preset with correct settings', () => {
      expect(PROVIDER_PRESETS.gmail).toBeDefined();
      expect(PROVIDER_PRESETS.gmail.imapHost).toBe('imap.gmail.com');
      expect(PROVIDER_PRESETS.gmail.imapPort).toBe(993);
      expect(PROVIDER_PRESETS.gmail.smtpHost).toBe('smtp.gmail.com');
      expect(PROVIDER_PRESETS.gmail.smtpPort).toBe(587);
      expect(PROVIDER_PRESETS.gmail.useTLS).toBe(true);
    });

    it('has Outlook preset with correct settings', () => {
      expect(PROVIDER_PRESETS.outlook).toBeDefined();
      expect(PROVIDER_PRESETS.outlook.imapHost).toBe('outlook.office365.com');
      expect(PROVIDER_PRESETS.outlook.imapPort).toBe(993);
      expect(PROVIDER_PRESETS.outlook.smtpHost).toBe('smtp.office365.com');
      expect(PROVIDER_PRESETS.outlook.smtpPort).toBe(587);
    });

    it('has Yahoo preset with correct settings', () => {
      expect(PROVIDER_PRESETS.yahoo).toBeDefined();
      expect(PROVIDER_PRESETS.yahoo.imapHost).toBe('imap.mail.yahoo.com');
      expect(PROVIDER_PRESETS.yahoo.smtpHost).toBe('smtp.mail.yahoo.com');
    });

    it('all presets use TLS', () => {
      Object.values(PROVIDER_PRESETS).forEach((preset) => {
        expect(preset.useTLS).toBe(true);
      });
    });

    it('all presets use standard ports', () => {
      Object.values(PROVIDER_PRESETS).forEach((preset) => {
        expect(preset.imapPort).toBe(993);
        expect([587, 465]).toContain(preset.smtpPort);
      });
    });
  });
});
