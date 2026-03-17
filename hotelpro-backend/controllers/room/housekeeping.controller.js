import mongoose from "mongoose";
import mongo from "../../database/database.service.js";
import bcrypt from "bcrypt";

import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  UserTypesEnum,
  SALT_WORK_FACTOR,
  RoomConditionEnum,
  AvailableWeekDayEnum,
} from "../../constants.js";

import {
  HousekeepingTask,
  HousekeepingAssign,
  RoomType,
  Room,
  User,
} from "../../database/database.schema.js";

const ObjectId = mongoose.Types.ObjectId;

const createHouseKeeper = asyncHandler(async (req, res) => {
  let { propertyUnitId, firstName, lastName, email, phone } = req.body;
  let data = {};

  const existedUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email is already exists", []);
  }

  let password = Math.random().toString(36).slice(-6);
  password = bcrypt.hashSync(password, SALT_WORK_FACTOR);
  let housekeeper = {
    propertyUnitId,
    firstName,
    lastName,
    password,
    email,
    phone,
    isLoginable: true,
    userType: UserTypesEnum.HOUSEKEEPER,
  };

  let user_details = new User(housekeeper);
  // schedule = schedule.map((s) => {
  //   s.housekeeperId = user_details._id;
  //   return s;
  // });

  await Promise.all([
    // housekeeperWorkerShift.insertMany(schedule),
    mongo.insertIntoCollection(user_details),
  ]);
  data.HouseKeeper = housekeeper;

  return res
    .status(200)
    .json(new ApiResponse(200, data, "House Keeper Added Successfully"));
});
const updateHouseKeeper = asyncHandler(async (req, res) => {
  let { _id, firstName, lastName, email, phone, schedule } = req.body;
  let data = {};

  // const updateWorkerShiftEntries = schedule.map((s) =>
  //   mongo.bulkwriteupdateone(
  //     { _id: s._id },
  //     {
  //       day: s.day,
  //       working: s.working,
  //       shiftEndTime: s.shiftEndTime,
  //       shiftStartTime: s.shiftStartTime,
  //     }
  //   )
  // );

  await Promise.all([
    // housekeeperWorkerShift.bulkWrite(updateWorkerShiftEntries),
    User.findByIdAndUpdate(_id, {
      firstName,
      lastName,
      email,
      phone,
    }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, data, "House Keeper Updated Successfully"));
});

const getHouseKeeper = asyncHandler(async (req, res) => {
  let { propertyUnitId } = req.body;
  let data = {};

  data.housekeeper_details = await User.aggregate([
    {
      $match: {
        propertyUnitId: new ObjectId(propertyUnitId),
        userType: UserTypesEnum.HOUSEKEEPER,
      },
    },
    // {
    //   $lookup: {
    //     from: "housekeeperworkershifts",
    //     localField: "_id",
    //     foreignField: "housekeeperId",
    //     as: "schedule",
    //   },
    // },
    {
      $project: {
        housekeeperName: {
          $concat: ["$firstName", " ", "$lastName"],
        },
        active: "$isLoginable",
        // schedule: 1,
      },
    },
    {
      $addFields: {
        assignedRoom: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, data, "House Keeper Added Successfully"));
});

const deleteHouseKeeper = asyncHandler(async (req, res) => {
  let { housekeeperId, active } = req.body;

  await User.updateOne(
    {
      _id: housekeeperId,
    },
    {
      isLoginable: active,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "House Keeper Updated Successfully"));
});

const getRoomsWithHouseKeeping = asyncHandler(async (req, res) => {
  let { propertyUnitId } = req.body;
  let data = {};
  [data.RoomDetails, data.housekeeperDetail] = await Promise.all([
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
          as: "RoomDetails",
        },
      },
      {
        $unwind: {
          path: "$RoomDetails",
        },
      },
      {
        $lookup: {
          from: "housekeepingtasks",
          localField: "RoomDetails._id",
          foreignField: "roomId",
          as: "houseKeepingTaskDetails",
          pipeline: [
            {
              $match: {
                isCompleted: false,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$houseKeepingTaskDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "houseKeepingTaskDetails.housekeeperId",
          foreignField: "_id",
          as: "housekeeper",
        },
      },
      {
        $unwind: {
          path: "$housekeeper",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: "$RoomDetails._id",
          roomNumber: "$RoomDetails.roomNumber",
          roomName: "$RoomDetails.roomName",
          roomType: "$roomTypeName",
          roomCondition: "$RoomDetails.roomCondition",
          roomStatus: "$RoomDetails.roomStatus",
          taskName: "$houseKeepingTaskDetails.taskName",
          isCompleted: "$houseKeepingTaskDetails.isCompleted",
          housekeeperId: "$housekeeper._id",
          housekeeperName: {
            $concat: ["$housekeeper.firstName", " ", "$housekeeper.lastName"],
          },
          notes: "$houseKeepingTaskDetails.taskDescription",
          housekeepingId: "$houseKeepingTaskDetails._id",
        },
      },
      { $addFields: { Show: true } },
      {
        $sort: {
          roomType: 1,
          roomNumber: 1,
        },
      },
    ]),
    User.aggregate([
      {
        $match: {
          propertyUnitId: new ObjectId(propertyUnitId),
          userType: UserTypesEnum.HOUSEKEEPER,
        },
      },
      // {
      //   $lookup: {
      //     from: "housekeeperworkershifts",
      //     localField: "_id",
      //     foreignField: "housekeeperId",
      //     as: "schedule",
      //   },
      // },
      {
        $project: {
          housekeeperName: {
            $concat: ["$firstName", " ", "$lastName"],
          },
          active: "$isLoginable",
          // schedule: 1,
          firstName: 1,
          lastName: 1,
          phone: 1,
          email: 1,
        },
      },
      {
        $addFields: {
          assignedRoom: 0,
        },
      },
    ]),
  ]);

  for (let hd of data.housekeeperDetail) {
    let assignRoomCount = 0;
    for (let rd of data.RoomDetails) {
      if (
        rd.housekeeperId &&
        hd._id.toString() == rd.housekeeperId.toString()
      ) {
        assignRoomCount++;
      }
    }
    hd.assignedRoom = assignRoomCount;
  }

  // for (let hd of data.housekeeperDetail) {
  //   hd.schedule.sort((a, b) => {
  //     return (
  //       AvailableWeekDayEnum.indexOf(a.day) -
  //       AvailableWeekDayEnum.indexOf(b.day)
  //     );
  //   });
  // }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        data,
        "All housekeeping tasks retrieved successfully"
      )
    );
});

