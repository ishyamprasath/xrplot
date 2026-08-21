const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TEXT_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';

async function callOpenRouterText(prompt, maxTokens = 2048, maxRetries = 3) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[OpenRouter] Text attempt ${attempt}/${maxRetries} with ${TEXT_MODEL}`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'XRPlot',
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      const text = message?.content;

      console.log('[OpenRouter] Response keys:', Object.keys(data));
      if (text != null && typeof text === 'string' && text.trim().length > 0) {
        console.log(`[OpenRouter] Text response received, length: ${text.length}`);
        return text;
      }

      console.warn(`[OpenRouter] Empty/null content. finish_reason: ${choice?.finish_reason}, model: ${data.model}`);
      throw new Error(`Empty or null content from model (finish_reason: ${choice?.finish_reason || 'unknown'})`);
    } catch (err) {
      lastError = err;
      console.error(`[OpenRouter] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`[OpenRouter] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`OpenRouter text call failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Generate comprehensive analysis using OpenRouter
export async function generateComprehensiveAnalysis(placeName, lat, lng) {
  try {
    console.log(`[OpenRouter] Analyzing ${placeName} at coordinates (${lat}, ${lng})`);

    const prompt = `You are a climate scientist + remote sensing ecologist + sustainable urban planner specializing in India's environmental crisis. Analyze:

1. Environmental Crisis Context for ${placeName} (${lat}, ${lng}):
   - Green cover loss (NDVI), heat island intensity (LST), built-up sprawl (NDBI)
   - Air quality & PM2.5 trends, water stress & groundwater depletion
   - Why unchecked sprawl is an Earth emergency here (cite heat, floods, biodiversity loss)

2. Location Eco-Analysis for ${placeName}:
   - Current green cover %, canopy health, wetland/lake status
   - Heat island hotspots, flood-prone basins, pollution corridors
   - Population pressure vs ecological carrying capacity

3. 10-Year Dual Future 2036 (Dystopia if we do nothing vs Regenerative if we act):
   - Dystopia: +2-3°C hotter, -40% green, AQI 160+, deeper water table, biodiversity collapse
   - Regenerative: Miyawaki forests, cool roofs, lake revival, bioswales - quantify cooling, carbon saved, flood reduction
   - Concrete, nature-based solutions that residents & municipalities can actually implement

Provide detailed eco-insights with specific numbers for 2036. Frame growth as environmental cost, not progress. Be urgent but hopeful.`;

    const text = await callOpenRouterText(prompt, 2048, 3);
    console.log(`[OpenRouter] Analysis completed for ${placeName}`);

    return {
      success: true,
      analysis: text,
      gdpInsights: extractGDPInsights(text),
      locationInsights: extractLocationInsights(text),
    };
  } catch (error) {
    console.error(`[OpenRouter] Error analyzing ${placeName}:`, error.message);
    return {
      success: false,
      error: error.message || 'Unknown error during analysis',
    };
  }
}

// Extract GDP insights from Gemini response
function extractGDPInsights(response) {
  if (!response) return "GDP analysis unavailable";
  const gdpSection = response.match(/India's GDP[\s\S]*?:(.*?)(?=\n\n|\n|$)/i);
  if (gdpSection && gdpSection[1]) {
    return gdpSection[1].trim();
  }
  return "GDP analysis for India's economic context and development patterns";
}

// Extract location insights from Gemini response  
function extractLocationInsights(response) {
  if (!response) return "Location analysis unavailable";
  const locationSection = response.match(/Location Analysis[\s\S]*?:(.*?)(?=\n\n|\n|$)/i);
  if (locationSection && locationSection[1]) {
    return locationSection[1].trim();
  }
  return "Detailed analysis of current urban development, infrastructure, and economic factors";
}

// Generate realistic 10-year future projection prompts
export async function generateFutureProjectionPrompt(placeName, currentInsights, gdpInsights, locationInsights) {
  try {
    const prompt = `Based on environmental analysis of ${placeName}, generate a DUAL 10-year eco-projection for 2036:

Current Eco-Analysis:
${currentInsights}

Climate Context:
${gdpInsights}

Location Eco-Factors:
${locationInsights}

Requirements:
1. DYSTOPIA vs REGENERATION - Show both paths: if we sprawl unchecked (heat, floods, smog) vs if we regenerate (forests, cool roofs, lakes)
2. SATELLITE-GROUNDED - Use NDBI/NDVI/LST logic: built-up up = green down = temp up
3. NATURE-BASED SOLUTIONS - Miyawaki forests, wetland revival, permeable pavements, rooftop gardens
4. QUANTIFIABLE IMPACT - Always state degrees cooled, AQI reduced, tons CO₂ saved, water recharged
5. VISIBLE 360° CHANGES - Describe what a resident will SEE: barren vs lush street, flooded vs spongy basin
6. HOPE + URGENCY - Dystopia is alarming but regenerative future is achievable and photorealistic

Generate a projection that makes ${placeName}'s 2036 eco-future visceral and actionable, not sci-fi.`;

    const text = await callOpenRouterText(prompt, 2048, 3);
    console.log(`[OpenRouter] Generated projection for ${placeName}`);

    return {
      success: true,
      projection: text,
    };
  } catch (error) {
    console.error(`[OpenRouter] Error generating projection for ${placeName}:`, error.message);
    return {
      success: false,
      error: error.message || 'Failed to generate projection',
    };
  }
}

export {
  generateComprehensiveAnalysis,
  generateFutureProjectionPrompt
};
