"""Piper TTS Text-to-Speech service."""
import subprocess
import tempfile
import os
import struct
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)


class TTSService:
    _instance = None
    VOICE_MODELS = {
        "en": "en_US-lessac-medium",
        "hi": "hi_IN-swara-medium",
        "te": "te_IN-sudha-medium"
    }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.models_dir = Path(settings.PIPER_MODELS_DIR)
        if not self.models_dir.is_absolute():
            self.models_dir = Path(__file__).resolve().parent.parent.parent / self.models_dir
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def synthesize(self, text: str, language: str = "en") -> bytes:
        voice = self.VOICE_MODELS.get(language, self.VOICE_MODELS["en"])
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            cmd = ["piper", "--model", voice, "--data-dir", str(self.models_dir), "--output_file", tmp_path]
            process = subprocess.run(cmd, input=text.encode("utf-8"), capture_output=True, timeout=30)
            if process.returncode != 0:
                logger.warning(f"Piper TTS failed: {process.stderr.decode()}")
                return self._generate_silence()
            with open(tmp_path, "rb") as f:
                return f.read()
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            logger.warning(f"Piper TTS unavailable: {e}")
            return self._generate_silence()
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return self._generate_silence()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def _generate_silence(self) -> bytes:
        sample_rate = 22050
        num_samples = int(sample_rate * 0.1)
        data_size = num_samples * 2
        header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF', 36 + data_size, b'WAVE', b'fmt ', 16, 1, 1,
            sample_rate, sample_rate * 2, 2, 16, b'data', data_size
        )
        return header + b'\x00' * data_size

    def get_available_voices(self) -> dict:
        return self.VOICE_MODELS
