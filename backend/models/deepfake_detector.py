"""
models/deepfake_detector.py — TFLite Deep Fake Detection
"""
from __future__ import annotations
import io, os, base64
from pathlib import Path
import numpy as np
from PIL import Image
from config import get_settings

settings = get_settings()

# Image preprocessing constants
IMG_SIZE = (128, 128)
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _preprocess_image(img: Image.Image) -> np.ndarray:
    """Resize, normalise, and add batch dimension."""
    img = img.convert("RGB").resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    return arr[np.newaxis, ...]  # (1, H, W, 3)


class DeepFakeDetector:
    """Wraps a TFLite model for fake/real image classification."""

    def __init__(self):
        self._interpreter = None
        self._input_details = None
        self._output_details = None
        self._model_available = False
        self._load_model()

    def _load_model(self):
        model_path = settings.deepfake_model_path
        if not Path(model_path).exists():
            # Use a mock/fallback when model file isn't present
            self._model_available = False
            return

        try:
            import tflite_runtime.interpreter as tflite
        except ImportError:
            try:
                import tensorflow as tf
                tflite = tf.lite
            except ImportError:
                self._model_available = False
                return

        self._interpreter = tflite.Interpreter(model_path=model_path)
        self._interpreter.allocate_tensors()
        self._input_details = self._interpreter.get_input_details()
        self._output_details = self._interpreter.get_output_details()
        self._model_available = True

    def _mock_predict(self, img: Image.Image) -> float:
        """
        Fallback heuristic when no TFLite model is present.
        Analyses basic image statistics as a proxy.
        """
        arr = np.array(img.convert("RGB"), dtype=np.float32) / 255.0
        # Real images tend to have more natural colour variance
        std = float(arr.std())
        channel_diff = float(abs(arr[:,:,0].mean() - arr[:,:,2].mean()))
        # Heuristic score (not reliable — replace with real model)
        score = min(max(0.3 + channel_diff * 2 - std * 0.5, 0.0), 1.0)
        return score

    async def predict(self, image_bytes: bytes) -> dict:
        """Run inference and return result dict."""
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size

        if self._model_available and self._interpreter:
            arr = _preprocess_image(img).astype(np.float32)
            self._interpreter.set_tensor(self._input_details[0]["index"], arr)
            self._interpreter.invoke()
            output = self._interpreter.get_tensor(self._output_details[0]["index"])
            # Assume output shape (1,) or (1, 2) with fake probability at index 1
            if output.shape[-1] == 2:
                fake_prob = float(output[0][1])
            else:
                fake_prob = float(output[0][0])
            model_used = "tflite"
        else:
            fake_prob = self._mock_predict(img)
            model_used = "heuristic (no model file)"

        threshold = settings.deepfake_threshold
        is_fake = fake_prob >= threshold
        confidence = fake_prob if is_fake else (1.0 - fake_prob)

        return {
            "is_fake": is_fake,
            "fake_probability": round(fake_prob, 4),
            "real_probability": round(1.0 - fake_prob, 4),
            "confidence": round(confidence * 100, 2),
            "verdict": "🚨 DEEPFAKE DETECTED" if is_fake else "✅ LIKELY AUTHENTIC",
            "model_used": model_used,
            "image_dimensions": {"width": w, "height": h},
            "threshold": threshold,
            "risk_level": (
                "HIGH" if fake_prob > 0.8
                else "MEDIUM" if fake_prob > 0.5
                else "LOW"
            ),
        }
