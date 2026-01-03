# strapi-provider-email-brevo

[![npm version](https://img.shields.io/npm/v/strapi-provider-email-brevo.svg)](https://www.npmjs.com/package/strapi-provider-email-brevo)
[![npm downloads](https://img.shields.io/npm/dm/strapi-provider-email-brevo.svg)](https://www.npmjs.com/package/strapi-provider-email-brevo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Strapi v5](https://img.shields.io/badge/Strapi-v5-blue.svg)](https://strapi.io/)

Brevo (formerly Sendinblue) email provider for **Strapi v5** using the Transactional Email API.

## Features

- **Strapi v5 compatible** - Built for the latest Strapi version
- **Uses Brevo API** - Direct API calls (not SMTP) for faster, more reliable delivery
- **Development fallback** - Logs emails to console when no API key is configured
- **Full email support** - HTML, plain text, CC, BCC, reply-to
- **Error codes** - Returns consistent error codes for easy handling
- **TypeScript friendly** - Works seamlessly in TypeScript projects

## Installation

```bash
# Using npm
npm install strapi-provider-email-brevo @getbrevo/brevo

# Using yarn
yarn add strapi-provider-email-brevo @getbrevo/brevo
```

## Configuration

### 1. Add Environment Variables

Add these to your `.env` file:

```bash
# Required for production (optional in development - falls back to console logging)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Default sender email (must be verified in Brevo)
BREVO_SENDER_EMAIL=noreply@yourdomain.com

# Default sender name
BREVO_SENDER_NAME=Your App Name
```

### 2. Configure the Plugin

Update your `config/plugins.js` or `config/plugins.ts`:

```javascript
// config/plugins.js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'strapi-provider-email-brevo',
      providerOptions: {
        apiKey: env('BREVO_API_KEY'),
      },
      settings: {
        defaultFrom: env('BREVO_SENDER_EMAIL', 'noreply@example.com'),
        defaultReplyTo: env('BREVO_SENDER_EMAIL', 'noreply@example.com'),
        defaultSenderName: env('BREVO_SENDER_NAME', 'My App'),
      },
    },
  },
});
```

**TypeScript version:**

```typescript
// config/plugins.ts
export default ({ env }) => ({
  email: {
    config: {
      provider: 'strapi-provider-email-brevo',
      providerOptions: {
        apiKey: env('BREVO_API_KEY'),
      },
      settings: {
        defaultFrom: env('BREVO_SENDER_EMAIL', 'noreply@example.com'),
        defaultReplyTo: env('BREVO_SENDER_EMAIL', 'noreply@example.com'),
        defaultSenderName: env('BREVO_SENDER_NAME', 'My App'),
      },
    },
  },
});
```

## Usage

### Sending Emails

Use Strapi's email service as usual:

```javascript
await strapi.plugins['email'].services.email.send({
  to: 'recipient@example.com',
  subject: 'Hello from Strapi!',
  text: 'This is a plain text email.',
  html: '<h1>Hello!</h1><p>This is an HTML email.</p>',
});
```

### With CC and BCC

```javascript
await strapi.plugins['email'].services.email.send({
  to: 'recipient@example.com',
  cc: ['cc1@example.com', 'cc2@example.com'],
  bcc: 'bcc@example.com',
  subject: 'Team Update',
  html: '<p>Important update for the team.</p>',
});
```

### Custom Sender

```javascript
await strapi.plugins['email'].services.email.send({
  from: 'Custom Sender <custom@yourdomain.com>',
  to: 'recipient@example.com',
  replyTo: 'replies@yourdomain.com',
  subject: 'Custom sender example',
  text: 'This email has a custom sender.',
});
```

## Development Mode

When `BREVO_API_KEY` is not set, the provider automatically falls back to **console logging**:

```
[Brevo] No API key configured - emails will be logged to console

📧 [DEV MODE] Email would be sent:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: noreply@example.com
To: recipient@example.com
Subject: Test Email
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Text Preview: This is the email content...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This is perfect for local development without needing a Brevo account.

## Getting a Brevo API Key

1. Sign up or log in at [Brevo](https://app.brevo.com)
2. Navigate to **Settings → SMTP & API**
3. Click **"Generate a new API key"**
4. Copy the key (starts with `xkeysib-...`)
5. Add it to your `.env` file

## Error Codes

The provider returns consistent error codes instead of messages:

| Code | Description |
|------|-------------|
| `EMAIL_SEND_FAILED` | General send failure |
| `EMAIL_INVALID_RECIPIENT` | Invalid email address |
| `EMAIL_API_UNAUTHORIZED` | Invalid or missing API key |
| `EMAIL_RATE_LIMITED` | Brevo rate limit exceeded |

Handle errors in your code:

```javascript
try {
  await strapi.plugins['email'].services.email.send({
    to: 'recipient@example.com',
    subject: 'Test',
    text: 'Hello!',
  });
} catch (error) {
  if (error.message === 'EMAIL_RATE_LIMITED') {
    // Wait and retry
  } else if (error.message === 'EMAIL_API_UNAUTHORIZED') {
    // Check API key configuration
  }
}
```

## Why Brevo API vs SMTP?

This provider uses Brevo's **Transactional Email API** instead of SMTP:

- **Faster** - Direct API calls vs SMTP handshakes
- **More reliable** - No connection timeouts or limits
- **Better feedback** - Detailed error responses
- **Feature-rich** - Access to tracking, scheduling, attachments

## Requirements

- **Strapi v5.x**
- **Node.js >= 18**
- Brevo account (free tier available)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

[MIT](./LICENSE)

## Links

- [Brevo (Sendinblue)](https://www.brevo.com/)
- [Brevo API Documentation](https://developers.brevo.com/reference/sendtransacemail)
- [Strapi Email Plugin](https://docs.strapi.io/dev-docs/plugins/email)
- [Strapi v5 Documentation](https://docs.strapi.io/)

---

Made with ❤️ for the Strapi community
