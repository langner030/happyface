import { mkdir } from "fs/promises";
import { execSync } from "child_process";

const MODEL_BASE =
  "https://github.com/nicholasgasior/face-api.js/raw/master/weights";

const MODELS = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_tiny_model-weights_manifest.json",
  "face_landmark_68_tiny_model-shard1",
  "face_expression_model-weights_manifest.json",
  "face_expression_model-shard1",
];

const MODEL_DIR = "public/models";

async function download() {
  await mkdir(MODEL_DIR, { recursive: true });
  console.log("Downloading face-api.js models...\n");

  // Note: In practice, models ship with @vladmandic/face-api.
  // Copy them from node_modules/@vladmandic/face-api/model/ instead:
  console.log("Copying models from @vladmandic/face-api...");
  try {
    execSync(
      `cp node_modules/@vladmandic/face-api/model/tiny_face_detector* ${MODEL_DIR}/`
    );
    execSync(
      `cp node_modules/@vladmandic/face-api/model/face_landmark_68_tiny* ${MODEL_DIR}/`
    );
    execSync(
      `cp node_modules/@vladmandic/face-api/model/face_expression* ${MODEL_DIR}/`
    );
    console.log("Done! Models copied to public/models/");
  } catch {
    console.error(
      "Could not copy from node_modules. Run 'npm install' first."
    );
  }
}

download();
