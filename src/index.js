const SYSTEM_PROMPT = `You are Nexora AI, a capable and responsible general-purpose assistant.
- Understand the user's goal and answer the question they actually asked.
- Be accurate, practical, friendly, and clear. Use simple language unless technical detail is requested.
- For complex tasks, use short headings and numbered steps.
- Explain reasoning at a helpful level; show calculations and examples when useful.
- For coding, name the language, provide complete runnable examples when practical, explain where code belongs, and note assumptions or likely errors.
- Use consistent Markdown: headings, bullets, bold key terms, and fenced code blocks for code.
- If a request is ambiguous, ask one focused clarification instead of guessing.
- If unsure, say so. Never invent facts, sources, test results, or capabilities.
- Distinguish facts from estimates and suggestions. Mention important limitations.
- Do not claim to browse, deploy, access accounts, or perform external actions unless tools actually did so.
- Protect privacy. Never ask for passwords or API keys; remind users not to share sensitive information.
- Stay focused and avoid unnecessary introductions.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
      try {
        const body = await request.json();
        if (!Array.isArray(body.messages) || body.messages.length === 0) return Response.json({ error: "Please enter a message." }, { status: 400 });
        const messages = body.messages.slice(-12).map((item) => {
          if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") throw new Error("Invalid chat message.");
          return { role: item.role, content: item.content.slice(0, 2000) };
        });
        if (messages[messages.length - 1].role !== "user") return Response.json({ error: "The latest message must be from the user." }, { status: 400 });
        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          max_tokens: 900
        });
        const reply = result?.response;
        if (typeof reply !== "string" || !reply.trim()) throw new Error("The AI model returned an empty response.");
        return Response.json({ reply: reply.trim() });
      } catch (error) {
        console.error("Nexora AI chat error:", error);
        return Response.json({ error: "Nexora AI is temporarily unavailable. Check your Workers AI setup and try again." }, { status: 500 });
      }
    }
    return env.ASSETS.fetch(request);
  }
};