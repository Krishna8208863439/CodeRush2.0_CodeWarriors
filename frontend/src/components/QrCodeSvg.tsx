'use client';

import React from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
}

export default function QrCodeSvg({ value, size = 128 }: QrCodeSvgProps) {
  // Generate a clean deterministic 21x21 grid pattern for the QR code representation
  const matrixSize = 21;
  const grid: boolean[][] = Array(matrixSize).fill(false).map(() => Array(matrixSize).fill(false));

  // Helper to draw position finder patterns (7x7 boxes at corners)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          grid[startY + r][startX + c] = true;
        }
      }
    }
  };

  // Draw 3 standard finder patterns
  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Fill pseudo-random data bits based on string hash
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= 13;
      const inBottomLeft = r >= 13 && c < 8;
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        const bit = ((hash ^ (r * 31 + c * 17)) & 1) === 1;
        grid[r][c] = bit;
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="#ffffff" />
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * cellSize}
                y={rIdx * cellSize}
                width={cellSize + 0.1}
                height={cellSize + 0.1}
                fill="#0f172a"
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
