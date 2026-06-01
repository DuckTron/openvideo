#!/usr/bin/env python3
"""Final Modal test using correct API."""

import modal

def main():
    """Test Modal functions using the correct API."""
    
    print("Testing Modal functions with correct API...")
    
    try:
        # Look up the deployed app
        app = modal.App.lookup("openvideo-indexer")
        print("✅ Successfully looked up app")
        
        # The correct way to call functions is through the app's function registry
        # Let's try different approaches to find the right API
        
        print("\n🔍 Exploring app object...")
        print(f"App type: {type(app)}")
        print(f"App attributes: {[attr for attr in dir(app) if not attr.startswith('_')]}")
        
        # Try to access functions through different methods
        if hasattr(app, '_functions'):
            print(f"Found _functions: {app._functions}")
        
        if hasattr(app, 'function_names'):
            print(f"Found function_names: {app.function_names}")
        
        # Try accessing registered functions
        print("\n🔍 Checking registered functions...")
        if hasattr(app, 'registered_functions'):
            print(f"Registered functions: {app.registered_functions}")
        
        # Try to get functions by name from registered functions
        print("\n🏥 Testing health check...")
        try:
            # Get the health check function from registered functions
            health_check_func = app.registered_functions['health_check']
            result = health_check_func.remote()
            print(f"✅ Health check result: {result}")
        except Exception as e:
            print(f"❌ Registered function call failed: {e}")
        
        # Test status check
        print("\n📊 Testing status check...")
        try:
            status_func = app.registered_functions['get_indexing_status']
            result = status_func.remote("test-asset-id")
            print(f"✅ Status check result: {result}")
        except Exception as e:
            print(f"❌ Status check failed: {e}")
        
    except Exception as e:
        print(f"❌ App lookup failed: {e}")
        
        # As a last resort, let's try to call the functions directly
        print("\n🔄 Trying direct function calls...")
        try:
            # This might work if the functions are in the global scope
            result = health_check.remote()
            print(f"✅ Direct health check result: {result}")
        except Exception as e:
            print(f"❌ Direct call failed: {e}")

if __name__ == "__main__":
    main()
