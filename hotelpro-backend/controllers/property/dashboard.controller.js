import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Property, User, Address } from "../../database/database.schema.js";
import { SALT_WORK_FACTOR } from "../../constants.js";
import { UserTypesEnum } from "../../constants.js";
const ObjectId = mongoose.Types.ObjectId;

const readClientDashboard = asyncHandler(async (req, res) => {
  const { propertyId } = req.body;
  const response = {};

  const [property, rooms] = await Promise.all([
    Property.aggregate([
      {
        $match: {
          _id: new ObjectId(propertyId),
        },
      },
      {
        $lookup: {
          from: "propertyunits",
          localField: "_id",
          foreignField: "propertyId",
          as: "propertyunits",
          pipeline: [
            {
              $project: {
                propertyUnitName: 1,
                active: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          propertyId: "$_id",
          propertyName: "$propertyName",
          isVIP: "$isVIP",
          propertyUnits: "$propertyunits",
        },
      },
    ]),
    Property.aggregate([
      {
        $match: {
          _id: new ObjectId(propertyId),
        },
      },
      {
        $lookup: {
          from: "propertyunits",
          localField: "_id",
          foreignField: "propertyId",
          as: "propertyUnits",
        },
      },
      {
        $unwind: {
          path: "$propertyUnits",
        },
      },
      {
        $lookup: {
          from: "roomtypes",
          localField: "propertyUnits._id",
          foreignField: "propertyUnitId",
          as: "roomTypes",
        },
      },
      {
        $unwind: {
          path: "$roomTypes",
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "roomTypes._id",
          foreignField: "roomTypeId",
          as: "rooms",
        },
      },
      {
        $unwind: {
          path: "$rooms",
        },
      },
      {
        $group: {
          _id: "$_id",
          totalRooms: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  if (!property || property.length == 0) {
    throw new ApiError(404, "Property not found");
  }

  response.property = property[0];
  response.rooms = rooms[0];
  return res
    .status(200)
    .json(new ApiResponse(200, response, "Property retrieved successfully"));
});

const readUserByPropertyUnit = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.body;
  const response = {};
  let matchquerry = {};
  if (req.user.userType == UserTypesEnum.MANAGER) {
    matchquerry = {
      userType: UserTypesEnum.FRONTDESK,
      propertyUnitId: new ObjectId(propertyUnitId),
    };
  } else {
    matchquerry = {
      userType: { $in: [UserTypesEnum.FRONTDESK, UserTypesEnum.MANAGER] },
      $or: [
        { propertyUnitId: new ObjectId(propertyUnitId) },
        { accessPropertyUnitIds: { $in: [new ObjectId(propertyUnitId)] } },
      ],
    };
  }
  const [users] = await Promise.all([
    User.aggregate([
      {
        $match: matchquerry,
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          accessPropertyUnitIds: 1,
          email: 1,
          phone: 1,
          isLoginable: 1,
          userType: 1,
        },
      },
    ]),
  ]);

  if (!users || users.length == 0) {
    throw new ApiError(404, "User not found");
  }

  response.users = users;
  return res
    .status(200)
    .json(new ApiResponse(200, response, "Users retrieved successfully"));
});

const updateUser = asyncHandler(async (req, res) => {
  let {
    userId,
    firstName,
    lastName,
    active: isLoginable,
    email,
    phone,
    propertyUnits,
  } = req.body;
  const response = {};
  if (propertyUnits) {
    propertyUnits = propertyUnits.map((user) => user._id);
  } else {
    propertyUnits = [];
  }
  let user = await User.findById(userId);
  user.firstName = firstName;
  user.lastName = lastName;
  user.isLoginable = isLoginable;
  user.email = email;
  user.phone = phone;
  if (
    propertyUnits.length != 0 &&
    user.propertyUnitId &&
    !propertyUnits.includes(user.propertyUnitId.toString())
  ) {
    user.propertyUnitId = propertyUnits[0];
  }
  user.accessPropertyUnitIds = propertyUnits;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Users retrieved successfully"));
});

const createUser = asyncHandler(async (req, res) => {
  let {
    firstName,
    lastName,
    userType,
    email,
    phone,
    password,
    propertyUnitId,
    propertyUnits,
  } = req.body;
  const response = {};
  if (propertyUnits) {
    propertyUnits = propertyUnits.map((user) => user._id);
  } else {
    propertyUnits = [];
  }
  const existedUser = await User.findOne({
    email,
  });

  if (existedUser) {
    throw new ApiError(409, "User with email id is already exists", []);
  }

  const EncryptedPassword = await bcrypt.hash(password, SALT_WORK_FACTOR);
  const user = new User({
    email,
    password: EncryptedPassword,
    firstName,
    lastName,
    phone,
    userType,
    propertyUnitId,
    accessPropertyUnitIds: propertyUnits,
    isEmailVerified: true,
  });
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Users retrieved successfully"));
});

export default {
  readClientDashboard,
  readUserByPropertyUnit,
  updateUser,
  createUser,
};
