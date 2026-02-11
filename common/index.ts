export const PLUGIN_ID = 'email-brevo';
export const PLUGIN_NAME = 'Brevo Email';

/**
 * Plugin permissions
 */
export const permissions = {
  settings: {
    read: 'settings.read',
    change: 'settings.change',
  },
  render: (permission: string) => `plugin::${PLUGIN_ID}.${permission}`,
};

/**
 * Flatten permissions for RBAC
 */
export const flattenPermissions = Object.values(permissions.settings).map((action) => ({
  action: permissions.render(action),
  subject: null,
}));

/**
 * Email address with optional name
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Plugin settings stored in database
 */
export interface Settings {
  enabled: boolean;
  apiKey: string;
  defaultFrom: string;
  defaultFromName: string;
  defaultReplyTo: string;
}

/**
 * Masked settings returned by the API (never exposes the real API key)
 */
export interface MaskedSettings {
  enabled: boolean;
  apiKey: string;
  defaultFrom: string;
  defaultFromName: string;
  defaultReplyTo: string;
  hasApiKey: boolean;
}

/**
 * Settings form values (same as Settings for this plugin)
 */
export type SettingsForm = Settings;

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  apiKey: '',
  defaultFrom: '',
  defaultFromName: '',
  defaultReplyTo: '',
};

/**
 * Discriminated union for validation results
 */
export type ValidationResult =
  | { valid: true; errors: Record<string, never> }
  | { valid: false; errors: Record<string, string> };

/**
 * Validation for settings
 */
export function validateSettings(settings: Partial<Settings>): ValidationResult {
  const errors: Record<string, string> = {};

  if (settings.enabled) {
    if (!settings.apiKey?.trim()) {
      errors.apiKey = 'API key is required when plugin is enabled';
    }
    if (!settings.defaultFrom?.trim()) {
      errors.defaultFrom = 'Default from email is required when plugin is enabled';
    } else if (!isValidEmail(settings.defaultFrom)) {
      errors.defaultFrom = 'Invalid email format';
    }
    if (settings.defaultReplyTo && !isValidEmail(settings.defaultReplyTo)) {
      errors.defaultReplyTo = 'Invalid email format';
    }
  }

  const valid = Object.keys(errors).length === 0;
  return valid
    ? { valid: true, errors: {} as Record<string, never> }
    : { valid: false, errors };
}

/**
 * Simple email validation
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
