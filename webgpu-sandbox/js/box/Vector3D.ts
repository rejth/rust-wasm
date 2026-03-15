export class Vector3D {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    [this.x, this.y, this.z] = [x, y, z];
  }

  array() {
    return [this.x, this.y, this.z];
  }

  clone() {
    return new Vector3D(this.x, this.y, this.z);
  }

  /**
   * Magnitude (length)
   */
  magnitude() {
    return Math.sqrt(this.dot(this));
  }

  /**
   * Set from another vector
   */
  set(vector: Vector3D) {
    [this.x, this.y, this.z] = [vector.x, vector.y, vector.z];
  }

  /**
   * Vector sum
   */
  add(vector: Vector3D) {
    return new Vector3D(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  /**
   * Vector subtraction
   */
  sub(vector: Vector3D) {
    return new Vector3D(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  /**
   * Distance to point
   */
  dist(vector: Vector3D) {
    return this.sub(vector).magnitude();
  }

  /**
   * Dot product
   */
  dot(vector: Vector3D) {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  /**
   * Returns the angle between this vector and another vector
   */
  angle(vector: Vector3D) {
    return Math.acos(Math.min(Math.max(this.dot(vector) / this.magnitude() / vector.magnitude(), -1), 1));
  }

  /**
   * Returns the angle between this vector A and vector B so that a rotation of vector A by angle makes it colinear with vector B
   */
  signedAngle(vector: Vector3D) {
    const a = this.angle(vector);

    if (new Vector3D(0, 0, 0).orient(this, vector) > 0) {
      return -a;
    }

    return a;
  }

  /**
   * Multiplication by scalar
   */
  scale(alpha: number) {
    return new Vector3D(this.x * alpha, this.y * alpha, this.z * alpha);
  }

  /**
   * Returns this vector rotated by angle radians
   */
  rotate(angle: number) {
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    return new Vector3D(c * this.x - s * this.y, s * this.x + c * this.y, c * this.z - s * this.z);
  }

  /**
   * Returns a new vector that is a mix of this vector and another vector
   */
  mix(vector: Vector3D, alpha: number) {
    // this vector * (1 - alpha) + vector * alpha
    return new Vector3D(
      this.x * (1 - alpha) + vector.x * alpha,
      this.y * (1 - alpha) + vector.y * alpha,
      this.z * (1 - alpha) + vector.z * alpha,
    );
  }

  /**
   * Normalize this vector
   */
  normalize() {
    return this.scale(1 / this.magnitude());
  }

  /**
   * Distance to line segment
   */
  distSegment(p: Vector3D, q: Vector3D) {
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

  /**
   * Determinant of a 3x3 matrix
   */
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

  /**
   * Returns the orientation of triangle (this, p, q)
   */
  orient(p: Vector3D, q: Vector3D) {
    return Math.sign(this.determinant(1, 1, 1, this.x, p.x, q.x, this.y, p.y, q.y));
  }
}
