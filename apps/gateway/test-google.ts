async function main() {
  const apiKey = "AIzaSyAKCqOmoA_-AYyHO3Qsd3EoWv-L8pURcYk"; // Key 1
  const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  
  const models = [
    "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", 
    "gemini-3.1-flash-lite", "gemini-3-flash-preview", 
    "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"
  ];

  for (const model of models) {
    console.log(`\nTesting ${model}...`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Test" }]
        })
      });

      console.log(`Status for ${model}: ${res.status}`);
      if (res.status !== 404 && res.status !== 429) {
        const text = await res.text();
        console.log("Response:", text);
      }
    } catch (err: any) {
      console.log(`Error testing ${model}:`, err.message);
    }
  }
}
main();
