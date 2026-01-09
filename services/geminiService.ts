
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CinematicShot, AnalysisResult, Language } from "../types";

const API_KEY = process.env.API_KEY || "";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async analyzeInput(input: string, isImage: boolean, lang: Language): Promise<CinematicShot[]> {
    const model = 'gemini-3-pro-preview';
    const langInstructions = lang === 'zh' 
      ? "请使用中文输出所有内容（标题、描述、氛围等）。" 
      : "Output all content in English.";
    
    const prompt = `Analyze this ${isImage ? 'image' : 'description'}: "${isImage ? 'Base64 image provided' : input}". 
    Act as a professional cinematographer. Find or conceive 20 diverse, high-quality cinematic movie shots that match the aesthetic, mood, or subject of this input.
    Each shot must be unique and represent a different cinematographic approach (e.g., Wide, Close-up, Dutch angle, Silhouette, etc.).
    
    ${langInstructions}

    Return a JSON array of objects with these properties:
    - id: unique string
    - title: evocative movie scene title
    - cinematography: shot type and camera movement
    - lighting: detailed lighting description
    - colorPalette: dominant colors and grading style
    - description: a 2-sentence visual description
    - vibe: overall mood (e.g., Noir, Ethereal, Gritty, Melancholic)`;

    const response = await this.ai.models.generateContent({
      model,
      contents: isImage 
        ? { parts: [{ inlineData: { data: input, mimeType: 'image/jpeg' } }, { text: prompt }] }
        : prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  cinematography: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  colorPalette: { type: Type.STRING },
                  description: { type: Type.STRING },
                  vibe: { type: Type.STRING },
                },
                required: ["id", "title", "cinematography", "lighting", "colorPalette", "description", "vibe"]
              }
            }
          },
          required: ["shots"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"shots": []}') as AnalysisResult;
    return data.shots;
  }

  async generateShotImage(shot: CinematicShot): Promise<string> {
    const model = 'gemini-2.5-flash-image';
    // Use English for better image generation performance regardless of UI language
    const prompt = `A hyper-realistic cinematic movie still: ${shot.title}. ${shot.cinematography}. ${shot.lighting}. ${shot.colorPalette}. ${shot.description}. Highly detailed 8k film style, anamorphic lens, realistic textures, ${shot.vibe} atmosphere. No text, no watermarks.`;

    const response = await this.ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate image part");
  }

  async synthesizeFinalPrompt(selectedShots: CinematicShot[], lang: Language): Promise<string> {
    const model = 'gemini-3-flash-preview';
    const shotsSummary = selectedShots.map(s => `${s.title}: ${s.description} (${s.cinematography}, ${s.lighting})`).join('\n');
    
    // AI Generators (Midjourney/Stable Diffusion) work best with English prompts, 
    // but we can provide a bilingual output or follow the user's preference.
    const prompt = `Synthesize a single, highly detailed master prompt for an AI image generator based on these selected cinematic shots:\n${shotsSummary}\n
    Combine the best elements into one cohesive masterpiece. 
    The final prompt should be professional and include camera settings.
    ${lang === 'zh' ? '请输出两部分：1. 生成用的英文提示词 2. 该提示词的中文字面意思。' : 'Output ONLY the English prompt text.'}`;

    const response = await this.ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Could not generate prompt.";
  }
}
