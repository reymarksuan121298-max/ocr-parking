package com.ocrparkingmanagement

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class ImageCropModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ImageCropModule"

    @ReactMethod
    fun cropImage(imagePath: String, x: Double, y: Double, width: Double, height: Double, promise: Promise) {
        try {
            val cleanPath = imagePath.replace("file://", "")
            val file = File(cleanPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source image does not exist: $cleanPath")
                return
            }

            // Decode original image
            val originalBitmap = BitmapFactory.decodeFile(cleanPath)
            if (originalBitmap == null) {
                promise.reject("DECODE_ERROR", "Could not decode image at: $cleanPath")
                return
            }

            // Check EXIF orientation
            val exif = ExifInterface(cleanPath)
            val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            val matrix = Matrix()
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            }

            val rotatedBitmap = if (orientation != ExifInterface.ORIENTATION_NORMAL) {
                Bitmap.createBitmap(originalBitmap, 0, 0, originalBitmap.width, originalBitmap.height, matrix, true)
            } else {
                originalBitmap
            }

            val imgW = rotatedBitmap.width
            val imgH = rotatedBitmap.height

            // Calculate integer bounds with safety clamps
            var cropX = Math.max(0, (x * imgW).toInt())
            var cropY = Math.max(0, (y * imgH).toInt())
            var cropW = Math.min((width * imgW).toInt(), imgW - cropX)
            var cropH = Math.min((height * imgH).toInt(), imgH - cropY)

            if (cropW <= 0) cropW = imgW
            if (cropH <= 0) cropH = imgH

            val croppedBitmap = Bitmap.createBitmap(rotatedBitmap, cropX, cropY, cropW, cropH)

            // Save cropped bitmap to temporary cache file
            val cacheDir = reactApplicationContext.cacheDir
            val outFile = File(cacheDir, "plate_cropped_${System.currentTimeMillis()}.jpg")
            val outStream = FileOutputStream(outFile)
            croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 90, outStream)
            outStream.flush()
            outStream.close()

            promise.resolve("file://${outFile.absolutePath}")
        } catch (e: Exception) {
            promise.reject("CROP_ERROR", e.message, e)
        }
    }
}
