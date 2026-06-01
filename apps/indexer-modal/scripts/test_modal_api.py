#!/usr/bin/env python3
"""Test Modal API with correct function calls."""

import modal

def test_modal_functions():
    """Test Modal functions using proper API."""
    
    print("Testing Modal functions...")
    
    try:
        # Import the deployed app
        app = modal.App.lookup("openvideo-indexer")
        
        print("✅ App lookup successful")
        
        # Test health check by calling the function directly on the app
        print("\n🏥 Testing health check...")
        try:
            # Try to get the function from the app
            health_check = app.functions["health_check"]
            result = health_check.remote()
            print(f"✅ Health check result: {result}")
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            # Try alternative approach
            try:
                result = health_check.remote()
                print(f"✅ Health check result (alternative): {result}")
            except Exception as e2:
                print(f"❌ Health check failed (alternative): {e2}")
        
        # Test status check
        print("\n📊 Testing status check...")
        try:
            status_func = app.functions["get_indexing_status"]
            result = status_func.remote("test-asset-id")
            print(f"✅ Status check result: {result}")
        except Exception as e:
            print(f"❌ Status check failed: {e}")
            
        return True
        
    except Exception as e:
        print(f"❌ App lookup failed: {e}")
        return False

if __name__ == "__main__":
    test_modal_functions()
