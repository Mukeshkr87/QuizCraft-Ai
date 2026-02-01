import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { quizCreationSchema } from "@/schemas/forms/quiz";
import { strict_output } from "@/lib/gpt";
import { NextResponse } from "next/server";
import { z } from "zod";

/* =========================
   POST: Create Game
========================= */
export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to create a game." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { topic, type, amount } = quizCreationSchema.parse(body);

    // Create game
    const game = await prisma.game.create({
      data: {
        gameType: type,
        timeStarted: new Date(),
        userId: session.user.id,
        topic,
      },
    });

    // Update topic count
    await prisma.topic_count.upsert({
      where: { topic },
      create: { topic, count: 1 },
      update: { count: { increment: 1 } },
    });

    /* =========================
       Generate Questions (Gemini)
    ========================= */

    // ---------- MCQ ----------
    if (type === "mcq") {
      const questions = await strict_output(
        "You are an expert quiz generator.",
        `Generate ${amount} multiple choice questions on ${topic}.`,
        {
          question: "",
          answer: "",
          option1: "",
          option2: "",
          option3: "",
        }
      );

      const manyData: Prisma.QuestionCreateManyInput[] = questions.map((q) => {
        const options = [
          q.option1,
          q.option2,
          q.option3,
          q.answer,
        ].sort(() => Math.random() - 0.5);

        return {
          question: q.question,
          answer: q.answer,
          options: JSON.stringify(options),
          gameId: game.id,
          questionType: "mcq",
        };
      });

      await prisma.question.createMany({
        data: manyData,
      });
    }

    // ---------- OPEN ENDED ----------
    if (type === "open_ended") {
      const questions = await strict_output(
        "You are an expert quiz generator.",
        `Generate ${amount} open ended questions on ${topic}.`,
        {
          question: "",
          answer: "",
        }
      );

      const manyData: Prisma.QuestionCreateManyInput[] = questions.map((q) => ({
        question: q.question,
        answer: q.answer,
        gameId: game.id,
        questionType: "open_ended",
      }));

      await prisma.question.createMany({
        data: manyData,
      });
    }

    return NextResponse.json(
      { gameId: game.id },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error("GAME CREATE ERROR:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/* =========================
   GET: Fetch Game
========================= */
export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const gameId = url.searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "You must provide a game id." },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { questions: true },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { game },
      { status: 200 }
    );
  } catch (error) {
    console.error("GAME FETCH ERROR:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
