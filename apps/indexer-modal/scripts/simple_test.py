#!/usr/bin/env python3
"""Simple test to check basic functionality."""

import os
import sys
from pathlib import Path

def check_environment():
    """Check if environment is set up correctly."""
    print("🔍 Checking environment setup...")
    
    # Check .env file
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    print("✅ .env file found")
    
    # Load and check environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            # Mask sensitive values for display
            masked = value[:8] + "..." if len(value) > 8 else "***"
            print(f"✅ {var}: {masked}")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    return True


def check_dependencies():
    """Check if key dependencies are available."""
    print("\n📦 Checking dependencies...")
    
    deps = [
        "modal",
        "httpx", 
        "google.generativeai",
        "psycopg2",
        "opencv-python",
        "PIL",
        "langchain",
        "dotenv"
    ]
    
    failed = []
    for dep in deps:
        try:
            if dep == "opencv-python":
                import cv2
            elif dep == "PIL":
                import PIL
            elif dep == "dotenv":
                import dotenv
            else:
                __import__(dep)
            print(f"✅ {dep}")
        except ImportError as e:
            print(f"❌ {dep}: {e}")
            failed.append(dep)
    
    return len(failed) == 0


def check_project_structure():
    """Check if project structure is correct."""
    print("\n📁 Checking project structure...")
    
    required_files = [
        "src/core/interfaces.py",
        "src/core/exceptions.py",
        "src/services/downloader.py",
        "src/services/scene_detector.py",
        "src/services/transcriber.py",
        "src/services/vision_analyzer.py",
        "src/services/vector_store.py",
        "src/services/progress_tracker.py",
        "src/services/database.py",
        "src/indexer/video_indexer.py",
        "src/api/main.py",
        "requirements.txt"
    ]
    
    missing = []
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path}")
            missing.append(file_path)
    
    return len(missing) == 0


def test_basic_imports():
    """Test basic imports without running the full indexer."""
    print("\n🧪 Testing basic imports...")
    
    # Add src to path
    src_path = Path("src")
    if src_path.exists():
        sys.path.insert(0, str(src_path))
    
    try:
        # Test core imports
        from core.interfaces import Asset, AssetType, IndexingStatus
        from core.exceptions import VideoIndexingError
        print("✅ Core interfaces imported")
        
        # Test a simple service import
        from shared.logging import get_logger
        logger = get_logger("test")
        print("✅ Logging imported")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False


def main():
    """Run all checks."""
    print("🧪 OpenVideo Modal Indexer - Simple Test Suite")
    print("=" * 60)
    
    tests = [
        ("Environment Setup", check_environment),
        ("Dependencies", check_dependencies), 
        ("Project Structure", check_project_structure),
        ("Basic Imports", test_basic_imports),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} failed: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n📊 Test Results Summary")
    print("=" * 30)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 Basic setup looks good!")
        print("Next steps:")
        print("1. Fix any import issues in the services")
        print("2. Test with actual Modal deployment")
        print("3. Update langchain imports for newer versions")
    else:
        print("\n⚠️  Some setup issues need to be resolved.")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
