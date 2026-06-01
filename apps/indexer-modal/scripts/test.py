#!/usr/bin/env python3
"""Test script for OpenVideo Modal Indexer."""

import asyncio
import modal
import os
from datetime import datetime


async def test_health_check():
    """Test the health check endpoint."""
    print("🏥 Testing health check...")
    
    try:
        import openvideo_indexer
        health_check = openvideo_indexer.health_check
        result = health_check.remote()
        
        print(f"✅ Health check result: {result}")
        return result.get("status") == "healthy"
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


async def test_index_asset(asset_id: str):
    """Test asset indexing."""
    print(f"📹 Testing asset indexing for: {asset_id}")
    
    try:
        import openvideo_indexer
        index_asset = openvideo_indexer.index_asset
        
        # Start indexing (this will run asynchronously)
        print("⏳ Starting indexing job...")
        result = index_asset.remote(asset_id)
        
        print(f"✅ Indexing result: {result}")
        return result.get("success", False)
    except Exception as e:
        print(f"❌ Asset indexing failed: {e}")
        return False


async def test_get_status(asset_id: str):
    """Test status checking."""
    print(f"📊 Testing status check for: {asset_id}")
    
    try:
        import openvideo_indexer
        get_status = openvideo_indexer.get_indexing_status
        result = get_status.remote(asset_id)
        
        print(f"✅ Status result: {result}")
        return True
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return False


async def main():
    """Main test suite."""
    print("🧪 OpenVideo Modal Indexer Test Suite")
    print("=" * 50)
    
    # Test configuration
    test_asset_id = os.getenv("TEST_ASSET_ID", "test-asset-id")
    
    # Run tests
    tests = [
        ("Health Check", lambda: test_health_check()),
        ("Get Status", lambda: test_get_status(test_asset_id)),
        # Note: Skip actual indexing test unless TEST_ASSET_ID is provided
    ]
    
    if os.getenv("TEST_ASSET_ID") and os.getenv("RUN_INDEXING_TEST", "").lower() == "true":
        tests.append(("Asset Indexing", lambda: test_index_asset(test_asset_id)))
    
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
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Please check the logs above.")


if __name__ == "__main__":
    asyncio.run(main())
