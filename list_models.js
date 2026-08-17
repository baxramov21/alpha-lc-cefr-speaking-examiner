const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
(async () => {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const res = await model.generateContent("hello");
    console.log("gemini-1.5-flash-latest works:", res.response.text());
  } catch (e) {
    console.error("gemini-1.5-flash-latest failed", e.message);
  }
})();
