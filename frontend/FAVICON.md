# Favicon Implementation Guide

## Overview
The application is configured to use favicons for better branding and user experience. The HTML includes links to various favicon sizes for different devices and platforms.

## Required Favicon Files

Place the following files in the `frontend/` directory:

1. **favicon.ico** - Traditional favicon (16x16, 32x32, 48x48 combined)
2. **favicon-16x16.png** - 16x16 PNG favicon
3. **favicon-32x32.png** - 32x32 PNG favicon
4. **apple-touch-icon.png** - 180x180 PNG for iOS devices
5. **android-chrome-192x192.png** - 192x192 PNG for Android
6. **android-chrome-512x512.png** - 512x512 PNG for Android
7. **site.webmanifest** - Already created (manifest file for PWA)

## How to Create Favicon Files

### Option 1: Online Favicon Generator (Recommended)
1. Visit https://realfavicongenerator.net/ or https://favicon.io/
2. Upload your logo/image (recommended: 512x512 or larger, square image)
3. Configure settings:
   - iOS: Enable Apple touch icon
   - Android: Enable Android Chrome icons
   - Windows: Configure tile colors
4. Download the generated package
5. Extract and copy all files to the `frontend/` directory

### Option 2: Using Image Editing Software
1. Create a square image (at least 512x512 pixels)
2. Export/resize to the required sizes:
   - 16x16 → `favicon-16x16.png`
   - 32x32 → `favicon-32x32.png`
   - 180x180 → `apple-touch-icon.png`
   - 192x192 → `android-chrome-192x192.png`
   - 512x512 → `android-chrome-512x512.png`
3. Create `favicon.ico` using an online converter or tool like ImageMagick:
   ```bash
   convert favicon-32x32.png favicon.ico
   ```

### Option 3: Using the Company Logo
If you want to use the existing KPN Corp logo:
1. Use the logo from `/docs/KPN Corp .png`
2. Resize and convert it to the required favicon sizes
3. Place all files in the `frontend/` directory

## File Structure
```
frontend/
├── index.html          (already includes favicon links)
├── site.webmanifest    (already created)
├── favicon.ico         (create this)
├── favicon-16x16.png   (create this)
├── favicon-32x32.png   (create this)
├── apple-touch-icon.png (create this)
├── android-chrome-192x192.png (create this)
└── android-chrome-512x512.png (create this)
```

## Testing
After adding the favicon files:
1. Restart the frontend container: `docker-compose restart frontend`
2. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
4. Check the browser tab - you should see the favicon

## Notes
- Favicon files are cached by browsers, so you may need to clear cache to see changes
- The nginx configuration already includes caching for `.ico` files (1 year expiry)
- All favicon files are served from the root `/` path
- The `site.webmanifest` file is already configured with the app name and theme colors
