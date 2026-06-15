import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
]

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
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
    /id="productTitle"[^>]*>\s*([^<]{10,300})\s*</,
    /<title>([^<]{10,200})\s*(?::|–|-)\s*Amazon/i,
    /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>\s*([^<]{10,300})\s*</i,
  ])

  const price = get([
    /class="a-price-whole">([0-9\s,]+)</,
    /id="priceblock_ourprice"[^>]*>([^<]+)</,
    /class="a-offscreen">([€$£][0-9,.\s]+)</,
    /"buyingPrice":"([^"]+)"/,
    /"price":"([^"]+)"/,
  ])

  const rating = get([
    /([0-9],[0-9])\s*sur 5 étoiles/,
    /([0-9]\.[0-9])\s*out of 5 stars/,
    /class="a-icon-alt">([0-9,.]+\s*(?:sur|out)[^<]+)</,
    /"ratingScore":"([^"]+)"/,
  ])

  const reviewCount = get([
    /([0-9\s]+)\s*évaluation[s]?\s*client/,
    /([0-9,\s]+)\s*(?:customer )?ratings/,
    /([0-9,\s]+)\s*avis clients/,
    /"totalReviewCount":"?([0-9,]+)"?/,
    /id="acrCustomerReviewText"[^>]*>([0-9,\s]+)/,
  ])

  const bsr = get([
    /N°\s*([0-9,\s]+)\s+en\s+(?:Cuisine|Beauté|Sports|Maison|Électronique|Informatique|Jardin|Jeux|Vêtements|Automobile|Chaussures|Livres|Musique|Vidéo|DVD)/,
    /#\s*([0-9,]+)\s+in\s+(?:Home|Kitchen|Beauty|Sports|Electronics|Clothing|Automotive|Books|Toys|Office)/,
    /classement.*?n°\s*([0-9,]+)/i,
    /Best Sellers Rank[^#]*#([0-9,]+)/,
    /Best Seller[^#]*#([0-9,]+)/,
  ])

  const category = get([
    /nav-subnav[^>]*data-category="([^"]+)"/,
    /<span[^>]*class="a-list-item"[^>]*>\s*<a[^>]*>([^<]{3,50})<\/a>\s*<\/span>\s*<\/li>\s*<\/ul>/,
    /productTitle[^<]*<[^>]*>\s*<[^>]*>([^<]{3,80})<\/a>\s*<\/li>/,
  ])

  const brand = get([
    /class="po-brand"[^>]*>[\s\S]*?<span[^>]*>([^<]{2,50})<\/span>/,
    /bylineInfo"[^>]*>[^>]*>(?:Marque|Brand|par|by)\s*:\s*<[^>]*>([^<]{2,50})</i,
    /[Mm]arque.*?:\s*([A-Z][A-Za-z\s]{1,30}?)(?:<|,|\s{2})/,
  ])

  const bulletRaw = html.match(/<span class="a-list-item">\s*([^<]{30,400})\s*<\/span>/g) || []
  const bullets = bulletRaw
    .map(b => b.replace(/<[^>]*>/g, '').trim())
    .filter(b => b.length > 30 && !b.toLowerCase().includes('asin') && !b.toLowerCase().startsWith('marque'))
    .slice(0, 7)

  // Count images more reliably
  const imgMatches = (html.match(/"hiRes":"https:\/\/m\.media-amazon/g) || []).length
    || (html.match(/altImage/g) || []).length
    || (html.match(/colorImages.*?initial/g) || []).length

  const hasVideo = html.includes('videoContainer') || html.includes('video-player') || html.includes('VideoBlock') || html.includes('aplus-media-library')
  const hasAPlus = html.includes('aplus-v2') || html.includes('aplus3p') || html.includes('a-section aplus') || html.includes('aplusBrandStory')
  const hasFaq = html.includes('askATF') || html.includes('questions-and-answers') || html.includes('ask_lazy_load')
  const hasBadge = html.includes('bestSellersRank') || html.includes("Best Seller") || html.includes('#1 Best Seller')
  const hasVariants = (html.match(/twisterContainer/g) || []).length > 0
  const fulfilledByAmazon = html.includes('fulfillmentMerchantName') ? html.includes('"Amazon"') : html.includes('Expédié et vendu par Amazon') || html.includes('Ships from and sold by Amazon')

  return { title, price, rating, reviewCount, bsr, category, brand, bullets, imageCount: imgMatches, hasVideo, hasAPlus, hasFaq, hasBadge, hasVariants, fulfilledByAmazon }
}

async function tryFetch(url: string, extraHeaders = {}) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-GB;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'DNT': '1',
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  })
  return resp
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { asin, marketplace = 'fr' } = await req.json()
    const cleanAsin = (asin || '').trim().toUpperCase()

    if (!/^[A-Z0-9]{10}$/.test(cleanAsin)) {
      return new Response(JSON.stringify({ error: 'Format ASIN invalide (10 caractères alphanumériques)' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Clé GEMINI_API_KEY non configurée dans les secrets Supabase' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let productData: ReturnType<typeof extractFromHtml> | null = null
    let scrapedUrl = ''

    const tld = marketplace === 'com' ? 'com' : marketplace === 'de' ? 'de' : marketplace === 'es' ? 'es' : marketplace === 'it' ? 'it' : marketplace === 'uk' ? 'co.uk' : 'fr'

    const urlsToTry = [
      { url: `https://www.amazon.${tld}/dp/${cleanAsin}`, headers: { 'Referer': `https://www.amazon.${tld}/s?k=${cleanAsin}` } },
      { url: `https://www.amazon.${tld}/gp/product/${cleanAsin}`, headers: {} },
      { url: `https://www.amazon.${tld}/dp/${cleanAsin}?th=1&psc=1`, headers: {} },
    ]

    // Add .com fallback if not already trying .com
    if (tld !== 'com') {
      urlsToTry.push({ url: `https://www.amazon.com/dp/${cleanAsin}`, headers: { 'Referer': 'https://www.amazon.com/' } })
    }

    for (const { url, headers } of urlsToTry) {
      try {
        const resp = await tryFetch(url, headers)
        if (resp.ok) {
          const html = await resp.text()
          const isRealPage = html.length > 15000
            && !html.includes('api-services-support@amazon.com')
            && !html.toLowerCase().includes('robot check')
            && !html.includes('Enter the characters you see below')
            && !html.includes('Type the characters you see in this image')
            && (html.includes('productTitle') || html.includes('a-price-whole') || html.includes('acrPopover') || html.includes('buyingPrice'))

          if (isRealPage) {
            productData = extractFromHtml(html)
            scrapedUrl = url
            break
          }
        }
      } catch (e) {
        console.log(`Fetch ${url} failed: ${(e as Error).message}`)
      }
    }

    const productContext = productData
      ? `=== DONNÉES EXTRAITES DE LA PAGE AMAZON (${scrapedUrl}) ===
ASIN : ${cleanAsin}
Titre complet : ${productData.title || 'Non extrait'}
Prix actuel : ${productData.price || 'Non extrait'}
Note moyenne : ${productData.rating || 'Non extrait'}
Nombre d'évaluations : ${productData.reviewCount || 'Non extrait'}
BSR (Best Seller Rank) : ${productData.bsr || 'Non extrait'}
Catégorie : ${productData.category || 'Non extraite'}
Marque : ${productData.brand || 'Non extraite'}
Nombre d'images : ${productData.imageCount || 0}
Vidéo produit : ${productData.hasVideo ? 'OUI' : 'NON'}
Contenu A+ : ${productData.hasAPlus ? 'OUI' : 'NON'}
FAQ/Q&A : ${productData.hasFaq ? 'OUI' : 'NON'}
Badge Best Seller : ${productData.hasBadge ? 'OUI' : 'NON'}
Variantes : ${productData.hasVariants ? 'OUI (plusieurs variantes)' : 'NON'}
Vendu par Amazon : ${productData.fulfilledByAmazon ? 'OUI (FBA)' : 'NON ou inconnu'}
Bullet points extraits (${productData.bullets.length}) :
${productData.bullets.map((b, i) => `  ${i + 1}. ${b}`).join('\n') || '  Aucun extrait'}`
      : `=== PAGE AMAZON NON ACCESSIBLE (protection anti-bot) ===
ASIN : ${cleanAsin}
Marketplace visée : Amazon.${tld}
Note : Aucune donnée live n'a pu être extraite. Utilise tes connaissances générales sur ce type de produit/ASIN pour produire l'analyse la plus précise et professionnelle possible, en te basant sur les standards du marché Amazon.`

    const systemPrompt = `Tu es un consultant expert Amazon FBA senior avec 15+ ans d'expérience. Tu maîtrises parfaitement : l'algorithme A10 d'Amazon, l'optimisation de listings, le SEO Amazon, la stratégie PPC Sponsored Products/Brands/Display, l'analyse concurrentielle de niches, l'optimisation du taux de conversion, et la stratégie de lancement. Tu as accompagné des centaines de vendeurs générant des millions d'euros de CA. Tu produis des analyses aussi précises et actionnables que celles de Helium 10 Listing Analyzer. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ni après le JSON.`

    const userPrompt = `${productContext}

Analyse ce produit Amazon de façon experte et ultra-complète, comme le ferait Helium 10. Génère une analyse professionnelle avec TOUTES les sections ci-dessous.

IMPORTANT : Fournis des recommandations SPÉCIFIQUES et ACTIONNABLES. Pas de généralités. Chaque conseil doit être directement applicable. Si tu n'as pas les données scrappées, base-toi sur ce que tu sais de la niche/catégorie pour cet ASIN.

Réponds avec ce JSON exact :
{
  "score_global": <entier 0-100>,
  "resume_executif": "<3-4 phrases percutantes sur la situation et le potentiel de ce produit>",
  "produit_detecte": "<nom/description du produit>",
  "niche_detectee": "<catégorie/niche identifiée>",

  "opportunite_niche": {
    "score_opportunite": <0-100>,
    "niveau_competition": "faible|moyen|élevé|très élevé",
    "potentiel_ca_mensuel": "<estimation €>",
    "volume_recherche_estime": "<volume mensuel estimé pour les 3 principaux mots-clés>",
    "tendance": "croissante|stable|décroissante",
    "saisonnalite": "<analyse de la saisonnalité>",
    "barriere_entree": "faible|moyenne|élevée",
    "recommandation": "<verdict : vaut-il la peine d'aller sur ce marché ?>"
  },

  "analyse_concurrentielle": {
    "score": <0-100>,
    "analyse": "<analyse de la position concurrentielle>",
    "avantages_concurrentiels": ["<avantage>", "<avantage>"],
    "points_faibles_vs_concurrents": ["<faiblesse>", "<faiblesse>"],
    "strategies_differentiation": ["<stratégie>", "<stratégie>", "<stratégie>"]
  },

  "titre": {
    "score": <0-100>,
    "longueur_actuelle": "<X caractères ou 'non disponible'>",
    "longueur_optimale": "150-200 caractères",
    "analyse": "<analyse spécifique et détaillée du titre>",
    "problemes": ["<problème précis>", "<problème précis>"],
    "titre_optimise": "<titre réécrit et optimisé pour A10 — spécifique à ce produit, avec mots-clés>",
    "mots_cles_integrer": ["<mot-clé volume élevé>", "<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>"]
  },

  "images": {
    "score": <0-100>,
    "nombre_actuel": <nombre ou 0>,
    "nombre_optimal": 7,
    "analyse": "<analyse du nombre et qualité>",
    "images_manquantes": [
      {"type": "<type précis>", "description": "<ce que l'image doit montrer exactement>", "priorite": "haute|moyenne"},
      {"type": "<type>", "description": "<description>", "priorite": "haute|moyenne"},
      {"type": "<type>", "description": "<description>", "priorite": "haute|moyenne"},
      {"type": "<type>", "description": "<description>", "priorite": "moyenne"}
    ],
    "conseils_techniques": ["<conseil précis>", "<conseil>", "<conseil>"]
  },

  "bullet_points": {
    "score": <0-100>,
    "analyse": "<analyse détaillée des bullet points>",
    "problemes": ["<problème>", "<problème>"],
    "bullets_optimises": [
      "<bullet 1 : commence par un bénéfice clé en majuscules, suivi de détails et mots-clés>",
      "<bullet 2>",
      "<bullet 3>",
      "<bullet 4>",
      "<bullet 5>"
    ]
  },

  "description_aplus": {
    "score": <0-100>,
    "a_du_contenu_aplus": <true|false>,
    "analyse": "<analyse du contenu A+ ou recommandation si absent>",
    "modules_recommandes": ["<module A+ spécifique>", "<module>", "<module>"],
    "points_cles_a_inclure": ["<point>", "<point>", "<point>"]
  },

  "prix_strategie": {
    "score": <0-100>,
    "prix_actuel": "<prix détecté ou 'non disponible'>",
    "analyse_positionnement": "<analyse du prix dans le marché>",
    "fourchette_optimale": "<fourchette €X - €Y recommandée>",
    "strategie_lancement": "<stratégie de prix pour lancement/croissance>",
    "impact_conversion": "<impact estimé d'un ajustement de prix>",
    "conseil_promotions": "<conseil sur les coupons/promotions>"
  },

  "seo_keywords": {
    "score": <0-100>,
    "mots_cles_principaux": [
      {"mot_cle": "<mot-clé>", "volume_mensuel_estime": "<X recherches/mois>", "difficulte": "faible|moyen|élevé"},
      {"mot_cle": "<mot-clé>", "volume_mensuel_estime": "<X>", "difficulte": "faible|moyen|élevé"},
      {"mot_cle": "<mot-clé>", "volume_mensuel_estime": "<X>", "difficulte": "faible|moyen|élevé"},
      {"mot_cle": "<mot-clé>", "volume_mensuel_estime": "<X>", "difficulte": "faible|moyen|élevé"},
      {"mot_cle": "<mot-clé>", "volume_mensuel_estime": "<X>", "difficulte": "faible|moyen|élevé"}
    ],
    "mots_cles_longue_traine": ["<phrase longue traine>", "<phrase>", "<phrase>", "<phrase>", "<phrase>"],
    "backend_search_terms": ["<terme backend>", "<terme>", "<terme>", "<terme>", "<terme>", "<terme>"],
    "opportunites_inexploitees": ["<mot-clé opportunité>", "<mot-clé>", "<mot-clé>"],
    "conseil_principal": "<conseil SEO actionnable et spécifique>"
  },

  "avis_reputation": {
    "score": <0-100>,
    "note_actuelle": "<note/5 ou 'non disponible'>",
    "nb_avis": "<nombre ou 'non disponible'>",
    "analyse": "<analyse de la réputation>",
    "strategie_obtenir_avis": "<stratégie concrète — Vine, email follow-up, insert card>",
    "points_differenciants": ["<point fort à valoriser>", "<point fort>"],
    "risques": ["<risque identifié>", "<risque>"],
    "objectif_avis_3mois": "<objectif réaliste en 3 mois>"
  },

  "publicite_ppc": {
    "score_opportunite_ppc": <0-100>,
    "budget_journalier_recommande": "<€X - €Y / jour>",
    "bid_suggere": "<€X - €Y par clic>",
    "acos_cible": "<X% ACOS cible>",
    "types_campagnes": [
      {"type": "Sponsored Products - Exact Match", "objectif": "<objectif>", "priorite": "haute"},
      {"type": "Sponsored Products - Auto", "objectif": "<objectif>", "priorite": "haute"},
      {"type": "Sponsored Brands", "objectif": "<objectif>", "priorite": "moyenne"},
      {"type": "Sponsored Display", "objectif": "<objectif>", "priorite": "moyenne"}
    ],
    "mots_cles_ppc_prioritaires": ["<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>", "<mot-clé>"],
    "mots_cles_negatifs": ["<mot-clé négatif>", "<mot-clé>", "<mot-clé>"],
    "strategie": "<stratégie PPC complète et détaillée>"
  },

  "listing_quality_score": {
    "completude": <0-100>,
    "optimisation_seo": <0-100>,
    "qualite_visuelle": <0-100>,
    "conviction_acheteur": <0-100>
  },

  "plan_action_prioritaire": [
    {"rang": 1, "action": "<action TRÈS précise — ex: Réécrire le titre en ajoutant '[mot-clé] + [mot-clé]' dans les 30 premiers caractères>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai réaliste>", "gain_estime": "<impact attendu>"},
    {"rang": 2, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>", "gain_estime": "<impact>"},
    {"rang": 3, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>", "gain_estime": "<impact>"},
    {"rang": 4, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>", "gain_estime": "<impact>"},
    {"rang": 5, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>", "gain_estime": "<impact>"},
    {"rang": 6, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>", "gain_estime": "<impact>"},
    {"rang": 7, "action": "<action>", "impact": "élevé|moyen|faible", "effort": "faible|moyen|élevé", "delai": "<délai>", "gain_estime": "<impact>"}
  ],

  "score_par_categorie": {
    "titre": <0-100>,
    "images": <0-100>,
    "bullet_points": <0-100>,
    "description_aplus": <0-100>,
    "prix": <0-100>,
    "seo": <0-100>,
    "avis": <0-100>,
    "ppc": <0-100>,
    "niche": <0-100>,
    "concurrence": <0-100>
  }
}`

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 6000,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!geminiResp.ok) {
      const errText = await geminiResp.text()
      throw new Error(`Erreur API Gemini: ${errText}`)
    }

    const geminiData = await geminiResp.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!rawText) throw new Error('Réponse vide de Gemini')

    let analysis
    try {
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
      marketplace: tld,
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
