# mega-agency-litelm

Lite proxy server for Google Gemini (Generative AI). Deploy on Render, set GEMINI_API_KEY in Environment.

## Endpoints

- `GET /health` - health check
- `POST /chat/completions` - JSON { messages: [{role, content}], temperature, max_tokens }
- `POST /raw` - passthrough raw request body to Gemini generateContent endpoint

## Render
- Use Dockerfile (provided)
- Expose port 8000 (Render will set PORT)
- Add environment variables: GEMINI_API_KEY, MODEL (optional)
