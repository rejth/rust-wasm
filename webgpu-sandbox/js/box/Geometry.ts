export type BoxBounds = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type BoxDimension = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BoxPosition = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>;

export type BoxCorners = {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
};

export type BBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type Point = { x: number; y: number };

export class Geometry {
  getMousePosition(e: MouseEvent): Point {
    return { x: e.pageX, y: e.pageY };
  }

  getTouchPosition(e: TouchEvent): Point {
    const { left, top } = (e.target as Element).getBoundingClientRect();
    const { clientX, clientY } = e.changedTouches[0];

    return { x: clientX - left, y: clientY - top };
  }

  getPosition(e: MouseEvent | TouchEvent): Point {
    if (e instanceof MouseEvent) {
      return this.getMousePosition(e);
    } else if (window.TouchEvent && e instanceof TouchEvent) {
      return this.getTouchPosition(e);
    }

    return { x: 0, y: 0 };
  }

  getPathBounds(path: Point[]): BoxBounds | null {
    if (!path.length) return null;

    const from = path[0];
    const to = path[path.length - 1];

    return {
      x0: from.x,
      y0: from.y,
      x1: to.x,
      y1: to.y,
    };
  }

  getBoxDimensionFromPath(path: Point[]): BoxDimension | null {
    if (!path.length) return null;

    const from = path[0];
    const to = path[path.length - 1];

    return {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      width: Math.abs(from.x - to.x),
      height: Math.abs(from.y - to.y),
    };
  }

  getBoxDimensionFromBounds(bounds: BoxBounds): BoxDimension {
    const { x0, y0, x1, y1 } = bounds;
    return {
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      width: Math.abs(x0 - x1),
      height: Math.abs(y0 - y1),
    };
  }

  getBoxtBoundsFromDimension(dimension: BoxDimension): BoxBounds {
    return {
      x0: dimension.x,
      y0: dimension.y,
      x1: dimension.x + dimension.width,
      y1: dimension.y + dimension.height,
    };
  }

  getBoxCorners(x: number, y: number, width: number, height: number): BoxCorners {
    return {
      topLeft: { x, y },
      topRight: { x: x + width, y },
      bottomLeft: { x, y: y + height },
      bottomRight: { x: x + width, y: y + height },
    };
  }

  getMiddlePoint(from: number, to: number): number {
    return (from + to) / 2;
  }

  isPointInsideBox(p: Point, box: BoxPosition): boolean {
    return p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom;
  }

  isPointInsideBoxDimension(p: Point, { x, y, width, height }: BoxDimension, padding = 0): boolean {
    return p.x > x - padding && p.x < x + width + padding && p.y > y - padding && p.y < y + height + padding;
  }

  getBoundingBox(bounds: BoxBounds = { x0: 0, y0: 0, x1: 0, y1: 0 }): BBox {
    const { x0, y0, x1, y1 } = bounds;
    return {
      minX: Math.min(x0, x1),
      minY: Math.min(y0, y1),
      maxX: Math.max(x0, x1),
      maxY: Math.max(y0, y1),
    };
  }

  areBoxesOverlapping(boxA: BoxBounds, boxB: BoxBounds): boolean {
    const box1 = this.getBoundingBox(boxA);
    const box2 = this.getBoundingBox(boxB);
    return !(box1.maxX < box2.minX || box1.minX > box2.maxX || box1.maxY < box2.minY || box1.minY > box2.maxY);
  }

  areBoxesIntersecting(boxA: BoxDimension, boxB: BoxDimension): boolean {
    return !(
      boxA.x + boxA.width <= boxB.x ||
      boxB.x + boxB.width <= boxA.x ||
      boxA.y + boxA.height <= boxB.y ||
      boxB.y + boxB.height <= boxA.y
    );
  }

  getDistanceBetweenPoints(pointA: Point, pointB: Point) {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  }

  getDistanceBetweenPointAndLine({ x, y }: Point, pointA: Point, pointB: Point) {
    return (
      ((pointB.x - pointA.x) * (pointA.y - y) - (pointA.x - x) * (pointB.y - pointA.y)) /
      Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2))
    );
  }

  scaleToPercentage(scale: number): number {
    return Math.max(10, Math.min(Math.ceil((scale * 200) / 10), 200));
  }

  zoomPercentageToScale(percentage: number): number {
    return (percentage * 10) / 200;
  }

  degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}

export const geometry = new Geometry();
