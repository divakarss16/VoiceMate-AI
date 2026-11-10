# VoiceMate AI – Intelligent Multilingual Voice Assistant

VoiceMate AI is a full-stack, enterprise-grade multilingual voice assistant web application powered by **Gnani.ai's** cutting-edge voice intelligence technology stack.

---

## 🌟 Architecture & Gnani AI Models

VoiceMate AI integrates with official Gnani AI models and specifications:

1. **Gnani Prisma – Speech-to-Text (STT):**
   - **Endpoint:** `POST https://api.vachana.ai/stt/v3`
   - **Header:** `X-API-Key-ID: <GNANI_API_KEY>`
   - **Supported Models:** `prisma-v3.0` (flagship India-first multilingual model supporting English + 9 Indian languages with automatic language detection `indic-auto`) and `prisma-v2.5`.
   - **Output Formats:** `transcribe` (clean text with Inverse Text Normalization), `verbatim` (filler words & exact repetition), `codemix` (native scripts), and `transliterate` (Latin characters).

2. **Gnani Timbre – Text-to-Speech (TTS):**
   - **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
   - **Header:** `X-API-Key-ID: <GNANI_API_KEY>`
   - **Supported Models:** `timbre-v3.0` (13 expressive multilingual voices supporting Indian languages and inline tags) and `timbre-v2.5` (42 voices).
   - **Voices:** *Avinash (default)*, *Chetana*, *Lakshmi*, *Devansh*, *Harshad*, *Kalpana*, *Prakash*, *Riyaa*, *Shivani*, *Shubham*, *Tarika*, *Vasudha*, *Yashraj*, *Pranav*, *Nalini*, etc.

3. **Gnani Evon 30B – AI Reasoning & Responses:**
   - **Model Details:** Evon (`gnani/gnani-evon-v3.3-30B-A3B`) is Gnani.ai's open-weights hybrid Mixture of Experts (MoE) LLM (30B total, ~3.5B active parameters).
   - **API Status & Integration:** Unlike Prisma and Timbre which have public managed cloud REST endpoints on `api.vachana.ai`, Evon 30B is released as an open-weights model on Hugging Face. The application is pre-architected to connect to any hosted Evon 30B inference endpoint via `GNANI_EVON_API_URL` and `GNANI_EVON_API_KEY`. If unconfigured, the system explicitly reports the model status without fabricating responses.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.9+
- Pip package manager
- A Gnani.ai API key from the [Gnani.ai / Vachana Developer Portal](https://api.vachana.ai)

### 2. Installation

1. Open your terminal in this directory:
   ```bash
   cd c:\Users\Divakar\Desktop\GnaniAPI
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Configure Credentials

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Open `.env` and add your Gnani.ai API credentials:
   ```env
   GNANI_API_KEY=your_actual_gnani_api_key_here
   GNANI_BASE_URL=https://api.vachana.ai

   # Optional: Configure if hosting Evon 30B weights
   # GNANI_EVON_API_URL=https://your-evon-inference-endpoint/v1/chat/completions
   # GNANI_EVON_API_KEY=your_key
   ```

### 4. Run the Application

Start the Flask server:
```bash
python app.py
```

The application will start on:
👉 **`http://127.0.0.1:5000`**

---

## 📁 Project Structure

```text
GnaniAPI/
├── app.py                     # Main Flask server and REST routing
├── requirements.txt           # Python dependencies
├── .env                       # Local environment variables (kept private)
├── .env.example               # Template environment configuration
├── .gitignore                 # Git ignore rules for keys and uploads
├── README.md                  # Documentation and API integration guide
├── services/
│   ├── __init__.py
│   ├── prisma_service.py      # Gnani Prisma STT (POST /stt/v3)
│   ├── timbre_service.py      # Gnani Timbre TTS (POST /api/v1/tts/inference)
│   └── evon_service.py        # Evon 30B reasoning & endpoint client
├── templates/
│   └── index.html             # VoiceMate AI responsive dashboard UI
└── static/
    ├── style.css              # Dark navy & purple themed design system
    └── script.js              # Frontend controller, drag-and-drop & API dispatcher
```

---

## 🔒 Security Best Practices

- **Zero Client-Side Key Exposure:** All API communication with Gnani.ai occurs on the backend Python server. Keys are never transmitted to or embedded in frontend JavaScript.
- **Environment Isolation:** Secrets are loaded via `python-dotenv` from `.env`, which is untracked by Git (`.gitignore`).
- **File Validation:** Restricts audio uploads to allowed extensions (`.wav`, `.mp3`, `.ogg`, `.flac`, `.m4a`, `.webm`) and enforces a maximum file size of 25 MB.
- **Fail-Safe Logging:** Sensitive credentials and headers are scrubbed from log statements.

