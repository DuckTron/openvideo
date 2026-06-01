#!/usr/bin/env python3
"""Test deployed Modal functions with correct API."""

import modal

# Test assets
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"

def main():
    """Test the deployed Modal functions."""
    print("🧪 Testing Deployed Modal Functions")
    print("=" * 40)
    print(f"Asset ID: {TEST_ASSET_ID}")
    print("=" * 40)
    
    try:
        # Create an app for the deployed functions
        app = modal.App("openvideo-indexer")
        
        # Test health check
        print("\n--- Health Check ---")
        with app.run():
            from src.api.main import health_check
            health_result = health_check.remote()
        print(f"✅ Health check: {health_result}")
        
        # Test asset indexing
        print(f"\n--- Asset Indexing ---")
        with app.run():
            from src.api.main import index_asset
            index_result = index_asset.remote(TEST_ASSET_ID)
        print(f"✅ Indexing result: {index_result}")
        
        # Test status check
        print(f"\n--- Status Check ---")
        with app.run():
            from src.api.main import get_indexing_status
            status_result = get_indexing_status.remote(TEST_ASSET_ID)
        print(f"✅ Status result: {status_result}")
        
        print("\n🎉 All tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
