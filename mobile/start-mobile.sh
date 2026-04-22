#!/bin/bash

echo "🚀 Starting Zorli AI Vault Mobile App..."
echo ""
echo "📱 Make sure you have Expo Go installed on your device:"
echo "   - iOS: https://apps.apple.com/app/expo-go/id982107779"
echo "   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
echo ""
echo "Starting Expo development server..."
echo ""

cd "$(dirname "$0")"
npm start
