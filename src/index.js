const SYSTEM_PROMPT = `You are Nexora AI, a helpful, clear, and thoughtful general-purpose assistant. Give accurate, practical answers in friendly language. If you are unsure, say so rather than inventing facts. Keep answers concise unless the user asks for detail. Do not claim to have performed actions you cannot perform.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed." }, { status: 405 });
      }

      try {
        const body = await request.json();
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return Response.json({ error: "Please enter a message." }, { status: 400 });
        }

        const messages = body.messages.slice(-12).map((item) => {
          if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
            throw new Error("Invalid chat message.");
          }
          return {
            role: item.role,
            content: item.content.slice(0, 2000)
          };
        });

        if (messages[messages.length - 1].role !== "user") {
          return Response.json({ error: "The latest message must be from the user." }, { status: 400 });
        }

        const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages
          ],
          max_tokens: 700
        });

        const reply = result?.response;
        if (typeof reply !== "string" || !reply.trim()) {
          throw new Error("The AI model returned an empty response.");
        }

        return Response.json({ reply: reply.trim() });
      } catch (error) {
        console.error("Nexora AI chat error:", error);
        return Response.json(
          { error: "Nexora AI couldn't respond right now. Check your Workers AI setup and try again." },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};