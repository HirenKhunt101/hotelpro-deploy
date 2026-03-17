import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Property, Reservation } from "../../database/database.schema.js";
import { PropertyUnit, User, Address } from "../../database/database.schema.js";
import { getRandomNumber } from "../../utils/helpers.js";
import mongoose from "mongoose";
import { UserTypesEnum } from "../../constants.js";
const ObjectId = mongoose.Types.ObjectId;

// GET all property units
const getAllPropertyUnits = asyncHandler(async (req, res) => {
  const propertyUnits = await PropertyUnit.find();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        propertyUnits,
        "All property units retrieved successfully"
      )
    );
});

// GET a single property unit by ID
const getPropertyUnitById = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const propertyUnit = await PropertyUnit.aggregate([
    {
      $match: {
        _id: new ObjectId(propertyUnitId),
      },
    },
    {
      $lookup: {
        from: "addresses",
        localField: "addressId",
        foreignField: "_id",
        as: "propertyAddress",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "managerId",
        foreignField: "_id",
        as: "managerDetails",
      },
    },
    {
      $unwind: {
        path: "$propertyAddress",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$managerDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!propertyUnit) {
    throw new ApiError(404, "Property unit not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        propertyUnit[0],
        "Property unit retrieved successfully"
      )
    );
});

// POST create a new property unit
const createPropertyUnit = asyncHandler(async (req, res) => {
  const {
    propertyId,
    propertyUnitName,
    propertyUnitLegalName,
    propertyUnitType,
    propertyAddress,
    managerDetails,
    description,
    website,
    socialMediaLinks,
    active,
  } = req.body;

  const existedUser = await User.findOne({
    email: managerDetails.email,
  });

  if (existedUser) {
    throw new ApiError(409, "Manager email is already exists", []);
  }

  const propertyUnitCode = getRandomNumber(1000000);

  const manager = new User(managerDetails);
  manager.userType = UserTypesEnum.MANAGER;

  const propertyUnit = new PropertyUnit({
    propertyId,
    propertyUnitName,
    propertyUnitLegalName,
    propertyUnitCode,
    propertyUnitType,
    description,
    website,
    socialMediaLinks,
    active,
  });
  const address = new Address(propertyAddress);

  propertyUnit.addressId = address._id;
  propertyUnit.managerId = manager._id;
  manager.propertyUnitId = propertyUnit._id;
  manager.accessPropertyUnitIds = [propertyUnit._id];
  await Promise.all([propertyUnit.save(), address.save(), manager.save()]);

  return res
    .status(201)
    .json(
      new ApiResponse(201, propertyUnit, "Property unit created successfully")
    );
});

// PUT update a property unit by ID
const updatePropertyUnitById = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const {
    propertyUnitName,
    propertyUnitLegalName,
    propertyAddress,
    propertyUnitType,
    managerId,
    addressId,
    description,
    website,
    socialMediaLinks,
    active,
    managerDetails,
  } = req.body;
  const propertyUnit = await PropertyUnit.findByIdAndUpdate(
    propertyUnitId,
    {
      propertyUnitName,
      propertyUnitLegalName,
      propertyUnitType,
      description,
      website,
      socialMediaLinks,
      active,
    },
    { new: true }
  );
  const [manager, address] = await Promise.all([
    User.findByIdAndUpdate(propertyUnit.managerId, managerDetails, {
      new: true,
    }),
    Address.findByIdAndUpdate(propertyUnit.addressId, propertyAddress, {
      new: true,
    }),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, propertyUnit, "Property unit updated successfully")
    );
});

const updatePropertyUnitStatus = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const { active } = req.body;
  const propertyUnit = await PropertyUnit.findByIdAndUpdate(
    propertyUnitId,
    {
      active,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, propertyUnit, "Property unit updated successfully")
    );
});

// DELETE a property unit by ID
const deletePropertyUnitById = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;

  const propertyUnit = await PropertyUnit.findByIdAndDelete(propertyUnitId);

  if (!propertyUnit) {
    throw new ApiError(404, "Property unit not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { propertyUnitId },
        "Property unit deleted successfully"
      )
    );
});

const switchProperty = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.body;
  const newUserCred = await User.findByIdAndUpdate(
    req.user._id,
    {
      propertyUnitId,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, newUserCred, "Property unit updated successfully")
    );
});

const getFrontDeskDashboard = asyncHandler(async (req, res) => {
  const { propertyUnitId, startDate } = req.body;
  let today = new Date(startDate);
  today.setUTCHours(0, 0, 0, 0);
  let response = {};

  let [reservationData, totalReservation] = await Promise.all([
    Reservation.aggregate([
      [
        {
          $match: {
            $and: [
              {
                $and: [
                  {
                    arrival: {
                      $lte: today,
                    },
                  },
                  {
                    departure: {
                      $gte: today,
                    },
                  },
                ],
              },
              {
                propertyUnitId: new ObjectId(propertyUnitId),
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalArrival: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ["$arrival", today],
                      },
                      {
                        $eq: ["$reservationStatus", "reserved"],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            checkinCompleted: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ["$arrival", today],
                      },
                      {
                        $eq: ["$reservationStatus", "inhouse"],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            checkoutRemaining: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ["$departure", today],
                      },
                      {
                        $eq: ["$reservationStatus", "inhouse"],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            checkoutCompleted: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ["$departure", today],
                      },
                      {
                        $eq: ["$reservationStatus", "checkedout"],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            inhouse: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ["$reservationStatus", "inhouse"],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalDeparture: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ["$departure", today],
                      },
                      {
                        $eq: ["$reservationStatus", "inhouse"],
                      },
                      {
                        $eq: ["$reservationStatus", "checkedout"],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ],
    ]),
    Reservation.countDocuments({ propertyUnitId }),
  ]);

  if (reservationData.length == 0) {
    reservationData.totalArrival = 0;
    reservationData.checkinCompleted = 0;
    reservationData.checkoutRemaining = 0;
    reservationData.checkoutCompleted = 0;
    reservationData.inhouse = 0;
    reservationData.totalDeparture = 0;
  } else {
    reservationData = reservationData[0];
  }

  response = { ...reservationData, totalReservation };
  return res
    .status(200)
    .json(new ApiResponse(200, response, "Dashboard retrieved successfully"));
});

export default {
  getAllPropertyUnits,
  getPropertyUnitById,
  createPropertyUnit,
  updatePropertyUnitById,
  deletePropertyUnitById,
  switchProperty,
  getFrontDeskDashboard,
  updatePropertyUnitStatus,
};
