#!/bin/bash
# This script converts the Keyworder extension into a Safari Web Extension.
# It requires Xcode to be installed and the Xcode license to be accepted.

echo "Converting Keyworder to a Safari Web Extension..."

# Convert the extension (we are in the project root, so we convert the current directory)
xcrun safari-web-extension-converter . --project-location ../Keyworder-SafariApp --app-name "Keyworder" --bundle-identifier "com.itsreidar.Keyworder" --swift --no-prompt

if [ $? -eq 0 ]; then
  echo "Conversion successful!"
  echo "The Safari extension Xcode project has been generated in ../Keyworder-SafariApp/"
  echo "To build and run it:"
  echo "1. Open the project in Xcode: open ../Keyworder-SafariApp/Keyworder.xcodeproj"
  echo "2. Select your Mac as the destination and run the project (Cmd+R)."
  echo "3. Safari will open. Go to Safari > Preferences > Extensions and enable Keyworder."
else
  echo "Conversion failed. Please ensure you have Xcode installed and have run 'sudo xcodebuild -license'."
fi
