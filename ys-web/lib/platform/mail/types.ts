export interface MailAddress {
  email: string
  name?: string
}

export interface MailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface MailMessage {
  from: MailAddress
  to: MailAddress[]
  subject: string
  html?: string
  text?: string
  template?: string
  templateData?: Record<string, unknown>
  attachments?: MailAttachment[]
  cc?: MailAddress[]
  bcc?: MailAddress[]
  replyTo?: MailAddress
  metadata?: Record<string, unknown>
}

export interface MailDriver {
  send(message: MailMessage): Promise<boolean>
  isAvailable(): boolean
  name(): string
}
