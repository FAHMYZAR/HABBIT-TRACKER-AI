import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleItem, AIResponse } from "../types";

// Schema for structured output
const SCHEDULE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "A motivating, friendly response in Indonesian. Short and snappy.",
    },
    schedule: {
      type: Type.ARRAY,
      description: "The detailed schedule.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: [
              "ROUTINE", "ACADEMIC", "FITNESS", "RELIGIOUS", "WORK", "MEAL", "REST", "OTHER"
            ]
          },
          isTomorrow: {
            type: Type.BOOLEAN,
            description: "Set to TRUE if this task is planned for tomorrow/next day. Set FALSE for today."
          },
          subtasks: {
            type: Type.ARRAY,
            description: "Micro-steps (e.g., '05:00-05:03 Drink Water').",
            items: { type: Type.STRING }
          },
          smartTip: {
            type: Type.STRING,
            description: "Expert advice (Calories/Form/Science)."
          },
          metrics: {
            type: Type.STRING,
            description: "Quantifiable data (e.g., 450 kcal, 4x12 Reps)."
          }
        },
        required: ["id", "startTime", "endTime", "title", "category", "subtasks"],
      },
    },
  },
  required: ["reply", "schedule"],
};

export const processUserMessage = async (
  message: string,
  currentSchedule: ScheduleItem[],
  currentTime: string,
  chatContext: string // A summary of recent interactions to keep the "Brain" smart
): Promise<AIResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemPrompt = `
      You are a Personal Habit Architect & Fitness Expert. 
      Current Time: ${currentTime}
      
      **GOAL:** Maintain a "Micro-Scheduled" day. Adapt instantly to changes.
      
      **LOGIC:**
      - If the user asks for a schedule STARTING tomorrow, mark all items with 'isTomorrow': true.
      - If the user asks for a schedule starting NOW, mark items for today as 'isTomorrow': false.
      - If a task time has already passed today but the user is asking to plan it for TOMORROW, use 'isTomorrow': true.
      
      **MEMORY CONTEXT:**
      The user has been discussing: ${chatContext.slice(0, 1000)}... (Use this to know their habits)

      **INSTRUCTIONS:**
      1.  **Micro-Detail:** Break tasks down (e.g., "Wash Face" inside "Morning Routine").
      2.  **Expertise:**
          -   FITNESS: Give Sets x Reps.
          -   FOOD: Give Calories/Macros.
          -   STUDY: Suggest Pomodoro.
      3.  **Tone:** Friendly, energetic, Indonesian language.

      **CURRENT SCHEDULE STATE:**
      ${JSON.stringify(currentSchedule)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: SCHEDULE_SCHEMA,
        thinkingConfig: {
            thinkingBudget: 16000 
        }
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AIResponse;
    } else {
      throw new Error("No response text from Gemini");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};