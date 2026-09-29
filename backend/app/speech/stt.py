"""Speech-to-Text service using Groq's Whisper API.

Uses Groq's cloud-based Whisper instead of local faster-whisper
to avoid ffmpeg dependency and provide faster transcription.
"""
import tempfile
import os
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class STTService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        if not self.api_key:
            logger.error("GROQ_API_KEY not set — STT will not work")

    async def transcribe_async(self, audio_data: bytes, language: str = None) -> dict:
        """Transcribe audio using Groq's Whisper API (async).
        
        Supports: webm, wav, mp3, ogg, flac, m4a, mp4
        """
        if not self.api_key:
            return {"text": "", "language": language or "en"}

        if not audio_data or len(audio_data) < 100:
            logger.warning(f"Audio data too small ({len(audio_data)} bytes)")
            return {"text": "", "language": language or "en"}

        # Detect format from header
        ext = self._detect_format(audio_data)
        mime_t = self._mime_type(ext)
        hex_header = audio_data[:32].hex()

        _stt_debug = (
            f"[Voice Debug] STT incoming:\n"
            f"  total_bytes  : {len(audio_data)}\n"
            f"  detected_ext : {ext}\n"
            f"  mime_type    : {mime_t}\n"
            f"  language     : {language}\n"
            f"  first_32_hex : {hex_header}"
        )
        logger.info(_stt_debug)
        print(_stt_debug, flush=True)  # [Voice Debug] force stdout

        # Save to temp file
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(audio_data)
                tmp_path = tmp.name
            print(f"[Voice Debug] Temp file path: {os.path.abspath(tmp_path)}", flush=True)  # [Voice Debug] force stdout

            # Save persistent debug copy (overwrites on every request — local debugging only)
            debug_wav_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "temp_debug.wav")
            debug_wav_path = os.path.normpath(debug_wav_path)
            try:
                with open(debug_wav_path, "wb") as f_debug:
                    f_debug.write(audio_data)
                print(f"[Voice Debug] Persistent copy saved: {debug_wav_path}", flush=True)  # [Voice Debug] force stdout
            except Exception as dbg_err:
                print(f"[Voice Debug] Could not save temp_debug.wav: {dbg_err}", flush=True)  # [Voice Debug] force stdout

            # Call Groq Whisper API
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(tmp_path, "rb") as f:
                    files = {"file": (f"audio{ext}", f, self._mime_type(ext))}
                    data = {
                        "model": "whisper-large-v3",
                        "response_format": "json",
                    }
                    if language:
                        lang_map = {"en": "en", "hi": "hi", "te": "te"}
                        if language in lang_map:
                            data["language"] = lang_map[language]

                    resp = await client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        files=files,
                        data=data,
                    )

                if resp.status_code == 200:
                    result = resp.json()
                    print(f"[Voice Debug] Groq raw JSON response: {result}", flush=True)  # [Voice Debug] force stdout
                    text = result.get("text", "").strip()
                    logger.info(f"STT result: '{text[:80]}'")
                    print(f"[Voice Debug] Processed STT text after strip(): '{text}'", flush=True)  # [Voice Debug] force stdout
                    return {"text": text, "language": language or "en"}
                else:
                    _err = f"[Voice Debug] Groq Whisper API error {resp.status_code}: {resp.text}"
                    logger.error(_err)
                    print(_err, flush=True)  # [Voice Debug] force stdout
                    return {"text": "", "language": language or "en"}

        except httpx.TimeoutException:
            logger.error("Groq Whisper API timeout")
            return {"text": "", "language": language or "en"}
        except Exception as e:
            logger.error(f"STT error: {e}", exc_info=True)
            return {"text": "", "language": language or "en"}
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    def transcribe(self, audio_data: bytes, language: str = None) -> dict:
        """Sync wrapper — use transcribe_async instead when possible."""
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # We're in an async context, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(
                    asyncio.run, self.transcribe_async(audio_data, language)
                ).result(timeout=30)
        else:
            return asyncio.run(self.transcribe_async(audio_data, language))

    def _detect_format(self, data: bytes) -> str:
        if data[:4] == b'RIFF':
            return '.wav'
        elif data[:4] == b'OggS':
            return '.ogg'
        elif data[:4] == b'\x1aE\xdf\xa3':
            return '.webm'
        elif data[:3] == b'ID3' or data[:2] == b'\xff\xfb':
            return '.mp3'
        elif data[:4] == b'fLaC':
            return '.flac'
        return '.webm'  # Default for browser recordings

    def _mime_type(self, ext: str) -> str:
        return {
            '.wav': 'audio/wav',
            '.webm': 'audio/webm',
            '.ogg': 'audio/ogg',
            '.mp3': 'audio/mpeg',
            '.flac': 'audio/flac',
            '.m4a': 'audio/mp4',
        }.get(ext, 'audio/webm')
