#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Model Download Script -- Community Redressal Planner
=====================================================
Run this once to download all required ML model weights.

Usage:
    cd ai-service
    pip install -r requirements.txt
    python scripts/download_models.py
"""

import os
import sys

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def download_spacy():
    print("\n[1/4] Downloading spaCy English model (en_core_web_sm)...")
    try:
        import spacy
        os.system(f"{sys.executable} -m spacy download en_core_web_sm")
        print("[OK] spaCy en_core_web_sm ready")
    except ImportError:
        print("[FAIL] spaCy not installed. Run: pip install spacy")


def download_sentence_transformers():
    print("\n[2/4] Downloading Sentence-Transformers (all-MiniLM-L6-v2)...")
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        save_path = os.path.join(MODELS_DIR, "all-MiniLM-L6-v2")
        model.save(save_path)
        print("[OK] Sentence-Transformers saved to: " + save_path)
    except ImportError:
        print("[FAIL] sentence-transformers not installed. Run: pip install sentence-transformers")
    except Exception as e:
        print("[FAIL] Sentence-Transformers download error: " + str(e))


def download_whisper():
    print("\n[3/4] Downloading Whisper STT (base model, ~145 MB)...")
    try:
        import whisper
        whisper_dir = os.path.join(MODELS_DIR, "whisper")
        os.makedirs(whisper_dir, exist_ok=True)
        whisper.load_model("base", download_root=whisper_dir)
        print("[OK] Whisper base model saved to: " + whisper_dir)
    except ImportError:
        print("[FAIL] openai-whisper not installed. Run: pip install openai-whisper")
    except Exception as e:
        print("[FAIL] Whisper download error: " + str(e))


def verify_langdetect():
    print("\n[4/4] Verifying langdetect...")
    try:
        from langdetect import detect
        test_result = detect("The road has a large pothole")
        print("[OK] langdetect working. Test detection: '" + test_result + "'")
    except ImportError:
        print("[FAIL] langdetect not installed. Run: pip install langdetect")
    except Exception as e:
        print("[FAIL] langdetect error: " + str(e))


if __name__ == "__main__":
    print("=" * 60)
    print("Community Redressal Planner -- Model Setup")
    print("=" * 60)

    download_spacy()
    download_sentence_transformers()
    download_whisper()
    verify_langdetect()

    print("\n" + "=" * 60)
    print("Model setup complete.")
    print("")
    print("Remaining models that require manual training/download:")
    print("  * ./models/distilbert   -- Fine-tuned complaint classifier")
    print("  * ./models/xgboost.json -- Priority prediction model")
    print("  * ./models/yolov8.pt    -- YOLOv8 object detection weights")
    print("These will return {'not_yet_available': True} until provided.")
    print("=" * 60)
