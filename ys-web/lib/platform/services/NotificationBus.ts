export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord'

export interface Notification {
  channel: NotificationChannel | NotificationChannel[]
  subject: string
  body: string
  recipient: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
  moduleId?: string
  metadata?: Record<string, unknown>
}

export interface NotificationProvider {
  channel: NotificationChannel
  send(notification: Notification): Promise<boolean>
  isAvailable(): boolean
}

export interface NotificationResult {
  notification: Notification
  success: boolean
  error?: string
  timestamp: string
}

export class NotificationBus {
  private providersByChannel = new Map<NotificationChannel, NotificationProvider[]>()
  private history: NotificationResult[] = []
  private maxHistory = 200

  registerProvider(provider: NotificationProvider): void {
    const list = this.providersByChannel.get(provider.channel) ?? []
    const existing = list.findIndex(p => p.channel === provider.channel)
    if (existing >= 0) {
      list[existing] = provider
    } else {
      list.push(provider)
    }
    this.providersByChannel.set(provider.channel, list)
  }

  async notify(notification: Notification): Promise<NotificationResult[]> {
    const channels = Array.isArray(notification.channel)
      ? notification.channel
      : [notification.channel]

    const results: NotificationResult[] = []

    for (const channel of channels) {
      const providers = this.providersByChannel.get(channel)
      if (!providers || providers.length === 0) {
        results.push({
          notification,
          success: false,
          error: `No provider registered for channel: ${channel}`,
          timestamp: new Date().toISOString(),
        })
        continue
      }

      for (const provider of providers) {
        try {
          const success = await provider.send(notification)
          results.push({ notification, success, timestamp: new Date().toISOString() })
        } catch (e) {
          results.push({
            notification,
            success: false,
            error: e instanceof Error ? e.message : String(e),
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    this.history.push(...results)
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory)
    }

    return results
  }

  async broadcast(notification: Omit<Notification, 'channel'>): Promise<NotificationResult[]> {
    return this.notify({ ...notification, channel: ['email', 'sms', 'push', 'webhook', 'slack', 'discord'] })
  }

  getProviders(): NotificationProvider[] {
    return Array.from(this.providersByChannel.values()).flat()
  }

  getChannelProviders(channel: NotificationChannel): NotificationProvider[] {
    return [...(this.providersByChannel.get(channel) ?? [])]
  }

  getHistory(): NotificationResult[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }
}
