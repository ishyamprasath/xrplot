const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Generate comprehensive analysis using OpenRouter
export async function generateComprehensiveAnalysis(placeName, lat, lng) {
  try {
    console.log(`[OpenRouter] Analyzing ${placeName} at coordinates (${lat}, ${lng})`);
    
    const prompt = `You are an expert analyst specializing in India's economic development and urban planning. Analyze the following:

1. India's GDP and Economic Context:
   - Current GDP trends and growth patterns
   - Economic policies and their impact on development
   - Regional economic factors affecting ${placeName}
   - Infrastructure development and investment patterns

2. Location Analysis for ${placeName}:
   - Current urban development status
   - Population growth and demographics
   - Infrastructure quality and availability
   - Economic activities and employment patterns
   - Environmental and geographical factors

3. 10-Year Future Projection (2036):
   - Realistic urban growth expectations
   - Infrastructure development timeline
   - Economic and social changes
   - Environmental and sustainability considerations

Provide detailed insights with specific data points and realistic projections for 2036. Focus on practical, achievable developments rather than overly optimistic scenarios.`;

    console.log('[OpenRouter] Sending request to openrouter/auto...');
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "XRPlot"
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
      })
    });
    
    console.log('[OpenRouter] Raw response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter] API error:', errorText);
      return {
        success: false,
        error: `OpenRouter API error ${response.status}: ${errorText}`,
        rawResponse: errorText.slice(0, 500)
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    console.log('[OpenRouter] Raw result:', JSON.stringify(data).slice(0, 300));

    if (text) {
      console.log(`[OpenRouter] Analysis completed for ${placeName}`);
      return {
        success: true,
        analysis: text,
        gdpInsights: extractGDPInsights(text),
        locationInsights: extractLocationInsights(text)
      };
    }

    return {
      success: false,
      error: "Failed to generate analysis - no text in response",
      rawResponse: JSON.stringify(data).slice(0, 500)
    };
  } catch (error) {
    console.error(`[OpenRouter] Error analyzing ${placeName}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error during analysis'
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
  const prompt = `Based on the following analysis of ${placeName}, generate a realistic 10-year projection for 2036:

Current Analysis:
${currentInsights}

GDP Context:
${gdpInsights}

Location Factors:
${locationInsights}

Requirements:
1. REALISTIC PROJECTIONS - Consider India's actual development pace and constraints
2. PRACTICAL CHANGES - Focus on achievable infrastructure and urban development
3. MODERN TECHNOLOGY - Include realistic technological advancement
4. SUSTAINABLE DEVELOPMENT - Balance growth with environmental considerations
5. INFRASTRUCTURE FOCUS - Emphasize practical improvements in roads, buildings, utilities
6. ECONOMIC REALISM - Reflect realistic economic growth patterns

Generate a detailed projection that shows how ${placeName} will realistically evolve by 2036, avoiding overly optimistic or sci-fi scenarios. Focus on practical, visible changes that residents would actually experience.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "XRPlot"
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `OpenRouter API error ${response.status}: ${errorText}`,
      rawResponse: errorText.slice(0, 500)
    };
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  if (text) {
    console.log(`[OpenRouter] Generated projection for ${placeName}`);
    return {
      success: true,
      projection: text
    };
  }

  return {
    success: false,
    error: "Failed to generate projection - no text in response",
    rawResponse: JSON.stringify(data).slice(0, 500)
  };
}

export {
  generateComprehensiveAnalysis,
  generateFutureProjectionPrompt
};