const updateRoomsWithHouseKeeping = asyncHandler(async (req, res) => {
  let { RoomDetails } = req.body;
  let updateRoomEntries = [];

  for (let j = 0; j < RoomDetails.length; j++) {
    updateRoomEntries.push(
      mongo.bulkwriteupdateone(
        { _id: new ObjectId(RoomDetails[j]._id) },
        {
          roomCondition: RoomDetails[j].roomCondition,
        }
      )
    );
  }

  await Promise.all([Room.bulkWrite(updateRoomEntries)]);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Housekeeping task updated successfully"));
});

const createHouseKeepingTask = asyncHandler(async (req, res) => {
  const {
    housekeeper: housekeeperId,
    propertyUnitId,
    rooms: roomIds,
    taskName,
    notes: taskDescription,
  } = req.body;

  let taskAssignEntries = [];
  for (let a of roomIds) {
    taskAssignEntries.push({
      roomId: a.item_id,
      propertyUnitId,
      housekeeperId,
      taskName: "Room Cleaning",
      taskDescription,
    });
  }

  await HousekeepingTask.insertMany(taskAssignEntries);

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Housekeeping task assigned successfully"));
});

const completeTaskById = asyncHandler(async (req, res) => {
  const { housekeepingId, roomId } = req.body;

  await Promise.all([
    HousekeepingTask.findByIdAndUpdate(housekeepingId, { isCompleted: true }),
    Room.findByIdAndUpdate(roomId, { roomCondition: RoomConditionEnum.CLEAN }),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Housekeeping task completed successfully"));
});

export default {
  createHouseKeeper,
  updateHouseKeeper,
  getHouseKeeper,
  deleteHouseKeeper,
  getRoomsWithHouseKeeping,
  updateRoomsWithHouseKeeping,
  createHouseKeepingTask,
  completeTaskById,
};
