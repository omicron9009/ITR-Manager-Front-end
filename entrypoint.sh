#!/bin/sh
set -e

# Replace build-time placeholder with runtime NEXT_PUBLIC_API_URL
# This runs at container start so the env var from docker-compose takes effect.
if [ -n "$NEXT_PUBLIC_API_URL" ]; then
  # Fix common mistake: http:host -> http://host (missing //)
  NEXT_PUBLIC_API_URL=$(echo "$NEXT_PUBLIC_API_URL" | sed -E 's|^(https?):([^/])|\1://\2|')
  echo "Replacing __NEXT_PUBLIC_API_URL__ with $NEXT_PUBLIC_API_URL"
  find /app/.next -type f -name "*.js" -exec sed -i "s|__NEXT_PUBLIC_API_URL__|${NEXT_PUBLIC_API_URL}|g" {} +
  # Also replace in the standalone server.js if present
  if [ -f /app/server.js ]; then
    sed -i "s|__NEXT_PUBLIC_API_URL__|${NEXT_PUBLIC_API_URL}|g" /app/server.js
  fi
else
  echo "WARNING: NEXT_PUBLIC_API_URL is not set. API calls will use relative paths."
fi

# Start the Next.js server
exec node server.js
