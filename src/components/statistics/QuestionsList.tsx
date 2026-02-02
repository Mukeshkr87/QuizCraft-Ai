"use client";
import React from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Question } from "@prisma/client";

type Props = {
  questions: Question[];
};

const QuestionsList = ({ questions }: Props) => {
  if (!questions.length) {
    return <p className="mt-4 text-muted-foreground">No questions found.</p>;
  }

  const isOpenEnded = questions[0].questionType === "open_ended";

  return (
    <Table className="mt-4">
      <TableCaption>End of list.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[10px]">No.</TableHead>
          <TableHead>Question & Correct Answer</TableHead>
          <TableHead>Your Answer</TableHead>
          {isOpenEnded && (
            <TableHead className="w-[10px] text-right">Accuracy</TableHead>
          )}
        </TableRow>
      </TableHeader>

      <TableBody>
        {questions.map(
          (
            { answer, question, userAnswer, percentageCorrect, isCorrect },
            index
          ) => (
            <TableRow key={`${question}-${index}`}>
              <TableCell className="font-medium">{index + 1}</TableCell>

              <TableCell>
                {question}
                <br />
                <br />
                <span className="font-semibold">{answer}</span>
              </TableCell>

              <TableCell
                className={`font-semibold ${
                  !isOpenEnded
                    ? isCorrect
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}
              >
                {userAnswer}
              </TableCell>

              {isOpenEnded &&
                percentageCorrect !== null &&
                percentageCorrect !== undefined && (
                  <TableCell className="text-right">
                    {percentageCorrect}%
                  </TableCell>
                )}
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
};

export default QuestionsList;
