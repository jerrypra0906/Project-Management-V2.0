# Fix Favicon Transparency Issue

## Problem
The favicon.ico file might have a white/colored background instead of transparent background.

## Solution

### Step 1: Verify PNG files have transparent backgrounds
Check if your PNG files in `Assets/favicon_io/` have transparent backgrounds:
- Open `favicon-32x32-removebg-preview.png` in an image viewer
- The background should be transparent/checkered (not white)

### Step 2: Regenerate favicon.ico from transparent PNG

**Option A: Using Online Converter (Easiest)**
1. Go to https://convertio.co/png-ico/ or https://favicon.io/favicon-converter/
2. Upload `favicon-32x32-removebg-preview.png` (or the transparent version)
3. Make sure "Transparent background" option is enabled
4. Download the generated `favicon.ico`
5. Replace `frontend/favicon.ico` with the new file

**Option B: Using Favicon.io Generator**
1. Go to https://favicon.io/favicon-converter/
2. Upload your transparent PNG logo (the original source image)
3. Download the complete favicon package
4. Replace all files in `frontend/` directory

### Step 3: Update Files
After regenerating:
1. Copy all files from `Assets/favicon_io/` to `frontend/`
2. Make sure `favicon.ico` is generated from a transparent PNG
3. Restart frontend: `docker-compose restart frontend`
4. Clear browser cache completely
5. Hard refresh (Ctrl+F5)

## Important Notes
- `favicon.ico` is the most important file - it's what browsers use by default
- The `.ico` format must support transparency (32-bit ICO)
- PNG files can have transparency, but ICO needs to be generated correctly
- Browser cache is aggressive with favicons - you may need to:
  - Clear browser cache completely
  - Use incognito/private mode to test
  - Or add `?v=timestamp` to favicon URLs (already done in HTML)
