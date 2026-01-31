const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'assets');
const logoPath = path.join(assetsDir, 'logo.png');

// App theme colors
const backgroundColor = '#020617';
const iconBackgroundColor = '#FFFFFF';

async function generateIcons() {
  console.log('Generating app icons from logo...');

  // Get logo dimensions
  const logoMetadata = await sharp(logoPath).metadata();
  console.log(`Logo size: ${logoMetadata.width}x${logoMetadata.height}`);

  // Generate main app icon (1024x1024) - logo on white background
  const iconSize = 1024;
  const logoPadding = 100;
  const logoResizeSize = iconSize - (logoPadding * 2);

  await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: iconBackgroundColor
    }
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(logoResizeSize, logoResizeSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  console.log('✓ Generated icon.png (1024x1024)');

  // Generate adaptive icon foreground (1024x1024) - needs safe zone padding
  // Adaptive icons need ~66% safe zone, so we make logo smaller
  const adaptivePadding = 200;
  const adaptiveLogoSize = iconSize - (adaptivePadding * 2);

  await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(adaptiveLogoSize, adaptiveLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));

  console.log('✓ Generated adaptive-icon.png (1024x1024)');

  // Generate splash screen (1284x2778 for modern phones)
  const splashWidth = 1284;
  const splashHeight = 2778;
  const splashLogoSize = 600;

  // Parse background color
  const bgHex = backgroundColor.replace('#', '');
  const bgR = parseInt(bgHex.substring(0, 2), 16);
  const bgG = parseInt(bgHex.substring(2, 4), 16);
  const bgB = parseInt(bgHex.substring(4, 6), 16);

  await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 4,
      background: { r: bgR, g: bgG, b: bgB, alpha: 1 }
    }
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(splashLogoSize, splashLogoSize, { fit: 'contain', background: { r: bgR, g: bgG, b: bgB, alpha: 1 } })
          .toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('✓ Generated splash.png (1284x2778)');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
