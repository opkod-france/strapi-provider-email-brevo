import type { Core } from '@strapi/strapi';
import { BrevoClient, Brevo } from '@getbrevo/brevo';
import { PLUGIN_ID, EmailAddress, Settings } from '../../../common';

interface SendOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
}

let clientInstance: BrevoClient | null = null;
let cachedApiKey: string | null = null;

function getClient(apiKey: string): BrevoClient {
  if (!clientInstance || cachedApiKey !== apiKey) {
    clientInstance = new BrevoClient({ apiKey });
    cachedApiKey = apiKey;
  }
  return clientInstance;
}

export function clearApiInstance() {
  clientInstance = null;
  cachedApiKey = null;
}

function parseEmail(email: string): EmailAddress {
  const match = email.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  if (match) {
    return {
      email: match[2].trim(),
      name: match[1]?.trim() || undefined,
    };
  }
  return { email: email.trim() };
}

function parseRecipients(recipients: string | string[]): EmailAddress[] {
  const list = Array.isArray(recipients) ? recipients : [recipients];
  return list.map(parseEmail);
}

const emailService = ({ strapi }: { strapi: Core.Strapi }) => {
  async function getSettings(): Promise<Settings> {
    const settingsService = strapi.plugin(PLUGIN_ID).service('settings');
    return settingsService.getSettings();
  }

  async function send(options: SendOptions): Promise<void> {
    const settings = await getSettings();

    if (!settings.enabled) {
      console.log('[Brevo] Plugin disabled - email logged to console:');
      console.log('-------------------------------------------');
      console.log('From:', options.from || settings.defaultFrom);
      console.log('To:', options.to);
      if (options.cc) console.log('CC:', options.cc);
      if (options.bcc) console.log('BCC:', options.bcc);
      console.log('Subject:', options.subject);
      console.log('-------------------------------------------');
      if (options.text) {
        console.log(
          'Text Preview:',
          options.text.substring(0, 200) + (options.text.length > 200 ? '...' : '')
        );
      }
      if (options.html) {
        console.log('HTML Content: [Provided - length:', options.html.length, 'chars]');
      }
      console.log('-------------------------------------------');
      return;
    }

    if (!settings.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    const client = getClient(settings.apiKey);

    // Build sender
    const senderEmail = options.from || settings.defaultFrom;
    const sender = senderEmail ? parseEmail(senderEmail) : undefined;
    if (sender && settings.defaultFromName && !sender.name) {
      sender.name = settings.defaultFromName;
    }

    // Build replyTo
    const replyTo = options.replyTo
      ? parseEmail(options.replyTo)
      : settings.defaultReplyTo
        ? parseEmail(settings.defaultReplyTo)
        : undefined;

    try {
      const response = await client.transactionalEmails.sendTransacEmail({
        subject: options.subject,
        to: parseRecipients(options.to),
        sender,
        htmlContent: options.html,
        textContent: options.text,
        replyTo,
        cc: options.cc ? parseRecipients(options.cc) : undefined,
        bcc: options.bcc ? parseRecipients(options.bcc) : undefined,
      });
      console.log(`[Brevo] Email sent successfully. MessageId: ${response.messageId}`);
    } catch (error) {
      if (error instanceof Brevo.UnauthorizedError) {
        console.error('[Brevo] Failed to send email: Unauthorized');
        throw new Error('EMAIL_API_UNAUTHORIZED');
      }
      if (error instanceof Brevo.TooManyRequestsError) {
        console.error('[Brevo] Failed to send email: Rate limited');
        throw new Error('EMAIL_RATE_LIMITED');
      }
      if (error instanceof Brevo.BadRequestError) {
        console.error('[Brevo] Failed to send email: Bad request');
        throw new Error('EMAIL_INVALID_RECIPIENT');
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Brevo] Failed to send email:', message);
      throw new Error('EMAIL_SEND_FAILED');
    }
  }

  return { send };
};

export default emailService;
