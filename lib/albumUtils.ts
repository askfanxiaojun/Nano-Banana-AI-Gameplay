/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Helper function to load an image and return it as an HTMLImageElement
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Setting crossOrigin is good practice for canvas operations, even with data URLs
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`加载图片失败: ${src.substring(0, 50)}...`));
        img.src = src;
    });
}

/**
 * Creates a single "photo album" page image from a collection of images.
 * @param imageData A record mapping keys (like decades or magazine names) to their image data URLs.
 * @param title The main title for the album page.
 * @param subtitle The subtitle for the album page.
 * @returns A promise that resolves to a data URL of the generated album page (JPEG format).
 */
export async function createAlbumPage(
    imageData: Record<string, string>,
    title: string,
    subtitle: string
): Promise<string> {
    const canvas = document.createElement('canvas');
    // High-resolution canvas for good quality (A4-like ratio)
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('无法获取 2D 画布上下文');
    }

    // 1. Draw the album page background (dark theme)
    ctx.fillStyle = '#1a1a1a'; // Dark gray/off-black background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw the titles
    ctx.textAlign = 'center';

    // Main Title: with gradient
    const mainTitleY = 220;
    // Create a retro gradient for the main title
    const mainTitleGradient = ctx.createLinearGradient(canvasWidth * 0.25, 0, canvasWidth * 0.75, 0);
    mainTitleGradient.addColorStop(0, '#f9d423'); // Retro Yellow
    mainTitleGradient.addColorStop(0.5, '#ff4e50'); // Retro Red/Pink
    mainTitleGradient.addColorStop(1, '#fc913a'); // Retro Orange
    ctx.fillStyle = mainTitleGradient;
    ctx.font = `160px 'Permanent Marker', cursive`;
    ctx.fillText(title, canvasWidth / 2, mainTitleY);

    // Subtitle
    ctx.font = `70px 'Caveat', cursive`;
    ctx.fillStyle = '#e0e0e0'; // Light gray for subtitle
    ctx.fillText(subtitle, canvasWidth / 2, mainTitleY + 100);


    // 3. Load all the polaroid images concurrently
    const keys = Object.keys(imageData);
    const loadedImages = await Promise.all(
        Object.values(imageData).map(url => loadImage(url))
    );

    const imagesWithKeys = keys.map((key, index) => ({
        key,
        img: loadedImages[index],
    }));

    // 4. Define grid layout and draw each polaroid
    const grid = { cols: 2, rows: 3, padding: 100 };
    const contentTopMargin = 400; // Increased space for the new header
    const contentHeight = canvasHeight - contentTopMargin;
    const cellWidth = (canvasWidth - grid.padding * (grid.cols + 1)) / grid.cols;
    const cellHeight = (contentHeight - grid.padding * (grid.rows + 1)) / grid.rows;

    // Calculate polaroid dimensions to fit inside the grid cell with a margin
    const polaroidAspectRatio = 1.2; // height is 1.2 times width
    const maxPolaroidWidth = cellWidth * 0.9;
    const maxPolaroidHeight = cellHeight * 0.9;

    let polaroidWidth = maxPolaroidWidth;
    let polaroidHeight = polaroidWidth * polaroidAspectRatio;

    if (polaroidHeight > maxPolaroidHeight) {
        polaroidHeight = maxPolaroidHeight;
        polaroidWidth = polaroidHeight / polaroidAspectRatio;
    }

    const imageContainerWidth = polaroidWidth * 0.9;
    const imageContainerHeight = imageContainerWidth; // Classic square-ish photo area

    // Reverse the drawing order: draw bottom rows first so top rows are rendered on top
    const reversedImages = [...imagesWithKeys].reverse();
    reversedImages.forEach(({ key, img }, reversedIndex) => {
        // Calculate the original index to determine grid position
        const index = imagesWithKeys.length - 1 - reversedIndex;

        const row = Math.floor(index / grid.cols);
        const col = index % grid.cols;

        // Calculate top-left corner of the polaroid within its grid cell
        const x = grid.padding * (col + 1) + cellWidth * col + (cellWidth - polaroidWidth) / 2;
        const y = contentTopMargin + grid.padding * (row + 1) + cellHeight * row + (cellHeight - polaroidHeight) / 2;
        
        ctx.save();
        
        // Translate context to the center of the polaroid for rotation
        ctx.translate(x + polaroidWidth / 2, y + polaroidHeight / 2);
        
        // Apply a slight, random rotation for a hand-placed look
        const rotation = (Math.random() - 0.5) * 0.1; // Radians (approx. +/- 2.8 degrees)
        ctx.rotate(rotation);
        
        // Draw a soft shadow to lift the polaroid off the dark background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        
        // Draw the white polaroid frame (centered at the new origin)
        ctx.fillStyle = '#fff';
        ctx.fillRect(-polaroidWidth / 2, -polaroidHeight / 2, polaroidWidth, polaroidHeight);
        
        // Remove shadow for subsequent drawing
        ctx.shadowColor = 'transparent';
        
        // Calculate image dimensions to fit while maintaining aspect ratio
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth = imageContainerWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > imageContainerHeight) {
            drawHeight = imageContainerHeight;
            drawWidth = drawHeight * aspectRatio;
        }

        // Calculate position to center the image within its container area
        const imageAreaTopMargin = (polaroidWidth - imageContainerWidth) / 2;
        const imageContainerY = -polaroidHeight / 2 + imageAreaTopMargin;
        
        const imgX = -drawWidth / 2; // Horizontally centered due to context translation
        const imgY = imageContainerY + (imageContainerHeight - drawHeight) / 2;
        
        ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
        
        // Draw the handwritten caption
        ctx.fillStyle = '#222';
        ctx.font = `60px 'Permanent Marker', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const captionAreaTop = imageContainerY + imageContainerHeight;
        const captionAreaBottom = polaroidHeight / 2;
        const captionY = captionAreaTop + (captionAreaBottom - captionAreaTop) / 2;

        ctx.fillText(key, 0, captionY);
        
        ctx.restore(); // Restore context to pre-transformation state
    });

    // Convert canvas to a high-quality JPEG and return the data URL
    return canvas.toDataURL('image/jpeg', 0.9);
}