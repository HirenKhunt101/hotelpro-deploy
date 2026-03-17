import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Tax } from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

// GET all taxs
const getAllTaxes = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const taxs = await Tax.find({ propertyUnitId: propertyUnitId });
  return res
    .status(200)
    .json(new ApiResponse(200, taxs, "All taxs retrieved successfully"));
});

// GET a single tax by ID
const getTaxById = asyncHandler(async (req, res) => {
  const { taxId } = req.params;
  const tax = await Tax.findById(taxId);
  if (!tax) {
    throw new ApiError(404, "Tax not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tax, "Tax retrieved successfully"));
});

// POST create a new tax
const createTax = asyncHandler(async (req, res) => {
  const { propertyUnitId, taxPercentage, taxName, active } = req.body;
  const tax = new Tax({
    propertyUnitId,
    taxPercentage,
    taxName,
    active,
  });
  await tax.save();
  return res
    .status(201)
    .json(new ApiResponse(201, tax, "Tax created successfully"));
});

// PUT update a tax by ID
const updateTaxById = asyncHandler(async (req, res) => {
  const { taxId } = req.params;
  const { propertyUnitId, taxPercentage, taxName, active } = req.body;
  const tax = await Tax.findByIdAndUpdate(
    taxId,
    { propertyUnitId, taxPercentage, taxName, active },
    { new: true }
  );
  if (!tax) {
    throw new ApiError(404, "Tax not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tax, "Tax updated successfully"));
});

// DELETE a tax by ID
const deleteTaxById = asyncHandler(async (req, res) => {
  const { taxId } = req.params;
  const tax = await Tax.findByIdAndDelete(taxId);
  if (!tax) {
    throw new ApiError(404, "Tax not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { taxId }, "Tax deleted successfully"));
});

export default {
  getAllTaxes,
  getTaxById,
  createTax,
  updateTaxById,
  deleteTaxById,
};
