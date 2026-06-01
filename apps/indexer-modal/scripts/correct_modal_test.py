#!/usr/bin/env python3
"""Correct Modal test using deployed function calls."""

import modal

def main():
    """Test Modal functions using the deployed API."""
    
    print("Testing Modal deployed functions...")
    
    try:
        # The correct way to call deployed functions is using Function.lookup
        # but we need to use the right import path
        
        # Try to import the app module directly
        print("🔍 Trying to import the deployed app...")
        
        # Method 1: Import the app as a module
        try:
            import openvideo_indexer
            print("✅ Successfully imported openvideo_indexer")
            
            # Call health check
            print("\n🏥 Testing health check...")
            result = openvideo_indexer.health_check.remote()
            print(f"✅ Health check result: {result}")
            
            # Call status check
            print("\n📊 Testing status check...")
            result = openvideo_indexer.get_indexing_status.remote("test-asset-id")
            print(f"✅ Status check result: {result}")
            
        except ImportError as e:
            print(f"❌ Import failed: {e}")
            
            # Method 2: Use modal.Function with the correct app name
            print("\n🔄 Trying modal.Function approach...")
            try:
                # This should work if the app is properly deployed
                health_func = modal.Function.from_name("openvideo-indexer", "health_check")
                result = health_func.remote()
                print(f"✅ Health check result (Function.from_name): {result}")
                
                status_func = modal.Function.from_name("openvideo-indexer", "get_indexing_status")
                result = status_func.remote("test-asset-id")
                print(f"✅ Status check result (Function.from_name): {result}")
                
            except Exception as e2:
                print(f"❌ Function.from_name failed: {e2}")
                
                # Method 3: Try using the app lookup with function calls
                print("\n🔄 Trying app.function approach...")
                try:
                    app = modal.App.lookup("openvideo-indexer")
                    
                    # Use the function decorator to call deployed functions
                    @app.function()
                    def call_health_check():
                        return health_check.remote()
                    
                    result = call_health_check.remote()
                    print(f"✅ Health check result (app.function): {result}")
                    
                except Exception as e3:
                    print(f"❌ App.function approach failed: {e3}")
        
    except Exception as e:
        print(f"❌ General error: {e}")
        
        # Final attempt - check if we can at least verify the deployment
        print("\n🔍 Checking deployment status...")
        try:
            app = modal.App.lookup("openvideo-indexer")
            print(f"✅ App found: {app.name} (ID: {app.app_id})")
            print(f"📊 Dashboard: {app.get_dashboard_url()}")
            print(f"🔧 Registered functions: {list(app.registered_functions.keys())}")
        except Exception as e4:
            print(f"❌ Deployment check failed: {e4}")

if __name__ == "__main__":
    main()
