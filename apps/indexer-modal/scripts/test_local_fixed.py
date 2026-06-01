#!/usr/bin/env python3
"""Local test script for specific assets - fixed imports."""

import asyncio
import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set PYTHONPATH to include src
os.environ["PYTHONPATH"] = str(project_root / "src")

# Now we can import using absolute paths
sys.path.insert(0, str(project_root / "src"))

try:
    from indexer.video_indexer import VideoIndexer
    from shared.logging import setup_logging, get_logger
    from core.exceptions import VideoIndexingError
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Let's try a different approach...")
    
    # Alternative: run as module
    os.chdir(str(project_root))
    sys.path.insert(0, ".")
    
    try:
        from src.indexer.video_indexer import VideoIndexer
        from src.shared.logging import setup_logging, get_logger
        from src.core.exceptions import VideoIndexingError
    except ImportError as e2:
        print(f"❌ Still failing: {e2}")
        sys.exit(1)

# Setup logging
setup_logging(level="INFO")
logger = get_logger("test_local")

# Test assets
TEST_SPACE_ID = "00053fc1-6fce-4bd9-9693-3da01db5bc28"
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"


async def test_basic_imports():
    """Test if we can import everything correctly."""
    logger.info("🧪 Testing basic imports...")
    try:
        # Test importing all services
        from services.downloader import HttpVideoDownloader
        from services.scene_detector import FFmpegSceneDetector
        from services.transcriber import DeepgramTranscriber
        from services.vision_analyzer import GeminiVisionAnalyzer
        from services.vector_store import PGVectorStore
        from services.progress_tracker import DatabaseProgressTracker
        from services.database import PostgreSQLClient
        
        logger.info("✅ All imports successful")
        return True
    except Exception as e:
        logger.error(f"❌ Import test failed: {e}")
        return False


async def test_database_connection():
    """Test database connection separately."""
    logger.info("🔗 Testing database connection...")
    
    try:
        from services.database import PostgreSQLClient
        
        db_client = PostgreSQLClient()
        
        # Test basic connection
        asset = await db_client.get_asset("non-existent")
        logger.info("✅ Database connection successful")
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


async def test_asset_retrieval():
    """Test retrieving the specific asset."""
    logger.info("🔍 Testing asset retrieval...")
    
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


async def test_local_indexing():
    """Test indexing locally with specific assets."""
    logger.info("🚀 Starting local indexing test")
    logger.info(f"📁 Space ID: {TEST_SPACE_ID}")
    logger.info(f"🎬 Asset ID: {TEST_ASSET_ID}")
    
    # Check environment variables
    required_vars = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these in your .env file")
        return False
    
    try:
        # Initialize indexer
        logger.info("🔧 Initializing VideoIndexer...")
        indexer = VideoIndexer()
        
        # Test indexing
        logger.info("🚀 Starting indexing process...")
        start_time = asyncio.get_event_loop().time()
        
        await indexer.index_asset(TEST_ASSET_ID)
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        logger.info(f"✅ Indexing completed successfully in {duration:.2f} seconds")
        
        # Test progress tracking
        logger.info("📊 Checking final progress...")
        progress = await indexer.progress_tracker.get_progress(TEST_ASSET_ID)
        
        if progress:
            logger.info(f"   Status: {progress.status}")
            logger.info(f"   Progress: {progress.progress}%")
            logger.info(f"   Stage: {progress.stage}")
            if progress.error:
                logger.warning(f"   Error: {progress.error}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Local test failed: {str(e)}", exc_info=True)
        return False


async def main():
    """Run all local tests."""
    print("🧪 OpenVideo Modal Indexer - Local Test Suite")
    print("=" * 60)
    
    tests = [
        ("Basic Imports", test_basic_imports),
        ("Database Connection", test_database_connection),
        ("AI Services", test_ai_services),
        ("Asset Retrieval", test_asset_retrieval),
        ("Asset Indexing", test_local_indexing),
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
        print("🎉 All tests passed! Ready for deployment.")
    else:
        print("⚠️  Some tests failed. Please check the logs above.")
    
    return passed == total


if __name__ == "__main__":
    # Check if .env file exists
    env_file = Path(__file__).parent.parent / ".env"
    if not env_file.exists():
        print("❌ .env file not found. Please copy .env.example to .env and configure it.")
        sys.exit(1)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(str(env_file))
    
    # Run tests
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
