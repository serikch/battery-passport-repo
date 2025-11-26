import os

# Auto-détection : local vs production
API_BASE_URL = os.getenv(
    "API_URL", 
    "https://battery-passport-api.onrender.com"  # URL Render
)