const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
(async () => {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const res = await model.generateContent("hello");
    console.log("gemini-2.5-flash-lite works:", res.response.text());
  } catch (e) {
    console.error("gemini-2.5-flash-lite failed", e.message);
  }
})();
