import io
import os
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import cv2

router = APIRouter(prefix="/api/deepfake", tags=["deepfake"])

# Try to load TFLite model
_interpreter = None

def get_interpreter():
    global _interpreter
    if _interpreter is not None:
        return _interpreter

    model_path = os.getenv("DEEPFAKE_MODEL_PATH", "models/deepfake_model.tflite")

    if not os.path.exists(model_path):
        return None

    try:
        try:
            import tflite_runtime.interpreter as tflite
            _interpreter = tflite.Interpreter(model_path=model_path)
        except ImportError:
            import tensorflow as tf
            _interpreter = tf.lite.Interpreter(model_path=model_path)
        _interpreter.allocate_tensors()
        return _interpreter
    except Exception as e:
        print(f"Failed to load TFLite model: {e}")
        return None


def preprocess_image(image: Image.Image, size: tuple = (224, 224)) -> np.ndarray:
    image = image.convert("RGB").resize(size)
    arr = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def simulate_prediction(image: Image.Image) -> dict:
    """Fallback: use basic image statistics as a heuristic demo."""
    arr = np.array(image.convert("RGB"), dtype=np.float32)
    # Simple heuristic based on noise & color distribution
    noise = np.std(arr)
    color_variance = np.var(arr.mean(axis=(0, 1)))
    score = float(np.clip((noise / 80.0 + color_variance / 5000.0) / 2.0, 0.0, 1.0))
    fake_prob = 1.0 - score  # just a demo
    return {
        "fake_probability": round(fake_prob, 4),
        "real_probability": round(1.0 - fake_prob, 4),
        "verdict": "FAKE" if fake_prob > 0.5 else "REAL",
        "confidence": round(abs(fake_prob - 0.5) * 200, 1),
        "model_used": "heuristic_demo",
    }


@router.post("/detect")
async def detect_deepfake(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are supported.")

    content = await file.read()
    try:
        image = Image.open(io.BytesIO(content))
    except Exception:
        raise HTTPException(400, "Invalid image file.")

    interpreter = get_interpreter()

    if interpreter is None:
        # Use simulation mode
        result = simulate_prediction(image)
        result["note"] = "Running in demo mode. Place a TFLite model at models/deepfake_model.tflite for real detection."
        return JSONResponse(result)

    try:
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        input_shape = tuple(input_details[0]["shape"][1:3])
        tensor = preprocess_image(image, size=input_shape)

        interpreter.set_tensor(input_details[0]["index"], tensor)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]["index"])[0]

        if len(output) >= 2:
            fake_prob = float(output[1])
            real_prob = float(output[0])
        else:
            fake_prob = float(output[0])
            real_prob = 1.0 - fake_prob

        return {
            "fake_probability": round(fake_prob, 4),
            "real_probability": round(real_prob, 4),
            "verdict": "FAKE" if fake_prob > 0.5 else "REAL",
            "confidence": round(abs(fake_prob - 0.5) * 200, 1),
            "model_used": "tflite_model",
        }
    except Exception as e:
        raise HTTPException(500, f"Model inference failed: {str(e)}")


@router.get("/status")
async def model_status():
    interpreter = get_interpreter()
    return {
        "model_loaded": interpreter is not None,
        "model_path": os.getenv("DEEPFAKE_MODEL_PATH", "models/deepfake_model.tflite"),
        "mode": "tflite" if interpreter else "demo",
    }
