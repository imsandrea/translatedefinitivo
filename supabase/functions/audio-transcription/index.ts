import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.63.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY non configurata. Contatta l'amministratore."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const formData = await req.formData();
    const audioFile = formData.get("file") as File;
    const language = formData.get("language") as string || "it";
    const prompt = formData.get("prompt") as string || "";

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "File audio mancante" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica dimensione file (max 25MB per Whisper)
    const maxSize = 25 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return new Response(
        JSON.stringify({ 
          error: "File troppo grande. Massimo 25MB.",
          needsChunking: true,
          fileSize: audioFile.size
        }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Trascrizione con OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: language,
      prompt: prompt || undefined,
      response_format: "verbose_json",
    });

    return new Response(
      JSON.stringify({
        success: true,
        text: transcription.text,
        segments: transcription.segments || [],
        duration: transcription.duration,
        language: transcription.language,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Errore trascrizione:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Errore durante la trascrizione"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
