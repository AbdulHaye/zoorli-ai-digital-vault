#!/bin/bash

# Navigate to mobile directory
cd "$(dirname "$0")"

echo "========================================="
echo "  Starting Expo in TUNNEL mode"
echo "========================================="
echo ""
echo "This will create a tunnel connection to"
echo "bypass network restrictions and allow"
echo "Expo Go to connect properly."
echo ""
echo "========================================="

# Clear Expo cache and start in tunnel mode
npx expo start --tunnel --clear
