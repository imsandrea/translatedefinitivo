import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.68.4";

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

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
    });

    if (action === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const language = (formData.get("language") as string) || "it";

      if (!file) {
        return new Response(
          JSON.stringify({ error: "File mancante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileId = crypto.randomUUID();
      const fileName = `${fileId}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Errore upload" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      const { data: job, error: jobError } = await supabase
        .from("transcription_jobs")
        .insert({
          filename: file.name,
          file_size: file.size,
          storage_path: fileName,
          language: language,
          total_chunks: totalChunks,
          completed_chunks: 0,
          status: "pending",
        })
        .select()
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Errore creazione job" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          jobId: job.id,
          totalChunks: totalChunks,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "process-chunk") {
      const jobId = url.searchParams.get("jobId");
      const chunkIndexStr = url.searchParams.get("chunkIndex");

      if (!jobId || chunkIndexStr === null) {
        return new Response(
          JSON.stringify({ error: "jobId o chunkIndex mancante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const chunkIndex = parseInt(chunkIndexStr);

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

      if (chunkIndex === 0) {
        await supabase
          .from("transcription_jobs")
          .update({ status: "processing" })
          .eq("id", jobId);
      }

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
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
      const chunkBuffer = arrayBuffer.slice(start, end);

      const chunkBlob = new Blob([chunkBuffer], { type: "audio/mpeg" });
      const chunkFile = new File([chunkBlob], `chunk-${chunkIndex}.mp3`, { type: "audio/mpeg" });

      const transcription = await openai.audio.transcriptions.create({
        file: chunkFile,
        model: "whisper-1",
        language: job.language,
      });

      const newCompletedChunks = chunkIndex + 1;
      const isLastChunk = newCompletedChunks >= job.total_chunks;

      if (isLastChunk) {
        const { data: currentJob } = await supabase
          .from("transcription_jobs")
          .select("transcription_text")
          .eq("id", jobId)
          .single();

        const existingText = currentJob?.transcription_text || "";
        const fullText = existingText + (existingText ? " " : "") + transcription.text;

        await supabase
          .from("transcription_jobs")
          .update({
            status: "completed",
            transcription_text: fullText,
            completed_chunks: newCompletedChunks,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        await supabase.storage
          .from("audio-files")
          .remove([job.storage_path]);
      } else {
        const { data: currentJob } = await supabase
          .from("transcription_jobs")
          .select("transcription_text")
          .eq("id", jobId)
          .single();

        const existingText = currentJob?.transcription_text || "";
        const updatedText = existingText + (existingText ? " " : "") + transcription.text;

        await supabase
          .from("transcription_jobs")
          .update({
            transcription_text: updatedText,
            completed_chunks: newCompletedChunks,
          })
          .eq("id", jobId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          chunkIndex: chunkIndex,
          completed: newCompletedChunks,
          total: job.total_chunks,
          isLastChunk: isLastChunk,
          chunkText: transcription.text
        }),
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
        JSON.stringify({
          success: true,
          job: job,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Azione non valida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
