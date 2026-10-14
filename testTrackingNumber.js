import { generateTrackingNumber } from "./utils/generateTrackingNumber.js";

console.log("Generated tracking numbers:");

for (let i = 0; i < 5; i++) {
console.log(generateTrackingNumber());
}
