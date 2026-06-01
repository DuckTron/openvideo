#!/usr/bin/env python3
"""Simple test for deployed Modal functions."""

import modal
import asyncio

# Test assets
TEST_ASSET_ID = "a8c240b7-ea72-4361-9dae-4cc1af2ab1b8"

async def main():
    """Test the deployed Modal functions."""
    print("🧪 Testing Deployed Modal Functions")
    print("=" * 40)
    
    try:
        # Get the deployed functions
        health_check = modal.Function.lookup("openvideo-indexer", "health_check")
        index_asset = modal.Function.lookup("openvideo-indexer", "index_asset")
        get_status = modal.Function.lookup("openvideo-indexer", "get_indexing_status")
        
        # Test health check
        print("\n--- Health Check ---")
        health_result = await health_check.aio()
        print(f"✅ Health check: {health_result}")
        
        # Test asset indexing
        print(f"\n--- Asset Indexing ---")
        print(f"Testing with asset: {TEST_ASSET_ID}")
        index_result = await index_asset.aio(TEST_ASSET_ID)
        print(f"✅ Indexing result: {index_result}")
        
        # Test status check
        print(f"\n--- Status Check ---")
        status_result = await get_status.aio(TEST_ASSET_ID)
        print(f"✅ Status result: {status_result}")
        
        print("\n🎉 All tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
