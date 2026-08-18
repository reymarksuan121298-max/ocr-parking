import { NativeModules, Image } from "react-native";
import type { PlateFrame } from "./ocr";

const { ImageCropModule } = NativeModules;

export async function cropPlateImage(
  photoUri: string,
  plateFrame?: PlateFrame | null
): Promise<string> {
  if (!ImageCropModule || !ImageCropModule.cropImage) {
    return photoUri;
  }

  return new Promise((resolve) => {
    Image.getSize(
      photoUri,
      async (imgWidth, imgHeight) => {
        try {
          let cropX = 0;
          let cropY = 0;
          let cropW = 1;
          let cropH = 1;

          if (
            plateFrame &&
            plateFrame.width > 0 &&
            plateFrame.height > 0 &&
            imgWidth > 0 &&
            imgHeight > 0
          ) {
            // Expand plate bounding box with padding to capture full plate border
            const padX = plateFrame.width * 0.15;
            const padY = plateFrame.height * 0.25;

            const pixelLeft = Math.max(0, plateFrame.left - padX);
            const pixelTop = Math.max(0, plateFrame.top - padY);
            const pixelWidth = Math.min(imgWidth - pixelLeft, plateFrame.width + padX * 2);
            const pixelHeight = Math.min(imgHeight - pixelTop, plateFrame.height + padY * 2);

            cropX = pixelLeft / imgWidth;
            cropY = pixelTop / imgHeight;
            cropW = pixelWidth / imgWidth;
            cropH = pixelHeight / imgHeight;
          } else {
            // Fallback to center frame area (approx. viewport viewfinder cutout)
            cropX = 0.15;
            cropY = 0.35;
            cropW = 0.70;
            cropH = 0.30;
          }

          const croppedUri = await ImageCropModule.cropImage(
            photoUri,
            cropX,
            cropY,
            cropW,
            cropH
          );
          resolve(croppedUri);
        } catch (err) {
          console.warn("[cropPlateImage] crop error:", err);
          resolve(photoUri);
        }
      },
      (err) => {
        console.warn("[cropPlateImage] getSize failed:", err);
        resolve(photoUri);
      }
    );
  });
}
