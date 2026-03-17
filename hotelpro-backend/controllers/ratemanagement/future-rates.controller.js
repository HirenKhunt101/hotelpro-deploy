import mongo from "../../database/database.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  RatePlanSetup,
  RatePlanRoomDateRate,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
import { RateTypeEnum } from "../../constants.js";
import yieldController from "./yield.controller.js";
const ObjectId = mongoose.Types.ObjectId;

const getFutureRates = asyncHandler(async (req, res) => {
  let { startDate, endDate, ratePlanId, propertyUnitId } = req.body;
  startDate = new Date(startDate);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate = new Date(endDate);
  endDate.setUTCHours(0, 0, 0, 0);

  let [ratePlanDetails, dateRateDetails, yieldData] = await Promise.all([
    RatePlanSetup.aggregate([
      {
        $match: {
          _id: new ObjectId(ratePlanId),
        },
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
              $unwind: {
                path: "$roomTypeRates",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: "$_id",
                roomTypeRates: {
                  $push: {
                    rateType: "$roomTypeRates.rateType",
                    baseRate: "$roomTypeRates.baseRate",
                  },
                },
                roomTypeId: { $first: "$roomTypeId" },
              },
            },
            {
              $lookup: {
                from: "roomtypes",
                localField: "roomTypeId",
                foreignField: "_id",
                as: "roomType",
              },
            },
            {
              $unwind: {
                path: "$roomType",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                roomTypeId: 1,
                roomTypeName: "$roomType.roomTypeName",
                baseRate: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$roomTypeRates",
                        cond: { $eq: ["$$this.rateType", "baseRate"] },
                      },
                    },
                    0,
                  ],
                },
                adultRate: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$roomTypeRates",
                        cond: { $eq: ["$$this.rateType", "adultRate"] },
                      },
                    },
                    0,
                  ],
                },
                childRate: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$roomTypeRates",
                        cond: { $eq: ["$$this.rateType", "childRate"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
            {
              $project: {
                roomTypeId: 1,
                roomTypeName: 1,
                baseRate: "$baseRate.baseRate",
                adultRate: "$adultRate.baseRate",
                childRate: "$childRate.baseRate",
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$rateRoomTypes",
        },
      },
      {
        $project: {
          roomTypeName: "$rateRoomTypes.roomTypeName",
          roomTypeId: {
            $toString: "$rateRoomTypes.roomTypeId",
          },
          baseRate: "$rateRoomTypes.baseRate",
          adultRate: "$rateRoomTypes.adultRate",
          childRate: "$rateRoomTypes.childRate",
          ratePlanRoomRateId: "$rateRoomTypes._id",
        },
      },
    ]),
    RatePlanSetup.aggregate([
      {
        $match: {
          _id: new ObjectId(ratePlanId),
        },
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
                from: "roomtypes",
                localField: "roomTypeId",
                foreignField: "_id",
                as: "roomType",
              },
            },
            {
              $unwind: {
                path: "$roomType",
              },
            },
            {
              $lookup: {
                from: "rateplanroomdaterates",
                localField: "_id",
                foreignField: "ratePlanRoomRateId",
                as: "roomTypeDateRates",
                pipeline: [
                  {
                    $match: {
                      date: {
                        $gte: startDate,
                        $lt: endDate,
                      },
                    },
                  },
                ],
              },
            },
            {
              $project: {
                roomTypeName: "$roomType.roomTypeName",
                roomTypeId: {
                  $toString: "$roomType._id",
                },
                roomTypeDateRates: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$rateRoomTypes",
        },
      },
      {
        $project: {
          dateRates: "$rateRoomTypes.roomTypeDateRates",
          roomTypeName: "$rateRoomTypes.roomTypeName",
          roomTypeId: "$rateRoomTypes.roomTypeId",
        },
      },
    ]),
    yieldController.getDateWiseYield(
      startDate,
      endDate,
      ratePlanId,
      propertyUnitId
    ),
  ]);

  for (let rp of ratePlanDetails) {
    rp.dailyRates = [];
    for (let dr of dateRateDetails) {
      if (rp.roomTypeId == dr.roomTypeId) {
        for (let currDate = new Date(startDate); currDate < endDate; ) {
          let todayRate = rp.baseRate;
          for (let d of dr.dateRates) {
            if (d.date.toString() == currDate.toString()) {
              todayRate = d.baseRate;
              break;
            }
          }
          rp.dailyRates.push({
            date: new Date(currDate),
            baseRate: todayRate,
          });
          currDate.setDate(currDate.getDate() + 1);
        }
      }
    }
  }

  for (let rp of ratePlanDetails) {
    for (let yd of yieldData) {
      if (rp.roomTypeId == yd.roomTypeId) {
        for (let dr of rp.dailyRates) {
          for (let da of yd.dateArray) {
            if (dr.date.getTime() == da.date.getTime()) {
              dr.baseRate = await yieldController.applyYield(
                dr.baseRate,
                da.yieldChangeType,
                da.yieldChangeValue
              );
              dr.yieldApplied = true;
            }
          }
        }
      }
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        ratePlanDetails,
        "future rate data fetched successfully"
      )
    );
});

const updateFutureRates = asyncHandler(async (req, res) => {
  let { ratePlanRoomRateId } = req.body;
  let { startDate, endDate, newRate } = req.body.changeRates;
  startDate = new Date(startDate);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate = new Date(endDate);
  endDate.setUTCHours(0, 0, 0, 0);

  let updateRateEntries = [];
  for (let currDate = new Date(startDate); currDate <= endDate; ) {
    updateRateEntries.push(
      mongo.bulkwriteupdateone(
        {
          ratePlanRoomRateId: new ObjectId(ratePlanRoomRateId),
          date: new Date(currDate),
        },
        {
          ratePlanRoomRateId: new ObjectId(ratePlanRoomRateId),
          baseRate: newRate,
          date: new Date(currDate),
        },
        { upsert: true }
      )
    );
    currDate.setDate(currDate.getDate() + 1);
  }
  await RatePlanRoomDateRate.bulkWrite(updateRateEntries);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "future rate data fetched successfully"));
});

export default {
  getFutureRates,
  updateFutureRates,
};
