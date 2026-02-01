import { strict_output } from "@/lib/gpt";
import { getAuthSession } from "@/lib/nextauth";
import { getQuestionsSchema } from "@/schemas/questions";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 500;

export async function POST(req: Request) {
  try {
    // Optional auth (keep commented if public)
    // const session = await getAuthSession();
    // if (!session?.user) {
    //   return NextResponse.json(
    //     { error: "You must be logged in." },
    //     { status: 401 }
    //   );
    // }

    const body = await req.json();
    const { amount, topic, type } = getQuestionsSchema.parse(body);

    let questions: any[] = [];

    if (type === "open_ended") {
      questions = await strict_output(
        "You are an expert quiz generator.",
        `Generate EXACTLY ${amount} hard open-ended questions about "${topic}".
Each answer must be at most 15 words.`,
        {
          question: "",
          answer: "",
        },
        amount
      );
    }

    if (type === "mcq") {
      questions = await strict_output(
        "You are an expert quiz generator.",
        `Generate EXACTLY ${amount} hard multiple choice questions about "${topic}".
Each question must have 4 options and answers must be at most 15 words.`,
        {
          question: "",
          answer: "",
          option1: "",
          option2: "",
          option3: "",
        },
        amount
      );
    }

    return NextResponse.json(
      { questions },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error("GPT QUESTION ERROR:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
