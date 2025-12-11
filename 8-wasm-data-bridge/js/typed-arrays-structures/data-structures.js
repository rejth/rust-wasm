const U8 = {
  get byteLength() {
    return 1;
  },

  get alignment() {
    return 1;
  },

  init: (buffer, offset) => {
    const array = new Uint8Array(buffer, offset, 1);

    return {
      get() {
        return array[0];
      },
      set(value) {
        array[0] = value;
      },
    };
  },
};

const U16 = {
  get byteLength() {
    return 2;
  },

  get alignment() {
    return 2;
  },

  init: (buffer, offset) => {
    const remainder = offset % U16.alignment;

    offset = remainder === 0 ? offset : offset - remainder;

    const array = new Uint16Array(buffer, offset, 1);

    return {
      get() {
        return array[0];
      },

      set(value) {
        array[0] = value;
      },
    };
  },
};

const FixedASCIIString = (maxLength) => ({
  get byteLength() {
    return maxLength;
  },

  get alignment() {
    return 1;
  },

  init: (buffer, offset) => {
    const array = new Uint8Array(buffer, offset, maxLength);

    return {
      get() {
        let str = '';

        for (charCode of array) {
          if (charCode === 0) {
            break;
          }
          str += String.fromCharCode(charCode);
        }

        return str;
      },

      set(value) {
        for (let i = 0; i < maxLength; i++) {
          if (i < value.length) {
            array[i] = value.charCodeAt(i);
          } else {
            array[i] = 0;
          }
        }
      },
    };
  },
});

class Struct {
  constructor(scheme) {
    let totalLength = 0;

    this.scheme = Object.entries(scheme).flatMap(([key, dataType]) => {
      const alignment = this.#getAlignment(totalLength, dataType.alignment ?? 1);

      const result = [];

      if (alignment !== 0) {
        result.push([
          Symbol(`alignment_${key}`),
          {
            byteLength: alignment,
            init: () => ({
              get: () => 0,
              set: (_value) => {},
            }),
          },
        ]);

        totalLength += alignment;
      }

      result.push([
        key,
        {
          byteLength: dataType.byteLength,
          init: dataType.init.bind(dataType),
        },
      ]);

      totalLength += dataType.byteLength;

      return result;
    });

    this.byteLength = totalLength;
    this.scheme = new Map(this.scheme);
  }

  init(buffer, offset = 0) {
    const view = this.from(buffer, offset);

    return {
      get: () => view,
      set: (value) => this.create(value, buffer, offset),
    };
  }

  create(data, buffer = new ArrayBuffer(this.byteLength), offset = 0) {
    const view = new StructDataView(buffer, this.byteLength, offset);

    this.scheme.forEach((dataType, key) => {
      const { get, set } = dataType.init(buffer, offset);

      if (typeof key !== 'symbol') {
        set(data[key]);

        Object.defineProperty(view, key, {
          get,
          set,
          enumerable: true,
          configurable: true,
        });
      }

      offset += dataType.byteLength;
    });

    return view;
  }

  from(buffer, offset = 0) {
    const view = new StructDataView(buffer, this.byteLength, offset);

    this.scheme.forEach((dataType, key) => {
      const currentOffset = offset;
      offset += dataType.byteLength;

      let accessors = null;

      function init() {
        if (accessors === null) {
          accessors = dataType.init(buffer, currentOffset);
        }

        return accessors;
      }

      if (typeof key !== 'symbol') {
        Object.defineProperty(view, key, {
          get: () => init().get(),
          set: (value) => init().set(value),
          enumerable: true,
          configurable: true,
        });
      }
    });

    return view;
  }

  #getAlignment(offset, size) {
    const remainder = offset % size;

    if (remainder === 0) {
      return 0;
    }

    return size - remainder;
  }
}

class StructDataView {
  #buffer;
  #byteLength;
  #byteOffset;

  constructor(buffer, byteLength, byteOffset) {
    this.#buffer = buffer;
    this.#byteLength = byteLength;
    this.#byteOffset = byteOffset;
  }

  get buffer() {
    return this.#buffer;
  }

  get byteLength() {
    return this.#byteLength;
  }

  get byteOffset() {
    return this.#byteOffset;
  }

  get(key) {
    return this.buffer[key];
  }

  set(key, value) {
    this.buffer[key] = value;
  }
}

const Tuple = (...dataTypes) => {
  const scheme = dataTypes.reduce((acc, dataType, index) => {
    acc[index] = dataType;
    return acc;
  }, {});

  return new Struct(scheme);
};

class TypedArray {
  constructor(dataType, length) {
    this.byteLength = dataType.byteLength * length;
    this.length = length;
    this.dataType = dataType;
  }

  init(buffer, offset = 0) {
    const view = this.from(buffer, offset);

    return {
      get: () => view,
      set: (value) => this.create(value, buffer, offset),
    };
  }

  create(data, buffer = new ArrayBuffer(this.byteLength), offset = 0) {
    const view = new TypedArrayDataView(buffer, this.dataType, this.byteLength, offset);

    for (let i = 0; i < this.length && i < data.length; i++) {
      view.set(i, data[i]);
    }

    return view;
  }

  from(buffer, offset = 0) {
    const view = new TypedArrayDataView(buffer, this.dataType, this.byteLength, offset);

    return view;
  }
}

class TypedArrayDataView {
  #buffer;
  #dataType;
  #byteLength;
  #byteOffset;

  constructor(buffer, dataType, byteLength, byteOffset) {
    this.#buffer = buffer;
    this.#dataType = dataType;
    this.#byteLength = byteLength;
    this.#byteOffset = byteOffset;
  }

  get buffer() {
    return this.#buffer;
  }

  get byteLength() {
    return this.#byteLength;
  }

  get BYTES_PER_ELEMENT() {
    return this.#dataType.byteLength;
  }

  get byteOffset() {
    return this.#byteOffset;
  }

  #init(index) {
    return this.#dataType.init(this.#buffer, this.#byteOffset + index * this.BYTES_PER_ELEMENT);
  }

  get(index) {
    return this.#init(index).get();
  }

  set(index, value) {
    this.#init(index).set(value);
  }
}

const Color = Tuple(U8, U8, U8);

const Person = new Struct({
  age: U8,
  id: U16,
  firstName: FixedASCIIString(8),
  lastName: FixedASCIIString(8),
  color: Color,
});

const PersonArray = new TypedArray(Person, 1e5);

const data = PersonArray.create([
  {
    age: 25,
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    color: [0xff, 0x00, 0x00],
  },
  {
    age: 30,
    id: 2,
    firstName: 'Jane',
    lastName: 'Doe',
    color: [0x00, 0xff, 0x00],
  },
  {
    age: 35,
    id: 3,
    firstName: 'Jim',
    lastName: 'Beam',
    color: [0x00, 0x00, 0xff],
  },
]);

console.log(data.get(2).firstName);
console.log(data.get(2).lastName);
console.log(data.get(2).age);
console.log(data.get(2).id);
