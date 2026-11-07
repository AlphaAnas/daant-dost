import dotenv from "dotenv";
import fs from "fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config({ path: ".env.local" }); // loads ELEVENLABS_API_KEY, so the key stays out of the code

const client = new ElevenLabsClient(); // reads ELEVENLABS_API_KEY from the environment

// Pass generated text as command-line arguments, or pipe it through stdin.
const text = process.argv.slice(2).join(" ").trim() || (process.stdin.isTTY
  ? ""
  : await new Promise((resolve, reject) => {
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => resolve(input.trim()));
      process.stdin.on("error", reject);
    }));

if (!text) {
  console.error('Provide text as an argument or pipe it in, e.g. node elevenlabstts.mjs "سلام"');
  process.exit(1);
}

const audio = await client.textToSpeech.convert("cgSgspJ2msm6clMCkdW9", {
  text,
  modelId: "eleven_v3", // if rejected on your plan, use "eleven_multilingual_v2"
  outputFormat: "mp3_44100_128",
});

const chunks = [];
for await (const chunk of audio) chunks.push(chunk);
fs.writeFileSync("reply.mp3", Buffer.concat(chunks));

console.log("Saved reply.mp3");