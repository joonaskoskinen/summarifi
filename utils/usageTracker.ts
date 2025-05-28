const STORAGE_KEY = "summari_usage"
// Kovakoodattu premium-koodi (tuotannossa tämä tulisi API:sta)
const PREMIUM_CODE = "koskelo123"

export interface UsageData {
  count: number
  lastReset: string
  isPremium: boolean
  customerId?: string
  activatedAt?: string
}

export function getUsageData(): UsageData {
  if (typeof window === "undefined") {
    return { count: 0, lastReset: new Date().toDateString(), isPremium: false }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const newData = { count: 0, lastReset: new Date().toDateString(), isPremium: false }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
    return newData
  }

  try {
    const data: UsageData = JSON.parse(stored)

    // Validoi data structure
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid data structure")
    }

    // Varmista että kaikki kentät ovat olemassa
    const validatedData: UsageData = {
      count: typeof data.count === "number" ? data.count : 0,
      lastReset: typeof data.lastReset === "string" ? data.lastReset : new Date().toDateString(),
      isPremium: typeof data.isPremium === "boolean" ? data.isPremium : false,
      customerId: typeof data.customerId === "string" ? data.customerId : undefined,
      activatedAt: typeof data.activatedAt === "string" ? data.activatedAt : undefined,
    }

    // Reset count daily (mutta EI premium-statusta!)
    const today = new Date().toDateString()
    if (validatedData.lastReset !== today) {
      validatedData.count = 0
      validatedData.lastReset = today
      // Säilytetään premium-status ja customerId
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedData))
    }

    return validatedData
  } catch (error) {
    console.warn("Korruptoitunut localStorage data, luodaan uusi:", error)
    const newData: UsageData = { count: 0, lastReset: new Date().toDateString(), isPremium: false }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
    return newData
  }
}

export function incrementUsage(): UsageData {
  const data = getUsageData()
  data.count += 1
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

export function activatePremium(code: string): boolean {
  if (code.toLowerCase() === PREMIUM_CODE.toLowerCase()) {
    const data = getUsageData()
    data.isPremium = true
    data.activatedAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  }
  return false
}

export function activatePremiumWithCustomer(customerId: string): void {
  const data = getUsageData()
  data.isPremium = true
  data.customerId = customerId
  data.activatedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function canUseService(): { allowed: boolean; remaining: number } {
  const data = getUsageData()
  if (data.isPremium) {
    return { allowed: true, remaining: -1 } // Unlimited
  }

  const remaining = Math.max(0, 3 - data.count)
  return { allowed: remaining > 0, remaining }
}

export function resetUsageForTesting(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
    console.log("Usage data resetoitu testausta varten")
  }
}

export function isPremiumActive(): boolean {
  const data = getUsageData()
  return data.isPremium === true
}
