import { Vector2D } from './Vector2D';

export type Vector3 = [number, number, number];

/**
 * A 4x4 matrix for 3D transformations.
 */
export class Matrix4 {
  elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity() {
    const m = this.elements;

    m[0] = 1;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = 1;
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = 1;
    m[11] = 0;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return this;
  }

  /**
   * Set data from another matrix
   */
  set(data: Matrix4['elements']) {
    this.elements.set(data);
    return this;
  }

  /**
   * Copy the matrix
   */
  copy() {
    const dst = new Matrix4();
    dst.set(this.elements);
    return dst;
  }

  /**
   * Applies an orthographic projection to the matrix.
   * @param left - The left plane distance.
   * @param right - The right plane distance.
   * @param bottom - The bottom plane distance.
   * @param top - The top plane distance.
   * @param near - The near plane distance.
   * @param far - The far plane distance.
   */
  orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    const m = this.elements;

    m[0] = 2 / (right - left);
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = 2 / (top - bottom);
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = 1 / (near - far);
    m[11] = 0;

    m[12] = (right + left) / (left - right);
    m[13] = (top + bottom) / (bottom - top);
    m[14] = near / (near - far);
    m[15] = 1;

    return this;
  }

  /**
   * Applies a perspective projection to the 4x4 matrix.
   * @param fov - The field of view in radians.
   * @param aspect - The aspect ratio (width / height).
   * @param near - The near plane distance.
   * @param far - The far plane distance.
   */
  perspective(fov: number, aspect: number, near: number, far: number) {
    const f = 1.0 / Math.tan(fov * 0.5);
    const rangeInverse = 1 / (near - far); // inverse of the range (near - far)
    const m = this.elements;

    m[0] = f / aspect;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = f;
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = (far + near) * rangeInverse;
    m[11] = -1;

    m[12] = 0;
    m[13] = 0;
    m[14] = 2 * far * near * rangeInverse;
    m[15] = 0;

    return this;
  }

  /**
   * Post-multiplies the 4x4 matrix by a 3D translation vector.
   * Appends translation to an existing transform chain without extra allocations.
   * Preserves current projection/rotation/scale and updates only the last column based on existing columns.
   */
  translate([dx, dy, dz]: Float32Array) {
    const m = this.elements;

    const c0r0 = m[0];
    const c0r1 = m[1];
    const c0r2 = m[2];
    const c0r3 = m[3];

    const c1r0 = m[4];
    const c1r1 = m[5];
    const c1r2 = m[6];
    const c1r3 = m[7];

    const c2r0 = m[8];
    const c2r1 = m[9];
    const c2r2 = m[10];
    const c2r3 = m[11];

    const c3r0 = m[12];
    const c3r1 = m[13];
    const c3r2 = m[14];
    const c3r3 = m[15];

    m[12] = c0r0 * dx + c1r0 * dy + c2r0 * dz + c3r0;
    m[13] = c0r1 * dx + c1r1 * dy + c2r1 * dz + c3r1;
    m[14] = c0r2 * dx + c1r2 * dy + c2r2 * dz + c3r2;
    m[15] = c0r3 * dx + c1r3 * dy + c2r3 * dz + c3r3;

    return this;
  }

  /**
   * Post-multiplies the 4x4 matrix by a Z-axis rotation angle in radians.
   * Appends rotation to an existing transform chain without extra allocations.
   * Preserves current translation/scale/projection and updates only the rotation matrix.
   */
  rotateZ(angleInRadians = 0) {
    const m = this.elements;
    const s = Math.sin(angleInRadians);
    const c = Math.cos(angleInRadians);

    const c0r0 = m[0];
    const c0r1 = m[1];
    const c0r2 = m[2];
    const c0r3 = m[3];

    const c1r0 = m[4];
    const c1r1 = m[5];
    const c1r2 = m[6];
    const c1r3 = m[7];

    m[0] = c0r0 * c - c1r0 * s;
    m[1] = c0r1 * c - c1r1 * s;
    m[2] = c0r2 * c - c1r2 * s;
    m[3] = c0r3 * c - c1r3 * s;

    m[4] = c0r0 * s + c1r0 * c;
    m[5] = c0r1 * s + c1r1 * c;
    m[6] = c0r2 * s + c1r2 * c;
    m[7] = c0r3 * s + c1r3 * c;

    return this;
  }

  /**
   * Post-multiplies the 4x4 matrix by a 3D scale vector.
   * Appends scale to an existing transform chain without extra allocations.
   * Preserves current translation/rotation/projection and updates only the scale matrix.
   */
  scale([sx, sy, sz]: Float32Array) {
    const m = this.elements;

    m[0] *= sx;
    m[1] *= sx;
    m[2] *= sx;
    m[3] *= sx;

    m[4] *= sy;
    m[5] *= sy;
    m[6] *= sy;
    m[7] *= sy;

    m[8] *= sz;
    m[9] *= sz;
    m[10] *= sz;
    m[11] *= sz;

    return this;
  }

  /**
   * Multiplies two 4x4 matrices.
   * This is commonly used to combine transformations (like applying a rotation after a translation).
   */
  multiply(matrix: Matrix4) {
    const ae = this.elements;
    const be = matrix.elements;
    const out = this.elements;

    const a00 = ae[0];
    const a01 = ae[1];
    const a02 = ae[2];
    const a03 = ae[3];

    const a10 = ae[4];
    const a11 = ae[5];
    const a12 = ae[6];
    const a13 = ae[7];

    const a20 = ae[8];
    const a21 = ae[9];
    const a22 = ae[10];
    const a23 = ae[11];

    const a30 = ae[12];
    const a31 = ae[13];
    const a32 = ae[14];
    const a33 = ae[15];

    const b00 = be[0];
    const b01 = be[1];
    const b02 = be[2];
    const b03 = be[3];

    const b10 = be[4];
    const b11 = be[5];
    const b12 = be[6];
    const b13 = be[7];

    const b20 = be[8];
    const b21 = be[9];
    const b22 = be[10];
    const b23 = be[11];

    const b30 = be[12];
    const b31 = be[13];
    const b32 = be[14];
    const b33 = be[15];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;

    out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;

    out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;

    out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

    return this;
  }

  /**
   * Inverts the current 4x4 matrix in place without creating a new matrix.
   * The inverse matrix "undoes" the transformation represented by the original matrix.
   * Returns null if the matrix is not invertible.
   */
  inverse() {
    const m = this.elements;

    const m00 = m[0];
    const m01 = m[1];
    const m02 = m[2];
    const m03 = m[3];

    const m10 = m[4];
    const m11 = m[5];
    const m12 = m[6];
    const m13 = m[7];

    const m20 = m[8];
    const m21 = m[9];
    const m22 = m[10];
    const m23 = m[11];

    const m30 = m[12];
    const m31 = m[13];
    const m32 = m[14];
    const m33 = m[15];

    const b00 = m00 * m11 - m01 * m10;
    const b01 = m00 * m12 - m02 * m10;
    const b02 = m00 * m13 - m03 * m10;
    const b03 = m01 * m12 - m02 * m11;

    const b04 = m01 * m13 - m03 * m11;
    const b05 = m02 * m13 - m03 * m12;
    const b06 = m20 * m31 - m21 * m30;
    const b07 = m20 * m32 - m22 * m30;

    const b08 = m20 * m33 - m23 * m30;
    const b09 = m21 * m32 - m22 * m31;
    const b10 = m21 * m33 - m23 * m31;
    const b11 = m22 * m33 - m23 * m32;

    const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (Math.abs(determinant) < Number.EPSILON) {
      return null;
    }

    const invDeterminant = 1 / determinant;

    m[0] = (m11 * b11 - m12 * b10 + m13 * b09) * invDeterminant;
    m[1] = (m02 * b10 - m01 * b11 - m03 * b09) * invDeterminant;
    m[2] = (m31 * b05 - m32 * b04 + m33 * b03) * invDeterminant;
    m[3] = (m22 * b04 - m21 * b05 - m23 * b03) * invDeterminant;

    m[4] = (m12 * b08 - m10 * b11 - m13 * b07) * invDeterminant;
    m[5] = (m00 * b11 - m02 * b08 + m03 * b07) * invDeterminant;
    m[6] = (m32 * b02 - m30 * b05 - m33 * b01) * invDeterminant;
    m[7] = (m20 * b05 - m22 * b02 + m23 * b01) * invDeterminant;

    m[8] = (m10 * b10 - m11 * b08 + m13 * b06) * invDeterminant;
    m[9] = (m01 * b08 - m00 * b10 - m03 * b06) * invDeterminant;
    m[10] = (m30 * b04 - m31 * b02 + m33 * b00) * invDeterminant;
    m[11] = (m21 * b02 - m20 * b04 - m23 * b00) * invDeterminant;

    m[12] = (m11 * b07 - m10 * b09 - m12 * b06) * invDeterminant;
    m[13] = (m00 * b09 - m01 * b07 + m02 * b06) * invDeterminant;
    m[14] = (m31 * b01 - m30 * b03 - m32 * b00) * invDeterminant;
    m[15] = (m20 * b03 - m21 * b01 + m22 * b00) * invDeterminant;

    return this;
  }

  /**
   * Transforms this matrix by a 3D vector.
   */
  transform(vector: Vector3) {
    const m = this.elements;

    const x = vector[0];
    const y = vector[1];
    const z = vector[2];

    const c0r0 = m[0];
    const c0r1 = m[1];
    const c0r2 = m[2];

    const c1r0 = m[4];
    const c1r1 = m[5];
    const c1r2 = m[6];

    const c2r0 = m[8];
    const c2r1 = m[9];
    const c2r2 = m[10];

    m[0] = x * c0r0 + y * c1r0 + z * c2r0;
    m[1] = x * c0r1 + y * c1r1 + z * c2r1;
    m[2] = x * c0r2 + y * c1r2 + z * c2r2;

    return this;
  }

  /**
   * Returns a new 2D vector, where the given vector is transformed by this 4x4 matrix and transformed as a 2D point (z=0, w=1), including translation.
   * Transforms a point/position in space (like moving a dot from one location to another).
   */
  apply2DPoint(vector: Vector2D) {
    const m = this.elements;
    const x = vector.x;
    const y = vector.y;

    const tx = m[0] * x + m[4] * y + m[12];
    const ty = m[1] * x + m[5] * y + m[13];
    const tw = m[3] * x + m[7] * y + m[15];

    if (tw !== 0 && tw !== 1) {
      return new Vector2D(tx / tw, ty / tw);
    }

    return new Vector2D(tx, ty);
  }

  /**
   * Returns a new 2D vector, where the given vector is transformed by this matrix and transformed as a 2D direction (z=0, w=0), excluding translation.
   * This method does not include translation (e and f). It's a direction-only transformation.
   * Transform a direction/velocity vector (like rotating which way something is pointing, but not changing its position).
   */
  apply2DVector(vector: Vector2D) {
    const m = this.elements;
    const x = vector.x;
    const y = vector.y;

    return new Vector2D(m[0] * x + m[4] * y, m[1] * x + m[5] * y);
  }
}
