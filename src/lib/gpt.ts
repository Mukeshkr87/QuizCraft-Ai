import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ✅ VERIFIED working model
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
});

export interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

/**
 * strict_output
 * --------------
 * Guarantees:
 * - JSON only
 * - ARRAY output
 * - Retries on malformed output
 */
export async function strict_output(
  system_prompt: string,
  user_prompt: string,
  output_format: OutputFormat,
  expectedCount?: number,
  retries: number = 3
): Promise<any[]> {

  // 🔒 ALWAYS force array schema (this fixes the 50% bug)
  const schema = [output_format];

  const prompt = `
${system_prompt}

CRITICAL INSTRUCTIONS (DO NOT IGNORE):
- Return ONLY valid JSON
- No markdown
- No explanations
- No comments
- No text outside JSON
- Output MUST be a JSON ARRAY
${expectedCount ? `- Array MUST contain EXACTLY ${expectedCount} objects` : ""}

JSON SCHEMA:
${JSON.stringify(schema, null, 2)}

User request:
${user_prompt}
`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // 🔑 VERY IMPORTANT (stability)
          topP: 0.9,
        },
      });

      const rawText = result.response.text();

      // 🧠 Extract FIRST valid JSON array only
      const match = rawText.match(/\[[\s\S]*?\]/);

      if (!match) {
        throw new Error("No JSON array found in Gemini response");
      }

      const parsed = JSON.parse(match[0]);

      if (!Array.isArray(parsed)) {
        throw new Error("Output is not an array");
      }

      if (expectedCount && parsed.length !== expectedCount) {
        throw new Error(
          `Expected ${expectedCount} items, got ${parsed.length}`
        );
      }

      return parsed;

    } catch (err) {
      console.error(`Gemini attempt ${attempt} failed`);

      if (attempt === retries) {
        console.error("FINAL Gemini failure:", err);
        throw err;
      }
    }
  }

  return [];
}
