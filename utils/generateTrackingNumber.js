import { randomBytes } from "crypto";

/**

* Generates a unique-format package tracking number.
* Example: TRK-2026-A1B2C3D4E5F6
*
* @returns {string} A newly generated tracking number.
  */
  export function generateTrackingNumber() {
  const year = new Date().getFullYear();

  const uniqueCode = randomBytes(6)
  .toString("hex")
  .toUpperCase();

  return `TRK-${year}-${uniqueCode}`;
  }
