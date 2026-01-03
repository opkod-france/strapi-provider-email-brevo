/**
 * Brevo Email Provider for Strapi v5
 *
 * Custom provider using Brevo Transactional Email API.
 * Falls back to console logging when BREVO_API_KEY is not configured.
 */
import * as Brevo from "@getbrevo/brevo";

/**
 * Email address with optional name
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Provider configuration options passed from Strapi config
 */
export interface ProviderOptions {
  apiKey?: string;
}

/**
 * Email settings from Strapi configuration
 */
export interface EmailSettings {
  defaultFrom?: string;
  defaultReplyTo?: string;
  defaultSenderName?: string;
}

/**
 * Options passed to the send method
 */
export interface SendOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Email provider instance returned by init
 */
export interface EmailProvider {
  send: (options: SendOptions) => Promise<void>;
}

/**
 * Parse email string to Brevo format
 * Supports: "email@example.com" or "Name <email@example.com>"
 */
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

/**
 * Parse recipients to Brevo format
 */
function parseRecipients(recipients: string | string[]): EmailAddress[] {
  const list = Array.isArray(recipients) ? recipients : [recipients];
  return list.map(parseEmail);
}

/**
 * Initialize the Brevo email provider
 */
function init(
  providerOptions: ProviderOptions = {},
  settings: EmailSettings = {}
): EmailProvider {
  const apiKey = providerOptions.apiKey;

  // Development fallback - log to console when no API key
  if (!apiKey) {
    console.warn(
      "[Brevo] No API key configured - emails will be logged to console"
    );

    return {
      async send(options: SendOptions): Promise<void> {
        console.log("Email would be sent:");
        console.log("-------------------------------------------");
        console.log("From:", options.from || settings.defaultFrom);
        console.log("To:", options.to);
        if (options.cc) console.log("CC:", options.cc);
        if (options.bcc) console.log("BCC:", options.bcc);
        console.log("Subject:", options.subject);
        console.log("-------------------------------------------");
        if (options.text) {
          console.log(
            "Text Preview:",
            options.text.substring(0, 200) +
              (options.text.length > 200 ? "..." : "")
          );
        }
        if (options.html) {
          console.log("HTML Content: [Provided - length:", options.html.length, "chars]");
        }
        console.log("-------------------------------------------");
      },
    };
  }

  // Production mode - use Brevo API
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    apiKey
  );

  return {
    /**
     * Send an email via Brevo Transactional Email API
     */
    async send(options: SendOptions): Promise<void> {
      const sendSmtpEmail = new Brevo.SendSmtpEmail();

      // Required fields
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.to = parseRecipients(options.to);

      // Sender
      const senderEmail = options.from || settings.defaultFrom;
      if (senderEmail) {
        sendSmtpEmail.sender = parseEmail(senderEmail);
        if (settings.defaultSenderName && !sendSmtpEmail.sender.name) {
          sendSmtpEmail.sender.name = settings.defaultSenderName;
        }
      }

      // Content - at least one required
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
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(
          `[Brevo] Email sent successfully. MessageId: ${response.body.messageId}`
        );
      } catch (error) {
        const err = error as {
          message?: string;
          statusCode?: number;
          body?: { code?: string };
        };

        console.error(
          "[Brevo] Failed to send email:",
          err.message || "Unknown error"
        );

        // Map Brevo errors to consistent error codes
        if (err.statusCode === 401) {
          throw new Error("EMAIL_API_UNAUTHORIZED");
        }
        if (err.statusCode === 429) {
          throw new Error("EMAIL_RATE_LIMITED");
        }
        if (err.body?.code === "invalid_parameter") {
          throw new Error("EMAIL_INVALID_RECIPIENT");
        }

        throw new Error("EMAIL_SEND_FAILED");
      }
    },
  };
}

export default {
  init,
};

// Also export init directly for CommonJS compatibility
module.exports = {
  init,
};
