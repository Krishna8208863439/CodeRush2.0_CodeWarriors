"""
Community Redressal Planner — Model Download Script
=====================================================
Run this script once to download all required open-source model weights.
Models are saved to ./models/ directory relative to ai-service/.

Usage:
    cd ai-service
    python scripts/download_models.py

Requirements: pip install -r requirements.txt
"""

import os
import sys

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def download_sentence_transformers():
    print("\n[1/4] Downloading Sentence-Transformers (all-MiniLM-L6-v2)...")
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        save_path = os.path.join(MODELS_DIR, "all-MiniLM-L6-v2")
        model.save(save_path)
        print(f"  ✅ Saved to {save_path}")
    except ImportError:
        print("  ❌ sentence-transformers not installed. Run: pip install sentence-transformers")
    except Exception as e:
        print(f"  ❌ Failed: {e}")


def download_spacy():
    print("\n[2/4] Downloading spaCy en_core_web_sm...")
    ret = os.system(f"{sys.executable} -m spacy download en_core_web_sm")
    if ret == 0:
        print("  ✅ spaCy en_core_web_sm downloaded")
    else:
        print("  ❌ spaCy download failed. Run: python -m spacy download en_core_web_sm")


def download_whisper():
    print("\n[3/4] Downloading Whisper base model...")
    try:
        import whisper
        whisper_dir = os.path.join(MODELS_DIR, "whisper")
        os.makedirs(whisper_dir, exist_ok=True)
        model = whisper.load_model("base", download_root=whisper_dir)
        print(f"  ✅ Whisper base saved to {whisper_dir}")
    except ImportError:
        print("  ❌ openai-whisper not installed. Run: pip install openai-whisper")
    except Exception as e:
        print(f"  ❌ Failed: {e}")


def check_distilbert():
    print("\n[4/4] Checking DistilBERT classifier...")
    distilbert_dir = os.path.join(MODELS_DIR, "distilbert")
    if os.path.isdir(distilbert_dir):
        print(f"  ✅ Custom DistilBERT found at {distilbert_dir}")
    else:
        print(f"  ⚠️  No fine-tuned DistilBERT found at {distilbert_dir}")
        print("     The AI service will use keyword-based classification as fallback.")
        print("     To use real classification: place fine-tuned HuggingFace model weights in ./models/distilbert/")
        print("     Training guide: see docs/ARCHITECTURE.md section 'AI Model Training'")


if __name__ == "__main__":
    print("=" * 60)
    print("Community Redressal Planner — Model Setup")
    print("=" * 60)

    download_sentence_transformers()
    download_spacy()
    download_whisper()
    check_distilbert()

    print("\n" + "=" * 60)
    print("Model setup complete. Start the AI service with:")
    print("  uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print("=" * 60)
