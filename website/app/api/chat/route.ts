import createDOMPurify from "dompurify";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const gemini_api_key = process.env.GEMINI_API_KEY;
const removeMd = require('remove-markdown');

if (!gemini_api_key) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
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

// const window = new JSDOM("").window;
// const DOMPurify = createDOMPurify(window);

// export function removeMd(markdown: string): string {
//   if (!markdown) return "";

//   const rawHtml: any = marked(markdown, {
//     breaks: true,
//     gfm: true,
//   });

//   const cleanHtml = DOMPurify.sanitize(rawHtml, {
//     ALLOWED_TAGS: [
//       "p", "b", "i", "em", "strong", "a", "ul", "ol", "li",
//       "code", "pre", "blockquote", "h1", "h2", "h3", "h4",
//       "h5", "h6", "table", "thead", "tbody", "tr", "th", "td",
//       "br", "hr", "span"
//     ],
//     ALLOWED_ATTR: ["href", "title", "alt", "src", "class"],
//   });

//   return cleanHtml;
// }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    if (history && Array.isArray(history)) {
      const chat = geminiModel.startChat({
        history: history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      const text = removeMd(result.response.text());

      return NextResponse.json({
        success: true,
        response: text,
        role: "model",
      });
    }

    const result = await geminiModel.generateContent(message);
    const text = removeMd(result.response.text());

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
