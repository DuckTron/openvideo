import type { Point, Rectangle } from "pixi.js";

export interface SnapGuide {
  type: "vertical" | "horizontal";
  position: number;
  // The line segment to draw to visualize the snap
  start: number;
  end: number;
}

export interface SnapResult {
  x: number | null; // null if no snap
  y: number | null; // null if no snap
  guides: SnapGuide[];
}

export class SnappingManager {
  static SNAP_THRESHOLD = 5;

  constructor(
    private artboardWidth: number,
    private artboardHeight: number,
    private scale: number = 1,
  ) {}

  updateContext(width: number, height: number, scale: number) {
    this.artboardWidth = width;
    this.artboardHeight = height;
    this.scale = scale;
  }

  /**
   * Snap a rectangle (bounds of the object) to artboard edges and center.
   * returns delta (adjustment) needed for x and y
   */
  snapMove(
    current: Rectangle,
    // Optional: future support for snapping to other objects could pass them here
  ): { dx: number; dy: number; guides: SnapGuide[] } {
    const guides: SnapGuide[] = [];
    let dx = 0;
    let dy = 0;

    const threshold = SnappingManager.SNAP_THRESHOLD / this.scale;

    // X Axis Snapping

    // Targets: Center (W/2), Left (0), Right (W) - Center prioritized
    const targetsX = [
      { value: this.artboardWidth / 2, label: "center" },
      { value: 0, label: "start" },
      { value: this.artboardWidth, label: "end" },
    ];

    // Points on object: Left, Center, Right
    const objectPointsX = [
      { value: current.x, type: "start" },
      { value: current.x + current.width / 2, type: "center" },
      { value: current.x + current.width, type: "end" },
    ];

    let snappedX = false;

    // Check for closest snap
    for (const target of targetsX) {
      if (snappedX) break;
      for (const objP of objectPointsX) {
        const diff = target.value - objP.value;
        if (Math.abs(diff) < threshold) {
          dx = diff;
          snappedX = true;

          guides.push({
            type: "vertical",
            position: target.value,
            // Guide length: encompass both object and artboard height usually,
            // or just min/max of the two
            start: Math.min(0, current.y),
            end: Math.max(this.artboardHeight, current.y + current.height),
          });
          break;
        }
      }
    }

    // Y Axis Snapping
    const targetsY = [
      { value: this.artboardHeight / 2, label: "center" },
      { value: 0, label: "start" },
      { value: this.artboardHeight, label: "end" },
    ];

    const objectPointsY = [
      { value: current.y, type: "start" },
      { value: current.y + current.height / 2, type: "center" },
      { value: current.y + current.height, type: "end" },
    ];

    let snappedY = false;

    for (const target of targetsY) {
      if (snappedY) break;
      for (const objP of objectPointsY) {
        const diff = target.value - objP.value;
        if (Math.abs(diff) < threshold) {
          dy = diff;
          snappedY = true;

          guides.push({
            type: "horizontal",
            position: target.value,
            start: Math.min(0, current.x),
            end: Math.max(this.artboardWidth, current.x + current.width),
          });
          break;
        }
      }
    }

    return { dx, dy, guides };
  }

