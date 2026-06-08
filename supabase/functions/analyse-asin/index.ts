import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function extractFromHtml(html: string) {
  const get = (patterns: RegExp[]) => {
    for (const p of patterns) {
      const m = html.match(p)
      if (m?.[1]) return m[1].replace(/<[^>]*>/g, '').trim()
    }
    return ''
  }

  const title = get([
    /id="productTitle"[^>]*>\s*([^<]{10,})\s*</,
    /<h1[^>]*>\s*<span[^>]*>([^<]{10,})<\/span>/,
  ])

  const price = get([
    /class="a-price-whole">([0-9,\s]+)</,
    /id="priceblock_ourprice"[^>]*>([^<]+)</,
    /"price":"([^"]+)"/,
  ])

  const rating = get([
    /([0-9,.]+ sur 5 étoiles)/,
    /([0-9,.]+ out of 5 stars)/,
    /class="a-icon-alt">([0-9,.]+\s*(?:sur|out)[^<]+)</,
  ])

  const reviewCount = get([
    /([0-9\s]+)\s*évaluations/,
    /([0-9,\s]+)\s*ratings/,
    /([0-9,\s]+)\s*avis/,
  ])

  const bsr = get([
    /N°\s*([0-9,\s]+)\s+en/,
    /#\s*([0-9,]+)\s+in/,
    /Best Sellers Rank.*?#([0-9,]+)/s,
  ])

  const bulletRaw = html.match(/<span class="a-list-item">([^<]{25,})<\/span>/g) || []
  const bullets = bulletRaw
    .map(b => b.replace(/<[^>]*>/g, '').trim())
    .filter(b => b.length > 25 && !b.startsWith('Marque') && !b.startsWith('ASIN'))
    .slice(0, 6)

  const imageCount = Math.max(
    (html.match(/altImage/g) || []).length,
    (html.match(/"hiRes":"https/g) || []).length,
    (html.match(/imgTagWrapperId/g) || []).length,
  )

  const hasVideo = html.includes('videoContainer') || html.includes('video-player') || html.includes('VideoBlock')
  const hasAPlus = html.includes('aplus') || html.includes('a-plus') || html.includes('aplus3p')
  const hasFaq = html.includes('askATF') || html.includes('questions-and-answers')
  const brand = get([/class="a-size-base po-break-word">([^<]+)</, /brand.*?"([A-Z][a-z]+[A-Za-z\s]*?)"/])
  const category = get([/nav-subnav.*?data-category="([^"]+)"/, /<li[^>]*>([^<]+)<\/li>\s*<\/ul>\s*<\/div>\s*<\/div>\s*<div.*?productTitle/s])

  return { title, price, rating, reviewCount, bsr, bullets, imageCount, hasVideo, hasAPlus, hasFaq, brand, category }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { asin } = await req.json()
    const cleanAsin = (asin || '').trim().toUpperCase()

    if (!/^[A-Z0-9]{10}$/.test(cleanAsin)) {
      return new Response(JSON.stringify({ error: 'Format ASIN invalide (10 caractères alphanumériques)' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Clé ANTHROPIC_API_KEY non configurée dans les secrets Supabase' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Try to scrape product page (amazon.fr then amazon.com)
    let productData: ReturnType<typeof extractFromHtml> | null = null
    let scrapedUrl = ''

    const urls = [
      `https://www.amazon.fr/dp/${cleanAsin}?language=fr_FR`,
      `https://www.amazon.com/dp/${cleanAsin}`,
    ]

    for (const url of urls) {
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Cache-Control': 'max-age=0',
          },
          signal: AbortSignal.timeout(9000),
          redirect: 'follow',
        })

        if (resp.ok) {
          const html = await resp.text()
          // Verify it's a real product page (not CAPTCHA or robot check)
          if (
            html.length > 20000 &&
            !html.includes('api-services-support@amazon.com') &&
            !html.includes('robot check') &&
            !html.includes('Enter the characters you see below') &&
            (html.includes('productTitle') || html.includes('a-price-whole') || html.includes('acrPopover'))
          ) {
            productData = extractFromHtml(html)
            scrapedUrl = url
            break
          }
        }
      } catch (e) {
        console.log(`Fetch ${url} failed: ${(e as Error).message}`)
      }
    }

    // Build context for Claude
    const productContext = productData
      ? `=== DONNÉES EXTRAITES DE LA PAGE AMAZON (${scrapedUrl}) ===
ASIN : ${cleanAsin}
Titre : ${productData.title || 'Non extrait'}
Prix : ${productData.price || 'Non extrait'}
Note : ${productData.rating || 'Non extrait'}
Nombre d'évaluations : ${productData.reviewCount || 'Non extrait'}
BSR (classement) : ${productData.bsr || 'Non extrait'}
Marque : ${productData.brand || 'Non extrait'}
Nombre d'images : ${productData.imageCount || 0}
Vidéo produit : ${productData.hasVideo ? 'OUI' : 'NON'}
Contenu A+ : ${productData.hasAPlus ? 'OUI' : 'NON'}
FAQ / Q&A : ${productData.hasFaq ? 'OUI' : 'NON'}
Bullet points extraits (${productData.bullets.length}) :
${productData.bullets.map((b, i) => `  ${i + 1}. ${b}`).join('\n') || '  Aucun extrait'}`
      : `=== PAGE AMAZON NON ACCESSIBLE (protection anti-bot) ===
ASIN : ${cleanAsin}
Analyse basée sur les meilleures pratiques Amazon FBA et les standards du marché.`

    const systemPrompt = `Tu es un consultant expert Amazon FBA avec 10+ ans d'expérience, spécialisé dans l'optimisation de listings, le SEO Amazon (A9/A10), la stratégie PPC, et l'analyse concurrentielle. Tu as aidé des centaines de vendeurs à multiplier leurs ventes. Tu réponds uniquement en JSON valide, sans texte avant ni après.`

    const userPrompt = `${productContext}

Fournis une analyse complète et actionnable pour maximiser les performances de ce produit sur Amazon. Génère une analyse expert approfondie.

Réponds avec ce JSON exact (remplace tous les placeholders par du contenu RÉEL et SPÉCIFIQUE à ce produit) :
{
  "score_global": <entier 0-100 basé sur l'analyse>,
  "resume_executif": "<2-3 phrases sur la situation actuelle et le potentiel>",
  "produit_detecte": "<nom/catégorie du produit si identifié, sinon 'Produit ASIN ${cleanAsin}'>",

  "titre": {
    "score": <0-100>,
    "analyse": "<analyse spécifique du titre actuel>",
    "problemes": ["<problème concret>", "<problème concret>"],
    "titre_optimise": "<proposition de titre optimisé pour A10 avec mots-clés>",
    "mots_cles_integrer": ["<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>"]
  },

  "images": {
    "score": <0-100>,
    "analyse": "<analyse du nombre et de la qualité des images>",
    "images_manquantes": [
      {"type": "<type d'image>", "description": "<ce qu'elle doit montrer>", "priorite": "haute|moyenne"},
      {"type": "<type>", "description": "<description>", "priorite": "haute|moyenne"},
      {"type": "<type>", "description": "<description>", "priorite": "haute|moyenne"}
    ],
    "conseils_techniques": ["<conseil>", "<conseil>", "<conseil>"]
  },

  "bullet_points": {
    "score": <0-100>,
    "analyse": "<analyse des bullet points actuels>",
    "problemes": ["<problème>", "<problème>"],
    "bullets_optimises": [
      "<bullet point 1 réécrit avec bénéfices + mots-clés>",
      "<bullet point 2 réécrit>",
      "<bullet point 3 réécrit>",
      "<bullet point 4 réécrit>",
      "<bullet point 5 réécrit>"
    ]
  },

  "description_aplus": {
    "score": <0-100>,
    "a_du_contenu_aplus": <true|false>,
    "analyse": "<analyse du contenu A+ ou absence>",
    "modules_recommandes": ["<module A+>", "<module A+>", "<module A+>"],
    "points_cles_a_inclure": ["<point>", "<point>", "<point>"]
  },

  "prix_strategie": {
    "score": <0-100>,
    "analyse_positionnement": "<analyse du prix dans le marché>",
    "fourchette_optimale": "<fourchette de prix recommandée>",
    "strategie_lancement": "<stratégie de prix pour le lancement/croissance>",
    "impact_conversion": "<impact estimé d'un ajustement prix>"
  },

  "seo_keywords": {
    "score": <0-100>,
    "mots_cles_principaux": ["<mot-clé volume élevé>", "<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>"],
    "mots_cles_longue_traine": ["<phrase longue traine>", "<phrase>", "<phrase>", "<phrase>"],
    "backend_search_terms": ["<terme>", "<terme>", "<terme>", "<terme>", "<terme>"],
    "conseil_principal": "<conseil SEO actionnable>"
  },

  "avis_reputation": {
    "score": <0-100>,
    "analyse": "<analyse de la réputation/avis>",
    "strategie_obtenir_avis": "<stratégie concrète pour générer des avis>",
    "points_differenciants": ["<point fort à mettre en avant>", "<point fort>"],
    "risques": ["<risque ou point faible>", "<risque>"]
  },

  "publicite_ppc": {
    "budget_journalier_recommande": "<montant €/jour>",
    "bid_suggere": "<enchère suggérée €>",
    "types_campagnes": [
      {"type": "<type de campagne>", "objectif": "<objectif>", "priorite": "haute|moyenne"},
      {"type": "<type>", "objectif": "<objectif>", "priorite": "haute|moyenne"}
    ],
    "mots_cles_ppc_prioritaires": ["<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>"],
    "strategie": "<stratégie PPC globale>"
  },

  "plan_action_prioritaire": [
    {"rang": 1, "action": "<action précise et actionnable>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai réaliste>"},
    {"rang": 2, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>"},
    {"rang": 3, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>"},
    {"rang": 4, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>"},
    {"rang": 5, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>"},
    {"rang": 6, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>"}
  ],

  "score_par_categorie": {
    "titre": <0-100>,
    "images": <0-100>,
    "bullet_points": <0-100>,
    "description_aplus": <0-100>,
    "prix": <0-100>,
    "seo": <0-100>,
    "avis": <0-100>,
    "ppc": <0-100>
  }
}`

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeResp.ok) {
      const errText = await claudeResp.text()
      throw new Error(`Erreur API Claude: ${errText}`)
    }

    const claudeData = await claudeResp.json()
    const rawText = claudeData.content[0].text.trim()

    let analysis
    try {
      // Remove potential markdown code blocks
      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]+\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Impossible de parser la réponse JSON de Claude')
      }
    }

    return new Response(JSON.stringify({
      success: true,
      asin: cleanAsin,
      scraped: !!productData,
      product_data: productData,
      analysis,
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
