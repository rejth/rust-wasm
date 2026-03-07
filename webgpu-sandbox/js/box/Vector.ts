export class Vector {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    [this.x, this.y] = [x, y];
  }

  array() {
    return [this.x, this.y];
  }

  clone() {
    return new Vector(this.x, this.y);
  }

  // Magnitude (length)
  magnitude() {
    return Math.sqrt(this.dot(this));
  }

  // Set from another vector
  set(vector: Vector) {
    [this.x, this.y] = [vector.x, vector.y];
  }

  // Vector sum
  add(vector: Vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  // Vector subtraction
  sub(vector: Vector) {
    return new Vector(this.x - vector.x, this.y - vector.y);
  }

  // Distance to point
  dist(vector: Vector) {
    return this.sub(vector).magnitude();
  }

  // Dot product
  dot(vector: Vector) {
    return this.x * vector.x + this.y * vector.y;
  }

  // Returns the angle between this vector and another vector
  angle(vector: Vector) {
    return Math.acos(Math.min(Math.max(this.dot(vector) / this.magnitude() / vector.magnitude(), -1), 1));
  }

  // Returns the angle between this vector A and vector B so that a rotation of vector A by angle makes it colinear with vector B
  signedAngle(vector: Vector) {
    const a = this.angle(vector);
    if (new Vector(0, 0).orient(this, vector) > 0) return -a;
    return a;
  }

  // Multiplication by scalar
  scale(alpha: number) {
    return new Vector(this.x * alpha, this.y * alpha);
  }

  // Returns this vector rotated by angle radians
  rotate(angle: number) {
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    return new Vector(c * this.x - s * this.y, s * this.x + c * this.y);
  }

  mix(vector: Vector, alpha: number) {
    // this vector * (1 - alpha) + vector * alpha
    return new Vector(this.x * (1 - alpha) + vector.x * alpha, this.y * (1 - alpha) + vector.y * alpha);
  }

  // Normalize this vector
  normalize() {
    return this.scale(1 / this.magnitude());
  }

  // Distance to line segment
  distSegment(p: Vector, q: Vector) {
    const s = p.dist(q);

    if (s < 0.00001) {
      return this.dist(p);
    }

    const v = q.sub(p).scale(1.0 / s);
    const u = this.sub(p);
    const d = u.dot(v);

    if (d < 0) {
      return this.dist(p);
    }
    if (d > s) {
      return this.dist(q);
    }

    return p.mix(q, d / s).dist(this);
  }

  // Determinant of a 3x3 matrix
  determinant(
    t00: number,
    t01: number,
    t02: number,
    t10: number,
    t11: number,
    t12: number,
    t20: number,
    t21: number,
    t22: number,
  ) {
    return t00 * (t11 * t22 - t12 * t21) + t01 * (t12 * t20 - t10 * t22) + t02 * (t10 * t21 - t11 * t20);
  }

  orient(p: Vector, q: Vector) {
    // Returns the orientation of triangle (this, p, q)
    return Math.sign(this.determinant(1, 1, 1, this.x, p.x, q.x, this.y, p.y, q.y));
  }
}
