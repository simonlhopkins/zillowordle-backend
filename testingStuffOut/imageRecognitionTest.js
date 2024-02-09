import axios from "axios";

// const zillowHouseData = await axios.get(
//   "http://localhost:8080/zillow/cached-house"
// );

import tf from "@tensorflow/tfjs-node";
import mobilenet from "@tensorflow-models/mobilenet";
import cocoSsd from "@tensorflow-models/coco-ssd";

import deeplab from "@tensorflow-models/deeplab"


async function loadImageFromUrl(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    // saveBase64Image(buffer.toString('base64'), './test.png')
    
    // Decode the image using tf.node.decodeImage
    const decodedImage = tf.node.decodeImage(new Uint8Array(response.data), 3);
    return decodedImage;
  } catch (error) {
    throw new Error("Error fetching or processing the image");
  }
}
const loadDeepLab = async () => {
  const modelName = 'ade20k';   // set to your preferred model, either `pascal`, `cityscapes` or `ade20k`
  const quantizationBytes = 2;  // either 1, 2 or 4
  return await deeplab.load({base: modelName, quantizationBytes});
};

async function classifyImage(imageUrl) {
  try {
    // Load the MobileNet model
    const model = await mobilenet.load();
    const coco = await cocoSsd.load();
    // Load and preprocess the image
    const inputTensor = await loadImageFromUrl(imageUrl);

    // Perform image classification
    
    // const predictions = await model.classify(inputTensor);
    // const cocoPredictions = await coco.detect(inputTensor);

    // Print the predictions
    // console.log(predictions);

    loadDeepLab()
    .then((model) => model.segment(inputTensor))
    .then(
        ({legend}) =>
            console.log(`The predicted classes are ${JSON.stringify(legend)}`));

    // You can now use the predictions as needed
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Usage example with an image URL
classifyImage("https://photos.zillowstatic.com/fp/c55f725491b0142c7b784ea2f75a9e62-cc_ft_1536.jpg");
