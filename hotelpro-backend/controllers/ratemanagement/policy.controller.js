import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  CancellationPolicy,
  NoShowPolicy,
} from "../../database/database.schema.js";

// NoShowPolicy Handlers
const getAllNoShowPolicies = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const policies = await NoShowPolicy.find({ propertyUnitId: propertyUnitId });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        policies,
        "All no-show policies retrieved successfully"
      )
    );
});

const getNoShowPolicyById = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const policy = await NoShowPolicy.findById(policyId);
  if (!policy) {
    throw new ApiError(404, "No-show policy not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, policy, "No-show policy retrieved successfully")
    );
});

const createNoShowPolicy = asyncHandler(async (req, res) => {
  const {
    noShowPolicyName,
    chargeType,
    chargeValue,
    propertyUnitId,
    policyDescription,
  } = req.body;
  const policy = new NoShowPolicy({
    noShowPolicyName,
    chargeType,
    chargeValue,
    propertyUnitId,
    policyDescription,
  });
  await policy.save();
  return res
    .status(201)
    .json(new ApiResponse(201, policy, "No-show policy created successfully"));
});

const updateNoShowPolicyById = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const {
    noShowPolicyName,
    chargeType,
    chargeValue,
    propertyUnitId,
    policyDescription,
  } = req.body;
  const policy = await NoShowPolicy.findByIdAndUpdate(
    policyId,
    {
      noShowPolicyName,
      chargeType,
      chargeValue,
      propertyUnitId,
      policyDescription,
    },
    { new: true }
  );
  if (!policy) {
    throw new ApiError(404, "No-show policy not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, policy, "No-show policy updated successfully"));
});

const deleteNoShowPolicyById = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const policy = await NoShowPolicy.findByIdAndDelete(policyId);
  if (!policy) {
    throw new ApiError(404, "No-show policy not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, { policyId }, "No-show policy deleted successfully")
    );
});

// CancellationPolicy Handlers
const getAllCancellationPolicies = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const policies = await CancellationPolicy.find({
    propertyUnitId: propertyUnitId,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        policies,
        "All cancellation policies retrieved successfully"
      )
    );
});

const getCancellationPolicyById = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const policy = await CancellationPolicy.findById(policyId);
  if (!policy) {
    throw new ApiError(404, "Cancellation policy not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, policy, "Cancellation policy retrieved successfully")
    );
});

const createCancellationPolicy = asyncHandler(async (req, res) => {
  const {
    cancelPolicyName,
    propertyUnitId,
    policyDescription,
    windowRange,
    windowType,
    insideWindowCharge,
    outsideWindowCharge,
  } = req.body;
  const policy = new CancellationPolicy({
    cancelPolicyName,
    propertyUnitId,
    policyDescription,
    windowRange,
    windowType,
    insideWindowCharge,
    outsideWindowCharge,
  });
  await policy.save();
  return res
    .status(201)
    .json(
      new ApiResponse(201, policy, "Cancellation policy created successfully")
    );
});

const updateCancellationPolicyById = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const {
    cancelPolicyName,
    propertyUnitId,
    policyDescription,
    windowRange,
    windowType,
    insideWindowCharge,
    outsideWindowCharge,
  } = req.body;
  const policy = await CancellationPolicy.findByIdAndUpdate(
    policyId,
    {
      cancelPolicyName,
      propertyUnitId,
      policyDescription,
      windowRange,
      windowType,
      insideWindowCharge,
      outsideWindowCharge,
    },
    { new: true }
  );
  if (!policy) {
    throw new ApiError(404, "Cancellation policy not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, policy, "Cancellation policy updated successfully")
    );
});

const deleteCancellationPolicyById = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const policy = await CancellationPolicy.findByIdAndDelete(policyId);
  if (!policy) {
    throw new ApiError(404, "Cancellation policy not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { policyId },
        "Cancellation policy deleted successfully"
      )
    );
});

export default {
  getAllNoShowPolicies,
  getNoShowPolicyById,
  createNoShowPolicy,
  updateNoShowPolicyById,
  deleteNoShowPolicyById,
  getAllCancellationPolicies,
  getCancellationPolicyById,
  createCancellationPolicy,
  updateCancellationPolicyById,
  deleteCancellationPolicyById,
};
