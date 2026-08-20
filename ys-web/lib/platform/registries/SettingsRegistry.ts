export interface SettingsSection {
  id: string
  moduleId: string
  labelEn: string
  labelAr: string
  order: number
  keys: string[]
}

export class SettingsRegistry {
  private sections: SettingsSection[] = []

  registerSection(section: SettingsSection): void {
    const existing = this.sections.findIndex(s => s.id === section.id)
    if (existing >= 0) {
      this.sections[existing] = section
      return
    }
    this.sections.push(section)
    this.sections.sort((a, b) => a.order - b.order)
  }

  getSections(): SettingsSection[] {
    return [...this.sections]
  }

  clear(): void {
    this.sections = []
  }
}
