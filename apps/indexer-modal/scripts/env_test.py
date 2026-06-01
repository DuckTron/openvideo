#!/usr/bin/env python3
"""Test environment variables in Modal."""

import modal

def main():
    """Check what environment variables are available."""
    
    print("Checking environment variables in Modal...")
    
    try:
        # Use the same function approach to test environment
        env_func = modal.Function.from_name("openvideo-indexer", "health_check")
        
        # The health check already shows environment status
        result = env_func.remote()
        
        print("Health check result:")
        print(f"Status: {result.get('status')}")
        
        services = result.get('services', {})
        env_info = services.get('environment', {})
        
        print(f"Environment status: {env_info.get('status')}")
        print(f"Required variables: {env_info.get('required_vars', [])}")
        
        # Let's create a simple test function to check environment
        print("\n🔍 Creating a simple environment test...")
        
        # Create a test function that just prints environment variables
        @modal.function(
            image=modal.Image.debian_slim().pip_install(["python-dotenv"]),
            secrets=[
                modal.Secret.from_name("openvideo-db"),
                modal.Secret.from_name("openvideo-ai"), 
                modal.Secret.from_name("openvideo-deepgram")
            ]
        )
        def check_env():
            import os
            env_vars = {}
            for key in os.environ.keys():
                if any(secret in key.lower() for secret in ['database', 'google', 'deepgram', 'api']):
                    value = os.environ[key]
                    env_vars[key] = value[:20] + "..." if len(value) > 20 else value
            return env_vars
        
        result = check_env.remote()
        print(f"Environment variables found: {result}")
        
    except Exception as e:
        print(f"❌ Environment test failed: {e}")

if __name__ == "__main__":
    main()
