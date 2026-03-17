import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { RoomAmenity } from "../../database/database.schema.js";

// GET all amenities
const getAllAmenities = asyncHandler(async (req, res) => {
  const amenities = await RoomAmenity.find();
  return res
    .status(200)
    .json(
      new ApiResponse(200, amenities, "All amenities retrieved successfully")
    );
});

// GET a single amenity by ID
const getAmenityById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const amenity = await RoomAmenity.findById(id);
  if (!amenity) {
    throw new ApiError(404, "Amenity not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, amenity, "Amenity retrieved successfully"));
});

// POST create a new amenity
const createAmenity = asyncHandler(async (req, res) => {
  const {
    propertyUnitId,
    roomTypeId,
    amenityName,
    amenityCharges,
    amenityDescription,
  } = req.body;
  const amenity = new RoomAmenity({
    propertyUnitId,
    roomTypeId,
    amenityName,
    amenityCharges,
    amenityDescription,
  });
  await amenity.save();
  return res
    .status(201)
    .json(new ApiResponse(201, amenity, "Amenity created successfully"));
});

// PUT update an amenity by ID
const updateAmenityById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    propertyUnitId,
    roomTypeId,
    amenityName,
    amenityCharges,
    amenityDescription,
  } = req.body;
  const amenity = await RoomAmenity.findByIdAndUpdate(
    id,
    {
      propertyUnitId,
      roomTypeId,
      amenityName,
      amenityCharges,
      amenityDescription,
    },
    { new: true }
  );
  if (!amenity) {
    throw new ApiError(404, "Amenity not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, amenity, "Amenity updated successfully"));
});

// DELETE an amenity by ID
const deleteAmenityById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const amenity = await RoomAmenity.findByIdAndDelete(id);
  if (!amenity) {
    throw new ApiError(404, "Amenity not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Amenity deleted successfully"));
});

export default {
  getAllAmenities,
  getAmenityById,
  createAmenity,
  updateAmenityById,
  deleteAmenityById,
};
