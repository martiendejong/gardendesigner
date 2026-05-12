import nodemailer from 'nodemailer';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function createTransport() {
  // Configure via .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  // For local dev without SMTP set, falls back to Ethereal (catches emails, no real delivery)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Dev fallback: log to console instead
  return null;
}

const FROM = process.env.SMTP_FROM || 'Garden Designer <noreply@gardendesigner.local>';

export async function sendPasswordSetupEmail(email: string, firstname: string, token: string): Promise<void> {
  const link = `${APP_URL}?token=${token}`;
  const subject = 'Set up your Garden Designer account';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1a12;color:#c8d8c0;padding:32px;border-radius:12px">
      <div style="margin-bottom:24px">
        <span style="font-size:22px;font-weight:700;color:#7ab648">Garden Designer</span>
      </div>
      <p style="font-size:16px;margin-bottom:8px">Hi <strong>${firstname}</strong>,</p>
      <p style="font-size:14px;color:#94a894;line-height:1.6;margin-bottom:24px">
        Your account has been created. Click the button below to set your password and get started.
        This link expires in <strong>24 hours</strong>.
      </p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7ab648,#5a9a30);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px">
        Set Your Password
      </a>
      <p style="font-size:12px;color:#5a6b5e;margin-top:24px">
        Or copy this link: <a href="${link}" style="color:#7ab648">${link}</a>
      </p>
    </div>
  `;

  await deliver(email, subject, html, link, 'Setup link');
}

export async function sendPasswordResetEmail(email: string, firstname: string, token: string): Promise<void> {
  const link = `${APP_URL}?token=${token}`;
  const subject = 'Reset your Garden Designer password';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1a12;color:#c8d8c0;padding:32px;border-radius:12px">
      <div style="margin-bottom:24px">
        <span style="font-size:22px;font-weight:700;color:#7ab648">Garden Designer</span>
      </div>
      <p style="font-size:16px;margin-bottom:8px">Hi <strong>${firstname}</strong>,</p>
      <p style="font-size:14px;color:#94a894;line-height:1.6;margin-bottom:24px">
        We received a request to reset your password. Click the button below.
        This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7ab648,#5a9a30);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px">
        Reset Password
      </a>
      <p style="font-size:12px;color:#5a6b5e;margin-top:24px">
        If you didn't request this, you can ignore this email.
      </p>
      <p style="font-size:12px;color:#5a6b5e">
        Or copy this link: <a href="${link}" style="color:#7ab648">${link}</a>
      </p>
    </div>
  `;

  await deliver(email, subject, html, link, 'Reset link');
}

async function deliver(to: string, subject: string, html: string, link: string, linkLabel: string) {
  const transport = createTransport();
  if (!transport) {
    // Dev mode: print to console so developer can click the link
    console.log(`\n  [EMAIL] To: ${to}`);
    console.log(`  [EMAIL] Subject: ${subject}`);
    console.log(`  [EMAIL] ${linkLabel}: ${link}\n`);
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, html });
}
