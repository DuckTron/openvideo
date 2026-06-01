#!/usr/bin/env python3
"""Deployment script for OpenVideo Modal Indexer."""

import subprocess
import sys
import os


def run_command(cmd: str, description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n🔄 {description}...")
    print(f"Running: {cmd}")
    
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"Error: {e.stderr}")
        return False


def main():
    """Main deployment process."""
    print("🚀 OpenVideo Modal Indexer Deployment")
    print("=" * 50)
    
    # Check if Modal CLI is installed
    try:
        subprocess.run(["modal", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Modal CLI not found. Please install it first:")
        print("pip install modal")
        sys.exit(1)
    
    # Check environment variables
    required_env_vars = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
    missing_vars = []
    
    for var in required_env_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these in your environment or .env file")
        sys.exit(1)
    
    # Deployment steps
    steps = [
        ("modal secret create openvideo-db", "Creating database secret"),
        ("modal secret create openvideo-ai", "Creating AI secret"),
        ("modal secret create openvideo-deepgram", "Creating Deepgram secret"),
        ("modal deploy src/api/main.py", "Deploying Modal functions"),
    ]
    
    success_count = 0
    for cmd, description in steps:
        if run_command(cmd, description):
            success_count += 1
        else:
            print(f"\n⚠️  {description} failed. Please check the error above.")
            response = input("Continue with remaining steps? (y/N): ")
            if response.lower() != 'y':
                break
    
    # Summary
    print(f"\n📊 Deployment Summary")
    print(f"Completed: {success_count}/{len(steps)} steps")
    
    if success_count == len(steps):
        print("\n🎉 Deployment completed successfully!")
        print("\nNext steps:")
        print("1. Test the deployment with: modal function list openvideo-indexer")
        print("2. Update your tRPC router to call Modal functions")
        print("3. Test with a sample asset")
    else:
        print("\n⚠️  Deployment incomplete. Please resolve errors and retry.")


if __name__ == "__main__":
    main()
