import mongo from "../../database/database.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  RoomType,
  Room,
  Reservation,
  RoomMaintenance,
  RatePlanSetup,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
import {
  ReservationStatusEnum,
  RoomConditionEnum,
  RoomStatusEnum,
} from "../../constants.js";
import yieldController from "./yield.controller.js";
const ObjectId = mongoose.Types.ObjectId;

const getTapechart = asyncHandler(async (req, res) => {
  let { startDate, endDate, propertyUnitId, from } = req.body;
  startDate = new Date(startDate);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate = new Date(endDate);
  endDate.setUTCHours(0, 0, 0, 0);

  let [tapechartData, rateData, baseRatePlan, unAssignReservations] =
    await Promise.all([
      RoomType.aggregate([
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
            as: "roomDetails",
            pipeline: [
              {
                $lookup: {
                  from: "reservations",
                  localField: "_id",
                  foreignField: "roomId",
                  as: "reservation",
                  pipeline: [
                    {
                      $match: {
                        $and: [
                          {
                            departure: {
                              $gt: startDate,
                            },
                          },
                          {
                            arrival: {
                              $lt: endDate,
                            },
                          },
                          {
                            propertyUnitId: new ObjectId(propertyUnitId),
                          },
                          {
                            $or: [
                              {
                                reservationStatus:
                                  ReservationStatusEnum.INHOUSE,
                              },
                              {
                                reservationStatus:
                                  ReservationStatusEnum.RESERVED,
                              },
                            ],
                          },
                        ],
                      },
                    },
                    {
                      $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userDetail",
                      },
                    },
                    {
                      $unwind: {
                        path: "$userDetail",
                      },
                    },
                    {
                      $project: {
                        arrival: 1,
                        departure: 1,
                        tantative: 1,
                        reservationStatus: 1,
                        guestName: {
                          $concat: [
                            "$userDetail.firstName",
                            " ",
                            "$userDetail.lastName",
                          ],
                        },
                      },
                    },
                  ],
                },
              },
              {
                $lookup: {
                  from: "roommaintenances",
                  localField: "_id",
                  foreignField: "roomId",
                  as: "maintenance",
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
                            propertyUnitId: new ObjectId(propertyUnitId),
                          },
                          {
                            isCompleted: false,
                          },
                        ],
                      },
                    },
                    {
                      $project: {
                        startDate: 1,
                        endDate: 1,
                        reason: 1,
                      },
                    },
                  ],
                },
              },
              {
                $project: {
                  roomName: 1,
                  roomCondition: 1,
                  reservation: 1,
                  maintenance: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            roomTypeId: { $toString: "$_id" },
            roomTypeName: 1,
            roomDetails: 1,
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
          $lookup: {
            from: "rateplanroomtypes",
            localField: "_id",
            foreignField: "roomTypeId",
            as: "rateRoomTypes",
            pipeline: [
              {
                $lookup: {
                  from: "rateplansetups",
                  localField: "ratePlanSetupId",
                  foreignField: "_id",
                  as: "rateSetup",
                },
              },
              {
                $unwind: {
                  path: "$rateSetup",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $addFields: {
                  ratePlanName: "$rateSetup.ratePlanName",
                },
              },
              {
                $unset: "rateSetup",
              },
              {
                $lookup: {
                  from: "rateplanroomrates",
                  localField: "_id",
                  foreignField: "ratePlanRoomDetailId",
                  as: "roomTypeRates",
                  pipeline: [
                    {
                      $match: {
                        rateType: "baseRate",
                      },
                    },
                  ],
                },
              },
              {
                $unwind: {
                  path: "$roomTypeRates",
                },
              },
              {
                $lookup: {
                  from: "rateplanroomdaterates",
                  localField: "_id",
                  foreignField: "ratePlanRoomRateId",
                  as: "dateRates",
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$rateRoomTypes",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            roomTypeId: {
              $toString: "$_id",
            },
            baseRate: "$rateRoomTypes.roomTypeRates.baseRate",
            dateRate: "$rateRoomTypes.dateRates",
          },
        },
      ]),
      RatePlanSetup.findOne({
        active: true,
        isBaseRate: true,
        propertyUnitId,
      }),
      Reservation.aggregate([
        {
          $match: {
            $and: [
              {
                departure: {
                  $gt: startDate,
                },
              },
              {
                arrival: {
                  $lt: endDate,
                },
              },
              {
                propertyUnitId: new ObjectId(propertyUnitId),
              },
              {
                reservationStatus: ReservationStatusEnum.RESERVED,
              },
              {
                tentative: true,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetail",
          },
        },
        {
          $unwind: {
            path: "$userDetail",
          },
        },
        {
          $project: {
            arrival: 1,
            departure: 1,
            tantative: 1,
            reservationStatus: 1,
            groupId: 1,
            guestName: {
              $concat: ["$userDetail.firstName", " ", "$userDetail.lastName"],
            },
          },
        },
      ]),
    ]);

  let yieldData = await yieldController.getDateWiseYield(
    startDate,
    endDate,
    baseRatePlan._id.toString(),
    propertyUnitId
  );

  for (let tc of tapechartData) {
    tc.dailyRates = [];
    for (let dr of rateData) {
      if (tc.roomTypeId == dr.roomTypeId) {
        for (let currDate = new Date(startDate); currDate < endDate; ) {
          let todayRate = dr.baseRate;
          for (let d of dr.dateRate) {
            if (d.date.toString() == currDate.toString()) {
              todayRate = d.baseRate;
              break;
            }
          }
          tc.dailyRates.push({
            date: new Date(currDate),
            baseRate: todayRate,
          });
          currDate.setDate(currDate.getDate() + 1);
        }
      }
    }
  }

  for (let tc of tapechartData) {
    for (let yd of yieldData) {
      if (tc.roomTypeId == yd.roomTypeId) {
        for (let dr of tc.dailyRates) {
          for (let da of yd.dateArray) {
            if (dr.date.getTime() == da.date.getTime()) {
              dr.baseRate = await yieldController.applyYield(
                dr.baseRate,
                da.yieldChangeType,
                da.yieldChangeValue
              );
            }
          }
        }
      }
    }
  }

  if (from == "dashboard") {
    tapechartData = tapechartData.map(({ dailyRates, roomTypeName }) => ({
      dailyRates,
      roomTypeName,
    }));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tapechartData,
        unAssignReservations,
      },
      "Tapechart data fetched successfully"
    )
  );
});

export default {
  getTapechart,
};
