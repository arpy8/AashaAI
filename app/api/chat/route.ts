import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const gemini_api_key = process.env.GEMINI_API_KEY;

if (!gemini_api_key) {
  throw new Error("API_KEY is not defined in environment variables");
}

const googleAI = new GoogleGenerativeAI(gemini_api_key);
const geminiConfig = {
  temperature: 0.9,
  topP: 1,
  topK: 1,
  maxOutputTokens: 4096,
};

const geminiModel = googleAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  ...geminiConfig,
});

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { message, history } = body;

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // If history is provided, use chat mode for context
    if (history && Array.isArray(history)) {
      const chat = geminiModel.startChat({
        history: history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      const response = result.response;
      const text = response.text();

      return NextResponse.json({
        success: true,
        response: text,
        role: "model",
      });
    }

    // Single message without history
    const result = await geminiModel.generateContent(message);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      response: text,
      role: "model",
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Gemini chatbot API is running",
    model: "gemini-2.5-pro",
  });
}