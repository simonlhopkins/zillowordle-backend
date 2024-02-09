import axios from "axios";
import tf from "@tensorflow/tfjs-node";

import deeplab from "@tensorflow-models/deeplab";
import { DeepLabInput } from "@tensorflow-models/deeplab/dist/types";
import { config } from "dotenv";
config();
async function loadImageFromUrl(imageUrl: string) {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  // saveBase64Image(buffer.toString('base64'), './test.png')

  // Decode the image using tf.node.decodeImage
  const decodedImage = tf.node.decodeImage(new Uint8Array(response.data), 3);
  return decodedImage;
}
const loadDeepLab = async () => {
  const modelName = "ade20k"; // set to your preferred model, either `pascal`, `cityscapes` or `ade20k`
  const quantizationBytes = 2; // either 1, 2 or 4
  return await deeplab.load({ base: modelName, quantizationBytes });
};

export async function classifyListOfImages(urls: string[]) {
  const model = await loadDeepLab();
  const imageData = await Promise.all(
    urls.map(async (url) => {
      const inputTensor = await loadImageFromUrl(url);
      const segment = await model.segment(
        inputTensor as unknown as DeepLabInput
      );
      //segment.segmentationMap can be used for coloring
      return {
        url,
        labels: Object.keys(segment.legend),
      };
    })
  ).catch((e) => {
    throw new Error("Issue with classifying Images");
  });

  return imageData;
}

export function getBestSearchHouse(
  data: {
    url: string;
    tags: string[];
  }[]
) {
  console.log("best search house");
  const desireableLabels = [
    { tag: "sky", weight: 15 },
    { tag: "tree", weight: 10 },
    { tag: "fence", weight: 8 },
    { tag: "house", weight: 30 },
    { tag: "building", weight: 20 },
    { tag: "earth", weight: 1 },
    { tag: "grass", weight: 10 },
    { tag: "mountain", weight: 10 },
  ];
  const getScoreFromArr = (arr: string[]) => {
    let score = arr.reduce((accumulator, currentValue) => {
      let foundValue = desireableLabels.find(({ tag }) => {
        return currentValue == tag;
      });

      return accumulator + (foundValue ? foundValue.weight : 0);
    }, 0);
    return score;
  };

  let sortedData = data.sort(
    (a, b) => getScoreFromArr(b.tags) - getScoreFromArr(a.tags)
  );
  return sortedData;
}
const americanFootballHouse = {
  lat: 40.10986271076419,
  lng: -88.21658343182051,
};
export async function GetLocationFromImage(imageUrl: string) {
  // return {
  //   lat: americanFootballHouse.lat,
  //   lng: americanFootballHouse.lng,
  // };
  const url = "https://picarta.ai/classify";
  const apiToken = process.env.PICARTA_API_TOKEN; // Ensure this is your actual API token
  // Assuming you're using the image URL directly, without base64 encoding
  const payload = {
    TOKEN: apiToken,
    IMAGE: imageUrl, // Using the correct key as per the API example
  };

  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    if (!(response.data.ai_lon && response.data.ai_lat))
      throw new Error("no long or lat in response from Picarta");
    return {
      lng: response.data.ai_lon,
      lat: response.data.ai_lat,
    }; // No need for .json() with axios
  } catch (error) {
    console.error("Error fetching location from image:", error);
    return {
      lat: americanFootballHouse.lat,
      lng: americanFootballHouse.lng,
    };
  }
}
