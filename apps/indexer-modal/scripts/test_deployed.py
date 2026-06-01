#!/usr/bin/env python3
"""Test script for deployed Modal functions."""

import asyncio
import modal
import os
from datetime import datetime

# Test assets
TEST_SPACE_ID = "00053fc1-6fce-4bd9-9693-3da01db5bc28"
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"


async def test_health_check():
    """Test the health check endpoint."""
    print("🏥 Testing health check...")
    
    try:
        # Import the deployed app
        with modal.App("openvideo-indexer").run():
            from src.api.main import health_check
            result = health_check.remote()
        
        print(f"✅ Health check result: {result}")
        return result.get("status") == "healthy"
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


async def test_index_asset():
    """Test asset indexing with your specific asset."""
    print(f"📹 Testing asset indexing for: {TEST_ASSET_ID}")
    
    try:
        # Import the deployed app
        with modal.App("openvideo-indexer").run():
            from src.api.main import index_asset
            
            print("⏳ Starting indexing job...")
            result = index_asset.remote(TEST_ASSET_ID)
        
        print(f"✅ Indexing result: {result}")
        return result.get("success", False)
    except Exception as e:
        print(f"❌ Asset indexing failed: {e}")
        return False


async def test_get_status():
    """Test status checking."""
    print(f"📊 Testing status check for: {TEST_ASSET_ID}")
    
    try:
        # Import the deployed app
        with modal.App("openvideo-indexer").run():
            from src.api.main import get_indexing_status
            result = get_indexing_status.remote(TEST_ASSET_ID)
        
        print(f"✅ Status result: {result}")
        return True
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("🧪 OpenVideo Modal Indexer - Deployed Test Suite")
    print("=" * 60)
    print(f"Testing with Space ID: {TEST_SPACE_ID}")
    print(f"Testing with Asset ID: {TEST_ASSET_ID}")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Asset Indexing", test_index_asset),
        ("Get Status", test_get_status),
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
        print("\n🎉 All tests passed! The Modal indexer is working correctly.")
        print("\nNext steps:")
        print("1. Update your tRPC router to call Modal functions")
        print("2. Test with the frontend application")
        print("3. Monitor performance and costs in Modal dashboard")
    else:
        print("\n⚠️  Some tests failed. Please check the logs above.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
