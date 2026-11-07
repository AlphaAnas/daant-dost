import dotenv from "dotenv";
import fs from "fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config({ path: ".env.local" }); // loads ELEVENLABS_API_KEY, so the key stays out of the code

const client = new ElevenLabsClient(); // reads ELEVENLABS_API_KEY from the environment

// Urdu script, not Roman Urdu, for better pronunciation
// Urdu script, not Roman Urdu, for better pronunciation
const text =
  "السلام علیکم! میں دانت دوست ہوں، آپ کا دانتوں کی دیکھ بھال کا ساتھی۔ " +
  "براہِ مہربانی مجھے بتائیں کہ آپ کے دانت یا جبڑے میں درد کب سے ہے، " +
  "کیا ٹھنڈا یا گرم پینے سے درد بڑھتا ہے، اور کیا آپ کے چہرے پر سوجن یا بخار بھی ہے؟ " +
  "اگر سانس لینے یا نگلنے میں مشکل ہو تو فوراً ایمرجنسی جائیں۔ " +
  "میں ڈاکٹر کی جگہ نہیں لیتا، بلکہ آپ کو صحیح وقت پر صحیح مدد تک پہنچانے میں مدد کرتا ہوں۔";

const audio = await client.textToSpeech.convert("cgSgspJ2msm6clMCkdW9", {
  text,
  modelId: "eleven_v3", // if rejected on your plan, use "eleven_multilingual_v2"
  outputFormat: "mp3_44100_128",
});

const chunks = [];
for await (const chunk of audio) chunks.push(chunk);
fs.writeFileSync("reply.mp3", Buffer.concat(chunks));

console.log("Saved reply.mp3");