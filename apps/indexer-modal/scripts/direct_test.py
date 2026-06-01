#!/usr/bin/env python3
"""Direct test using Modal client."""

import modal

def main():
    """Test Modal functions directly."""
    
    print("Testing Modal functions...")
    
    # Create a Modal client
    try:
        # Try to import the deployed app as a module
        import openvideo_indexer
        
        print("✅ Successfully imported openvideo_indexer")
        
        # Test health check
        print("\n🏥 Testing health check...")
        try:
            result = openvideo_indexer.health_check.remote()
            print(f"✅ Health check result: {result}")
        except Exception as e:
            print(f"❌ Health check failed: {e}")
        
        # Test status check
        print("\n📊 Testing status check...")
        try:
            result = openvideo_indexer.get_indexing_status.remote("test-asset-id")
            print(f"✅ Status check result: {result}")
        except Exception as e:
            print(f"❌ Status check failed: {e}")
            
    except ImportError as e:
        print(f"❌ Failed to import openvideo_indexer: {e}")
        
        # Try alternative approach using App
        try:
            print("\nTrying alternative approach...")
            app = modal.App.lookup("openvideo-indexer")
            print("✅ Successfully looked up app")
            
            # Test functions through app
            print("\n🏥 Testing health check through app...")
            # Try to get the function by name
            if hasattr(app, 'health_check'):
                result = app.health_check.remote()
                print(f"✅ Health check result: {result}")
            else:
                print("❌ health_check not found as attribute")
                
                # Try accessing through the app's function registry
                try:
                    health_func = app.get_function("health_check")
                    result = health_func.remote()
                    print(f"✅ Health check result (via get_function): {result}")
                except Exception as e3:
                    print(f"❌ get_function approach failed: {e3}")
            
        except Exception as e2:
            print(f"❌ App approach also failed: {e2}")
    
    except Exception as e:
        print(f"❌ General error: {e}")

if __name__ == "__main__":
    main()
