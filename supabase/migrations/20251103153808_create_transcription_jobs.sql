/*
  # Tabella per gestire job di trascrizione

  1. Nuove Tabelle
    - `transcription_jobs`
      - `id` (uuid, primary key)
      - `filename` (text) - nome file originale
      - `file_size` (bigint) - dimensione in bytes
      - `status` (text) - pending, processing, completed, failed
      - `language` (text) - lingua per trascrizione
      - `total_chunks` (integer) - numero totale di chunk
      - `completed_chunks` (integer) - chunk completati
      - `transcription_text` (text) - testo finale
      - `error_message` (text) - eventuale errore
      - `storage_path` (text) - path nel storage
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sicurezza
    - RLS disabilitato per permettere accesso dalla Edge Function
    - In produzione si dovrebbe usare service role key
*/

CREATE TABLE IF NOT EXISTS transcription_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_size bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  language text NOT NULL DEFAULT 'it',
  total_chunks integer DEFAULT 0,
  completed_chunks integer DEFAULT 0,
  transcription_text text,
  error_message text,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Non abilitiamo RLS per semplificare l'accesso dalla Edge Function
-- In produzione usare service role key e policy appropriate