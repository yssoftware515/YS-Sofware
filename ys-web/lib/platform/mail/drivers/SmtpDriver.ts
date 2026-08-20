import type { MailDriver, MailMessage } from '../types'

export interface SmtpConfig {
  host: string
  port: number
  username?: string
  password?: string
  encryption?: 'tls' | 'ssl' | 'none'
}

export class SmtpDriver implements MailDriver {
  private config: SmtpConfig
  private available = true

  constructor(config: SmtpConfig) {
    this.config = config
  }

  name(): string {
    return 'smtp'
  }

  isAvailable(): boolean {
    return this.available
  }

  setAvailable(state: boolean): void {
    this.available = state
  }

  async send(message: MailMessage): Promise<boolean> {
    if (!this.available) return false
    try {
      const nodemailer = require('nodemailer')
      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.encryption === 'ssl',
        auth: this.config.username && this.config.password
          ? { user: this.config.username, pass: this.config.password }
          : undefined,
      })

      await transporter.sendMail({
        from: `"${message.from.name ?? ''}" <${message.from.email}>`,
        to: message.to.map(a => `"${a.name ?? ''}" <${a.email}>`).join(', '),
        cc: message.cc?.map(a => `"${a.name ?? ''}" <${a.email}>`).join(', '),
        bcc: message.bcc?.map(a => a.email).join(', '),
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
        replyTo: message.replyTo ? `"${message.replyTo.name ?? ''}" <${message.replyTo.email}>` : undefined,
      })

      return true
    } catch {
      this.available = false
      return false
    }
  }
}
