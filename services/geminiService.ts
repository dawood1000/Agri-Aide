
import { GoogleGenAI, Type } from "@google/genai";
import type { Language, Crop, AnalysisResult } from '../types';

if (!process.env.API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const diseaseSchema = {
  type: Type.OBJECT,
  properties: {
    diseaseName: {
      type: Type.STRING,
      description: "Name of the identified plant disease. If healthy, state 'Healthy'.",
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "A score from 0 to 100 representing the model's confidence in its diagnosis.",
    },
    isHealthy: {
      type: Type.BOOLEAN,
      description: "True if the plant leaf appears healthy, false otherwise.",
    },
    description: {
      type: Type.STRING,
      description: "A detailed description of the disease or the healthy state of the plant.",
    },
    symptoms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of key symptoms associated with the disease.",
    },
    remedies: {
      type: Type.OBJECT,
      properties: {
        chemical: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of suggested chemical treatments or pesticides.",
        },
        organic: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of suggested organic or cultural control methods.",
        },
      },
      required: ["chemical", "organic"],
    },
    preventiveMeasures: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of measures to prevent this disease in the future.",
    },
  },
  required: ["diseaseName", "confidenceScore", "isHealthy", "description", "symptoms", "remedies", "preventiveMeasures"],
};

export const analyzeCropImage = async (
  base64Image: string,
  crop: Crop,
  language: Language
): Promise<AnalysisResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY_NOT_CONFIGURED");
    }

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: 'image/jpeg',
    },
  };

  const systemInstruction = `You are an expert agricultural scientist specializing in plant pathology for South Asian crops. Your task is to analyze an image of a crop leaf and provide a detailed diagnosis. Respond ONLY with a valid JSON object matching the provided schema. The entire response, including all text fields, must be in the specified language: ${language}. If the image is not a plant leaf or is unclear, provide an error message in the 'diseaseName' field and a confidence score of 0.`;

  const contents = {
      parts: [
          imagePart,
          { text: `This is an image of a ${crop.name} leaf. Please analyze it for diseases.` }
      ],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: diseaseSchema,
        temperature: 0.2,
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString) as AnalysisResult;
    return result;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("ANALYSIS_FAILED");
  }
};
