"use server"

export interface SummaryResult {
  contentType?: string
  summary: string
  keyPoints: string[]
  actionItems: string[]
  deadlines?: { task: string; person: string; deadline: string; priority?: string }[]
  pendingDecisions?: string[]
  responseTemplate?: string
}

async function generateText(params: {
  model: string
  prompt: string
  temperature: number
  maxTokens: number
  apiKey: string
}): Promise<{ text: string }> {
  const { model, prompt, temperature, maxTokens, apiKey } = params

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("Groq API error:", response.status, errorBody)
    throw new Error(`AI-palvelussa tapahtui virhe. Yritä hetken kuluttua uudelleen.`)
  }

  const data = await response.json()

  if (data.choices && data.choices.length > 0) {
    return { text: data.choices[0].message.content }
  } else {
    throw new Error("AI-palvelu ei palauttanut vastausta")
  }
}

export async function generateSummary(
  content: string,
  template: "auto" | "meeting" | "email" | "project" = "auto",
): Promise<SummaryResult> {
  // Tarkista että sisältö ei ole tyhjä
  if (!content || content.trim().length < 10) {
    throw new Error("Syötä vähintään 10 merkkiä tekstiä")
  }

  const templatePrompts = {
    auto: `Analysoi seuraava sisältö ja tunnista automaattisesti sen tyyppi (sähköposti, kokous, dokumentti tai yleinen teksti).`,
    meeting: `Analysoi seuraava KOKOUSMUISTIO ja keskity erityisesti päätöksiin, toimenpiteisiin ja vastuuhenkilöihin.`,
    email: `Analysoi seuraava SÄHKÖPOSTI ja luo vastausluonnos sekä poimii toimenpiteet.`,
    project: `Analysoi seuraava PROJEKTISUUNNITELMA tai -dokumentti ja keskity aikatauluihin, vastuualueisiin ja virstanpylväisiin.`,
  }

  const basePrompt = templatePrompts[template]

  const prompt = `${basePrompt} Luo sitten JSON-vastaus tiivistelmällä, tärkeimmillä asioilla, toimenpiteillä, deadlineilla ja avoimilla päätöksillä.

SISÄLTÖ:
${content}

Tunnista ja analysoi:
- Sisällön tyyppi (email/meeting/document/general)
- Pääkohdat ja tärkeimmät asiat
- Selkeät TODO-tehtävät
- Vastuuhenkilöt ja deadlinet
- Avoimet päätökset tai epäselvyydet
- Jos sähköposti, luo vastausluonnos

Vastaa VAIN kelvollisella JSON:lla tässä tarkkassa muodossa:
{
  "contentType": "meeting|email|document|general",
  "summary": "Lyhyt tiivistelmä pääsisällöstä ja päätöksistä",
  "keyPoints": [
    "Ensimmäinen tärkeä asia → ratkaisu/päätös",
    "Toinen tärkeä asia → ratkaisu/päätös", 
    "Kolmas tärkeä asia → ratkaisu/päätös"
  ],
  "actionItems": [
    "Henkilö: Tehtävä",
    "Henkilö: Tehtävä",
    "Seuraava kokous/tapaaminen: aika"
  ],
  "deadlines": [
    {"task": "Tehtävän kuvaus", "person": "Vastuuhenkilö", "deadline": "pe 24.1.", "priority": "high|medium|low"},
    {"task": "Toinen tehtävä", "person": "Toinen henkilö", "deadline": "ensi viikko", "priority": "medium"}
  ],
  "pendingDecisions": [
    "Versiopäivitysten tiheydestä ei tehty päätöstä → palataan ensi viikolla",
    "Budjettikysymys jäi auki → Mari selvittää"
  ],
  "responseTemplate": "Vastausluonnos jos sisältö on sähköposti, muuten null"
}`

  // Tarkista API key
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.error("GROQ_API_KEY puuttuu environment variableista")
    throw new Error("AI-palvelu ei ole käytettävissä. Tarkista konfiguraatio.")
  }

  try {
    const { text } = await generateText({
      model: "llama-3.1-8b-instant",
      prompt,
      temperature: 0.1,
      maxTokens: 1500,
      apiKey,
    })

    // Puhdista ja parsoi JSON
    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "")

    const firstBrace = cleanedText.indexOf("{")
    if (firstBrace !== -1) {
      cleanedText = cleanedText.substring(firstBrace)
    }

    const lastBrace = cleanedText.lastIndexOf("}")
    if (lastBrace !== -1) {
      cleanedText = cleanedText.substring(0, lastBrace + 1)
    }

    let parsed: any
    try {
      parsed = JSON.parse(cleanedText)
    } catch (parseError) {
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("AI-vastaus ei ollut kelvollista JSON-muotoa")
      }
    }

    const result: SummaryResult = {
      contentType: parsed.contentType || "general",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Yhteenvedon luominen epäonnistui",
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints
            .filter((item: any) => typeof item === "string" && item.trim())
            .map((item: string) => item.trim())
            .slice(0, 6)
        : ["Tärkeimpien asioiden luominen epäonnistui"],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter((item: any) => typeof item === "string" && item.trim())
            .map((item: string) => item.trim())
            .slice(0, 6)
        : ["Toimenpiteiden luominen epäonnistui"],
      responseTemplate:
        typeof parsed.responseTemplate === "string" && parsed.responseTemplate.trim()
          ? parsed.responseTemplate.trim()
          : undefined,
      deadlines: Array.isArray(parsed.deadlines)
        ? parsed.deadlines
            .filter((item: any) => item && typeof item === "object" && item.task && item.person && item.deadline)
            .map((item: any) => ({
              ...item,
              priority: item.priority || "medium",
            }))
            .slice(0, 5)
        : undefined,
      pendingDecisions: Array.isArray(parsed.pendingDecisions)
        ? parsed.pendingDecisions
            .filter((item: any) => typeof item === "string" && item.trim())
            .map((item: string) => item.trim())
            .slice(0, 4)
        : undefined,
    }

    if (result.keyPoints.length === 0) {
      result.keyPoints = ["Ei tärkeimpiä asioita tunnistettu"]
    }
    if (result.actionItems.length === 0) {
      result.actionItems = ["Ei toimenpiteitä tunnistettu"]
    }

    return result
  } catch (error) {
    console.error("Summary generation failed:", error)

    // Palauta käyttäjäystävällinen virhe
    return {
      summary: "Yhteenvedon luominen epäonnistui. Kokeile lyhentää tekstiä tai yritä uudelleen hetken kuluttua.",
      keyPoints: [
        "Tarkista että teksti on selkeää suomea",
        "Kokeile lyhentää tekstiä",
        "Yritä uudelleen hetken kuluttua",
      ],
      actionItems: ["Muokkaa tekstiä ja yritä uudelleen"],
    }
  }
}
