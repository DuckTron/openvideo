#!/usr/bin/env python3
"""Test the deployed Modal service with sample assets."""

import modal
import asyncio

# Test assets
TEST_SPACE_ID = "00053fc1-6fce-4bd9-9693-3da01db5bc28"
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"

def test_health_check():
    """Test the health check function."""
    print("🏥 Testing health check...")
    
    try:
        # Import the deployed app and call the function
        import openvideo_indexer
        result = openvideo_indexer.health_check.remote()
        
        print(f"✅ Health check result: {result}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_index_asset():
    """Test indexing with your specific asset."""
    print(f"📹 Testing asset indexing...")
    print(f"   Asset ID: {TEST_ASSET_ID}")
    
    try:
        # Import the deployed app and call the function
        import openvideo_indexer
        result = openvideo_indexer.index_asset.remote(TEST_ASSET_ID)
        
        print(f"✅ Indexing result: {result}")
        return True
    except Exception as e:
        print(f"❌ Asset indexing failed: {e}")
        return False

def test_get_status():
    """Test getting status for your asset."""
    print(f"📊 Testing status check...")
    print(f"   Asset ID: {TEST_ASSET_ID}")
    
    try:
        # Import the deployed app and call the function
        import openvideo_indexer
        result = openvideo_indexer.get_indexing_status.remote(TEST_ASSET_ID)
        
        print(f"✅ Status result: {result}")
        return True
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing Deployed Modal Service")
    print("=" * 40)
    print(f"Space ID: {TEST_SPACE_ID}")
    print(f"Asset ID: {TEST_ASSET_ID}")
    print("=" * 40)
    
    tests = [
        ("Health Check", test_health_check),
        ("Asset Indexing", test_index_asset),
        ("Status Check", test_get_status),
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
        print("\n🎉 All tests passed! Your Modal indexer is working correctly.")
        print("\nNext steps:")
        print("1. Update your tRPC router to call Modal functions")
        print("2. Test with your frontend application")
    else:
        print("\n⚠️  Some tests failed. Check the logs above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
