import "server-only";

import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * react-pdf's built-in Helvetica has no glyphs for č ć ž š đ and renders them
 * as blanks — silently, with no error (docs/Tech.md §8). Client names and
 * addresses will contain them, so a real TTF is mandatory.
 *
 * The files are checked in under `public/fonts/` and pulled into the deployed
 * function by `outputFileTracingIncludes` in next.config.ts; `public/` alone is
 * served by the CDN and is not present on a serverless filesystem.
 */

export const PDF_FONT_FAMILY = "Noto Sans";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

let registered = false;

export function registerPdfFonts() {
  if (registered) {
    return;
  }

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: path.join(FONT_DIR, "NotoSans-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "NotoSans-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "NotoSans-Bold.ttf"), fontWeight: 700 },
    ],
  });

  // Without this, react-pdf hyphenates long words mid-syllable; invoice
  // descriptions and addresses read better broken only at spaces.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
