import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  RoomType,
  Room,
  RatePlanSetup,
  RatePlanRoomRate,
  RatePlanRoomType,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
import {
  AvailableRateTypeEnum,
  CLOUD_ROOM_TYPE_FOLDER_NAME,
  RateTypeEnum,
  RoomConditionEnum,
  RoomStatusEnum,
} from "../../constants.js";
const ObjectId = mongoose.Types.ObjectId;
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { CLOUD_USER_DOC_FOLDER_NAME } from "../../constants.js";

// GET all room types
const getAllRoomTypes = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const roomTypes = await RoomType.aggregate([
    { $match: { propertyUnitId: new ObjectId(propertyUnitId) } },
    { $addFields: { roomTypeId: "$_id" } },
    { $project: { _id: 0 } },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, roomTypes, "All room types retrieved successfully")
    );
});

// GET a single room type by ID
const getRoomTypeById = asyncHandler(async (req, res) => {
  const { roomTypeId } = req.params;
  const roomType = await RoomType.findById(roomTypeId);
  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, roomType, "Room type retrieved successfully"));
});

// POST create a new room type
const createRoomType = asyncHandler(async (req, res) => {
  const { roomTypes } = req.body;
  const { propertyUnitId } = req.params;
  for (let r of roomTypes) {
    r.propertyUnitId = propertyUnitId;
  }
  await RoomType.insertMany(roomTypes);

  return res
    .status(201)
    .json(new ApiResponse(201, roomTypes, "Room types created successfully"));
});

// PUT update a room type by ID
const updateRoomTypeById = asyncHandler(async (req, res) => {
  const { roomTypeId } = req.params;
  const {
    roomTypeName,
    active,
    roomTypeCategory,
    description,
    images,
    adultOccupancy,
    childOccupancy,
  } = req.body;

  const roomType = await RoomType.findByIdAndUpdate(
    roomTypeId,
    {
      roomTypeName,
      active,
      roomTypeCategory,
      description,
      images,
      adultOccupancy,
      childOccupancy,
    },
    { new: true }
  );

  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, roomType, "Room type updated successfully"));
});

// DELETE a room type by ID
const deleteRoomTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const roomType = await RoomType.findByIdAndDelete(id);
  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Room type deleted successfully"));
});

const createRoomTypeWithRooms = asyncHandler(async (req, res) => {
  const {
    roomTypeName,
    active,
    roomTypeCategory,
    description,
    adultOccupancy,
    childOccupancy,
    totalrooms,
    rooms,
    baseRate,
  } = req.body;
  const { propertyUnitId } = req.params;

  const roomTypeExists = await RoomType.findOne({
    roomTypeName,
    propertyUnitId,
  });
  if (roomTypeExists) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          `RoomType With ${roomTypeName} name already exists !`
        )
      );
  }

  // Create the room type
  const newRoomType = new RoomType({
    roomTypeName,
    active,
    roomTypeCategory,
    description,
    adultOccupancy,
    childOccupancy,
    totalrooms,
    propertyUnitId,
  });

  // Create the rooms
  const roomDocuments = [];
  let totalCount = 0;

  rooms.forEach((room) => {
    const { prefix, start, end } = room;
    for (let i = start; i <= end; i++) {
      roomDocuments.push({
        roomName: `${prefix}${i}`,
        roomNumber: i.toString(),
        roomTypeId: newRoomType._id,
        roomStatus: RoomStatusEnum.VACANT,
        roomCondition: RoomConditionEnum.CLEAN,
        dnd: false,
      });
      totalCount++;
    }
  });

  // Validate room count
  if (totalCount !== totalrooms) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Total rooms do not match the sum of the ranges"
        )
      );
  }

  //default rate flow
  let ratePlan = await RatePlanSetup.findOne({ propertyUnitId });
  if (!ratePlan) {
    ratePlan = new RatePlanSetup({
      active: true,
      isBaseRate: true,
      ratePlanName: "Best Available Rate",
      ratePlanShortName: "BAR",
      propertyUnitId,
      isRefundable: true,
    });

    await ratePlan.save();
  }
  const rateRoomType = new RatePlanRoomType({
    ratePlanSetupId: ratePlan._id,
    roomTypeId: newRoomType._id,
  });
  const rateEntries = [];
  for (let ratetype of AvailableRateTypeEnum) {
    const roomTypeRate = new RatePlanRoomRate({
      ratePlanRoomDetailId: rateRoomType._id,
      rateType: ratetype,
      baseRate: baseRate && ratetype == RateTypeEnum.BASERATE ? baseRate : 0,
    });

    rateEntries.push(roomTypeRate);
  }
  await Promise.all([
    newRoomType.save(),
    Room.insertMany(roomDocuments),
    rateRoomType.save(),
    RatePlanRoomRate.insertMany(rateEntries),
  ]);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { newRoomType, roomDocuments },
        "Room type and rooms created successfully"
      )
    );
});

