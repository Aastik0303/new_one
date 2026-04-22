# DeepFake Detection Model

Place your TensorFlow Lite model here as `deepfake_model.tflite`.

## Getting a model

### Option 1 — Download a pre-trained FaceForensics model
```bash
# Example: MesoNet converted to TFLite
wget -O deepfake_model.tflite https://your-model-source/model.tflite
```

### Option 2 — Convert your own TF/Keras model
```python
import tensorflow as tf

# Load your trained Keras model
model = tf.keras.models.load_model("my_deepfake_model.h5")

# Convert to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

with open("deepfake_model.tflite", "wb") as f:
    f.write(tflite_model)
```

## Without a model
The API runs in **demo mode** using image statistical heuristics.
Set `DEEPFAKE_MODEL_PATH` in `.env` to point to your model file.

## Expected model I/O
- Input: `(1, H, W, 3)` float32 image normalized to [0, 1]
- Output: `(1, 2)` — [real_prob, fake_prob] OR `(1, 1)` fake probability
