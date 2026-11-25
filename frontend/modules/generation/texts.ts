// The texts for a generation job, per content type. The flashcards texts are
// approved word for word in story 3.2, the quiz texts in story 4.1, and the
// model-card texts in story 7.1 (except the done text, which follows the others).

import { messageWithDetails } from "@/lib/messages";

import type { Job, JobKind } from "./types";

export type GenerationTexts = {
  // job-status while the job runs, and read out when it starts.
  jobText: string;
  // A failed job, whatever the code (error, time limit, restart).
  failed: (code: string | null) => string;
  // Done with fewer than chosen. Missing for a type where the student chooses
  // no scope (model cards): then fewer than requested is no message.
  fewer?: (created: number, requested: number) => string;
  // Done with nothing made.
  nothing: string;
  // Done, for the message on other pages and the end of a full job.
  done: (created: number, lectureName: string) => string;
  // Shown in the other rows while a job of this type runs in the lecture.
  waiting: string;
};

// The codes a failed job is stored with. Any other code gives the text for
// GENERATION_FAILED, so a failed job always shows the same message.
const FAILED_CODES = new Set(["GENERATION_FAILED", "GENERATION_TIMEOUT", "JOB_INTERRUPTED"]);

function failedText(content: string) {
  return (code: string | null) =>
    messageWithDetails(code && FAILED_CODES.has(code) ? code : "GENERATION_FAILED", { content });
}

export const generationTexts: Record<JobKind, GenerationTexts> = {
  flashcards: {
    jobText: "Lager flashcards …",
    failed: failedText("flashcardene"),
    fewer: (created, requested) =>
      `Det ble laget ${created} av inntil ${requested} flashcards. Notatene ga ikke grunnlag for flere.`,
    nothing: "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.",
    done: (created, lectureName) => `Flashcardene er ferdige: ${created} kort i ${lectureName}.`,
    waiting: "Venter til flashcardene er ferdige",
  },
  quiz: {
    jobText: "Lager quizspørsmål …",
    failed: failedText("quizspørsmålene"),
    fewer: (created, requested) =>
      `Det ble laget ${created} av inntil ${requested} spørsmål. Notatene ga ikke grunnlag for flere.`,
    nothing: "Notatene ga ikke grunnlag for spørsmål. Ingenting er lagret.",
    done: (created, lectureName) => `Quizspørsmålene er ferdige: ${created} spørsmål i ${lectureName}.`,
    waiting: "Venter til quizspørsmålene er ferdige",
  },
  models: {
    jobText: "Lager modellkort …",
    failed: failedText("modellkortene"),
    nothing: "Vi fant ingen modeller eller lister i denne forelesningen.",
    done: (created, lectureName) => `Modellkortene er ferdige: ${created} modellkort i ${lectureName}.`,
    waiting: "Venter til modellkortene er ferdige",
  },
};

// What a row shows about its latest job. failed: the error and «Prøv igjen».
// nothing/fewer: a calm note. complete/running: nothing.
export type JobOutcome =
  | { type: "failed"; text: string }
  | { type: "nothing"; text: string }
  | { type: "fewer"; text: string }
  | { type: "complete" }
  | { type: "running" };

export function jobOutcome(job: Job): JobOutcome {
  const texts = generationTexts[job.kind];
  if (job.status === "running") return { type: "running" };
  if (job.status === "failed") return { type: "failed", text: texts.failed(job.error_code) };
  const created = job.created ?? 0;
  if (created === 0) return { type: "nothing", text: texts.nothing };
  if (created < job.requested && texts.fewer) return { type: "fewer", text: texts.fewer(created, job.requested) };
  return { type: "complete" };
}

// The message when a job ends while the student is on another page: the
// result («Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.»), the
// nothing-made text or the error text.
export function finishedText(job: Job, lectureName: string): string {
  const texts = generationTexts[job.kind];
  if (job.status === "failed") return texts.failed(job.error_code);
  const created = job.created ?? 0;
  return created === 0 ? texts.nothing : texts.done(created, lectureName);
}
