import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  RatePlanSetup,
  RatePlanRoomType,
  RatePlanRoomRate,
  RatePlanRoomDateRate,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

// GET all rate plans
const getAllRatePlans = asyncHandler(async (req, res) => {
  const ratePlans = await RatePlanSetup.find();
  return res
    .status(200)
    .json(
      new ApiResponse(200, ratePlans, "All rate plans retrieved successfully")
    );
});

// GET a single rate plan by ID
const getRatePlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ratePlan = await RatePlanSetup.findById(id);
  if (!ratePlan) {
    throw new ApiError(404, "Rate plan not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, ratePlan, "Rate plan retrieved successfully"));
});

const readRatePlan = asyncHandler(async (req, res) => {
  const { ratePlanId, propertyUnitId, isBaseRate, fromList } = req.body;
  let matchquerry = {
    propertyUnitId: new ObjectId(propertyUnitId),
  };
  if (isBaseRate) {
    matchquerry.isBaseRate = isBaseRate;
  }
  if (ratePlanId) {
    matchquerry._id = new ObjectId(ratePlanId);
  }
  let ratePlanDetails = await RatePlanSetup.aggregate([
    {
      $match: matchquerry,
    },
    {
      $lookup: {
        from: "rateplanroomtypes",
        localField: "_id",
        foreignField: "ratePlanSetupId",
        as: "rateRoomTypes",
        pipeline: [
          {
            $lookup: {
              from: "rateplanroomrates",
              localField: "_id",
              foreignField: "ratePlanRoomDetailId",
              as: "roomTypeRates",
            },
          },
          {
            $lookup: {
              from: "roomtypes",
              localField: "roomTypeId",
              foreignField: "_id",
              as: "roomType",
              pipeline: [
                {
                  $project: {
                    _id: 0,
                    roomTypeName: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$roomType",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              roomTypeName: "$roomType.roomTypeName",
            },
          },
          {
            $unset: "roomType",
          },
        ],
      },
    },
  ]);
  if (fromList) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { ratePlanList: ratePlanDetails },
          "Rate plan retrieved successfully"
        )
      );
  }
  if (ratePlanDetails.length == 0) {
    throw new ApiError(404, "Rate plan not found");
  }
  ratePlanDetails = ratePlanDetails[0];
  for (let roomtype of ratePlanDetails.rateRoomTypes) {
    for (let rate of roomtype.roomTypeRates) {
      roomtype[rate.rateType] = rate.baseRate;
    }
    delete roomtype.roomTypeRates;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, ratePlanDetails, "Rate plan retrieved successfully")
    );
});

// POST create a new rate plan
const createRatePlan = asyncHandler(async (req, res) => {
  const {
    active,
    isBaseRate,
    ratePlanName,
    ratePlanShortName,
    ratePlanDescription,
    cancellationPolicyId,
    noShowPolicyId,
    propertyUnitId,
    isRefundable,
    roomTypeRates,
  } = req.body;

  const ratePlan = new RatePlanSetup({
    active,
    isBaseRate,
    ratePlanName,
    ratePlanShortName,
    ratePlanDescription,
    cancellationPolicyId,
    noShowPolicyId,
    propertyUnitId,
    isRefundable,
  });

  await ratePlan.save();

  for (let roomType of roomTypeRates) {
    let rateRoomTypeEntries = [];
    let rateEntries = [];
    const rateRoomType = new RatePlanRoomType({
      ratePlanSetupId: ratePlan._id,
      roomTypeId: roomType.roomTypeId,
      // startDate: roomType.startDate,
      // endDate: roomType.endDate,
    });

    rateRoomTypeEntries.push(rateRoomType);

    for (const [key, value] of Object.entries(roomType)) {
      if (
        !["roomTypeName", "roomTypeId", "startDate", "endDate"].includes(key)
      ) {
        const roomTypeRate = new RatePlanRoomRate({
          ratePlanRoomDetailId: rateRoomType._id,
          rateType: key,
          baseRate: value,
        });

        rateEntries.push(roomTypeRate);
      }
    }
    await Promise.all([
      RatePlanRoomType.insertMany(rateRoomTypeEntries),
      RatePlanRoomRate.insertMany(rateEntries),
    ]);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, ratePlan, "Rate plan created successfully"));
});

// PUT update a rate plan by ID
const updateRatePlan = asyncHandler(async (req, res) => {
  const {
    _id,
    active,
    isBaseRate,
    ratePlanName,
    ratePlanShortName,
    ratePlanDescription,
    cancellationPolicyId,
    noShowPolicyId,
    propertyUnitId,
    isRefundable,
    roomTypeRates,
  } = req.body;

  const ratePlanId = _id;
  const ratePlan = await RatePlanSetup.findByIdAndUpdate(
    ratePlanId,
    {
      active,
      isBaseRate,
      ratePlanName,
      ratePlanShortName,
      ratePlanDescription,
      cancellationPolicyId,
      noShowPolicyId,
      propertyUnitId,
      isRefundable,
    },
    { new: true }
  );

  if (!ratePlan) {
    throw new ApiError(404, "Rate plan not found");
  }

  for (let roomType of roomTypeRates) {
    const rateRoomType = await RatePlanRoomType.findOneAndUpdate(
      {
        roomTypeId: roomType.roomTypeId,
        ratePlanSetupId: ratePlanId,
      },
      {
        ratePlanSetupId: ratePlanId,
        roomTypeId: roomType.roomTypeId,
        // startDate: roomType.startDate,
        // endDate: roomType.endDate,
      },
      { new: true, upsert: true }
    );

    for (const [key, value] of Object.entries(roomType)) {
      if (
        !["roomTypeName", "roomTypeId", "startDate", "endDate", "_id"].includes(
          key
        )
      ) {
        await RatePlanRoomRate.findOneAndUpdate(
          { ratePlanRoomDetailId: rateRoomType._id, rateType: key },
          {
            baseRate: value,
            ratePlanRoomDetailId: rateRoomType._id,
            rateType: key,
          },
          { new: true, upsert: true }
        );
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, ratePlan, "Rate plan updated successfully"));
});

// DELETE a rate plan by ID
const deleteRatePlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ratePlan = await RatePlanSetup.findByIdAndDelete(id);
  if (!ratePlan) {
    throw new ApiError(404, "Rate plan not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Rate plan deleted successfully"));
});

export default {
  getAllRatePlans,
  readRatePlan,
  createRatePlan,
  updateRatePlan,
  deleteRatePlanById,
};
