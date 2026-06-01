#!/usr/bin/env python3
"""Final test script for the video indexer."""

import asyncio
import sys
import os
from pathlib import Path

# Set up environment
project_root = Path(__file__).parent.parent
os.chdir(str(project_root))
sys.path.insert(0, str(project_root / "src"))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from shared.logging import setup_logging, get_logger

# Setup logging
setup_logging(level="INFO")
logger = get_logger("final_test")

# Test assets
TEST_SPACE_ID = "00053fc1-6fce-4bd9-9693-3da01db5bc28"
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"


async def test_database_connection():
    """Test database connection."""
    logger.info("🔗 Testing database connection...")
    
    try:
        from services.database import PostgreSQLClient
        db_client = PostgreSQLClient()
        
        # Test connection by trying to get a non-existent asset
        await db_client.get_asset("test-non-existent")
        logger.info("✅ Database connection successful")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        return False


async def test_asset_retrieval():
    """Test retrieving the specific asset."""
    logger.info(f"🔍 Testing asset retrieval for: {TEST_ASSET_ID}")
    
    try:
        from services.database import PostgreSQLClient
        db_client = PostgreSQLClient()
        
        asset = await db_client.get_asset(TEST_ASSET_ID)
        
        if not asset:
            logger.error(f"❌ Asset {TEST_ASSET_ID} not found in database")
            return False
        
        logger.info(f"✅ Found asset: {asset.name}")
        logger.info(f"   Type: {asset.type}")
        logger.info(f"   Source: {asset.src}")
        logger.info(f"   Space: {asset.space_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Asset retrieval failed: {str(e)}")
        return False


async def test_service_initialization():
    """Test initializing all services."""
    logger.info("🔧 Testing service initialization...")
    
    try:
        # Test each service individually
        from services.downloader import HttpVideoDownloader
        from services.scene_detector import FFmpegSceneDetector
        from services.transcriber import DeepgramTranscriber
        from services.vision_analyzer import GeminiVisionAnalyzer
        from services.progress_tracker import DatabaseProgressTracker
        
        downloader = HttpVideoDownloader()
        scene_detector = FFmpegSceneDetector()
        transcriber = DeepgramTranscriber()
        vision_analyzer = GeminiVisionAnalyzer()
        progress_tracker = DatabaseProgressTracker()
        
        logger.info("✅ All services initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {str(e)}")
        return False


async def test_indexer_initialization():
    """Test initializing the main VideoIndexer."""
    logger.info("🎬 Testing VideoIndexer initialization...")
    
    try:
        from indexer.video_indexer import VideoIndexer
        indexer = VideoIndexer()
        
        logger.info("✅ VideoIndexer initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ VideoIndexer initialization failed: {str(e)}")
        return False


async def test_progress_tracking():
    """Test progress tracking functionality."""
    logger.info("📊 Testing progress tracking...")
    
    try:
        from services.progress_tracker import DatabaseProgressTracker
        from core.interfaces import IndexingProgress, IndexingStatus
        
        tracker = DatabaseProgressTracker()
        
        # Test creating and updating progress
        progress = IndexingProgress(
            asset_id=TEST_ASSET_ID,
            status=IndexingStatus.PENDING,
            progress=0,
            stage="testing"
        )
        
        await tracker.update_progress(TEST_ASSET_ID, progress)
        
        # Test retrieving progress
        retrieved = await tracker.get_progress(TEST_ASSET_ID)
        
        if retrieved and retrieved.status == IndexingStatus.PENDING:
            logger.info("✅ Progress tracking working correctly")
            return True
        else:
            logger.error("❌ Progress tracking not working")
            return False
        
    except Exception as e:
        logger.error(f"❌ Progress tracking test failed: {str(e)}")
        return False


async def main():
    """Run all tests."""
    print("🧪 OpenVideo Modal Indexer - Final Test Suite")
    print("=" * 60)
    print(f"Testing with Space ID: {TEST_SPACE_ID}")
    print(f"Testing with Asset ID: {TEST_ASSET_ID}")
    print("=" * 60)
    
    # Check environment variables
    required_vars = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Asset Retrieval", test_asset_retrieval),
        ("Service Initialization", test_service_initialization),
        ("Indexer Initialization", test_indexer_initialization),
        ("Progress Tracking", test_progress_tracking),
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
        print("\n🎉 All tests passed! The indexer is ready for deployment.")
        print("\nNext steps:")
        print("1. Deploy to Modal: python scripts/deploy.py")
        print("2. Test deployed service: python scripts/test.py")
        print("3. Update tRPC router to use Modal functions")
    else:
        print("\n⚠️  Some tests failed. Please check the logs above.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
