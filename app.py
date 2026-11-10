import os
import time
import logging
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from services.prisma_service import PrismaService
from services.timbre_service import TimbreService
from services.evon_service import EvonService

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "default-secret-voicemate-2026")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
GENERATED_FOLDER = os.path.join(BASE_DIR, "generated_audio")
ALLOWED_EXTENSIONS = {"wav", "mp3", "ogg", "flac", "m4a", "webm"}
MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["GENERATED_FOLDER"] = GENERATED_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

# Initialize services
prisma_service = PrismaService()
timbre_service = TimbreService(output_dir=GENERATED_FOLDER)
evon_service = EvonService()

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/config-status", methods=["GET"])
def config_status():
    """Returns the configuration and readiness status of services."""
    has_api_key = bool(os.getenv("GNANI_API_KEY", "").strip())
    evon_configured = evon_service.is_configured()
    
    return jsonify({
        "gnani_api_key_configured": has_api_key,
        "base_url": os.getenv("GNANI_BASE_URL", "https://api.vachana.ai"),
        "models": {
            "prisma": {
                "name": "Prisma v3.0 / v2.5",
                "type": "Speech-to-Text (STT)",
                "status": "Ready (API Key Present)" if has_api_key else "Missing API Key"
            },
            "timbre": {
                "name": "Timbre v3.0 / v2.5",
                "type": "Text-to-Speech (TTS)",
                "status": "Ready (API Key Present)" if has_api_key else "Missing API Key"
            },
            "evon": {
                "name": "Evon 30B (A3B)",
                "type": "Open-weights Reasoning LLM",
                "status": "Configured Endpoint" if evon_configured else "Self-host / Endpoint Required"
            }
        }
    })

@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    """Endpoint to handle audio file upload and Prisma transcription."""
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "No audio file provided in request."}), 400

    file = request.files["audio"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No selected audio file."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False, 
            "error": f"Unsupported audio format. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400

    model = request.form.get("model", "prisma-v3.0")
    language_code = request.form.get("language_code", "indic-auto")
    output_format = request.form.get("format", "transcribe")
    keyterms = request.form.get("keyterms", "").strip()
    topic = request.form.get("topic", "").strip()

    original_filename = secure_filename(file.filename)
    timestamp = int(time.time())
    saved_filename = f"{timestamp}_{original_filename}"
    saved_path = os.path.join(app.config["UPLOAD_FOLDER"], saved_filename)
    
    file.save(saved_path)
    file_size_bytes = os.path.getsize(saved_path)

    result = prisma_service.transcribe_audio(
        audio_file_path=saved_path,
        model=model,
        language_code=language_code,
        output_format=output_format,
        keyterms=keyterms if keyterms else None,
        topic=topic if topic else None
    )

    result["original_filename"] = original_filename
    result["file_size_bytes"] = file_size_bytes

    status_code = 200 if result.get("success") else result.get("status_code", 400)
    return jsonify(result), status_code

@app.route("/api/ask", methods=["POST"])
def ask_ai():
    """Endpoint to process AI questions using Evon 30B."""
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "").strip()

    if not prompt:
        return jsonify({"success": False, "error": "Please provide a valid question or prompt."}), 400

    result = evon_service.generate_response(prompt=prompt)
    status_code = 200 if result.get("success") else result.get("status_code", 400)
    return jsonify(result), status_code

@app.route("/api/synthesize", methods=["POST"])
def synthesize():
    """Endpoint to convert text into speech using Timbre."""
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    voice = data.get("voice", "Avinash")
    model = data.get("model", "timbre-v3.0")
    speed = float(data.get("speed", 1.0))

    if not text:
        return jsonify({"success": False, "error": "Please provide text to convert to speech."}), 400

    result = timbre_service.synthesize_speech(
        text=text,
        voice=voice,
        model=model,
        speed=speed
    )

    status_code = 200 if result.get("success") else result.get("status_code", 400)
    return jsonify(result), status_code

@app.route("/audio/generated/<path:filename>")
def serve_generated_audio(filename):
    """Serve synthesized audio files."""
    return send_from_directory(app.config["GENERATED_FOLDER"], filename)

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "success": False,
        "error": "The uploaded audio file exceeds the maximum allowed size (25 MB)."
    }), 413

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting VoiceMate AI server on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=True)

