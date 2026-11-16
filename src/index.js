export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.json({
        name: "Nexora AI",
        status: "online",
        message: "Welcome to Nexora AI"
      }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { message } = await request.json();

        if (!message || typeof message !== "string") {
          return Response.json(
            { error: "Please enter a message." },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: [
              {
                role: "system",
                content: "You are Nexora AI, a helpful and friendly AI assistant."
              },
              {
                role: "user",
                content: message
              }
            ]
          }
        );

        return Response.json({
          success: true,
          reply: result.response
        }, { headers: corsHeaders });

      } catch (error) {
        return Response.json({
          error: "AI request failed. Please try again."
        }, { status: 500, headers: corsHeaders });
      }
    }

    return Response.json(
      { error: "Route not found" },
      { status: 404, headers: corsHeaders }
    );
  }
};
