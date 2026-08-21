# G Maps Extractor API Pilot - Setup Status

## Current Status: WAITING FOR API KEY

### What's Ready
- ✅ gosom/google-maps-scraper cleanup complete
- ✅ G Maps Extractor API documentation reviewed
- ✅ Pilot targets created (5 restaurants)
- ✅ Output directories created
- ✅ API documentation notes created

### What's Needed
- ❌ **GMAPSEXTRACTOR_API_KEY** environment variable not set
- ❌ No API key available for testing

### Required Action
**Human must create account and provide API key:**

1. Visit: https://gmapsextractor.com/auth/google
2. Sign in with Google (creates account automatically)
3. Go to: https://gmapsextractor.com/dashboard/api
4. Generate/copy API key
5. Set environment variable:
   ```powershell
   $env:GMAPSEXTRACTOR_API_KEY = "your-api-key-here"
   ```
   Or add to system environment variables permanently.

### API Access Details
- **Single account** (Google OAuth - Continue with Google)
- **Single API key** for both Reviews and Photos APIs
- **Free tier**: 20 requests/month (sufficient for 5-restaurant pilot)
- **Base URL**: To be determined from API docs (likely `https://api.gmapsextractor.com` or similar)

### Next Steps After API Key Available
1. Set `$env:GMAPSEXTRACTOR_API_KEY = "key"`
2. Test Search API to get FIDs for 5 restaurants
6. Test Reviews API for each restaurant (up to 10 reviews each)
7. Test Photos API for each restaurant (3+ photos each)
8. Document results in pilot reports

### Important Constraints
- **DO NOT** create multiple accounts
- **DO NOT** create multiple API keys
- **DO NOT** hardcode API key in code/reports
- **DO NOT** make paid requests without human approval
- **DO NOT** scale beyond 5 restaurants

---

*Status recorded: 2026-08-20*  
*Waiting for human to provide API key via environment variable*