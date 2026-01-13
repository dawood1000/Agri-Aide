
import { GoogleGenAI, Type, Modality, GenerateContentResponse, Chat } from "@google/genai";
import type { Language, Crop, AnalysisResult, ChatMessage, GroundingLink } from '../types';

/**
 * Service to handle image analysis via Gemini 2.5 series.
 * Using gemini-2.5-flash specifically to support googleMaps tool grounding 
 * while maintaining high visual recognition accuracy for agricultural pathology.
 */
export const analyzeCropImage = async (
  base64Image: string,
  crop: Crop,
  language: Language,
  location?: { latitude: number; longitude: number }
): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const ai = new GoogleGenAI({ apiKey });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: 'image/jpeg',
    },
  };

  const systemInstruction = `You are a world-leading expert in Agricultural Pathology and Crop Science.
Your specialized domain includes the following five crops: Cotton, Wheat, Sugarcane, Mango, and Rice.

VISUAL RECOGNITION MISSION:
Analyze the user's submitted image of a ${crop.name} leaf. 
1. Verify if the specimen is indeed ${crop.name}.
2. Identify any visible diseases, pests, or nutrient deficiencies.
3. Provide precise, actionable advice in ${language}.

STRICT OUTPUT RULES:
- OUTPUT RAW JSON ONLY. NO MARKDOWN WRAPPERS.
- "confidenceScore" must be an integer (0-100).
- "cropMismatch": Set to true only if the image is clearly NOT a plant or is a totally different species (e.g., an animal or a human). Be flexible with lighting and growth stages.
- If the image is a leaf but you are unsure of the specific disease, provide the most likely diagnosis and a lower confidence score.

JSON SCHEMA:
{
  "cropMismatch": boolean,
  "mismatchExplanation": "string",
  "diseaseName": "string",
  "confidenceScore": number,
  "isHealthy": boolean,
  "description": "string",
  "symptoms": ["string"],
  "remedies": { "chemical": ["string"], "organic": ["string"] },
  "preventiveMeasures": ["string"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          imagePart,
          { text: `Analyze this ${crop.name} leaf for health issues. Context: Region for ${language}. Location: ${location?.latitude || 'Unknown'}, ${location?.longitude || 'Unknown'}.` }
        ]
      },
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: location ? { latitude: location.latitude, longitude: location.longitude } : undefined
          }
        }
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) throw new Error("ANALYSIS_FAILED");
    
    const groundingChunks = candidate.groundingMetadata?.groundingChunks;
    const groundingLinks: GroundingLink[] = (groundingChunks || [])
      .map((chunk: any) => {
        if (chunk.maps) return { title: chunk.maps.title || "Map View", uri: chunk.maps.uri };
        if (chunk.web) return { title: chunk.web.title || "Source", uri: chunk.web.uri };
        return null;
      })
      .filter((link): link is GroundingLink => link !== null);

    const textResponse = response.text || "";
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("INVALID_RESPONSE_FORMAT");
    
    const cleanedJson = match[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    const result = JSON.parse(cleanedJson) as AnalysisResult;
    
    // Normalize confidence score
    if (typeof result.confidenceScore !== 'number') {
      result.confidenceScore = 85;
    } else if (result.confidenceScore <= 1) {
      result.confidenceScore = Math.round(result.confidenceScore * 100);
    }
    
    result.groundingLinks = groundingLinks;
    return result;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message === "API_KEY_NOT_CONFIGURED" ? "API_KEY_NOT_CONFIGURED" : "ANALYSIS_FAILED");
  }
};

/**
 * Starts a new chat session. Using gemini-3-flash-preview here as tools aren't strictly needed for text chat.
 */
export const startAgriChat = (
  crop: Crop,
  diagnosis: AnalysisResult,
  language: Language
): Chat => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-3-flash-preview', 
    config: {
      systemInstruction: `You are an expert AI Agronomist specializing in ${crop.name}. User diagnosis: ${diagnosis.diseaseName}. Answer in ${language}.`,
    },
  });
};

/**
 * TTS generation on Flash.
 */
export const generateTTS = async (text: string, voiceName: string = 'Zephyr'): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const sanitizedText = text
    .replace(/[*_#`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') 
    .slice(0, 2000)
    .trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: sanitizedText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { 
        voiceConfig: { 
          prebuiltVoiceConfig: { voiceName } 
        } 
      },
    },
  });
  
  const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
  if (!audioPart || !audioPart.inlineData) {
    throw new Error("TTS_GENERATION_FAILED");
  }
  
  return audioPart.inlineData.data;
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  let bufferToUse = data.buffer;
  if (bufferToUse.byteLength % 2 !== 0) bufferToUse = bufferToUse.slice(0, bufferToUse.byteLength - 1);
  const dataInt16 = new Int16Array(bufferToUse);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};
