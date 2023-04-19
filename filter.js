const canvas = document.getElementById("canvas");
const greyscaleButton = document.getElementById("greyscale-button");
const invertedColorButton = document.getElementById("invertedColor-button");
const originalButton = document.getElementById("original-button");
const info = document.getElementById("info");

const ctx = canvas.getContext("2d");
const img = new Image();

let originalImageData = null;

const compose =
  (...fns) =>
  (arg) =>
    fns.reduceRight((acc, fn) => fn(acc), arg);

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (event) => reject(event.error);
    reader.readAsDataURL(file);
  });

const readImgFile = async (imgFile) => {
  try {
    img.src = await readFile(imgFile);
    info.textContent = "файл загружен";
  } catch (error) {
    info.textContent = "ошибка при загрузке файла";
  }
};

const greyscaleFilter = (pixelData) => {
  const grey = (pixelData[0] + pixelData[1] + pixelData[2]) / 3;

  // Set the red, green, and blue values to the greyscale value
  pixelData[0] = grey;
  pixelData[1] = grey;
  pixelData[2] = grey;
};

const invertColorsFilter = (pixelData) => {
  // Use bitwise NOT operator to invert each channel value
  pixelData[0] = 255 - pixelData[0];
  pixelData[1] = 255 - pixelData[1];
  pixelData[2] = 255 - pixelData[2];

  return pixelData;
};

const getImageData = () => ctx.getImageData(0, 0, canvas.width, canvas.height);

const putImageData = (imageData) => ctx.putImageData(imageData, 0, 0);

const applyFilter = (filter) => () =>
  compose(putImageData, filter)(getImageData());

const applyToAllPixels = (filter) => (imageData) => {
  const pixelData = imageData.data;
  for (let i = 0; i < pixelData.length; i += 4) {
    filter(pixelData.subarray(i, i + 4));
  }
  return imageData;
};

const onButtonClick = (filter) =>
  compose(applyFilter, applyToAllPixels)(filter);

const onGreyscaleFilterClick = onButtonClick(greyscaleFilter);

const onInvertColorsButtonClick = onButtonClick(invertColorsFilter);

const onOriginalButtonClick = applyFilter(() => originalImageData);

const setImageSize = () => {
  canvas.width = img.width / 7;
  canvas.height = img.height / 7;
};

const setOriginalImageData = () => {
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
};

img.onload = () => {
  setImageSize();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  setOriginalImageData();
};

document.getElementById("image-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    readImgFile(file);
  }
});

greyscaleButton.addEventListener("click", onGreyscaleFilterClick);
invertedColorButton.addEventListener("click", onInvertColorsButtonClick);
originalButton.addEventListener("click", onOriginalButtonClick);
