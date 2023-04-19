const testArray1 = [2, 3, true, false, "ab"];

const schema = [
  [3, "number"],
  [2, "number"],
  [1, "boolean"],
  [1, "boolean"],
  [16, "ascii"],
];

const getSchemaHandler = (schemaElement) => {
  switch (schemaElement[1]) {
    case "number":
      return (value) => value & ((2 ** 32 - 1) >> (32 - schemaElement[0]));

    case "boolean":
      return (value) => (value ? 1 : 0);

    case "ascii":
      return (value) => {
        let encodedValue = 0;
        const loopLimit = schemaElement[0] / 8;
        const stringBitSize = value.length * 8;
        for (let i = 0; i < loopLimit; i++) {
          if (value[i]) {
            const shift = stringBitSize - (i + 1) * 8;
            encodedValue |= value[i].charCodeAt(0) << shift;
          }
        }
        return encodedValue;
      };

    default:
      throw new Error(
        `Невозможно определить тип данных элемента схемы ${schemaElement}`
      );
  }
};

const setByteValue = (byteShift, bitShiftInsideByte, binaryValue, view) => {
  const workingByte = view.getUint8(byteShift);
  const shiftedBinaryValue = binaryValue << bitShiftInsideByte;
  const combinedBinaryValue = workingByte | shiftedBinaryValue;
  view.setUint8(byteShift, combinedBinaryValue);
};

const divideBy8Bits = (
  binaryValue,
  bitSizeElement,
  bitShiftInsideByte,
  byteShift,
  view
) => {
  let remainedBitsInByte = 8 - bitShiftInsideByte;

  if (remainedBitsInByte > bitSizeElement) {
    setByteValue(byteShift, bitShiftInsideByte, binaryValue, view);
  } else {
    const partOfBinaryValue = binaryValue & (2 ** remainedBitsInByte - 1);
    setByteValue(byteShift, bitShiftInsideByte, partOfBinaryValue, view);

    const remainedBitsSize = bitSizeElement - remainedBitsInByte;

    const remainedBinaryValue =
      (2 ** remainedBitsSize - 1) & (binaryValue >> remainedBitsInByte);
    divideBy8Bits(
      remainedBinaryValue,
      remainedBitsSize,
      0,
      byteShift + 1,
      view
    );
  }
};

const encode = (array, schema) => {
  const shemaBits = schema.reduce((acc, curr) => acc + curr[0], 0);
  let bitOffset = 0;
  const buffer = new ArrayBuffer(Math.ceil(shemaBits / 8));
  const view = new DataView(buffer);

  for (let i = 0; i < array.length; i++) {
    const schemaElement = schema[i];
    const bitSizeElement = schemaElement[0];
    const byteShift = Math.floor(bitOffset / 8);
    const bitShiftInsideByte = bitOffset % 8;

    const value = array[i];

    const schemaHandler = getSchemaHandler(schemaElement);
    const binaryValue = schemaHandler(value);

    divideBy8Bits(
      binaryValue,
      bitSizeElement,
      bitShiftInsideByte,
      byteShift,
      view
    );
    bitOffset += bitSizeElement;
  }
  return buffer;
};

// let i = 0;
// const bufferView = new DataView(encode(testArray1, schema));
// while (i < bufferView.byteLength) {
//   console.log(i, bufferView.getUint8(i).toString(2));
//   i++;
// }

const decodeHandler = (schemaElement) => {
  switch (schemaElement[1]) {
    case "number":
      return (value) => value;

    case "boolean":
      return (value) => Boolean(value);

    case "ascii":
      return (value) => {
        let decodedString = "";
        const loopLimit = schemaElement[0] / 8;
        for (let i = loopLimit - 1; i > -1; i--) {
          const char = (2 ** 8 - 1) & (value >> (i * 8));
          const decodedChar = String.fromCharCode(char);
          decodedString += decodedChar;
          console.log("decodedString", decodedString);
        }
        return decodedString;
      };

    default:
      throw new Error(
        `Невозможно определить тип данных элемента схемы ${schemaElement}`
      );
  }
};

const decodeBy8Bits = (
  partOfBinaryValue,
  decodedArray,
  bitSizeElement,
  bitShiftInsideByte,
  byteShift,
  view,
  decoder,
  mask,
  i
) => {
  let remainedBitsInByte = 8 - bitShiftInsideByte;
  const workingByte = view.getUint8(byteShift);

  if (remainedBitsInByte > bitSizeElement) {
    let finalBinaryValue;
    if (partOfBinaryValue) {
      const binaryFromThisByte =
        (mask & (workingByte >> bitShiftInsideByte)) <<
        partOfBinaryValue.toString(2).length;
      finalBinaryValue = partOfBinaryValue | binaryFromThisByte;
    } else {
      finalBinaryValue =
        (workingByte >> bitShiftInsideByte) & (2 ** bitSizeElement - 1);
    }
    decodedArray[i] = decoder(finalBinaryValue);
  } else {
    const binaryFromThisByte =
      (mask & (workingByte >> bitShiftInsideByte)) <<
      partOfBinaryValue.toString(2).length;

    partOfBinaryValue = binaryFromThisByte | (mask & partOfBinaryValue);

    const remainedBitsSize = bitSizeElement - remainedBitsInByte;
    decodeBy8Bits(
      partOfBinaryValue,
      decodedArray,
      remainedBitsSize,
      0,
      byteShift + 1,
      view,
      decoder,
      mask,
      i
    );
  }
};

const decode = (buffer, schema) => {
  const bufferView = new DataView(buffer);
  const decodedArray = new Array(schema.length);
  let bitOffset = 0;
  for (let i = 0; i < schema.length; i++) {
    const schemaElement = schema[i];
    const bitSizeElement = schemaElement[0];
    const byteShift = Math.floor(bitOffset / 8);
    const bitShiftInsideByte = bitOffset % 8;

    decodeBy8Bits(
      0,
      decodedArray,
      bitSizeElement,
      bitShiftInsideByte,
      byteShift,
      bufferView,
      decodeHandler(schemaElement),
      2 ** bitSizeElement - 1,
      i
    );
    bitOffset += bitSizeElement;
  }
  return decodedArray;
};

console.log(decode(encode(testArray1, schema), schema));
