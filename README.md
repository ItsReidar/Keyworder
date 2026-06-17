# Keyworder

A Chrome extension to assign a keyword to a URL and quickly access it via the Chrome omnibox (address bar).

## How it works

1. Click on the Keyworder extension icon in your toolbar.
2. The current URL will be pre-filled. Enter a short keyword you want to use for this URL.
3. Click "Save Bookmark".

To use a saved keyword:
1. Focus your Chrome address bar.
2. Type `k` and press `Space` or `Tab`.
3. Type your keyword (or part of it).
4. Press `Enter` to navigate directly to your saved URL.

## Example Usage

Let's say you frequently use Google Maps and want to access it quickly.

1. Open `https://maps.google.com` in your browser.
2. Click the Keyworder extension icon.
3. The URL field will be automatically filled with `https://maps.google.com`.
4. Enter `maps` in the keyword field and click "Save Bookmark".

Now, whenever you want to open Google Maps, simply:
1. Go to your address bar.
2. Type `k` + `Space` + `maps`.
3. Press `Enter` and you'll jump straight to Google Maps!

## Screenshots

![Screenshot 1](images/screenhot1.png)
![Screenshot 2](images/screenshot2.png)
![Screenshot 3](images/screenshot3.png)

## Packaging & Releasing

Depending on where you want to publish the extension, there are two primary ways to package it.

### 1. Creating a `.zip` for the Chrome Web Store / GitHub

The Chrome Web Store requires a `.zip` file. We have included a convenient build script for this.

Run the following command in your terminal at the root of the project:

```bash
./build.sh
```

This will automatically package the necessary files (ignoring things like `.git` and `.DS_Store`) into a `keyworder-release.zip` file. You can upload this directly to the Chrome Developer Dashboard or attach it to a GitHub release.

### 2. Creating a `.crx` file (For direct distribution)

If you want to distribute the extension directly to users via GitHub (without the Web Store), a `.crx` file is often used.

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top right corner.
3. Click the **Pack extension** button.
4. For the **Extension root directory**, browse and select the `Keyworder` folder.
5. Leave **Private key file** blank if this is your first time.
6. Click **Pack extension**.

Chrome will generate two files in the parent directory of your project:
*   `Keyworder.crx`: The installable extension file. You can upload this to GitHub.
*   `Keyworder.pem`: Your private key. **Keep this safe and private!** You will need it to pack future updates so that the extension ID remains the same.