  /**
   * Snap during scaling - only snaps the moving edges based on the handle.
   * This prevents false triggers when stationary edges align with artboard edges.
   * @param proposed - The proposed rectangle in local coordinates
   * @param proposedWorld - The world position of the proposed rect's origin (top-left)
   * @param handle - Which resize handle is being dragged
   */
  snapResize(
    proposed: Rectangle,
    proposedWorld: Point,
    handle: "tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb",
  ): {
    corrected: Rectangle;
    guides: SnapGuide[];
  } {
    const rect = proposed.clone();
    const guides: SnapGuide[] = [];
    const threshold = SnappingManager.SNAP_THRESHOLD / this.scale;

    // Debug logging
    console.log("[snapResize] handle:", handle, "scale:", this.scale, "threshold:", threshold);
    console.log("[snapResize] proposedLocal:", {
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
    });
    console.log("[snapResize] proposedWorld:", { x: proposedWorld.x, y: proposedWorld.y });

    // Artboard targets (in world coordinates)
    const targetsX = [
      { value: 0, label: "start" },
      { value: this.artboardWidth / 2, label: "center" },
      { value: this.artboardWidth, label: "end" },
    ];
    const targetsY = [
      { value: 0, label: "start" },
      { value: this.artboardHeight / 2, label: "center" },
      { value: this.artboardHeight, label: "end" },
    ];

    // Determine which edges are moving based on handle
    const movingLeft = ["tl", "ml", "bl"].includes(handle);
    const movingRight = ["tr", "mr", "br"].includes(handle);
    const movingTop = ["tl", "mt", "tr"].includes(handle);
    const movingBottom = ["bl", "mb", "br"].includes(handle);

    // Calculate world coordinates of the edges
    // proposedWorld is now in parent/artboard space (from localTransform.apply)
    // The localTransform already includes scale, so proposedWorld accounts for position + scale
    // For dimensions, we need to convert local width/height to parent space by multiplying by scale
    const worldLeft = proposedWorld.x;
    const worldTop = proposedWorld.y;
    const worldWidth = rect.width * this.scale;
    const worldHeight = rect.height * this.scale;
    const worldRight = worldLeft + worldWidth;
    const worldBottom = worldTop + worldHeight;

    console.log("[snapResize] worldEdges:", {
      left: worldLeft,
      right: worldRight,
      top: worldTop,
      bottom: worldBottom,
    });
    console.log("[snapResize] targets:", {
      midX: this.artboardWidth / 2,
      maxX: this.artboardWidth,
      midY: this.artboardHeight / 2,
      maxY: this.artboardHeight,
    });
    console.log("[snapResize] moving:", {
      left: movingLeft,
      right: movingRight,
      top: movingTop,
      bottom: movingBottom,
    });

    // Snap horizontal edges (X-axis) - check against world coordinates
    for (const target of targetsX) {
      // Check left edge if moving
      if (movingLeft) {
        const diffWorld = target.value - worldLeft;
        if (Math.abs(diffWorld) < threshold) {
          // Convert world diff to local diff
          const diffLocal = diffWorld / this.scale;
          rect.x += diffLocal;
          rect.width -= diffLocal; // Keep right edge stationary
          guides.push({
            type: "vertical",
            position: target.value,
            start: Math.min(0, worldTop),
            end: Math.max(this.artboardHeight, worldBottom),
          });
          break;
        }
      }
      // Check right edge if moving
      if (movingRight) {
        const diffWorld = target.value - worldRight;
        if (Math.abs(diffWorld) < threshold) {
          // Convert world diff to local diff
          const diffLocal = diffWorld / this.scale;
          rect.width += diffLocal;
          guides.push({
            type: "vertical",
            position: target.value,
            start: Math.min(0, worldTop),
            end: Math.max(this.artboardHeight, worldBottom),
          });
          break;
        }
      }
    }

    // Snap vertical edges (Y-axis) - check against world coordinates
    for (const target of targetsY) {
      // Check top edge if moving
      if (movingTop) {
        const diffWorld = target.value - worldTop;
        if (Math.abs(diffWorld) < threshold) {
          // Convert world diff to local diff
          const diffLocal = diffWorld / this.scale;
          rect.y += diffLocal;
          rect.height -= diffLocal; // Keep bottom edge stationary
          guides.push({
            type: "horizontal",
            position: target.value,
            start: Math.min(0, worldLeft),
            end: Math.max(this.artboardWidth, worldRight),
          });
          break;
        }
      }
      // Check bottom edge if moving
      if (movingBottom) {
        const diffWorld = target.value - worldBottom;
        if (Math.abs(diffWorld) < threshold) {
          // Convert world diff to local diff
          const diffLocal = diffWorld / this.scale;
          rect.height += diffLocal;
          guides.push({
            type: "horizontal",
            position: target.value,
            start: Math.min(0, worldLeft),
            end: Math.max(this.artboardWidth, worldRight),
          });
          break;
        }
      }
    }

    return { corrected: rect, guides };
  }

  // Specialized resize snap that checks individual edges
  snapPoint(point: Point): { p: Point; guides: SnapGuide[] } {
    const threshold = SnappingManager.SNAP_THRESHOLD / this.scale;

    const guides: SnapGuide[] = [];
    const res = point.clone();

    // X
    const targetsX = [0, this.artboardWidth / 2, this.artboardWidth];
    for (const tx of targetsX) {
      if (Math.abs(tx - point.x) < threshold) {
        res.x = tx;
        guides.push({
          type: "vertical",
          position: tx,
          start: 0, // Simplified
          end: this.artboardHeight,
        });
        break;
      }
    }

    // Y
    const targetsY = [0, this.artboardHeight / 2, this.artboardHeight];
    for (const ty of targetsY) {
      if (Math.abs(ty - point.y) < threshold) {
        res.y = ty;
        guides.push({
          type: "horizontal",
          position: ty,
          start: 0,
          end: this.artboardWidth,
        });
        break;
      }
    }

    return { p: res, guides };
  }
}
