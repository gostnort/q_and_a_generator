# Secure API Key Setup Guide

## ⚠️ Security Warning
**Never commit API keys to public repositories!** This guide shows you how to set up the API key securely.

## Option 1: Netlify Environment Variables (Recommended)

### Step 1: Set Environment Variable in Netlify
1. Go to your Netlify dashboard
2. Navigate to your site settings
3. Go to "Environment variables"
4. Add a new variable:
   - **Key**: `JSONBIN_API_KEY`
   - **Value**: `$2a$10$dfbMBkQ8onTuhMRt/yU4q.wqFZQm/GKEpBBBDb9lKofngGMe9mUGC`
5. Save the variable

### Step 2: Redeploy
- Netlify will automatically redeploy with the new environment variable
- The API key will be securely available to your application

## Option 2: Environment Variables Only (Secure)
The app now only accepts API keys through environment variables. No user prompts or manual input allowed for security.

## Option 3: Local Development
For local development, you can:
1. Create a `.env` file (not committed to git)
2. Add: `JSONBIN_API_KEY=your_key_here`
3. Use a local server that loads environment variables

## Security Best Practices

### ✅ Do:
- Use environment variables in production
- Keep API keys private
- Use different keys for development/production
- Regularly rotate API keys

### ❌ Don't:
- Commit API keys to git
- Share API keys publicly
- Use the same key for multiple projects
- Leave API keys in client-side code

## Testing
1. Set up the environment variable in Netlify
2. Deploy your site
3. Test with multiple devices
4. Verify server communication works

## Troubleshooting
- If you see "API key not found" warnings, the environment variable isn't set correctly
- Check Netlify logs for environment variable issues
- Ensure the API key is valid and has proper permissions
- The app will fall back to localStorage if no API key is available 