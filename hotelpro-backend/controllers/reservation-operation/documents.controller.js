import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { CLOUD_USER_DOC_FOLDER_NAME } from "../../constants.js";

// Upload reservation images to Cloudinary
const uploadReservationImages = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const { userId } = req.body;

  // Validate file input
  if (!Array.isArray(req.files) || req.files.length === 0) {
    throw new ApiError(400, "At least one image is required!");
  }

  // Array to hold the uploaded image URLs
  const uploadedImages = [];

  // Upload each file to Cloudinary concurrently using Promise.all
  await Promise.all(
    req.files.map(async (file) => {
      const localFilePath = file.path;
      const uploadedImage = await uploadOnCloudinary(
        localFilePath,
        CLOUD_USER_DOC_FOLDER_NAME
      );

      if (!uploadedImage) {
        throw new ApiError(
          400,
          `Image upload failed for ${file.originalname}!`
        );
      }

      uploadedImages.push(uploadedImage.url);
    })
  );

  if (userId) {
    // Validate userId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID provided!");
    }

    // Update user document with uploaded image URLs
    await User.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { documents: { $each: uploadedImages } } }
    );
  }

  // Return the uploaded images' URLs
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { images: uploadedImages },
        "Images uploaded successfully!"
      )
    );
});

// Delete reservation images from Cloudinary
const deleteReservationImages = asyncHandler(async (req, res) => {
  const { userId, imageUrl } = req.body;

  // Validate the imageUrl input
  if (!imageUrl) {
    throw new ApiError(400, "Image URL is required!");
  }

  // Attempt to delete the image from Cloudinary
  const isDelete = await deleteFromCloudinary(imageUrl);
  if (!isDelete) {
    throw new ApiError(400, `Image delete failed for ${imageUrl}!`);
  }

  if (userId) {
    // Validate userId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID provided!");
    }

    // Remove the image URL from the user's document
    await User.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { documents: imageUrl } }
    );
  }

  // Return success response after deletion
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Image deleted successfully!"));
});

export default {
  uploadReservationImages,
  deleteReservationImages,
};
