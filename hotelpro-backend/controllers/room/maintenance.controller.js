import mongo from "../../database/database.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  RoomType,
  Room,
  Reservation,
  RoomMaintenance,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
import {
  ReservationStatusEnum,
  RoomConditionEnum,
  RoomStatusEnum,
} from "../../constants.js";
const ObjectId = mongoose.Types.ObjectId;

// GET all room maintenance
const getRoomMaintenance = asyncHandler(async (req, res) => {
  let { startDate, endDate, propertyUnitId } = req.body;
  let data = {};
  startDate = new Date(startDate);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate = new Date(endDate);
  endDate.setUTCHours(0, 0, 0, 0);

  let [Rooms, reservation, roommaintainance] = await Promise.all([
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
          as: "rooms",
        },
      },
      {
        $unwind: "$rooms",
      },
      {
        $project: {
          roomId: "$rooms._id",
          roomType: "$roomTypeName",
          roomNumber: "$rooms.roomNumber",
          roomName: "$rooms.roomName",
          roomStatus: "$rooms.roomStatus",
          roomCondition: "$rooms.roomCondition",
          Reservation: [],
          RoomMaintainance: [],
        },
      },
      {
        $sort: {
          roomNumber: 1,
        },
      },
    ]),
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
              $or: [
                { reservationStatus: ReservationStatusEnum.INHOUSE },
                { reservationStatus: ReservationStatusEnum.RESERVED },
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
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $project: {
          arrival: 1,
          departure: 1,
          roomId: 1,
          tentative: 1,
          reservationStatus: 1,
          guestName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
        },
      },
    ]),
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
    ]),
  ]);

  data.Rooms = Rooms;
  for (var i = 0; i < data.Rooms.length; i++) {
    reservation.forEach((s) => {
      // if (s.Version.length > 1 && s.ReservationStatus != "Reserved") {
      //   s.Version.forEach((v) => {
      //     if (v.RoomChanged == true && v.Checked != true) {
      //       let obj = { ...s };
      //       obj.Departure = new Date(v.Date);
      //       s.Arrival = new Date(v.Date);
      //       v.Checked = true;
      //       for (var k = 0; k < data.Rooms.length; k++) {
      //         if (v.OldRoomId == data.Rooms[k].roomId.toString()) {
      //           delete obj.Version;
      //           obj.GuestName += " →";
      //           data.Rooms[k].Reservation.push(obj);
      //         }
      //       }
      //     }
      //   });
      // }

      if (
        !s.tentative &&
        s.roomId.toString() == data.Rooms[i].roomId.toString()
      ) {
        s.roomNumber = data.Rooms[i].roomNumber;
        s.roomName = data.Rooms[i].roomName;
        s.roomType = data.Rooms[i].roomType;
        data.Rooms[i].Reservation.push(s);
      }
    });
    roommaintainance.forEach((s) => {
      if (
        !s.tentative &&
        s.roomId.toString() == data.Rooms[i].roomId.toString()
      ) {
        s.roomNumber = data.Rooms[i].roomNumber;
        s.roomName = data.Rooms[i].roomName;
        s.roomType = data.Rooms[i].roomType;
        data.Rooms[i].RoomMaintainance.push(s);
      }
    });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Room maintenance fetch successfully"));
});

// POST create a new room maintenance
const createRoomMaintenance = asyncHandler(async (req, res) => {
  let { RoomMaintainance } = req.body;
  let data = {};
  let updateRoomEntries = [];

  for (let i = 0; i < RoomMaintainance.length; i++) {
    if (RoomMaintainance[i].today === RoomMaintainance[i].startDate) {
      updateRoomEntries.push(
        mongo.bulkwriteupdateone(
          { _id: RoomMaintainance[i].roomId },
          {
            roomStatus: RoomStatusEnum.MAINTENANCE,
            roomCondition: RoomConditionEnum.DIRTY,
          }
        )
      );
    }
  }

  await Promise.all([
    RoomMaintenance.insertMany(RoomMaintainance),
    Room.bulkWrite(updateRoomEntries),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, data, "Room Maintenance added successfully!"));
});

// PUT update a room maintenance
const updateRoomMaintenance = asyncHandler(async (req, res) => {
  let {
    startDate,
    endDate,
    roomId,
    reason,
    description,
    isCompleted,
    Today,
    RoomMaintainanceId,
  } = req.body;
  let data = {};

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  let room_maintainance_details = await RoomMaintenance.findById(
    RoomMaintainanceId
  );

  room_maintainance_details.startDate = startDate;
  room_maintainance_details.endDate = endDate;
  room_maintainance_details.reason = reason;
  room_maintainance_details.description = description;
  room_maintainance_details.isCompleted = isCompleted;

  let room_details = {};
  if (room_maintainance_details.isCompleted == true) {
    room_details.roomStatus = RoomStatusEnum.VACANT;
    room_details.roomCondition = RoomConditionEnum.CLEAN;
  } else if (new Date(Today).toString() == new Date(startDate).toString()) {
    room_details.roomStatus = RoomStatusEnum.MAINTENANCE;
    room_details.roomCondition = RoomConditionEnum.DIRTY;
  } else if (new Date(Today).toString() < new Date(startDate).toString()) {
    room_details.roomStatus = RoomStatusEnum.VACANT;
    room_details.roomCondition = RoomConditionEnum.CLEAN;
  }

  data.RoomMaintainance = await mongo.updateCollection(
    RoomMaintenance,
    {
      _id: RoomMaintainanceId,
    },
    room_maintainance_details
  );

  data.Room = await mongo.updateCollection(
    Room,
    {
      _id: roomId,
    },
    room_details
  );

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Room maintenance updated successfully"));
});

