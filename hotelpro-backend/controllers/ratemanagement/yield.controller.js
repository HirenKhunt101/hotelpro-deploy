import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  RatePlanSetup,
  YieldRoomType,
  Yield,
  RoomType,
  RoomMaintenance,
} from "../../database/database.schema.js";
import availabilityController from "./availability.controller.js";
import mongoose from "mongoose";
import { ChangeValueEnum } from "../../constants.js";
const ObjectId = mongoose.Types.ObjectId;

const readYield = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.body;
  let data = {};

  let today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  [data.yieldDetails, data.roomType, data.ratePlan] = await Promise.all([
    Yield.aggregate([
      {
        $match: {
          propertyUnitId: new ObjectId(propertyUnitId),
        },
      },
      {
        $lookup: {
          from: "rateplansetups",
          localField: "ratePlanSetupId",
          foreignField: "_id",
          as: "ratePlanDetail",
          pipeline: [
            {
              $project: {
                ratePlanName: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$ratePlanDetail",
        },
      },
      {
        $lookup: {
          from: "yieldroomtypes",
          localField: "_id",
          foreignField: "yieldId",
          as: "yieldDetail",
          pipeline: [
            {
              $match: {
                endDate: {
                  $gt: today,
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$yieldDetail",
        },
      },
      {
        $lookup: {
          from: "roomtypes",
          localField: "yieldDetail.roomTypeId",
          foreignField: "_id",
          as: "roomTypeDetail",
          pipeline: [
            {
              $project: {
                roomTypeName: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$roomTypeDetail",
        },
      },
      {
        $group: {
          _id: "$_id",
          yieldName: {
            $first: "$yieldName",
          },
          yieldDescription: {
            $first: "$yieldDescription",
          },
          ratePlanDetail: {
            $first: "$ratePlanDetail",
          },
          active: {
            $first: "$active",
          },
          startDate: {
            $first: "$yieldDetail.startDate",
          },
          endDate: {
            $first: "$yieldDetail.endDate",
          },
          occupancyRangeStart: {
            $first: "$yieldDetail.occupancyRangeStart",
          },
          occupancyRangeEnd: {
            $first: "$yieldDetail.occupancyRangeEnd",
          },
          changeType: {
            $first: "$yieldDetail.changeType",
          },
          changeValue: {
            $first: "$yieldDetail.changeValue",
          },
          roomTypes: {
            $push: "$roomTypeDetail",
          },
        },
      },
      {
        $sort: {
          startDate: -1,
        },
      },
    ]),
    RoomType.aggregate([
      {
        $match: {
          propertyUnitId: new ObjectId(propertyUnitId),
        },
      },
      {
        $project: {
          roomTypeName: 1,
          roomTypeId: "$_id",
          _id: 0,
        },
      },
    ]),
    RatePlanSetup.aggregate([
      {
        $match: {
          propertyUnitId: new ObjectId(propertyUnitId),
        },
      },
      {
        $project: {
          ratePlanName: 1,
          ratePlanId: "$_id",
          _id: 0,
        },
      },
    ]),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Yield retrieved successfully"));
});

const createYield = asyncHandler(async (req, res) => {
  let {
    yieldName,
    yieldDescription,
    ratePlanSetupId,
    startDate,
    endDate,
    occupancyRangeStart,
    occupancyRangeEnd,
    changeType,
    changeValue,
    roomTypeIds,
    propertyUnitId,
  } = req.body;

  startDate = new Date(startDate);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate = new Date(endDate);
  endDate.setUTCHours(0, 0, 0, 0);
  const roomTypeIdArray = roomTypeIds.map((rt) => new ObjectId(rt.roomTypeId));

  const existedYield = await Yield.aggregate([
    {
      $match: {
        ratePlanSetupId: new ObjectId(ratePlanSetupId),
        active: true,
      },
    },
    {
      $lookup: {
        from: "yieldroomtypes",
        localField: "_id",
        foreignField: "yieldId",
        as: "yieldDetail",
        pipeline: [
          {
            $match: {
              $and: [
                {
                  endDate: {
                    $gt: startDate,
                  },
                },
                {
                  startDate: {
                    $lt: endDate,
                  },
                },
                {
                  roomTypeId: {
                    $in: roomTypeIdArray,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$yieldDetail",
      },
    },
  ]);

  if (existedYield.length > 0) {
    throw new ApiError(
      409,
      "You cannot create a new yield because it overlaps with an existing one for the selected date, room type, and rate plan.",
      []
    );
  }

  const yieldDetail = new Yield({
    yieldName,
    yieldDescription,
    ratePlanSetupId: new ObjectId(ratePlanSetupId),
    propertyUnitId,
  });

  const yieldRoomTypeEntries = roomTypeIdArray.map((rt) => {
    return new YieldRoomType({
      startDate,
      endDate,
      occupancyRangeStart,
      occupancyRangeEnd,
      changeType,
      changeValue,
      roomTypeId: rt,
      yieldId: yieldDetail._id,
    });
  });

  await Promise.all([
    yieldDetail.save(),
    YieldRoomType.insertMany(yieldRoomTypeEntries),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Yield created successfully"));
});

const updateYield = asyncHandler(async (req, res) => {
  const {
    yieldId,
    yieldName,
    yieldDescription,
    ratePlanSetupId,
    startDate,
    endDate,
    occupancyRangeStart,
    occupancyRangeEnd,
    changeType,
    changeValue,
    roomTypeIds,
    active,
    propertyUnitId,
  } = req.body;

  let start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  let end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  const roomTypeIdArray = roomTypeIds.map((rt) => new ObjectId(rt.roomTypeId));
  const existedYield = await Yield.aggregate([
    {
      $match: {
        ratePlanSetupId: new ObjectId(ratePlanSetupId),
        active: true,
        _id: { $ne: new ObjectId(yieldId) },
      },
    },
    {
      $lookup: {
        from: "yieldroomtypes",
        localField: "_id",
        foreignField: "yieldId",
        as: "yieldDetail",
        pipeline: [
          {
            $match: {
              $and: [
                {
                  endDate: {
                    $gt: start,
                  },
                },
                {
                  startDate: {
                    $lt: end,
                  },
                },
                {
                  roomTypeId: {
                    $in: roomTypeIdArray,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$yieldDetail",
      },
    },
  ]);

  if (existedYield.length > 0) {
    throw new ApiError(
      409,
      "You cannot update yield because it overlaps with an existing one for the selected date, room type, and rate plan.",
      []
    );
  }

  let yieldDetail = await Yield.findById(yieldId);
  yieldDetail.yieldName = yieldName;
  yieldDetail.yieldDescription = yieldDescription;
  yieldDetail.ratePlanSetupId = ratePlanSetupId;
  yieldDetail.active = active;

  const yieldRoomTypeEntries = roomTypeIds.map((rt) => {
    return new YieldRoomType({
      startDate,
      endDate,
      occupancyRangeStart,
      occupancyRangeEnd,
      changeType,
      changeValue,
      roomTypeId: new ObjectId(rt.roomTypeId),
      yieldId: yieldDetail._id,
    });
  });

  await YieldRoomType.deleteMany({ yieldId });
  await Promise.all([
    yieldDetail.save(),
    YieldRoomType.insertMany(yieldRoomTypeEntries),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Yield created successfully"));
});

const getDateWiseYield = async (
  startDate,
  endDate,
  ratePlanId,
  propertyUnitId
) => {
  try {
    let matchquerry = {
      propertyUnitId: new ObjectId(propertyUnitId),
      active: true,
    };
    if (ratePlanId) matchquerry.ratePlanSetupId = new ObjectId(ratePlanId);

    let [yieldDetails, availability, roomMaintenance] = await Promise.all([
      Yield.aggregate([
        {
          $match: matchquerry,
        },
        {
          $lookup: {
            from: "yieldroomtypes",
            localField: "_id",
            foreignField: "yieldId",
            as: "yieldDetail",
            pipeline: [
              {
                $match: {
                  endDate: {
                    $gt: startDate,
                  },
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$yieldDetail",
          },
        },
        {
          $project: {
            yieldName: 1,
            ratePlanSetupId: 1,
            roomTypeId: "$yieldDetail.roomTypeId",
            startDate: "$yieldDetail.startDate",
            endDate: "$yieldDetail.endDate",
            occupancyRangeStart: "$yieldDetail.occupancyRangeStart",
            occupancyRangeEnd: "$yieldDetail.occupancyRangeEnd",
            changeType: "$yieldDetail.changeType",
            changeValue: "$yieldDetail.changeValue",
          },
        },
      ]),
      availabilityController.getDateWiseRoomAvailability(
        startDate,
        endDate,
        propertyUnitId,
        "yield"
      ),
      RoomMaintenance.aggregate([
        {
          $match: {
            $and: [
              {
                endDate: {
                  $gt: startDate,
                },
              },
              {
                startDate: {
                  $lte: endDate,
                },
              },
              {
                propertyUnitId: new ObjectId(propertyUnitId),
              },
            ],
          },
        },
        {
          $project: {
            roomId: 1,
            startDate: 1,
            endDate: 1,
          },
        },
      ]),
    ]);

    let yieldDateWiseData = [];
    for (let a of availability) {
      let obj = {
        roomTypeId: a._id.toString(),
        dateArray: [],
      };
      for (let yd of yieldDetails) {
        if (a._id.toString() == yd.roomTypeId.toString()) {
          for (let o of a.Occupancy) {
            let occupied = a.TotalRoom - o.Available;

            // Adjust for room maintenance
            let maintenanceCount = roomMaintenance.filter(
              (rm) =>
                new Date(o.Date).getTime() >=
                  new Date(rm.startDate).getTime() &&
                new Date(o.Date).getTime() < new Date(rm.endDate).getTime()
            ).length;

            let adjustedTotalRoom = a.TotalRoom - maintenanceCount;
            let occupancyPercentage =
              adjustedTotalRoom != 0 ? (100 * occupied) / adjustedTotalRoom : 0;

            if (
              yd.startDate.getTime() <= new Date(o.Date).getTime() &&
              new Date(o.Date).getTime() < yd.endDate.getTime() &&
              yd.occupancyRangeStart <= occupancyPercentage &&
              occupancyPercentage <= yd.occupancyRangeEnd
            ) {
              obj.dateArray.push({
                date: new Date(o.Date),
                roomTypeId: a._id.toString(),
                ratePlanSetupId: yd.ratePlanSetupId,
                yieldChangeValue: yd.changeValue,
                yieldChangeType: yd.changeType,
              });
            }
          }
        }
      }
      yieldDateWiseData.push(obj);
    }
    return yieldDateWiseData;
  } catch (error) {
    console.error("Error fetching date-wise yield:", error);
    throw error;
  }
};

const applyYield = async (baseRate, yieldChangeType, yieldChangeValue) => {
  if (yieldChangeType == ChangeValueEnum.FLAT) {
    return baseRate + yieldChangeValue;
  }
  if (yieldChangeType == ChangeValueEnum.PERCENTAGE) {
    return baseRate + (baseRate * yieldChangeValue) / 100;
  }
};

export default {
  readYield,
  createYield,
  updateYield,
  getDateWiseYield,
  applyYield,
};
