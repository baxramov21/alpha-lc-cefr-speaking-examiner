const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("No API key"); process.exit(1); }
const genAI = new GoogleGenerativeAI(apiKey);
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Extract 1 to 3 main visual keywords from: Describe a time when you or someone you know helped to protect the environment. Return ONLY the keywords separated by spaces.");
    const response = await result.response;
    console.log("Success:", response.text().trim());
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
