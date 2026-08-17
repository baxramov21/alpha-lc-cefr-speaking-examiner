const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
(async () => {
  for (const modelName of ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite"]) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const res = await model.generateContent("hello");
      console.log(modelName, "works:", res.response.text().slice(0, 20));
    } catch (e) {
      console.error(modelName, "failed:", e.message);
    }
  }
})();
