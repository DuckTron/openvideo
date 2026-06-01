#!/usr/bin/env python3
"""Simple local test without import issues."""

import os
import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
os.chdir(str(Path(__file__).parent.parent / "src"))

# Load environment
from dotenv import load_dotenv
load_dotenv()

from shared.logging import setup_logging, get_logger

# Setup logging
setup_logging(level="INFO")
logger = get_logger("test_simple_local")

# Test assets
TEST_SPACE_ID = "00053fc1-6fce-4bd9-9693-3da01db5bc28"
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"


async def test_database_connection():
    """Test database connection."""
    logger.info("🔗 Testing database connection...")
    
    try:
        from services.database import PostgreSQLClient
        db_client = PostgreSQLClient()
        
        # Test connection by trying to get the specific asset
        asset = await db_client.get_asset(TEST_ASSET_ID)
        
        if asset:
            logger.info(f"✅ Found asset: {asset.name}")
            logger.info(f"   Type: {asset.type}")
            logger.info(f"   Source: {asset.src}")
            logger.info(f"   Space: {asset.space_id}")
            return True
        else:
            logger.warning(f"⚠️  Asset {TEST_ASSET_ID} not found, but connection works")
            return True
            
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        return False


async def test_ai_services():
    """Test AI service configuration."""
    logger.info("🤖 Testing AI services...")
    
    try:
        # Test Gemini
        from services.vision_analyzer import GeminiVisionAnalyzer
        analyzer = GeminiVisionAnalyzer()
        logger.info("✅ Gemini AI configured")
        
        # Test Deepgram
        from services.transcriber import DeepgramTranscriber
        transcriber = DeepgramTranscriber()
        logger.info("✅ Deepgram configured")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ AI services configuration failed: {str(e)}")
        return False


async def test_progress_tracking():
    """Test progress tracking."""
    logger.info("📊 Testing progress tracking...")
    
    try:
        from services.progress_tracker import DatabaseProgressTracker
        from core.interfaces import IndexingProgress, IndexingStatus
        
        tracker = DatabaseProgressTracker()
        
        # Test creating progress
        progress = IndexingProgress(
            asset_id=TEST_ASSET_ID,
            status=IndexingStatus.PENDING,
            progress=0,
            stage="testing"
        )
        
        await tracker.update_progress(TEST_ASSET_ID, progress)
        logger.info("✅ Progress tracking working")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Progress tracking failed: {str(e)}")
        return False


async def test_downloader():
    """Test video downloader."""
    logger.info("📥 Testing video downloader...")
    
    try:
        from services.downloader import HttpVideoDownloader
        downloader = HttpVideoDownloader()
        logger.info("✅ Video downloader initialized")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Video downloader failed: {str(e)}")
        return False


async def main():
    """Run all tests."""
    print("🧪 OpenVideo Modal Indexer - Simple Local Test")
    print("=" * 50)
    print(f"Testing with Space ID: {TEST_SPACE_ID}")
    print(f"Testing with Asset ID: {TEST_ASSET_ID}")
    print("=" * 50)
    
    # Check environment variables
    required_vars = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    tests = [
        ("Database Connection", test_database_connection),
        ("AI Services", test_ai_services),
        ("Progress Tracking", test_progress_tracking),
        ("Video Downloader", test_downloader),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
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
        print("\n🎉 All tests passed! Local environment is ready.")
        print("\nNext steps:")
        print("1. Test with Modal deployed service")
        print("2. Update tRPC router to use Modal functions")
    else:
        print("\n⚠️  Some tests failed. Please check the logs above.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