const getRoomTypeAndRooms = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;

  const roomTypeDetails = await RoomType.aggregate([
    {
      $match: {
        propertyUnitId: new ObjectId(propertyUnitId),
      },
    },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "roomTypeId",
        as: "rooms",
        pipeline: [
          {
            $addFields: {
              roomId: "$_id",
            },
          },
          {
            $unset: "_id",
          },
        ],
      },
    },

    {
      $addFields: {
        roomTypeId: "$_id",
      },
    },
    {
      $unset: "_id",
    },
  ]);
  // if (roomTypeDetails.length == 0) {
  //   return res
  //     .status(400)
  //     .json(
  //       new ApiResponse(
  //         400,
  //         roomTypeDetails,
  //         "Room setup not found for this property!"
  //       )
  //     );
  // }
  return res
    .status(200)
    .json(
      new ApiResponse(200, roomTypeDetails, "Room types fetched successfully")
    );
});

const uploadRoomTypeImages = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const { _id } = req.body;

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
        CLOUD_ROOM_TYPE_FOLDER_NAME
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

  if (_id) {
    // Validate userId
    if (!ObjectId.isValid(_id)) {
      throw new ApiError(400, "Invalid user ID provided!");
    }

    // Update user document with uploaded image URLs
    await RoomType.updateOne(
      { _id: new ObjectId(_id) },
      { $push: { images: { $each: uploadedImages } } }
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
const deleteRoomTypeImages = asyncHandler(async (req, res) => {
  const { _id, imageUrl } = req.body;

  // Validate the imageUrl input
  if (!imageUrl) {
    throw new ApiError(400, "Image URL is required!");
  }

  // Attempt to delete the image from Cloudinary
  const isDelete = await deleteFromCloudinary(imageUrl);
  if (!isDelete) {
    throw new ApiError(400, `Image delete failed for ${imageUrl}!`);
  }

  if (_id) {
    // Validate userId
    if (!ObjectId.isValid(_id)) {
      throw new ApiError(400, "Invalid  ID provided!");
    }

    // Remove the image URL from the user's document
    await RoomType.updateOne(
      { _id: new ObjectId(_id) },
      { $pull: { images: imageUrl } }
    );
  }

  // Return success response after deletion
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Image deleted successfully!"));
});

const readRoomTypeImages = asyncHandler(async (req, res) => {
  const { _id, propertyUnitId } = req.body;

  if (_id) {
    // Validate `_id`
    if (!ObjectId.isValid(_id)) {
      throw new ApiError(400, "Invalid room type ID provided!");
    }

    const roomType = await RoomType.findById(_id).select("images");
    if (!roomType) {
      throw new ApiError(404, "Room type not found!");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { images: roomType.images },
          "Images retrieved successfully!"
        )
      );
  }

  if (!propertyUnitId) {
    throw new ApiError(400, "Property Unit ID is required!");
  }

  const roomTypes = await RoomType.find({ propertyUnitId }).select("images");
  if (!roomTypes || roomTypes.length === 0) {
    throw new ApiError(404, "No room types found for the given property unit!");
  }

  const images = {};
  roomTypes.forEach((roomType) => {
    images[roomType._id] = roomType.images.map((image) => ({
      image,
      thumbImage: image,
      alt: "room image",
    }));
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { images }, "Images retrieved successfully!"));
});

export default {
  getAllRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomTypeById,
  deleteRoomTypeById,
  createRoomTypeWithRooms,
  getRoomTypeAndRooms,
  uploadRoomTypeImages,
  deleteRoomTypeImages,
  readRoomTypeImages,
};
