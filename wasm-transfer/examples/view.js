import { getMemory } from '../pkg/wasm_transfer.js';

/**
 * View for reading Product data from encoded bytes (getItemsBinary).
 *
 * Encoded layout (17 bytes per Product):
 * - bytes 0-3:   sku ptr (u32)
 * - bytes 4-7:   sku len (u32)
 * - bytes 8-11:  price (f32)
 * - bytes 12-15: quantity (u32)
 * - byte 16:     in_stock (bool)
 */
export class ProductView {
  /** @type {ArrayBuffer | SharedArrayBuffer} */
  buffer;
  /** @type {number} */
  byteOffset;

  /**
   * @param {ArrayBufferLike | ArrayBufferView} bytes
   * @param {number} byteOffset
   */
  constructor(bytes, byteOffset) {
    this.buffer = ArrayBuffer.isView(bytes) ? bytes.buffer : bytes;
    this.byteOffset = byteOffset;
  }

  /** @type {typeof ProductView} */
  get helpers() {
    return this.constructor;
  }

  // Field offsets: returns [start, end] or [ptrStart, end, lenStart] for strings
  static get sku() {
    // ptr at 0, len at 4, field ends at 8
    return (byteOffset = 0) => [byteOffset, byteOffset + 8, byteOffset + 4];
  }

  static get price() {
    return (byteOffset = 0) => {
      const [_, from] = this.sku(byteOffset);
      return [from, from + 4]; // f32 = 4 bytes
    };
  }

  static get quantity() {
    return (byteOffset = 0) => {
      const [_, from] = this.price(byteOffset);
      return [from, from + 4]; // u32 = 4 bytes
    };
  }

  static get inStock() {
    return (byteOffset = 0) => {
      const [_, from] = this.quantity(byteOffset);
      return [from, from + 1]; // bool = 1 byte
    };
  }

  static get size() {
    return this.inStock()[1] - this.sku()[0]; // 17 bytes
  }

  get sku() {
    const [ptrFrom, _, lenFrom] = this.helpers.sku(this.byteOffset);

    const ref = new Uint32Array(this.buffer.slice(ptrFrom, ptrFrom + 4))[0];

    if (ref == null) {
      throw new Error('Null Pointer Exception');
    }

    const len = new Uint32Array(this.buffer.slice(lenFrom, lenFrom + 4))[0] ?? 0;

    return new TextDecoder().decode(getMemory().buffer.slice(ref, ref + len));
  }

  get price() {
    // Use Float32Array for f32
    return new Float32Array(this.buffer.slice(...this.helpers.price(this.byteOffset)))[0] ?? 0;
  }

  get quantity() {
    return new Uint32Array(this.buffer.slice(...this.helpers.quantity(this.byteOffset)))[0] ?? 0;
  }

  get inStock() {
    return !!new Uint8Array(this.buffer.slice(...this.helpers.inStock(this.byteOffset)))[0];
  }
}

export class ProductsView {
  static BYTES_PER_ELEMENT = ProductView.size; // 17 bytes

  /** @type {ArrayBuffer | SharedArrayBuffer} */
  buffer;
  /** @type {number} */
  byteOffset = 0;

  /**
   * @param {ArrayBufferLike | ArrayBufferView} bytes
   */
  constructor(bytes) {
    if (ArrayBuffer.isView(bytes)) {
      this.buffer = bytes.buffer;
      this.byteOffset = bytes.byteOffset;
    } else {
      this.buffer = bytes;
    }
  }

  /**
   * @param {number} index
   */
  get(index) {
    return new ProductView(this.buffer, this.byteOffset + index * ProductsView.BYTES_PER_ELEMENT);
  }
}

/**
 * View for reading Product data from raw struct memory (getItemsBinaryRaw).
 *
 * Raw struct layout with #[repr(C)] (24 bytes per Product):
 * - bytes 0-3:   sku.len (u32) - 4 bytes
 * - bytes 4-7:   sku.ptr (u32) - 4 bytes
 * - bytes 8-11:  sku.capacity (u32) - 4 bytes
 * - bytes 12-15: price (f32) - 4 bytes
 * - bytes 16-19: quantity (u32) - 4 bytes
 * - byte 20:     in_stock (bool) - 1 byte
 * - bytes 21-23: padding - 3 bytes
 */
export class ProductViewRaw extends ProductView {
  // Override field offsets for raw struct layout
  // String in wasm32 has layout [len, ptr, cap]
  static get sku() {
    // Returns [ptrStart, end, lenStart] - ptr at 4, len at 0, field ends at 12
    return (byteOffset = 0) => [byteOffset + 4, byteOffset + 12, byteOffset];
  }

  static get price() {
    return (byteOffset = 0) => {
      const [_, from] = this.sku(byteOffset);
      return [from, from + 4]; // f32 = 4 bytes, starts at offset 12
    };
  }

  static get quantity() {
    return (byteOffset = 0) => {
      const [_, from] = this.price(byteOffset);
      return [from, from + 4]; // u32 = 4 bytes, starts at offset 16
    };
  }

  static get inStock() {
    return (byteOffset = 0) => {
      const [_, from] = this.quantity(byteOffset);
      return [from, from + 1]; // bool = 1 byte, starts at offset 20
    };
  }

  static get size() {
    return 24; // 21 bytes of data + 3 bytes padding for alignment
  }
}

export class ProductsViewRaw {
  static BYTES_PER_ELEMENT = ProductViewRaw.size; // 24 bytes

  /** @type {ArrayBuffer | SharedArrayBuffer} */
  buffer;
  /** @type {number} */
  byteOffset;

  /**
   * @param {Uint32Array} header - [ptr, len] from getItemsBinaryRaw()
   */
  constructor(header) {
    const bytes = new Uint8Array(getMemory().buffer, ...header);
    this.buffer = bytes.buffer;
    this.byteOffset = bytes.byteOffset;
  }

  /**
   * @param {number} index
   */
  get(index) {
    return new ProductViewRaw(
      this.buffer,
      this.byteOffset + index * ProductsViewRaw.BYTES_PER_ELEMENT,
    );
  }
}
