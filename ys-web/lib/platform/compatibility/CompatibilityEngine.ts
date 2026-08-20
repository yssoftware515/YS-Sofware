export type CompatibilityStatus = 'supported' | 'deprecated' | 'breaking' | 'unknown'

export interface CompatibilityCheck {
  component: string
  currentVersion: string
  targetVersion: string
  status: CompatibilityStatus
  message: string
}

export interface CompatibilityMatrix {
  platform: CompatibilityCheck[]
  sdk: CompatibilityCheck[]
  drivers: CompatibilityCheck[]
  modules: CompatibilityCheck[]
}

export class CompatibilityEngine {
  checkPlatform(current: string, target: string): CompatibilityCheck {
    const curr = this.parseVersion(current)
    const tgt = this.parseVersion(target)
    if (!curr || !tgt) return { component: 'Platform', currentVersion: current, targetVersion: target, status: 'unknown', message: 'Unable to parse version' }

    if (curr.major === tgt.major && curr.minor >= tgt.minor) {
      return { component: 'Platform', currentVersion: current, targetVersion: target, status: 'supported', message: 'Fully compatible' }
    }
    if (curr.major === tgt.major) {
      return { component: 'Platform', currentVersion: current, targetVersion: target, status: 'supported', message: 'Minor version difference — should be compatible' }
    }
    if (curr.major > tgt.major) {
      return { component: 'Platform', currentVersion: current, targetVersion: target, status: 'deprecated', message: 'Major version ahead — current may have breaking changes' }
    }
    return { component: 'Platform', currentVersion: current, targetVersion: target, status: 'breaking', message: 'Major version behind — upgrade required' }
  }

  checkSdk(sdkVersion: string, minimumRequired: string): CompatibilityCheck {
    const sdk = this.parseVersion(sdkVersion)
    const min = this.parseVersion(minimumRequired)
    if (!sdk || !min) return { component: 'SDK', currentVersion: sdkVersion, targetVersion: minimumRequired, status: 'unknown', message: 'Unable to parse version' }

    if (sdk.major > min.major || (sdk.major === min.major && sdk.minor >= min.minor)) {
      return { component: 'SDK', currentVersion: sdkVersion, targetVersion: minimumRequired, status: 'supported', message: 'SDK meets minimum requirements' }
    }
    return { component: 'SDK', currentVersion: sdkVersion, targetVersion: minimumRequired, status: 'breaking', message: 'SDK version too low — upgrade required' }
  }

  checkDriver(current: string, target: string, driverName: string): CompatibilityCheck {
    const result = this.checkPlatform(current, target)
    return { ...result, component: `Driver: ${driverName}` }
  }

  generateMatrix(platformVersion: string, sdkVersion: string, minimumSdk: string): CompatibilityMatrix {
    return {
      platform: [this.checkPlatform(platformVersion, '1.0.0')],
      sdk: [this.checkSdk(sdkVersion, minimumSdk)],
      drivers: [],
      modules: [],
    }
  }

  private parseVersion(v: string): { major: number; minor: number; patch: number } | null {
    const parts = v.replace(/^[^\d]+/, '').split('.').map(Number)
    if (parts.length < 2 || parts.some(isNaN)) return null
    return { major: parts[0], minor: parts[1], patch: parts[2] ?? 0 }
  }
}
