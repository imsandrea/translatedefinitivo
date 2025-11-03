import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.63.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

const CHUNK_SIZE = 24 * 1024 * 1024;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY non configurata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "upload";

    if (action === "upload") {
      const formData = await req.formData();
      const audioFile = formData.get("file") as File;
      const language = formData.get("language") as string || "it";

      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: "File mancante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const jobId = crypto.randomUUID();
      const storagePath = `temp/${jobId}/${audioFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(storagePath, audioFile, {
          contentType: audioFile.type,
          upsert: false,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: `Errore upload: ${uploadError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalChunks = Math.ceil(audioFile.size / CHUNK_SIZE);

      const { data: job, error: dbError } = await supabase
        .from("transcription_jobs")
        .insert({
          id: jobId,
          filename: audioFile.name,
          file_size: audioFile.size,
          language,
          total_chunks: totalChunks,
          storage_path: storagePath,
          status: "pending",
        })
        .select()
        .single();

      if (dbError) {
        return new Response(
          JSON.stringify({ error: `Errore database: ${dbError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, jobId, totalChunks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "process") {
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        return new Response(
          JSON.stringify({ error: "jobId mancante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from("transcription_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Job non trovato" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("transcription_jobs")
        .update({ status: "processing" })
        .eq("id", jobId);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("audio-files")
        .download(job.storage_path);

      if (downloadError || !fileData) {
        await supabase
          .from("transcription_jobs")
          .update({ status: "failed", error_message: "Errore download file" })
          .eq("id", jobId);

        return new Response(
          JSON.stringify({ error: "Errore download file" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);
      const transcriptions: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
        const chunkBuffer = arrayBuffer.slice(start, end);

        const chunkBlob = new Blob([chunkBuffer], { type: "audio/mpeg" });
        const chunkFile = new File([chunkBlob], `chunk-${i}.mp3`, { type: "audio/mpeg" });

        const transcription = await openai.audio.transcriptions.create({
          file: chunkFile,
          model: "whisper-1",
          language: job.language,
        });

        transcriptions.push(transcription.text);

        await supabase
          .from("transcription_jobs")
          .update({ completed_chunks: i + 1 })
          .eq("id", jobId);
      }

      const fullText = transcriptions.join(" ");

      await supabase
        .from("transcription_jobs")
        .update({
          status: "completed",
          transcription_text: fullText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await supabase.storage
        .from("audio-files")
        .remove([job.storage_path]);

      return new Response(
        JSON.stringify({ success: true, text: fullText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        return new Response(
          JSON.stringify({ error: "jobId mancante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from("transcription_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Job non trovato" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, job }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Azione non valida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Errore:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
