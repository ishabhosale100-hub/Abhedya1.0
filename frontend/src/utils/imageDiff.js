/**
 * Canvas API utility for per-pixel image comparison and diff heatmap generation.
 */

/**
 * Load image file into an Image element.
 * @param {File} file 
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Compare two images and produce pixel metrics and difference heatmap.
 * @param {HTMLImageElement} img1 - Original Reference
 * @param {HTMLImageElement} img2 - Suspected Variant
 * @param {number} threshold - Sensitivity threshold (10-100)
 * @returns {Object} { analysisType, diffPercent, matchPercent, mad, psnr, diffDetected, statusText, regions, thumbnailUrl }
 */
export function compareImages(img1, img2, threshold = 30) {
  const w1 = img1.naturalWidth || img1.width || 500;
  const h1 = img1.naturalHeight || img1.height || 500;
  const w2 = img2.naturalWidth || img2.width || 500;
  const h2 = img2.naturalHeight || img2.height || 500;

  // Uniform target canvas dimensions safely normalized
  const width = Math.min(800, Math.max(200, Math.max(w1, w2)));
  const height = Math.min(800, Math.max(200, Math.max(h1, h2)));

  // Canvas for Image 1
  const c1 = document.createElement('canvas');
  c1.width = width;
  c1.height = height;
  const ctx1 = c1.getContext('2d');
  ctx1.clearRect(0, 0, width, height);
  ctx1.drawImage(img1, 0, 0, width, height);
  const data1 = ctx1.getImageData(0, 0, width, height).data;

  // Canvas for Image 2
  const c2 = document.createElement('canvas');
  c2.width = width;
  c2.height = height;
  const ctx2 = c2.getContext('2d');
  ctx2.clearRect(0, 0, width, height);
  ctx2.drawImage(img2, 0, 0, width, height);
  const data2 = ctx2.getImageData(0, 0, width, height).data;

  // Canvas for Output Heatmap
  const cDiff = document.createElement('canvas');
  cDiff.width = width;
  cDiff.height = height;
  const ctxDiff = cDiff.getContext('2d');
  const outImgData = ctxDiff.createImageData(width, height);
  const outData = outImgData.data;

  let totalDiffSum = 0;
  let mseSum = 0;
  let changedPixels = 0;
  const totalPixels = width * height;

  // Sensitivity threshold
  const cutoff = Math.max(1, threshold);

  // Grid for region density detection (20x20 cells)
  const gridRows = 20;
  const gridCols = 20;
  const cellWidth = width / gridCols;
  const cellHeight = height / gridRows;
  const gridDensity = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));

  for (let i = 0; i < data1.length; i += 4) {
    const r1 = data1[i];
    const g1 = data1[i + 1];
    const b1 = data1[i + 2];
    const a1 = data1[i + 3];

    const r2 = data2[i];
    const g2 = data2[i + 1];
    const b2 = data2[i + 2];
    const a2 = data2[i + 3];

    const diffR = Math.abs(r1 - r2);
    const diffG = Math.abs(g1 - g2);
    const diffB = Math.abs(b1 - b2);
    const diffA = Math.abs(a1 - a2);

    const avgDiff = (diffR + diffG + diffB + diffA) / 4;
    totalDiffSum += avgDiff;

    const msePixel = ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2) / 4;
    mseSum += msePixel;

    const pixelIdx = i / 4;
    const px = pixelIdx % width;
    const py = Math.floor(pixelIdx / width);

    if (avgDiff >= cutoff) {
      changedPixels++;

      const col = Math.floor(px / cellWidth);
      const row = Math.floor(py / cellHeight);
      if (row < gridRows && col < gridCols) {
        gridDensity[row][col]++;
      }

      // Heatmap color: Vivid Coral / Amber highlight for changed pixels
      const intensity = Math.min(255, Math.floor(avgDiff * 2.5));
      outData[i] = Math.min(255, 200 + intensity);            // Red
      outData[i + 1] = Math.max(0, 30 + (255 - intensity) / 5); // Green
      outData[i + 2] = 40;                                    // Blue
      outData[i + 3] = 230;                                   // Alpha
    } else {
      // Muted dark aubergine background for unchanged pixels
      outData[i] = 38;    // R (#26)
      outData[i + 1] = 9; // G (#09)
      outData[i + 2] = 33;// B (#21)
      outData[i + 3] = 220;
    }
  }

  // Draw Heatmap
  ctxDiff.putImageData(outImgData, 0, 0);

  // Compute Metrics Deterministically
  const rawDiffPercent = (changedPixels / totalPixels) * 100;
  const diffPercent = totalDiffSum === 0 || changedPixels === 0 ? 0.0 : Number(rawDiffPercent.toFixed(1));
  const matchPercent = Number((100 - diffPercent).toFixed(1));
  const mad = Number((totalDiffSum / totalPixels).toFixed(2));
  const mse = mseSum / totalPixels;
  const psnr = mse === 0 ? 99.0 : Number((10 * Math.log10((255 * 255) / mse)).toFixed(1));

  // Identify top changed region bounding boxes
  const regions = [];
  const minPixelsPerCell = Math.max(5, Math.floor((cellWidth * cellHeight) * 0.05));
  
  if (changedPixels > 0) {
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (gridDensity[r][c] >= minPixelsPerCell) {
          regions.push({
            x: Math.round(c * cellWidth),
            y: Math.round(r * cellHeight),
            w: Math.round(cellWidth),
            h: Math.round(cellHeight),
            count: gridDensity[r][c]
          });
        }
      }
    }
  }

  // Merge adjacent regions into up to 3 main boxes
  const mergedBoxes = mergeRegions(regions, width, height).slice(0, 3);

  // Draw bounding boxes on diff canvas if changes exist
  if (changedPixels > 0) {
    ctxDiff.lineWidth = 2;
    ctxDiff.font = '11px "JetBrains Mono", monospace';
    
    mergedBoxes.forEach((box, idx) => {
      ctxDiff.strokeStyle = '#ffdad6';
      ctxDiff.setLineDash([4, 3]);
      ctxDiff.strokeRect(box.x, box.y, box.w, box.h);
      
      // Label
      ctxDiff.fillStyle = '#ba1a1a';
      ctxDiff.fillRect(box.x, Math.max(0, box.y - 18), 120, 18);
      ctxDiff.fillStyle = '#ffffff';
      ctxDiff.fillText(`Changed region ${idx + 1}`, box.x + 4, Math.max(12, box.y - 4));
    });
  }

  const thumbnailDataUrl = cDiff.toDataURL('image/jpeg', 0.6);

  return {
    analysisType: 'Pixel Difference Analysis',
    diffPercent,
    matchPercent,
    mad,
    psnr,
    diffDetected: diffPercent > 0,
    statusText: diffPercent === 0 ? 'Images Match' : 'Images Differ',
    changedPixelsCount: changedPixels,
    totalPixelsCount: totalPixels,
    changedRegionsCount: mergedBoxes.length,
    regions: mergedBoxes,
    thumbnailUrl: thumbnailDataUrl,
  };
}

/**
 * Helper to cluster adjacent grid cells into clean bounding boxes.
 */
function mergeRegions(regions, maxX, maxY) {
  if (regions.length === 0) return [];

  // Group by rough proximity
  const clusters = [];
  regions.forEach(reg => {
    let added = false;
    for (const cluster of clusters) {
      if (
        Math.abs(reg.x - cluster.x) <= reg.w * 2 &&
        Math.abs(reg.y - cluster.y) <= reg.h * 2
      ) {
        const x1 = Math.min(cluster.x, reg.x);
        const y1 = Math.min(cluster.y, reg.y);
        const x2 = Math.max(cluster.x + cluster.w, reg.x + reg.w);
        const y2 = Math.max(cluster.y + cluster.h, reg.y + reg.h);
        cluster.x = x1;
        cluster.y = y1;
        cluster.w = Math.min(maxX - x1, x2 - x1);
        cluster.h = Math.min(maxY - y1, y2 - y1);
        cluster.count += reg.count;
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({ ...reg });
    }
  });

  clusters.sort((a, b) => b.count - a.count);
  return clusters;
}
