const nodemailer = require('nodemailer');

/**
 * Check whether real email credentials are configured.
 * Returns false if the env vars are still placeholder values.
 */
const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  return (
    user.length > 0 &&
    pass.length > 0 &&
    !user.includes('your_email') &&
    !pass.includes('your_16_char') &&
    user !== 'undefined'
  );
};

/**
 * Creates a nodemailer transporter using environment variables.
 * Uses Gmail SMTP — replace with SendGrid/Mailgun for production.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Don't throw if connection fails — let caller handle it
    connectionTimeout: 5000,
    greetingTimeout: 5000,
  });
};

/**
 * Sends an email verification link to the new user.
 * Silently skips (with a console warning) if email is not configured.
 */
const sendVerificationEmail = async (email, username, token) => {
  if (!isEmailConfigured()) {
    console.warn(
      `⚠️  [Email] Email not configured — skipping verification email to ${email}.\n` +
      `   Set EMAIL_USER and EMAIL_PASS in .env to enable email sending.`
    );
    return; // Silently skip — don't crash registration
  }

  const transporter = createTransporter();
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'MusicNest <noreply@musicnest.com>',
    to: email,
    subject: '🎵 Verify your MusicNest account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121212; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #1DB954; text-align: center;">🎵 MusicNest</h1>
        <h2>Hello, ${username}!</h2>
        <p>Thank you for joining MusicNest. Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: #1DB954; color: #000; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Verify Email
          </a>
        </div>
        <p style="color: #aaa; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
        <p style="color: #555; font-size: 12px;">Or paste this link: ${verifyUrl}</p>
      </div>
    `,
  });
};

/**
 * Sends a password reset link to the user.
 * Silently skips (with a console warning) if email is not configured.
 */
const sendPasswordResetEmail = async (email, username, token) => {
  if (!isEmailConfigured()) {
    console.warn(
      `⚠️  [Email] Email not configured — skipping password reset email to ${email}.\n` +
      `   Set EMAIL_USER and EMAIL_PASS in .env to enable email sending.`
    );
    return; // Silently skip — don't crash the reset flow
  }

  const transporter = createTransporter();
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'MusicNest <noreply@musicnest.com>',
    to: email,
    subject: '🔐 Reset your MusicNest password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #121212; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #1DB954; text-align: center;">🎵 MusicNest</h1>
        <h2>Password Reset Request</h2>
        <p>Hi ${username}, we received a request to reset your password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #1DB954; color: #000; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #aaa; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        <p style="color: #555; font-size: 12px;">Or paste this link: ${resetUrl}</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