// DELETE a room maintenance
const deleteRoomMaintenance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const roomType = await RoomType.findByIdAndDelete(id);
  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Room type deleted successfully"));
});

const updateRoomMaintenanceRange = asyncHandler(async (req, res) => {
  const { RangeMaintenance } = req.body;

  let MaintenanceIds = RangeMaintenance.map((m) => m._id);
  let RoomIds = RangeMaintenance.map((m) => m.roomId);

  await Promise.all([
    RoomMaintenance.updateMany(
      { _id: { $in: MaintenanceIds } },
      { $set: { isCompleted: true } }
    ),
    Room.updateMany(
      { _id: { $in: RoomIds } },
      {
        $set: {
          roomStatus: RoomStatusEnum.VACANT,
          roomCondition: RoomConditionEnum.CLEAN,
        },
      }
    ),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Room maintenance completed successfully"));
});

// GET all room maintenance
const getAvailableRoomForDateRange = asyncHandler(async (req, res) => {
  let { startDate, endDate, propertyUnitId } = req.body;
  let data = {};

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  let [ReservationDetails, TotalRooms, RoomMaintainanceDetails] =
    await Promise.all([
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
                  $lte: endDate,
                },
              },
              {
                propertyUnitId: new ObjectId(propertyUnitId),
              },
              {
                $or: [
                  {
                    reservationStatus: ReservationStatusEnum.INHOUSE,
                  },
                  {
                    reservationStatus: ReservationStatusEnum.RESERVED,
                  },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "Rooms",
          },
        },
        {
          $unwind: "$Rooms",
        },
        {
          $lookup: {
            from: "roomtypes",
            localField: "Rooms.roomTypeId",
            foreignField: "_id",
            as: "roomType",
          },
        },
        {
          $unwind: "$roomType",
        },
        {
          $project: {
            roomId: 1,
            tentative: 1,
            roomType: 1,
            Arrival: 1,
            Departure: 1,
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
            from: "rooms",
            localField: "_id",
            foreignField: "roomTypeId",
            as: "TotalRoomDetails",
          },
        },
        {
          $unwind: "$TotalRoomDetails",
        },
        {
          $group: {
            _id: "$roomTypeName",
            RoomTypeId: { $first: "$_id" },
            rooms: {
              $push: "$TotalRoomDetails",
            },
            roomId: {
              $push: {
                $convert: {
                  input: "$TotalRoomDetails._id",
                  to: "string",
                },
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $project: {
            _id: 1,
            rooms: 1,
            roomId: 1,
            DateRate: [],
            roomtype: "$_id",
            RoomTypeId: 1,
            TotalRoom: {
              $size: "$rooms",
            },
          },
        },
      ]),
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
                  $lt: endDate,
                },
              },
              {
                propertyUnitId: new ObjectId(propertyUnitId),
              },
              {
                isCompleted: { $ne: true },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "RoomMaintainanceDetails",
          },
        },
        {
          $unwind: "$RoomMaintainanceDetails",
        },
        {
          $group: {
            _id: null,
            MaintainanceRoomId: {
              $push: {
                $convert: {
                  input: "$RoomMaintainanceDetails._id",
                  to: "string",
                },
              },
            },
          },
        },
      ]),
    ]);

  RoomMaintainanceDetails = RoomMaintainanceDetails[0];
  for (var i = 0; i < TotalRooms.length; i++) {
    if (ReservationDetails != null && ReservationDetails.length > 0) {
      ReservationDetails.forEach((r) => {
        let index = TotalRooms[i].roomId.indexOf(r.roomId.toString());
        if (
          index > -1 &&
          (r.tentative == false ||
            r.tentative == undefined ||
            r.tentative == null)
        ) {
          TotalRooms[i].rooms.splice(index, 1);
          TotalRooms[i].roomId.splice(index, 1);
        }
        if (index > -1 && r.tentative == true) {
          TotalRooms[i].rooms[index].tentative = r.tentative;
        }
      });
    }

    if (
      RoomMaintainanceDetails != null &&
      RoomMaintainanceDetails.MaintainanceRoomId.length > 0
    ) {
      RoomMaintainanceDetails.MaintainanceRoomId.forEach((id) => {
        let index = TotalRooms[i].roomId.indexOf(id);
        if (index > -1) {
          console.log(index);
          TotalRooms[i].rooms.splice(index, 1);
          TotalRooms[i].roomId.splice(index, 1);
        }
      });
    }
  }

  data.RoomTypes = TotalRooms;

  return res
    .status(200)
    .json(new ApiResponse(200, data, "All room types retrieved successfully"));
});

export default {
  getRoomMaintenance,
  createRoomMaintenance,
  updateRoomMaintenance,
  deleteRoomMaintenance,
  updateRoomMaintenanceRange,
  getAvailableRoomForDateRange,
};
