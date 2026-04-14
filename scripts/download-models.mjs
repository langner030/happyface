import { mkdir, readdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const SRC_DIR = join("node_modules", "@vladmandic", "face-api", "model");
const DEST_DIR = join("public", "models");

const PREFIXES = [
  "tiny_face_detector",
  "face_landmark_68_tiny",
  "face_expression",
];

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(
      `Source ${SRC_DIR} not found. Run 'npm install' first.`
    );
    process.exit(1);
  }

  await mkdir(DEST_DIR, { recursive: true });
  const files = await readdir(SRC_DIR);

  let copied = 0;
  for (const file of files) {
    if (PREFIXES.some((p) => file.startsWith(p))) {
      await copyFile(join(SRC_DIR, file), join(DEST_DIR, file));
      copied += 1;
    }
  }

  console.log(`Copied ${copied} model file(s) to ${DEST_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
