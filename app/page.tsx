"use client"

import { useState, useEffect } from "react"
import { generateSummary, type SummaryResult } from "./actions/summarize"
import { createCheckoutSession } from "./actions/stripe"
import { getUsageData, incrementUsage, canUseService } from "../utils/usageTracker"

const downloadSummary = (summary: SummaryResult, usageData: any) => {
  if (!usageData.isPremium) return

  const timestamp = new Date().toLocaleString("fi-FI")
  const contentTypeMap = {
    meeting: "Kokousmuistio",
    email: "Sähköposti",
    document: "Dokumentti",
    general: "Yleinen teksti",
  }

  let content = `SUMMARI UNLIMITED - YHTEENVETO\n`
  content += `Luotu: ${timestamp}\n`
  content += `Tyyppi: ${contentTypeMap[summary.contentType as keyof typeof contentTypeMap] || "Tuntematon"}\n`
  content += `${"=".repeat(50)}\n\n`

  content += `TIIVISTELMÄ:\n${summary.summary}\n\n`

  content += `PÄÄKOHDAT:\n`
  summary.keyPoints.forEach((point, i) => {
    content += `${i + 1}. ${point}\n`
  })
  content += `\n`

  content += `TODO-TEHTÄVÄT:\n`
  summary.actionItems.forEach((action, i) => {
    content += `☐ ${action}\n`
  })
  content += `\n`

  if (summary.deadlines && summary.deadlines.length > 0) {
    content += `DEADLINET:\n`
    summary.deadlines.forEach((deadline) => {
      content += `📅 ${deadline.deadline} - ${deadline.task} (${deadline.person})\n`
    })
    content += `\n`
  }

  if (summary.pendingDecisions && summary.pendingDecisions.length > 0) {
    content += `AVOIMET PÄÄTÖKSET:\n`
    summary.pendingDecisions.forEach((decision) => {
      content += `❓ ${decision}\n`
    })
    content += `\n`
  }

  if (summary.responseTemplate) {
    content += `VASTAUSLUONNOS:\n${summary.responseTemplate}\n\n`
  }

  content += `${"=".repeat(50)}\n`
  content += `Luotu Summari Unlimited -palvelulla\n`
  content += `summari.fi\n`

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `summari-yhteenveto-${new Date().toISOString().split("T")[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function HomePage() {
  const [content, setContent] = useState("")
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [usageData, setUsageData] = useState(getUsageData())
  const [showPremiumBanner, setShowPremiumBanner] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<"auto" | "meeting" | "email" | "project">("auto")
  const [liveAnalysis, setLiveAnalysis] = useState({ wordCount: 0, estimatedTime: 0, detectedElements: [] as string[] })

  useEffect(() => {
    setUsageData(getUsageData())
  }, [])

  const scrollToApp = () => {
    const appSection = document.getElementById("app-section")
    if (appSection) {
      appSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      // Fokusoi textarea hetken kuluttua
      setTimeout(() => {
        const textarea = document.querySelector("textarea")
        if (textarea) {
          textarea.focus()
        }
      }, 800)
    }
  }

  const handleSubmit = async () => {
    if (!content?.trim()) return

    const { allowed, remaining } = canUseService()

    if (!allowed && !usageData.isPremium) {
      setShowPremiumBanner(true)
      return
    }

    setIsLoading(true)
    try {
      // Käytä valittua templatea
      const summary = await generateSummary(content, selectedTemplate)
      setResult(summary)

      if (!usageData.isPremium) {
        const newUsageData = incrementUsage()
        setUsageData(newUsageData)
      }
    } catch (error) {
      console.error("Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Tuntematon virhe"
      setResult({
        summary: `Virhe yhteenvedon luomisessa: ${errorMessage}`,
        keyPoints: ["Kokeile lyhentää tekstiä", "Varmista että teksti on selkeää suomea"],
        actionItems: ["Muokkaa tekstiä ja yritä uudelleen"],
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const words = content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
    const estimatedTime = Math.max(3, Math.ceil(words / 100)) // ~100 sanaa sekunnissa

    const detectedElements = []
    if (content.toLowerCase().includes("todo") || content.toLowerCase().includes("tehtävä")) {
      detectedElements.push("TODO-tehtäviä")
    }
    if (content.toLowerCase().includes("deadline") || content.toLowerCase().includes("mennessä")) {
      detectedElements.push("Deadlineja")
    }
    if (content.toLowerCase().includes("päätös") || content.toLowerCase().includes("sovittiin")) {
      detectedElements.push("Päätöksiä")
    }
    if (content.toLowerCase().includes("@") || content.toLowerCase().includes("lähettäjä")) {
      detectedElements.push("Sähköposti")
    }
    if (content.toLowerCase().includes("kokous") || content.toLowerCase().includes("osallistuj")) {
      detectedElements.push("Kokousmuistio")
    }

    setLiveAnalysis({ wordCount: words, estimatedTime, detectedElements })
  }, [content])

  const handlePremiumPurchase = async () => {
    setIsProcessingPayment(true)
    try {
      const { url, error } = await createCheckoutSession()

      if (error) {
        alert(`❌ ${error}`)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      alert("❌ Maksu epäonnistui. Yritä uudelleen.")
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handlePremiumActivated = () => {
    setUsageData(getUsageData())
    setShowPremiumBanner(false)
    setShowPricing(false)
  }

  const { allowed, remaining } = canUseService()

  const exampleText = `Hei, tässä olisi nyt vähän pidempää raporttia meidän viimeviikkoisesta markkinointikokouksesta, jota venytettiin muuten lopulta 1,5 tuntia, koska osalla oli niin paljon kommentoitavaa.

Ensinnäkin puhuttiin siitä, että meidän nykyinen mainoskampanja ei ole tuottanut toivottuja tuloksia, erityisesti LinkedInin kautta tulleet liidit ovat olleet vähäisiä ja niissä konversioaste matala, joten siihen pitäisi ehkä tehdä jotain uudelleen kohdistusta tai ainakin miettiä viestien selkeyttämistä. Samalla nousi esiin, että tiimillä ei ole vielä kunnollista yleisösegmentointia käytössä, mikä osaltaan selittää, miksi viestit eivät ehkä resonoi oikein – tästä pyydettiin Jenniä tekemään alustava suunnitelma seuraavaan kokoukseen mennessä.

Sitten siirryttiin puhumaan somekanavien aktiivisuudesta. On kuulemma paljon hajontaa siinä, kuka milloin julkaisee mitäkin, eikä ole selkeää aikataulua tai linjaa, joten päätettiin kokeilla 2 viikon sisällä uutta julkaisukalenteria, joka jaetaan kaikille Slackissa. Kukaan ei tosin vielä ottanut vastuuta sen laatimisesta, mutta Timo lupasi kysyä Lottaa, ehtisikö hän.

Myös verkkosivujen analytiikka otettiin esille – siellä näkyi piikki viime viikolla, mahdollisesti uuden blogitekstin ansiosta, mutta ei vielä varmaa. Joku ehdotti, että lisätään UTM-tageja kaikkiin linkkeihin, että tiedetään, mistä liikenne tarkalleen tulee. Jatkopäätös: Julia katsoo analytiikan asetukset kuntoon ennen torstaita.

Loppupuolella vielä käytiin läpi ensi kuun webinaarin valmistelua. Ilmoittautumisia on tullut toistaiseksi vähän, vaikka markkinointia on tehty – ehkä kutsut ei ole menneet oikeille ihmisille? Sovittiin, että testataan eri otsikoita A/B-testillä sähköposteissa, ja tämä hoidetaan Mailchimpin kautta.

Viimeinen keskustelu käytiin budjetista. Kaikki toimet näyttäisivät pysyvän raameissa, mutta Mari nosti esiin, että jos halutaan lisää mainosrahaa seuraavaan kampanjaan, niin siitä pitää nyt tehdä esitys talouspuolelle, ja mieluiten jo ennen kuun vaihdetta.

Seuraava kokous on ensi viikon keskiviikkona klo 13:00.`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">Summari</h1>
        <p className="text-xl text-gray-600">Älykkäät yhteenvedot suomeksi</p>
        <div className="mt-8 p-4 bg-green-100 rounded-lg">
          <p className="text-green-800 font-semibold">✅ Sivu toimii!</p>
        </div>
      </div>
    </div>
  )
}
