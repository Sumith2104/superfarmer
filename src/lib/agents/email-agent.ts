// src/lib/agents/email-agent.ts
// EmailAgent — handles automated email communication via SMTP (nodemailer)

import nodemailer from 'nodemailer';
import type { AgentResult } from './types';

export interface EmailData {
  to: string;
  subject: string;
  sentAt: string;
}

export async function runEmailAgent(
  to: string,
  subject: string,
  html: string
): Promise<AgentResult<EmailData>> {
  const trace: string[] = [`Step 1: Preparing to send email to ${to}...`];

  if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_PASSWORD) {
    trace.push('Step 1 ✗: SMTP credentials missing in environment.');
    return { success: false, error: 'SMTP credentials not configured', trace };
  }

  try {
    trace.push('Step 2: Initializing SMTP transporter (Gmail)...');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    trace.push('Step 3: Sending email...');
    await transporter.sendMail({
      from: `"SuperFarmer" <${process.env.EMAIL_ADDRESS}>`,
      to,
      subject,
      html,
    });

    trace.push(`Step 3 ✓: Email successfully sent to ${to}`);
    return {
      success: true,
      data: { to, subject, sentAt: new Date().toISOString() },
      trace,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email failed';
    trace.push(`Step 2/3 ✗: ${msg}`);
    return { success: false, error: msg, trace };
  }
}
