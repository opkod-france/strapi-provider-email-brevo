import type { Core } from '@strapi/strapi';
import * as Brevo from '@getbrevo/brevo';
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

let apiInstance: Brevo.TransactionalEmailsApi | null = null;
let cachedApiKey: string | null = null;

function getApiInstance(apiKey: string): Brevo.TransactionalEmailsApi {
  if (!apiInstance || cachedApiKey !== apiKey) {
    apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    cachedApiKey = apiKey;
  }
  return apiInstance;
}

export function clearApiInstance() {
  apiInstance = null;
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

    const api = getApiInstance(settings.apiKey);
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    // Required fields
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.to = parseRecipients(options.to);

    // Sender
    const senderEmail = options.from || settings.defaultFrom;
    if (senderEmail) {
      sendSmtpEmail.sender = parseEmail(senderEmail);
      if (settings.defaultFromName && !sendSmtpEmail.sender.name) {
        sendSmtpEmail.sender.name = settings.defaultFromName;
      }
    }

    // Content
    if (options.html) {
      sendSmtpEmail.htmlContent = options.html;
    }
    if (options.text) {
      sendSmtpEmail.textContent = options.text;
    }

    // Optional fields
    if (options.replyTo) {
      sendSmtpEmail.replyTo = parseEmail(options.replyTo);
    } else if (settings.defaultReplyTo) {
      sendSmtpEmail.replyTo = parseEmail(settings.defaultReplyTo);
    }

    if (options.cc) {
      sendSmtpEmail.cc = parseRecipients(options.cc);
    }

    if (options.bcc) {
      sendSmtpEmail.bcc = parseRecipients(options.bcc);
    }

    try {
      const response = await api.sendTransacEmail(sendSmtpEmail);
      console.log(`[Brevo] Email sent successfully. MessageId: ${response.body.messageId}`);
    } catch (error) {
      const err = error as {
        message?: string;
        statusCode?: number;
        body?: { code?: string };
      };

      console.error('[Brevo] Failed to send email:', err.message || 'Unknown error');

      if (err.statusCode === 401) {
        throw new Error('EMAIL_API_UNAUTHORIZED');
      }
      if (err.statusCode === 429) {
        throw new Error('EMAIL_RATE_LIMITED');
      }
      if (err.body?.code === 'invalid_parameter') {
        throw new Error('EMAIL_INVALID_RECIPIENT');
      }

      throw new Error('EMAIL_SEND_FAILED');
    }
  }

  return { send };
};

export default emailService;
