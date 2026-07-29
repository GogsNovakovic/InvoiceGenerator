import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Lazy singleton — instancira se tek pri prvom slanju, da build ne puca
 * ako `RESEND_API_KEY` nije postavljen u okolini u kojoj se gradi.
 */
export const getResend = () => {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY nije postavljen — provjeri .env.local");
    }
    client = new Resend(apiKey);
  }
  return client;
};

export const RESEND_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
