import fs from "fs";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { UserTypesEnum, SALT_WORK_FACTOR } from "../../constants.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  emailVerificationMailgenContent,
  sendEmail,
} from "../../utils/mail.js";

import {
  Property,
  User,
  Address,
  PropertyUnit,
} from "../../database/database.schema.js";
const ObjectId = mongoose.Types.ObjectId;

// GET all properties
const getAllProperties = asyncHandler(async (req, res) => {
  const properties = await Property.find();
  return res
    .status(200)
    .json(
      new ApiResponse(200, properties, "All properties retrieved successfully")
    );
});

// GET a single property by ID
const getPropertyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const property = await Property.findById(id);
  if (!property) {
    throw new ApiError(404, "Property not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, property, "Property retrieved successfully"));
});

// POST create a new property
const createProperty = asyncHandler(async (req, res) => {
  const {
    primaryPropertyName: propertyName,
    firstName,
    lastName,
    email,
    password,
    phone,
    address: propertyAddress,
  } = req.body;

  const existedUser = await User.findOne({
    email,
  });

  if (existedUser) {
    throw new ApiError(409, "User with email id is already exists", []);
  }
  const EncryptedPassword = await bcrypt.hash(password, SALT_WORK_FACTOR);

  const address = new Address(propertyAddress);
  const user = new User({
    email,
    password: EncryptedPassword,
    firstName,
    lastName,
    phone,
    isEmailVerified: false,
    userType: UserTypesEnum.CLIENT,
    addressId: address._id,
    isLoginable: true,
  });

  /**
   * unHashedToken: unHashed token is something we will send to the user's mail
   * hashedToken: we will keep record of hashedToken to validate the unHashedToken in verify email controller
   * tokenExpiry: Expiry to be checked before validating the incoming token
   */
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  /**
   * assign hashedToken and tokenExpiry in DB till user clicks on email verification link
   * The email verification is handled by {@link verifyEmail}
   */
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  const property = new Property({
    propertyName,
    ownerId: user._id,
  });

  await Promise.all([property.save(), address.save(), user.save()]);
  sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get(
        "host"
      )}/hotelpro/user/verify-email?verificationToken=${unHashedToken}&userid=${user._id.toString()}`
    ),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        property,
        "Property created successfully. Check your email for the verification link and verify your email."
      )
    );
});

// PUT update a property by ID
const updatePropertyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { propertyName, ownerId, isVIP } = req.body;
  const property = await Property.findByIdAndUpdate(
    id,
    {
      propertyName,
      ownerId,
      isVIP,
    },
    { new: true }
  );
  if (!property) {
    throw new ApiError(404, "Property not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, property, "Property updated successfully"));
});

// DELETE a property by ID
const deletePropertyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const property = await Property.findByIdAndDelete(id);
  if (!property) {
    throw new ApiError(404, "Property not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Property deleted successfully"));
});

// POST create a new property
const uploadRoomsPhotos = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // if ([title, description].some((field) => !field?.trim())) {
  //   throw new ApiError(400, "All Fields are required");
  // }

  // if (!LocalPath) {
  //   throw new ApiError(400, "LocalPath is required!");
  // }
  for (let file of req.files) {
    fs.unlinkSync(file?.path);
  }

  return res.status(201).json(new ApiResponse(201, {}, "Upload  successfully"));
});

const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // if ([title, description].some((field) => !field?.trim())) {
  //   throw new ApiError(400, "All Fields are required");
  // }
  const LocalPath = req.file?.path;
  // if (!LocalPath) {
  //   throw new ApiError(400, "LocalPath is required!");
  // }
  fs.unlinkSync(LocalPath);
  return res.status(201).json(new ApiResponse(201, {}, "Upload  successfully"));
});

const getClientDashboard = asyncHandler(async (req, res) => {
  let { propertyId, accessPropertyUnitIds } = req.body;
  const response = {};
  let matchQuery = {};

  if (accessPropertyUnitIds && accessPropertyUnitIds.length > 0) {
    // Convert accessPropertyUnitIds to ObjectId
    accessPropertyUnitIds = accessPropertyUnitIds.map((e) => new ObjectId(e));

    // Fetch the propertyId from the first property unit
    const propertyUnit = await PropertyUnit.findById(accessPropertyUnitIds[0]);

    if (!propertyUnit) {
      throw new ApiError(404, "Property Unit not found");
    }
    propertyId = propertyUnit.propertyId;
    matchQuery = { _id: { $in: accessPropertyUnitIds } };
  } else if (propertyId) {
    propertyId = new ObjectId(propertyId); // Convert to ObjectId if it's passed
  } else {
    throw new ApiError(
      400,
      "Either propertyId or accessPropertyUnitIds must be provided"
    );
  }

  // Fetch property and rooms data using Promise.all
  const [property, rooms, users] = await Promise.all([
    // First aggregation pipeline for property details
    Property.aggregate([
      {
        $match: { _id: propertyId },
      },
      {
        $lookup: {
          from: "propertyunits",
          localField: "_id",
          foreignField: "propertyId",
          pipeline: [
            { $match: matchQuery },
            {
              $project: { propertyUnitName: 1, active: 1, propertyUnitCode: 1 },
            },
          ],
          as: "propertyunits",
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

    // Second aggregation pipeline for room details
    Property.aggregate([
      { $match: { _id: propertyId } },
      {
        $lookup: {
          from: "propertyunits",
          localField: "_id",
          foreignField: "propertyId",
          pipeline: [{ $match: matchQuery }],
          as: "propertyUnits",
        },
      },
      { $unwind: "$propertyUnits" },
      {
        $lookup: {
          from: "roomtypes",
          localField: "propertyUnits._id",
          foreignField: "propertyUnitId",
          as: "roomTypes",
        },
      },
      { $unwind: "$roomTypes" },
      {
        $lookup: {
          from: "rooms",
          localField: "roomTypes._id",
          foreignField: "roomTypeId",
          as: "rooms",
        },
      },
      { $unwind: "$rooms" },
      {
        $group: {
          _id: "$_id",
          totalRooms: { $sum: 1 },
        },
      },
    ]),

    // Third aggregation pipeline for user details
    Property.aggregate([
      { $match: { _id: propertyId } },
      {
        $lookup: {
          from: "propertyunits",
          localField: "_id",
          foreignField: "propertyId",
          pipeline: [{ $match: matchQuery }],
          as: "propertyUnits",
        },
      },
      { $unwind: "$propertyUnits" },
      {
        $lookup: {
          from: "users",
          localField: "propertyUnits._id",
          foreignField: "propertyUnitId",
          as: "users",
          pipeline: [
            {
              $match: {
                userType: {
                  $in: ["frontdesk", "housekeeper", "manager"],
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$users",
        },
      },
      {
        $group: {
          _id: "$_id",
          totalUsers: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  // Check if property data exists
  if (!property || property.length === 0) {
    throw new ApiError(404, "Property not found");
  }

  // Prepare the response data
  response.property = property[0];
  response.rooms = rooms.length > 0 ? rooms[0] : { totalRooms: 0 };
  response.users = users.length > 0 ? users[0] : { totalUsers: 0 };

  // Send the response
  return res
    .status(200)
    .json(new ApiResponse(200, response, "Property retrieved successfully"));
});

export default {
  getAllProperties,
  getPropertyById,
  createProperty,
  updatePropertyById,
  deletePropertyById,
  uploadProfilePhoto,
  uploadRoomsPhotos,
  getClientDashboard,
};
