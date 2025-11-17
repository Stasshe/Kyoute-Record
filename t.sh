curl -v -X PATCH "https://lspwqbkpigbpogysouxh.supabase.co/rest/v1/grades?id=eq.3&user_id=eq.40eb0f1e-232b-467b-b795-c20a01771a6b&select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcHdxYmtwaWdicG9neXNvdXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjcwOTAsImV4cCI6MjA3ODkwMzA5MH0.Jq-tvu3JIrAsTKv1DYofVgk0-tmgjginlkBlCzg_IwQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcHdxYmtwaWdicG9neXNvdXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjcwOTAsImV4cCI6MjA3ODkwMzA5MH0.Jq-tvu3JIrAsTKv1DYofVgk0-tmgjginlkBlCzg_IwQ" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-11-17","subject":"Math IA","score":8}'