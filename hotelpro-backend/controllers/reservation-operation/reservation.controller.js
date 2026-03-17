import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  Reservation,
  ReservationDetail,
  RatePlanSetup,
  RatePlanRoomType,
  RatePlanRoomRate,
  RoomType,
  RoomBalance,
  GroupReservation,
  User,
  Address,
  BillingAccount,
  TransactionCode,
  GuestTransaction,
  BookingControl,
  RoomMaintenance,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import {
  UserTypesEnum,
  ReservationStatusEnum,
  BalanceNameEnum,
  AvailableReservationStatusEnum,
} from "../../constants.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../../utils/cloudinary.js";
import {
  deleteLocalImage,
  prepareInternalError,
  generateConfirmationNumber,
  generateGroupNumber,
} from "../../utils/helpers.js";
import {
  CLOUD_AVATAR_FOLDER_NAME,
  CLOUD_COVERPIC_FOLDER_NAME,
  CLOUD_USER_DOC_FOLDER_NAME,
} from "../../constants.js";

import {
  checkAndAllocateRoom,
  deallocateMultipleRooms,
  deallocateRoom,
} from "./room-reservation-concurrency.js";

import notification from "../notification/notification.js";
import yieldController from "../ratemanagement/yield.controller.js";

// GET all reservations
const getAllReservations = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.body;
  const reservations = await Reservation.aggregate([
    {
      $match: {
        propertyUnitId: new ObjectId(propertyUnitId),
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
      $lookup: {
        from: "roomtypes",
        localField: "roomTypeId",
        foreignField: "_id",
        as: "roomTypeDetail",
      },
    },
    {
      $unwind: {
        path: "$roomTypeDetail",
      },
    },
    {
      $lookup: {
        from: "rooms",
        localField: "roomId",
        foreignField: "_id",
        as: "roomDetail",
      },
    },
    {
      $unwind: {
        path: "$roomDetail",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        reservationId: {
          $toString: "$_id",
        },
        groupId: {
          $toString: "$groupId",
        },
        firstName: "$userDetail.firstName",
        lastName: "$userDetail.lastName",
        roomType: "$roomTypeDetail.roomTypeName",
        roomNumber: "$roomDetail.roomNumber",
        roomName: "$roomDetail.roomName",
        reservationStatus: 1,
        arrival: 1,
        departure: 1,
        confirmationNumber: 1,
        createdAt: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    { $addFields: { Show: true } },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        reservations,
        "All reservations retrieved successfully"
      )
    );
});

// POST create a new reservation

const createReservation = asyncHandler(async (req, res) => {
  let session = null;
  let AllInsertedRoomLockIds = [];
  let transaction_retry_count = 0;
  let data = {};
  const MAX_RETRY_COUNT = 3; // Retry limit for transactions

  try {
    session = await mongoose.startSession();
    console.log("Session started:", session.id);

    await session.withTransaction(async () => {
      console.log("Transaction started");

      let {
        groupDetails,
        reservationsArray,
        paymentEntries,
        propertyUnitId,
        isWalkin,
      } = req.body;

      if (transaction_retry_count > 0) {
        console.log("in retry");
        // if retrying, deallocate old rooms
        await deallocateMultipleRooms(AllInsertedRoomLockIds);
        AllInsertedRoomLockIds = [];
      }

      transaction_retry_count++;
      if (transaction_retry_count >= MAX_RETRY_COUNT) {
        throw new Error("Transaction retry limit reached");
      }

      propertyUnitId = new ObjectId(propertyUnitId);
      let reservationsRoomTypeIds = [];
      let assigncheckindate = new Date(groupDetails.arrival);
      let assigncheckoutdate = new Date(groupDetails.departure);

      // Get unique roomTypeIds from reservationsArray
      reservationsArray.forEach((r) => {
        const roomTypeId = new ObjectId(r.roomTypeId);
        if (!reservationsRoomTypeIds.includes(roomTypeId)) {
          reservationsRoomTypeIds.push(roomTypeId);
        }
      });

      // Optimize aggregation queries using indexing and projection
      let [
        OldReservations,
        TotalRooms,
        RoomMaintainanceDetails,
        BookingControlDetails,
      ] = await Promise.all([
        Reservation.aggregate([
          {
            $match: {
              $and: [
                { departure: { $gt: assigncheckindate } },
                { arrival: { $lt: assigncheckoutdate } },
                { propertyUnitId },
                { roomTypeId: { $in: reservationsRoomTypeIds } },
                {
                  $or: [
                    { reservationStatus: ReservationStatusEnum.INHOUSE },
                    { reservationStatus: ReservationStatusEnum.RESERVED },
                  ],
                },
              ],
            },
          },
          { $project: { roomId: 1, tentative: 1, roomTypeId: 1 } },
        ]),
        RoomType.aggregate([
          {
            $match: { propertyUnitId, _id: { $in: reservationsRoomTypeIds } },
          },
          {
            $lookup: {
              from: "rooms",
              localField: "_id",
              foreignField: "roomTypeId",
              as: "TotalRoomDetails",
            },
          },
          { $unwind: "$TotalRoomDetails" },
          {
            $group: {
              _id: "$_id",
              rooms: { $push: "$TotalRoomDetails" },
              roomId: { $push: { $toString: "$TotalRoomDetails._id" } },
            },
          },
        ]),
        RoomMaintenance.aggregate([
          {
            $match: {
              $and: [
                { endDate: { $gt: assigncheckindate } },
                { startDate: { $lt: assigncheckoutdate } },
                { isCompleted: { $ne: true } },
                { propertyUnitId },
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
          { $unwind: "$RoomMaintainanceDetails" },
          {
            $group: {
              _id: null,
              MaintainanceRoomId: {
                $push: { $toString: "$RoomMaintainanceDetails._id" },
              },
            },
          },
        ]),
        BookingControl.find({
          propertyUnitId,
          date: { $gte: assigncheckindate, $lte: assigncheckoutdate },
        }).lean(),
      ]);

      RoomMaintainanceDetails = RoomMaintainanceDetails[0];

      // Filter rooms with BookingControl and Maintenance details
      BookingControlDetails.forEach((b) => {
        if (b.soldOut) {
          TotalRooms.forEach((r) => {
            r.rooms = r.rooms.filter(
              (room) => room._id.toString() !== b.roomId.toString()
            );
            r.roomId = r.roomId.filter((id) => id !== b.roomId);
          });
        }
      });

      TotalRooms.forEach((r) => {
        r.TotalRoom = r.rooms.length;
      });

      // Adjust availability based on old reservations and maintenance
      for (let i = 0; i < TotalRooms.length; i++) {
        OldReservations.forEach((r) => {
          if (r.tentative && r.roomTypeId.equals(TotalRooms[i]._id)) {
            TotalRooms[i].TotalRoom -= 1;
          } else {
            const index = TotalRooms[i].roomId.indexOf(String(r.roomId));
            if (index > -1 && !r.tentative) {
              TotalRooms[i].rooms.splice(index, 1);
              TotalRooms[i].roomId.splice(index, 1);
              TotalRooms[i].TotalRoom -= 1;
            }
          }
        });

        if (RoomMaintainanceDetails?.MaintainanceRoomId.length > 0) {
          RoomMaintainanceDetails.MaintainanceRoomId.forEach((id) => {
            const index = TotalRooms[i].roomId.indexOf(id);
            if (index > -1) {
              TotalRooms[i].rooms.splice(index, 1);
              TotalRooms[i].roomId.splice(index, 1);
              TotalRooms[i].TotalRoom -= 1;
            }
          });
        }
      }

      // Room reservation and lock handling
      for (let reservation of reservationsArray) {
        for (let r of TotalRooms) {
          if (String(r._id) === reservation.roomTypeId) {
            if (r.TotalRoom <= 0)
              throw prepareInternalError("Rooms not available");
            if (reservation.roomId == "assign") {
              delete reservation.roomId;
              reservation.tentative = true;
              r.TotalRoom -= 1;
              continue;
            }
            if (reservation.roomId && !r.roomId.includes(reservation.roomId)) {
              throw prepareInternalError("Selected room is not available");
            }
            if (reservation.roomId && r.roomId.includes(reservation.roomId)) {
              const AllocatedRoomLockResponse = await checkAndAllocateRoom(
                propertyUnitId,
                reservation.roomId,
                assigncheckindate,
                assigncheckoutdate
              );
              if (!AllocatedRoomLockResponse.isRoomAvailable) {
                throw prepareInternalError(
                  "The selected room is not available!"
                );
              }
              reservation.roomLockId = AllocatedRoomLockResponse.roomLockId;
              AllInsertedRoomLockIds.push(reservation.roomLockId);
              r.TotalRoom -= 1;
            }
          }
        }
      }

      // Prepare group, reservation, and payment entries
      const groupData = new GroupReservation({
        ...groupDetails,
        propertyUnitId,
      });
      let customerDetails = new User({
        ...groupDetails,
        userType: UserTypesEnum.GUEST,
      });
      let customerAddress = new Address(groupDetails);
      customerDetails.addressId = customerAddress._id;
      groupData.customerId = customerDetails._id;

      let ReservationEntries = [];
      let ReservationDetailEntries = [];
      let RoomBalanceEntries = [];
      let UserEntries = [customerDetails];
      let AddressEntries = [customerAddress];
      let TransactionCodeEntries = [];
      let GuestTransactionEntries = [];

      // Handle reservation and guest processing
      for (let reservation of reservationsArray) {
        let reservationObj = new Reservation({
          ...reservation,
          propertyUnitId,
          groupId: groupData._id,
          arrival: groupData.arrival,
          departure: groupData.departure,
        });
        if (isWalkin)
          reservationObj.reservationStatus = ReservationStatusEnum.INHOUSE;

        let reservationDetailObj = new ReservationDetail({
          ...reservation,
          reservationId: reservationObj._id,
          adults: reservation.adultOccupant + reservation.extraAdults,
          childs: reservation.childOccupant + reservation.extraChilds,
        });

        // Handle guests and guest transactions
        for (let [index, guest] of reservation.guests.entries()) {
          let guestObj, guestAddress;
          if (index === 0) {
            if (guest.isSameAsCustomer) {
              reservationObj.userId = customerDetails._id;
            } else {
              guestObj = new User({ ...guest, userType: UserTypesEnum.GUEST });
              guestAddress = new Address(guest);
              guestObj.addressId = guestAddress._id;
              reservationObj.userId = guestObj._id;
              UserEntries.push(guestObj);
              AddressEntries.push(guestAddress);
            }
          } else {
            if (guest.isSameAsCustomer) {
              reservationObj.secondaryUserIds.push(customerDetails._id);
            } else {
              guestObj = new User({ ...guest, userType: UserTypesEnum.GUEST });
              guestAddress = new Address(guest);
              guestObj.addressId = guestAddress._id;
              reservationObj.secondaryUserIds.push(guestObj._id);
              UserEntries.push(guestObj);
              AddressEntries.push(guestAddress);
            }
          }
        }
        reservationObj.confirmationNumber = await generateConfirmationNumber(
          propertyUnitId
        );
        ReservationEntries.push(reservationObj);
        ReservationDetailEntries.push(reservationDetailObj);

        // Handle date rates
        reservation.dateRate.forEach((rate) => {
          let rb = new RoomBalance({
            balanceDate: rate.date,
            reservationId: reservationObj._id,
            balance: -(
              rate.baseRate +
              reservation.extraAdults * rate.adultRate +
              reservation.extraChilds * rate.childRate
            ),
            roomId: reservationObj.roomId,
          });
          RoomBalanceEntries.push(rb);
          let t = -roundNumber(
            ((rate.baseRate +
              reservation.extraAdults * rate.adultRate +
              reservation.extraChilds * rate.childRate) *
              reservation.taxPercentage) /
              100
          );
          let rbtax = new RoomBalance({
            balanceDate: rate.date,
            reservationId: reservationObj._id,
            balanceName: BalanceNameEnum.TAX,
            balance: t,
            roomId: reservationObj.roomId,
          });
          RoomBalanceEntries.push(rbtax);
        });
      }

      // Handle billing account, transaction code, and guest transaction entries
      const billing_account = new BillingAccount({
        billingAccountName: `${groupDetails.firstName} ${groupDetails.lastName}`,
        propertyUnitId,
        userId: customerDetails._id,
        groupId: groupData._id,
      });
      if (paymentEntries) {
        paymentEntries.forEach((payment) => {
          if (payment.paymentType != "cloud") {
            let transactionCode = new TransactionCode({
              transactionCode: String(new ObjectId()),
              transactionType: "Reservation",
              paymentType: payment.paymentType,
              transactionRate: payment.amount,
              transactionDetail: payment.remark,
              receipt: Math.floor(100000 + Math.random() * 900000),
              date: Date.now(),
            });

            let guestTransaction = new GuestTransaction({
              transactionCodeId: transactionCode._id,
              isDeposit: payment.deposit,
              transactionDate: Date.now(),
              userId: customerDetails._id,
              groupId: groupData._id,
              billingAccountId: billing_account._id,
            });

            TransactionCodeEntries.push(transactionCode);
            GuestTransactionEntries.push(guestTransaction);
            if (payment.deposit) {
              groupData.totalDeposit += payment.amount;
            } else {
              groupData.totalBalance += payment.amount;
              groupData.totalPayment += payment.amount;
            }
          }
        });
      }

      groupData.groupNumber = await generateGroupNumber(propertyUnitId);

      // // for live
      // try {
      //   console.log("Saving All data...");
      //   await Promise.all([
      //     groupData.save({ session }),
      //     Reservation.insertMany(ReservationEntries, { session }),
      //     ReservationDetail.insertMany(ReservationDetailEntries, { session }),
      //     RoomBalance.insertMany(RoomBalanceEntries, { session }),
      //     BillingAccount.insertMany([billing_account], { session }),
      //     User.insertMany(UserEntries, { session }),
      //     Address.insertMany(AddressEntries, { session }),
      //     TransactionCode.insertMany(TransactionCodeEntries, { session }),
      //     GuestTransaction.insertMany(GuestTransactionEntries, { session }),
      //   ]);
      // } catch (error) {
      //   console.error("Error saving All data :", error);
      //   throw error;
      // }

      //for debugging
      try {
        console.log("Saving group data...");
        await groupData.save({ session });
      } catch (error) {
        console.error("Error saving group data:", error);
        throw error;
      }

      try {
        console.log("Saving reservation entries...");
        await Reservation.insertMany(ReservationEntries, { session });
      } catch (error) {
        console.error("Error saving reservation entries:", error);
        throw error;
      }

      try {
        console.log("Saving reservation detail entries...");
        await ReservationDetail.insertMany(ReservationDetailEntries, {
          session,
        });
      } catch (error) {
        console.error("Error saving reservation detail entries:", error);
        throw error;
      }

      try {
        console.log("Saving room balance entries...");
        await RoomBalance.insertMany(RoomBalanceEntries, { session });
      } catch (error) {
        console.error("Error saving room balance entries:", error);
        throw error;
      }

      try {
        console.log("Saving billing account...");
        await BillingAccount.insertMany([billing_account], { session });
      } catch (error) {
        console.error("Error saving billing account:", error);
        throw error;
      }

      try {
        console.log("Saving user entries...");
        await User.insertMany(UserEntries, { session });
      } catch (error) {
        console.error("Error saving user entries:", error);
        throw error;
      }

      try {
        console.log("Saving address entries...");
        await Address.insertMany(AddressEntries, { session });
      } catch (error) {
        console.error("Error saving address entries:", error);
        throw error;
      }

      try {
        console.log("Saving transaction code entries...");
        await TransactionCode.insertMany(TransactionCodeEntries, { session });
      } catch (error) {
        console.error("Error saving transaction code entries:", error);
        throw error;
      }

      try {
        console.log("Saving guest transaction entries...");
        await GuestTransaction.insertMany(GuestTransactionEntries, { session });
      } catch (error) {
        console.error("Error saving guest transaction entries:", error);
        throw error;
      }

      notification.sendNotification(
        propertyUnitId,
        [{ ...groupDetails, ...groupData._doc, reservationsArray }],
        "Reservation Created",
        "RESERVATION",
        req.user
      );
      data = groupData;
    });
    console.log("Transaction committed successfully");
    return res
      .status(201)
      .json(new ApiResponse(201, data, "Reservation created successfully"));
  } catch (error) {
    const DeallocatedRoomLocks = await deallocateMultipleRooms(
      AllInsertedRoomLockIds
    );
    console.log("Error in transaction:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "An error occurred while creating the reservation"
        )
      );
  } finally {
    if (session) {
      console.log("Ending session");
      session.endSession();
    }
  }
});

const stayUpdate = asyncHandler(async (req, res) => {
  let session = null;
  let AllInsertedRoomLockIds = [];
  let transaction_retry_count = 0;
  let data = {};
  try {
    session = await mongoose.startSession();
    console.log("Session started:", session.id);

    await session.withTransaction(async () => {
      let {
        assigncheckindate,
        assigncheckoutdate,
        reservationId,
        groupId,
        propertyUnitId,
      } = req.body;
      assigncheckindate = new Date(assigncheckindate);
      assigncheckoutdate = new Date(assigncheckoutdate);
      reservationId = new ObjectId(reservationId);
      groupId = new ObjectId(groupId);
      propertyUnitId = new ObjectId(propertyUnitId);
      let [groupDetails, OldReservationDetails, roomBalanceDetails] =
        await Promise.all([
          GroupReservation.findById(groupId),
          Reservation.aggregate([
            {
              $match: {
                _id: reservationId,
              },
            },
            {
              $lookup: {
                from: "reservationdetails",
                localField: "_id",
                foreignField: "reservationId",
                as: "reservationDetails",
              },
            },
            {
              $unwind: {
                path: "$reservationDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "roomtypes",
                localField: "roomTypeId",
                foreignField: "_id",
                as: "roomTypeDetails",
              },
            },
            {
              $unwind: {
                path: "$roomTypeDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "rateplansetups",
                localField: "rateplanId",
                foreignField: "_id",
                as: "rateDetails",
              },
            },
            {
              $unwind: {
                path: "$rateDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]),
          RoomBalance.find({ reservationId }),
        ]);
      OldReservationDetails = OldReservationDetails[0];

      if (OldReservationDetails.roomId) {
        console.log("for Assigned Room");
        let [
          OldReservations,
          TotalRooms,
          RoomMaintainanceDetails,
          BookingControlDetails,
        ] = await Promise.all([
          Reservation.aggregate([
            {
              $match: {
                $and: [
                  { departure: { $gt: assigncheckindate } },
                  { arrival: { $lt: assigncheckoutdate } },
                  { propertyUnitId },
                  { roomTypeId: OldReservationDetails.roomTypeId },
                  {
                    $or: [
                      { reservationStatus: ReservationStatusEnum.INHOUSE },
                      { reservationStatus: ReservationStatusEnum.RESERVED },
                    ],
                  },
                  { _id: { $ne: reservationId } },
                ],
              },
            },
            { $project: { roomId: 1, tentative: 1, roomTypeId: 1 } },
          ]),
          RoomType.aggregate([
            {
              $match: {
                propertyUnitId,
                _id: OldReservationDetails.roomTypeId,
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
            { $unwind: "$TotalRoomDetails" },
            {
              $group: {
                _id: "$_id",
                rooms: { $push: "$TotalRoomDetails" },
                roomId: { $push: { $toString: "$TotalRoomDetails._id" } },
              },
            },
          ]),
          RoomMaintenance.aggregate([
            {
              $match: {
                $and: [
                  { endDate: { $gt: assigncheckindate } },
                  { startDate: { $lt: assigncheckoutdate } },
                  { isCompleted: { $ne: true } },
                  { propertyUnitId },
                  { roomId: OldReservationDetails.roomId },
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
            { $unwind: "$RoomMaintainanceDetails" },
            {
              $group: {
                _id: null,
                MaintainanceRoomId: {
                  $push: { $toString: "$RoomMaintainanceDetails._id" },
                },
              },
            },
          ]),
          BookingControl.find({
            propertyUnitId,
            date: { $gte: assigncheckindate, $lt: assigncheckoutdate },
            roomId: OldReservationDetails.roomId,
          }).lean(),
        ]);

        RoomMaintainanceDetails = RoomMaintainanceDetails[0];
        if (
          BookingControlDetails.length > 0 ||
          RoomMaintainanceDetails?.MaintainanceRoomId.length > 0
        ) {
          throw prepareInternalError("Selected room is not available");
        }
        TotalRooms.forEach((r) => {
          r.TotalRoom = r.rooms.length;
        });

        for (let i = 0; i < TotalRooms.length; i++) {
          if (OldReservations.length > 0) {
            OldReservations.forEach((r) => {
              if (!r.tentative && r.roomId == OldReservationDetails.roomId) {
                throw prepareInternalError(
                  "Room is Overlap with another reservation !"
                );
              } else if (
                r.tentative &&
                r.roomTypeId.equals(TotalRooms[i]._id)
              ) {
                TotalRooms[i].TotalRoom -= 1;
              } else {
                const index = TotalRooms[i].roomId.indexOf(String(r.roomId));
                if (index > -1 && !r.tentative) {
                  TotalRooms[i].rooms.splice(index, 1);
                  TotalRooms[i].roomId.splice(index, 1);
                  TotalRooms[i].TotalRoom -= 1;
                }
              }
            });
          }
        }
        if (TotalRooms[0].TotalRoom <= 0) {
          throw prepareInternalError("Room is not available !");
        }
        const DeallocatedRoomLock = await deallocateRoom(
          OldReservationDetails.roomLockId
        );
        if (!DeallocatedRoomLock) {
          throw prepareInternalError("error while deallocated room !");
        }
        const AllocatedRoomLockResponse = await checkAndAllocateRoom(
          propertyUnitId,
          OldReservationDetails.roomId,
          assigncheckindate,
          assigncheckoutdate
        );
        if (!AllocatedRoomLockResponse.isRoomAvailable) {
          throw prepareInternalError("The selected room is not available!");
        }
        OldReservationDetails.roomLockId = AllocatedRoomLockResponse.roomLockId;
        AllInsertedRoomLockIds.push(OldReservationDetails.roomLockId);

        let newRoomCost = 0;
        let newRoomPrice = 0;
        let newRoomTax = 0;
        let NewRoomBalanceEntries = [];

        let DeleteRoomBalanceEntries = [];
        for (let r of roomBalanceDetails) {
          if (
            r.balanceDate < assigncheckindate ||
            r.balanceDate >= assigncheckoutdate
          ) {
            DeleteRoomBalanceEntries.push(r._id);
          } else {
            if (r.balanceName == "Tax") {
              newRoomTax += r.balance;
            } else {
              newRoomPrice += r.balance;
            }
            newRoomCost += r.balance;
          }
        }
        let newRates = await readRateFunc(
          propertyUnitId,
          OldReservationDetails.roomTypeId,
          OldReservationDetails.rateplanId,
          assigncheckindate,
          assigncheckoutdate
        );
        newRates = newRates[0];
        newRates.dateRate.forEach((rate) => {
          if (
            new Date(rate.date) < OldReservationDetails.arrival ||
            new Date(rate.date) >= OldReservationDetails.departure
          ) {
            let rb = new RoomBalance({
              balanceDate: rate.date,
              reservationId: OldReservationDetails._id,
              balance: -rate.baseRate,
              roomId: OldReservationDetails.roomId,
            });
            newRoomCost += rb.balance;
            newRoomPrice += rb.balance;
            NewRoomBalanceEntries.push(rb);

            let rbtax = new RoomBalance({
              balanceDate: rate.date,
              reservationId: OldReservationDetails._id,
              balanceName: BalanceNameEnum.TAX,
              balance: roundNumber(
                (-rate.baseRate * Number(OldReservationDetails.taxPercentage)) /
                  100
              ),
              roomId: OldReservationDetails.roomId,
            });
            newRoomCost += rbtax.balance;
            newRoomTax += rbtax.balance;
            NewRoomBalanceEntries.push(rbtax);
          }
        });
        newRoomCost = -newRoomCost;
        newRoomPrice = -newRoomPrice;
        newRoomTax = -newRoomTax;

        let gb =
          groupDetails.totalBalance -
          (newRoomCost - OldReservationDetails.reservationDetails.roomCost);
        let gt =
          groupDetails.totalCost +
          newRoomCost -
          OldReservationDetails.reservationDetails.roomCost;
        let gp = roundNumber(
          groupDetails.totalPrice +
            newRoomPrice -
            OldReservationDetails.reservationDetails.roomCost /
              (1 + Number(OldReservationDetails.taxPercentage) / 100)
        );
        let gtax = roundNumber(
          (gp * Number(OldReservationDetails.taxPercentage)) / 100
        );

        try {
          console.log("Saving  entries...");
          await Promise.all([
            GroupReservation.updateOne(
              {
                _id: groupDetails._id,
              },
              {
                $set: {
                  totalCost: gt,
                  totalPrice: gp,
                  totalTax: gtax,
                  totalBalance: gb,
                },
              },
              session
            ),
            Reservation.updateOne(
              { _id: OldReservationDetails._id },
              {
                $set: {
                  arrival: assigncheckindate,
                  departure: assigncheckoutdate,
                  roomLockId: OldReservationDetails.roomLockId,
                },
              },
              session
            ),
            ReservationDetail.updateOne(
              { reservationId: OldReservationDetails._id },
              {
                $set: {
                  roomCost: newRoomCost,
                  roomPrice: newRoomPrice,
                },
              },
              session
            ),
            RoomBalance.insertMany(NewRoomBalanceEntries, { session }),
            RoomBalance.deleteMany(
              { _id: { $in: DeleteRoomBalanceEntries } },
              { session }
            ),
          ]);
        } catch (error) {
          console.error("Error saving entries:", error);
          throw error;
        }
      } else if (OldReservationDetails.tentative) {
        console.log("for not assign room !");
        let [
          OldReservations,
          TotalRooms,
          RoomMaintainanceDetails,
          BookingControlDetails,
        ] = await Promise.all([
          Reservation.aggregate([
            {
              $match: {
                $and: [
                  { departure: { $gt: assigncheckindate } },
                  { arrival: { $lt: assigncheckoutdate } },
                  { propertyUnitId },
                  { roomTypeId: OldReservationDetails.roomTypeId },
                  {
                    $or: [
                      { reservationStatus: ReservationStatusEnum.INHOUSE },
                      { reservationStatus: ReservationStatusEnum.RESERVED },
                    ],
                  },
                  { _id: { $ne: reservationId } },
                ],
              },
            },
            { $project: { roomId: 1, tentative: 1, roomTypeId: 1 } },
          ]),
          RoomType.aggregate([
            {
              $match: {
                propertyUnitId,
                _id: OldReservationDetails.roomTypeId,
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
            { $unwind: "$TotalRoomDetails" },
            {
              $group: {
                _id: "$_id",
                rooms: { $push: "$TotalRoomDetails" },
                roomId: { $push: { $toString: "$TotalRoomDetails._id" } },
              },
            },
          ]),
          RoomMaintenance.aggregate([
            {
              $match: {
                $and: [
                  { endDate: { $gt: assigncheckindate } },
                  { startDate: { $lt: assigncheckoutdate } },
                  { isCompleted: { $ne: true } },
                  { propertyUnitId },
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
            { $unwind: "$RoomMaintainanceDetails" },
            {
              $group: {
                _id: null,
                MaintainanceRoomId: {
                  $push: { $toString: "$RoomMaintainanceDetails._id" },
                },
              },
            },
          ]),
          BookingControl.find({
            propertyUnitId,
            date: { $gte: assigncheckindate, $lt: assigncheckoutdate },
          }).lean(),
        ]);
        RoomMaintainanceDetails = RoomMaintainanceDetails[0];
        BookingControlDetails.forEach((b) => {
          if (
            b.soldOut &&
            b.date >= assigncheckindate &&
            b.date < assigncheckoutdate
          ) {
            TotalRooms.forEach((r) => {
              r.rooms = r.rooms.filter(
                (room) => room._id.toString() !== b.roomId.toString()
              );
              r.roomId = r.roomId.filter((id) => id !== b.roomId);
            });
          }
        });

        TotalRooms.forEach((r) => {
          r.TotalRoom = r.rooms.length;
        });

        // Adjust room availability based on old reservations and maintenance
        for (let i = 0; i < TotalRooms.length; i++) {
          if (OldReservations.length > 0) {
            OldReservations.forEach((r) => {
              if (r.tentative && r.roomTypeId.equals(TotalRooms[i]._id)) {
                TotalRooms[i].TotalRoom -= 1;
              } else {
                const index = TotalRooms[i].roomId.indexOf(String(r.roomId));
                if (index > -1 && !r.tentative) {
                  TotalRooms[i].rooms.splice(index, 1);
                  TotalRooms[i].roomId.splice(index, 1);
                  TotalRooms[i].TotalRoom -= 1;
                }
              }
            });
          }

          if (RoomMaintainanceDetails?.MaintainanceRoomId.length > 0) {
            RoomMaintainanceDetails.MaintainanceRoomId.forEach((id) => {
              const index = TotalRooms[i].roomId.indexOf(id);
              if (index > -1) {
                TotalRooms[i].rooms.splice(index, 1);
                TotalRooms[i].roomId.splice(index, 1);
                TotalRooms[i].TotalRoom -= 1;
              }
            });
          }
        }
        if (TotalRooms[0].TotalRoom <= 0) {
          throw prepareInternalError("Room is not available !");
        }
        let newRoomCost = 0;
        let newRoomPrice = 0;
        let newRoomTax = 0;
        let NewRoomBalanceEntries = [];

        let DeleteRoomBalanceEntries = [];
        for (let r of roomBalanceDetails) {
          if (
            r.balanceDate < assigncheckindate ||
            r.balanceDate >= assigncheckoutdate
          ) {
            DeleteRoomBalanceEntries.push(r._id);
          } else {
            if (r.balanceName == "Tax") {
              newRoomTax += r.balance;
            } else {
              newRoomPrice += r.balance;
            }
            newRoomCost += r.balance;
          }
        }
        let newRates = await readRateFunc(
          propertyUnitId,
          OldReservationDetails.roomTypeId,
          OldReservationDetails.rateplanId,
          assigncheckindate,
          assigncheckoutdate
        );
        newRates = newRates[0];
        newRates.dateRate.forEach((rate) => {
          if (
            new Date(rate.date) < OldReservationDetails.arrival ||
            new Date(rate.date) >= OldReservationDetails.departure
          ) {
            let rb = new RoomBalance({
              balanceDate: rate.date,
              reservationId: OldReservationDetails._id,
              balance: -rate.baseRate,
              roomId: OldReservationDetails.roomId,
            });
            newRoomCost += rb.balance;
            newRoomPrice += rb.balance;
            NewRoomBalanceEntries.push(rb);

            let rbtax = new RoomBalance({
              balanceDate: rate.date,
              reservationId: OldReservationDetails._id,
              balanceName: BalanceNameEnum.TAX,
              balance: roundNumber(
                (-rate.baseRate * Number(OldReservationDetails.taxPercentage)) /
                  100
              ),
              roomId: OldReservationDetails.roomId,
            });
            newRoomCost += rbtax.balance;
            newRoomTax += rbtax.balance;
            NewRoomBalanceEntries.push(rbtax);
          }
        });
        newRoomCost = -newRoomCost;
        newRoomPrice = -newRoomPrice;
        newRoomTax = -newRoomTax;

        let gb = roundNumber(
          groupDetails.totalBalance -
            (newRoomCost - OldReservationDetails.reservationDetails.roomCost)
        );
        let gt = roundNumber(
          groupDetails.totalCost +
            newRoomCost -
            OldReservationDetails.reservationDetails.roomCost
        );
        let gp = roundNumber(
          groupDetails.totalPrice +
            newRoomPrice -
            OldReservationDetails.reservationDetails.roomCost /
              (1 + Number(OldReservationDetails.taxPercentage) / 100)
        );
        let gtax = roundNumber(
          (gp * Number(OldReservationDetails.taxPercentage)) / 100
        );

        try {
          console.log("Saving  entries...");
          await Promise.all([
            GroupReservation.updateOne(
              {
                _id: groupDetails._id,
              },
              {
                $set: {
                  totalCost: gt,
                  totalPrice: gp,
                  totalTax: gtax,
                  totalBalance: gb,
                },
              },
              session
            ),
            Reservation.updateOne(
              { _id: OldReservationDetails._id },
              {
                $set: {
                  arrival: assigncheckindate,
                  departure: assigncheckoutdate,
                },
              },
              session
            ),
            ReservationDetail.updateOne(
              { reservationId: OldReservationDetails._id },
              {
                $set: {
                  roomCost: newRoomCost,
                  roomPrice: newRoomPrice,
                },
              },
              session
            ),
            RoomBalance.insertMany(NewRoomBalanceEntries, { session }),
            RoomBalance.deleteMany(
              { _id: { $in: DeleteRoomBalanceEntries } },
              { session }
            ),
          ]);
        } catch (error) {
          console.error("Error saving entries:", error);
          throw error;
        }
      }
    });
    console.log("Transaction committed successfully");
    return res
      .status(201)
      .json(new ApiResponse(201, data, "Reservation Updated successfully"));
  } catch (error) {
    const DeallocatedRoomLocks = await deallocateMultipleRooms(
      AllInsertedRoomLockIds
    );
    console.log("Error in transaction:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "An error occurred while updating the reservation"
        )
      );
  } finally {
    if (session) {
      console.log("Ending session");
      session.endSession();
    }
  }
});

const readReservationRate = asyncHandler(async (req, res) => {
  let { propertyUnitId } = req.params;
  let { arrival, departure } = req.body;
  let nextDate = new Date(arrival);

  arrival = new Date(arrival);
  departure = new Date(departure);
  propertyUnitId = new ObjectId(propertyUnitId);

  // Fetch data in parallel
  const [
    ratesData,
    oldReservations,
    roomMaintenanceDetails,
    bookingControlDetails,
    yieldData,
  ] = await Promise.all([
    RoomType.aggregate([
      { $match: { propertyUnitId } },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "roomTypeId",
          as: "rooms",
        },
      },
      {
        $lookup: {
          from: "taxes",
          localField: "propertyUnitId",
          foreignField: "propertyUnitId",
          as: "taxes",
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
              $addFields: { ratePlanName: "$rateSetup.ratePlanName" },
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
          roomTypeId: "$_id",
          rooms: {
            $map: {
              input: "$rooms",
              as: "room",
              in: {
                id: "$$room._id",
                roomStatus: "$$room.roomStatus",
                roomCondition: "$$room.roomCondition",
                roomNumber: "$$room.roomNumber",
                roomName: "$$room.roomName",
              },
            },
          },
          roomId: {
            $map: {
              input: "$rooms",
              as: "room",
              in: { $toString: "$$room._id" },
            },
          },
          roomAmenities: [], // Assuming roomAmenities is an empty array for now
          rateplanId: "$rateRoomTypes.ratePlanSetupId",
          rateName: "$rateRoomTypes.ratePlanName",
          adultOccupant: "$adultOccupancy",
          childOccupant: "$childOccupancy",
          images: "$images",
          rates: "$rateRoomTypes.roomTypeRates",
          dateRates: "$rateRoomTypes.dateRates",
          roomtype: "$roomTypeName",
          totalRoom: { $size: "$rooms" },
          roomPrice: { $literal: 0 },
          roomCost: { $literal: 0 },
          taxPercentage: { $sum: "$taxes.taxPercentage" },
        },
      },
    ]),
    Reservation.aggregate([
      {
        $match: {
          propertyUnitId,
          departure: { $gt: arrival },
          arrival: { $lt: departure },
          reservationStatus: {
            $in: [
              ReservationStatusEnum.INHOUSE,
              ReservationStatusEnum.RESERVED,
            ],
          },
        },
      },
      { $project: { roomId: 1, tentative: 1, roomTypeId: 1 } },
    ]),
    RoomMaintenance.aggregate([
      {
        $match: {
          propertyUnitId,
          endDate: { $gt: arrival },
          startDate: { $lt: departure },
          isCompleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          MaintainanceRoomId: { $push: { $toString: "$roomId" } },
        },
      },
    ]),
    BookingControl.find({
      propertyUnitId,
      date: { $gte: arrival, $lte: departure },
    }).lean(),
    yieldController.getDateWiseYield(arrival, departure, "", propertyUnitId),
  ]);

  const maintenanceRooms = roomMaintenanceDetails[0]?.MaintainanceRoomId || [];

  // Adjust room availability based on booking control, reservations, and maintenance
  bookingControlDetails.forEach((b) => {
    if (b.soldOut && b.date >= arrival && b.date < departure) {
      ratesData.forEach((r) => {
        r.rooms = r.rooms.filter(
          (room) => room.id.toString() !== b.roomId.toString()
        );
        r.roomId = r.roomId.filter((id) => id !== b.roomId);
      });
    }
  });

  ratesData.forEach((rate) => {
    oldReservations.forEach((res) => {
      if (res.tentative && res.roomTypeId.equals(rate.roomTypeId)) {
        rate.totalRoom -= 1;
      } else {
        const index = rate.roomId.indexOf(String(res.roomId));
        if (index > -1 && !res.tentative) {
          rate.rooms.splice(index, 1);
          rate.roomId.splice(index, 1);
          rate.totalRoom -= 1;
        }
      }
    });

    maintenanceRooms.forEach((id) => {
      const index = rate.roomId.indexOf(id);
      if (index > -1) {
        rate.rooms.splice(index, 1);
        rate.roomId.splice(index, 1);
        rate.totalRoom -= 1;
      }
    });
  });

  // Prepare rateType and dateRate for each room type
  ratesData.forEach((roomtype) => {
    roomtype.rateType = Object.fromEntries(
      roomtype.rates.map((rate) => [rate.rateType, rate.baseRate])
    );
    roomtype.dateRate = [];
    delete roomtype.rates;
  });

  while (nextDate < departure) {
    for (let roomtype of ratesData) {
      let obj = { ...roomtype.rateType, date: nextDate.toISOString() };
      const dateRate = roomtype.dateRates.find(
        (r) => r.date.toISOString() === nextDate.toISOString()
      );
      if (dateRate) obj.baseRate = dateRate.baseRate;

      const yieldForRoomType = yieldData.find(
        (y) => y.roomTypeId.toString() === roomtype.roomTypeId.toString()
      );
      const yieldDetails = yieldForRoomType?.dateArray.find(
        (e) =>
          e.ratePlanSetupId.toString() === roomtype.rateplanId.toString() &&
          e.date.toISOString() === obj.date
      );
      if (yieldDetails) {
        obj.baseRate = await yieldController.applyYield(
          obj.baseRate,
          yieldDetails.yieldChangeType,
          yieldDetails.yieldChangeValue
        );
      }

      roomtype.dateRate.push(obj);
    }
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        ratesData,
        "Reservation Rate retrieved successfully!"
      )
    );
});

const readRateFunc = async (
  propertyUnitId,
  roomTypeId,
  rateplanId,
  arrival,
  departure
) => {
  try {
    // Ensure the dates are valid
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);

    let nextDate = new Date(arrival);
    let matchquerry = { propertyUnitId };

    if (roomTypeId) {
      matchquerry._id = roomTypeId;
    }

    let [ratesData, yieldData] = await Promise.all([
      RoomType.aggregate([
        { $match: matchquerry },
        {
          $lookup: {
            from: "rooms",
            localField: "_id",
            foreignField: "roomTypeId",
            as: "rooms",
          },
        },
        {
          $lookup: {
            from: "taxes",
            localField: "propertyUnitId",
            foreignField: "propertyUnitId",
            as: "taxes",
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
                $match: {
                  ratePlanSetupId: rateplanId,
                },
              },
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
                $addFields: { ratePlanName: "$rateSetup.ratePlanName" },
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
            roomTypeId: "$_id",
            rooms: {
              $map: {
                input: "$rooms",
                as: "room",
                in: {
                  id: "$$room._id",
                  roomStatus: "$$room.roomStatus",
                  roomCondition: "$$room.roomCondition",
                  roomNumber: "$$room.roomNumber",
                  roomName: "$$room.roomName",
                },
              },
            },
            roomId: {
              $map: {
                input: "$rooms",
                as: "room",
                in: { $toString: "$$room._id" },
              },
            },
            roomAmenities: [], // Assuming roomAmenities is an empty array for now
            rateplanId: "$rateRoomTypes.ratePlanSetupId",
            rateName: "$rateRoomTypes.ratePlanName",
            adultOccupant: "$adultOccupancy",
            childOccupant: "$childOccupancy",
            images: "$images",
            rates: "$rateRoomTypes.roomTypeRates",
            dateRates: "$rateRoomTypes.dateRates",
            roomtype: "$roomTypeName",
            totalRoom: { $size: "$rooms" },
            roomPrice: { $literal: 0 },
            roomCost: { $literal: 0 },
            taxPercentage: { $sum: "$taxes.taxPercentage" },
          },
        },
      ]),
      yieldController.getDateWiseYield(
        arrival,
        departure,
        rateplanId,
        propertyUnitId
      ),
    ]);
    if (roomTypeId) {
      yieldData = yieldData.filter((y) => {
        return y.roomTypeId === roomTypeId.toString();
      });
    }
    ratesData.forEach((roomtype) => {
      roomtype.rateType = Object.fromEntries(
        roomtype.rates.map((rate) => [rate.rateType, rate.baseRate])
      );
      roomtype.dateRate = [];
      delete roomtype.rates;
    });

    while (nextDate < departureDate) {
      for (let roomtype of ratesData) {
        let obj = { ...roomtype.rateType, date: nextDate.toISOString() };
        const dateRate = roomtype.dateRates.find(
          (r) => r.date.toISOString() === nextDate.toISOString()
        );
        if (dateRate) obj.baseRate = dateRate.baseRate;

        const yieldForRoomType = yieldData.find(
          (y) => y.roomTypeId.toString() === roomtype.roomTypeId.toString()
        );
        const yieldDetails = yieldForRoomType?.dateArray.find(
          (e) =>
            e.ratePlanSetupId.toString() === roomtype.rateplanId.toString() &&
            e.date.toISOString() === obj.date
        );
        if (yieldDetails) {
          obj.baseRate = await yieldController.applyYield(
            obj.baseRate,
            yieldDetails.yieldChangeType,
            yieldDetails.yieldChangeValue
          );
        }

        roomtype.dateRate.push(obj);
      }
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return ratesData;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const guestFolio = asyncHandler(async (req, res) => {
  const { propertyUnitId } = req.params;
  const { groupId } = req.body;

  // Fetch group reservation details
  const groupReservationDetails = await GroupReservation.aggregate([
    {
      $match: {
        _id: new ObjectId(groupId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "customerDetails",
        pipeline: [
          {
            $lookup: {
              from: "addresses",
              localField: "addressId",
              foreignField: "_id",
              as: "customerAddress",
            },
          },
          {
            $unwind: {
              path: "$customerAddress",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$customerDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "reservations",
        localField: "_id",
        foreignField: "groupId",
        as: "reservations",
        pipeline: [
          {
            $lookup: {
              from: "rooms",
              localField: "roomId",
              foreignField: "_id",
              as: "roomDetails",
            },
          },
          {
            $unwind: {
              path: "$roomDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "roomtypes",
              localField: "roomTypeId",
              foreignField: "_id",
              as: "roomTypeDetails",
            },
          },
          {
            $unwind: {
              path: "$roomTypeDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "guestDetails",
              pipeline: [
                {
                  $lookup: {
                    from: "addresses",
                    localField: "addressId",
                    foreignField: "_id",
                    as: "guestAddress",
                  },
                },
                {
                  $unwind: {
                    path: "$guestAddress",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$guestDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "secondaryUserIds",
              foreignField: "_id",
              as: "secondaryGuests",
              pipeline: [
                {
                  $lookup: {
                    from: "addresses",
                    localField: "addressId",
                    foreignField: "_id",
                    as: "guestAddress",
                  },
                },
                {
                  $unwind: {
                    path: "$guestAddress",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "reservationdetails",
              localField: "_id",
              foreignField: "reservationId",
              as: "reservationDetails",
            },
          },
          {
            $unwind: {
              path: "$reservationDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "rateplansetups",
              localField: "rateplanId",
              foreignField: "_id",
              as: "rateDetails",
            },
          },
          {
            $unwind: {
              path: "$rateDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "roombalances",
              localField: "_id",
              foreignField: "reservationId",
              as: "roomBalances",
              pipeline: [{ $sort: { balanceDate: 1 } }],
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "guesttransactions",
        localField: "_id",
        foreignField: "groupId",
        as: "paymentDetails",
        pipeline: [
          {
            $lookup: {
              from: "transactioncodes",
              localField: "transactionCodeId",
              foreignField: "_id",
              as: "transactionDetails",
            },
          },
          {
            $unwind: {
              path: "$transactionDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "billingcards",
              localField: "billingCardId",
              foreignField: "_id",
              as: "billingCardDetails",
            },
          },
          {
            $unwind: {
              path: "$billingCardDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
  ]);

  // Check if any group reservation was found
  if (!groupReservationDetails.length) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Group reservation not found."));
  }

  // Send the response with group reservation details
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        groupReservationDetails[0],
        "Reservation retrieved successfully!"
      )
    );
});

const addRoomReservation = asyncHandler(async (req, res) => {
  let session = null;
  let AllInsertedRoomLockIds = [];
  let transaction_retry_count = 0;
  let data = {};

  try {
    session = await mongoose.startSession();
    console.log("Session started:", session.id);

    await session.withTransaction(async () => {
      console.log("Transaction started");

      let { groupData, reservation, propertyUnitId } = req.body;

      if (transaction_retry_count > 0) {
        console.log("Retrying transaction...");
        // Deallocate old rooms if retrying
        await deallocateMultipleRooms(AllInsertedRoomLockIds);
        AllInsertedRoomLockIds = [];
      }

      transaction_retry_count++;
      propertyUnitId = new ObjectId(propertyUnitId);
      reservation.roomTypeId = new ObjectId(reservation.roomTypeId);
      let assigncheckindate = new Date(groupData.arrival);
      let assigncheckoutdate = new Date(groupData.departure);

      let [
        OldReservations,
        TotalRooms,
        RoomMaintainanceDetails,
        BookingControlDetails,
      ] = await Promise.all([
        Reservation.aggregate([
          {
            $match: {
              $and: [
                { departure: { $gt: assigncheckindate } },
                { arrival: { $lt: assigncheckoutdate } },
                { propertyUnitId },
                { roomTypeId: reservation.roomTypeId },
                {
                  $or: [
                    { reservationStatus: ReservationStatusEnum.INHOUSE },
                    { reservationStatus: ReservationStatusEnum.RESERVED },
                  ],
                },
              ],
            },
          },
          { $project: { roomId: 1, tentative: 1, roomTypeId: 1 } },
        ]),
        RoomType.aggregate([
          {
            $match: {
              propertyUnitId,
              _id: reservation.roomTypeId,
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
          { $unwind: "$TotalRoomDetails" },
          {
            $group: {
              _id: "$_id",
              rooms: { $push: "$TotalRoomDetails" },
              roomId: { $push: { $toString: "$TotalRoomDetails._id" } },
            },
          },
        ]),
        RoomMaintenance.aggregate([
          {
            $match: {
              $and: [
                { endDate: { $gt: assigncheckindate } },
                { startDate: { $lt: assigncheckoutdate } },
                { isCompleted: { $ne: true } },
                { propertyUnitId },
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
          { $unwind: "$RoomMaintainanceDetails" },
          {
            $group: {
              _id: null,
              MaintainanceRoomId: {
                $push: { $toString: "$RoomMaintainanceDetails._id" },
              },
            },
          },
        ]),
        BookingControl.find({
          propertyUnitId,
          date: { $gte: assigncheckindate, $lte: assigncheckoutdate },
        }).lean(),
      ]);

      RoomMaintainanceDetails = RoomMaintainanceDetails[0];

      // Update TotalRooms with booking controls and maintenance
      BookingControlDetails.forEach((b) => {
        if (
          b.soldOut &&
          b.date >= assigncheckindate &&
          b.date < assigncheckoutdate
        ) {
          TotalRooms.forEach((r) => {
            r.rooms = r.rooms.filter(
              (room) => room._id.toString() !== b.roomId.toString()
            );
            r.roomId = r.roomId.filter((id) => id !== b.roomId);
          });
        }
      });

      TotalRooms.forEach((r) => {
        r.TotalRoom = r.rooms.length;
      });

      // Adjust room availability based on old reservations and maintenance
      for (let i = 0; i < TotalRooms.length; i++) {
        if (OldReservations.length > 0) {
          OldReservations.forEach((r) => {
            if (r.tentative && r.roomTypeId.equals(TotalRooms[i]._id)) {
              TotalRooms[i].TotalRoom -= 1;
            } else {
              const index = TotalRooms[i].roomId.indexOf(String(r.roomId));
              if (index > -1 && !r.tentative) {
                TotalRooms[i].rooms.splice(index, 1);
                TotalRooms[i].roomId.splice(index, 1);
                TotalRooms[i].TotalRoom -= 1;
              }
            }
          });
        }

        if (RoomMaintainanceDetails?.MaintainanceRoomId.length > 0) {
          RoomMaintainanceDetails.MaintainanceRoomId.forEach((id) => {
            const index = TotalRooms[i].roomId.indexOf(id);
            if (index > -1) {
              TotalRooms[i].rooms.splice(index, 1);
              TotalRooms[i].roomId.splice(index, 1);
              TotalRooms[i].TotalRoom -= 1;
            }
          });
        }
      }

      // Handle room reservations and locks
      for (let r of TotalRooms) {
        if (String(r._id) === String(reservation.roomTypeId)) {
          if (r.TotalRoom <= 0)
            throw prepareInternalError("Rooms not available");
          if (reservation.roomId === "assign") {
            delete reservation.roomId;
            reservation.tentative = true;
            r.TotalRoom -= 1;
            continue;
          }
          if (reservation.roomId && !r.roomId.includes(reservation.roomId)) {
            throw prepareInternalError("Selected room is not available");
          }
          if (reservation.roomId && r.roomId.includes(reservation.roomId)) {
            const AllocatedRoomLockResponse = await checkAndAllocateRoom(
              propertyUnitId,
              reservation.roomId,
              assigncheckindate,
              assigncheckoutdate
            );
            if (!AllocatedRoomLockResponse.isRoomAvailable) {
              throw prepareInternalError("The selected room is not available!");
            }
            reservation.roomLockId = AllocatedRoomLockResponse.roomLockId;
            AllInsertedRoomLockIds.push(reservation.roomLockId);
            r.TotalRoom -= 1;
          }
        }
      }

      let RoomBalanceEntries = [];
      let reservationObj = new Reservation({
        ...reservation,
        propertyUnitId,
        groupId: groupData._id,
        arrival: groupData.arrival,
        departure: groupData.departure,
      });

      let reservationDetailObj = new ReservationDetail({
        ...reservation,
        reservationId: reservationObj._id,
        adults: reservation.adultOccupant + reservation.extraAdults,
        childs: reservation.childOccupant + reservation.extraChilds,
      });

      reservationObj.userId = new ObjectId(groupData.customerDetails._id);
      reservationObj.confirmationNumber = await generateConfirmationNumber(
        propertyUnitId
      );

      // Handle date rates
      let gt = { totalCost: 0, totalBalance: 0, totalPrice: 0, totalTax: 0 };

      reservation.dateRate.forEach((rate) => {
        let rb = new RoomBalance({
          balanceDate: rate.date,
          reservationId: reservationObj._id,
          balance: -(
            rate.baseRate +
            reservation.extraAdults * rate.adultRate +
            reservation.extraChilds * rate.childRate
          ),
          roomId: reservationObj.roomId,
        });
        gt.totalPrice += -rb.balance;
        RoomBalanceEntries.push(rb);

        let rbtax = new RoomBalance({
          balanceDate: rate.date,
          reservationId: reservationObj._id,
          balanceName: BalanceNameEnum.TAX,
          balance: roundNumber(
            (-(
              rate.baseRate +
              reservation.extraAdults * rate.adultRate +
              reservation.extraChilds * rate.childRate
            ) *
              reservation.taxPercentage) /
              100
          ),
          roomId: reservationObj.roomId,
        });
        gt.totalTax += -rbtax.balance;
        RoomBalanceEntries.push(rbtax);
      });
      gt.totalCost = gt.totalPrice + gt.totalTax;
      gt.totalBalance = -gt.totalCost;

      try {
        console.log("Saving group data...");
        await GroupReservation.updateOne(
          { _id: groupData._id },
          {
            $inc: gt,
          }
        );
      } catch (error) {
        console.error("Error saving group data:", error);
        throw error;
      }

      try {
        console.log("Saving reservation entries...");
        await reservationObj.save({ session });
      } catch (error) {
        console.error("Error saving reservation entries:", error);
        throw error;
      }

      try {
        console.log("Saving reservation detail entries...");
        await reservationDetailObj.save({ session });
      } catch (error) {
        console.error("Error saving reservation detail entries:", error);
        throw error;
      }

      try {
        console.log("Saving room balance entries...");
        await RoomBalance.insertMany(RoomBalanceEntries, { session });
      } catch (error) {
        console.error("Error saving room balance entries:", error);
        throw error;
      }

      data = groupData;
    });

    console.log("Transaction committed successfully");
    return res
      .status(201)
      .json(new ApiResponse(201, data, "Reservation created successfully"));
  } catch (error) {
    console.error("Error in transaction:", error);
    await deallocateMultipleRooms(AllInsertedRoomLockIds);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "An error occurred while creating the reservation"
        )
      );
  } finally {
    if (session) {
      console.log("Ending session");
      session.endSession();
    }
  }
});

const changeRoomReservation = asyncHandler(async (req, res) => {
  let session = null;
  let AllInsertedRoomLockIds = [];
  let transaction_retry_count = 0;
  let data = {};

  try {
    session = await mongoose.startSession();
    console.log("Session started:", session.id);

    await session.withTransaction(async () => {
      console.log("Transaction started");

      let {
        groupData,
        reservation,
        oldReservation,
        propertyUnitId,
        isSameRate,
      } = req.body;
      if (transaction_retry_count > 0) {
        console.log("In retry");
        await deallocateMultipleRooms(AllInsertedRoomLockIds);
        AllInsertedRoomLockIds = [];
      }

      transaction_retry_count++;
      propertyUnitId = new ObjectId(propertyUnitId);
      reservation.roomTypeId = new ObjectId(reservation.roomTypeId);
      oldReservation.roomLockId = new ObjectId(oldReservation.roomLockId);
      oldReservation._id = new ObjectId(oldReservation._id);
      reservation.roomId = new ObjectId(reservation.roomId);
      let assigncheckindate = new Date(groupData.arrival);
      let assigncheckoutdate = new Date(groupData.departure);

      if (oldReservation.roomLockId) {
        await deallocateRoom(oldReservation.roomLockId);
      }

      let [
        OldReservations,
        TotalRooms,
        RoomMaintainanceDetails,
        BookingControlDetails,
      ] = await Promise.all([
        Reservation.aggregate([
          {
            $match: {
              $and: [
                { departure: { $gt: assigncheckindate } },
                { arrival: { $lt: assigncheckoutdate } },
                { propertyUnitId },
                { roomTypeId: reservation.roomTypeId },
                { _id: { $ne: oldReservation._id } },
                {
                  $or: [
                    { reservationStatus: ReservationStatusEnum.INHOUSE },
                    { reservationStatus: ReservationStatusEnum.RESERVED },
                  ],
                },
              ],
            },
          },
          { $project: { roomId: 1, tentative: 1, roomTypeId: 1 } },
        ]),
        RoomType.aggregate([
          {
            $match: {
              propertyUnitId,
              _id: reservation.roomTypeId,
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
          { $unwind: "$TotalRoomDetails" },
          {
            $group: {
              _id: "$_id",
              rooms: { $push: "$TotalRoomDetails" },
              roomId: { $push: { $toString: "$TotalRoomDetails._id" } },
            },
          },
        ]),
        RoomMaintenance.aggregate([
          {
            $match: {
              $and: [
                { endDate: { $gt: assigncheckindate } },
                { startDate: { $lt: assigncheckoutdate } },
                { isCompleted: { $ne: true } },
                { propertyUnitId },
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
          { $unwind: "$RoomMaintainanceDetails" },
          {
            $group: {
              _id: null,
              MaintainanceRoomId: {
                $push: { $toString: "$RoomMaintainanceDetails._id" },
              },
            },
          },
        ]),
        BookingControl.find({
          propertyUnitId,
          date: { $gte: assigncheckindate, $lte: assigncheckoutdate },
        }).lean(),
      ]);

      RoomMaintainanceDetails = RoomMaintainanceDetails[0];

      BookingControlDetails.forEach((b) => {
        if (
          b.soldOut &&
          b.date >= assigncheckindate &&
          b.date < assigncheckoutdate
        ) {
          TotalRooms.forEach((r) => {
            r.rooms = r.rooms.filter(
              (room) => room._id.toString() !== b.roomId.toString()
            );
            r.roomId = r.roomId.filter((id) => id !== b.roomId);
          });
        }
      });

      TotalRooms.forEach((r) => {
        r.TotalRoom = r.rooms.length;
      });

      for (let i = 0; i < TotalRooms.length; i++) {
        if (OldReservations.length > 0) {
          OldReservations.forEach((r) => {
            if (r.tentative && r.roomTypeId.equals(TotalRooms[i]._id)) {
              TotalRooms[i].TotalRoom -= 1;
            } else {
              const index = TotalRooms[i].roomId.indexOf(String(r.roomId));
              if (index > -1 && !r.tentative) {
                TotalRooms[i].rooms.splice(index, 1);
                TotalRooms[i].roomId.splice(index, 1);
                TotalRooms[i].TotalRoom -= 1;
              }
            }
          });
        }

        if (RoomMaintainanceDetails?.MaintainanceRoomId.length > 0) {
          RoomMaintainanceDetails.MaintainanceRoomId.forEach((id) => {
            const index = TotalRooms[i].roomId.indexOf(id);
            if (index > -1) {
              TotalRooms[i].rooms.splice(index, 1);
              TotalRooms[i].roomId.splice(index, 1);
              TotalRooms[i].TotalRoom -= 1;
            }
          });
        }
      }

      for (let r of TotalRooms) {
        if (String(r._id) === String(reservation.roomTypeId)) {
          if (r.TotalRoom <= 0)
            throw prepareInternalError("Rooms not available");

          if (reservation.roomId == "assign") {
            delete reservation.roomId;
            reservation.tentative = true;
            r.TotalRoom -= 1;
            continue;
          }

          if (
            reservation.roomId &&
            !r.roomId.includes(String(reservation.roomId))
          ) {
            throw prepareInternalError("Selected room is not available");
          }

          if (
            reservation.roomId &&
            r.roomId.includes(String(reservation.roomId))
          ) {
            reservation.tentative = false;
            const AllocatedRoomLockResponse = await checkAndAllocateRoom(
              propertyUnitId,
              reservation.roomId,
              assigncheckindate,
              assigncheckoutdate
            );
            if (!AllocatedRoomLockResponse.isRoomAvailable) {
              throw prepareInternalError("The selected room is not available!");
            }
            reservation.roomLockId = AllocatedRoomLockResponse.roomLockId;
            AllInsertedRoomLockIds.push(reservation.roomLockId);
            r.TotalRoom -= 1;
          }
        }
      }

      if (!isSameRate) {
        let RoomBalanceEntries = [];
        let gt = {
          totalCost: -oldReservation.reservationDetails.roomCost,
          totalBalance: oldReservation.reservationDetails.roomCost,
          totalPrice: roundNumber(
            -oldReservation.reservationDetails.roomCost /
              (1 + Number(oldReservation.taxPercentage) / 100)
          ),
          totalTax: 0,
        };

        gt.totalTax = roundNumber(
          (gt.totalPrice * Number(oldReservation.taxPercentage)) / 100
        );

        reservation.dateRate.forEach((rate) => {
          let rb = new RoomBalance({
            balanceDate: rate.date,
            reservationId: oldReservation._id,
            balance: -(
              rate.baseRate +
              reservation.extraAdults * rate.adultRate +
              reservation.extraChilds * rate.childRate
            ),
            roomId: reservation.roomId,
          });
          gt.totalPrice += -rb.balance;
          RoomBalanceEntries.push(rb);

          let rbtax = new RoomBalance({
            balanceDate: rate.date,
            reservationId: oldReservation._id,
            balanceName: BalanceNameEnum.TAX,
            balance: roundNumber(
              (-(
                rate.baseRate +
                reservation.extraAdults * rate.adultRate +
                reservation.extraChilds * rate.childRate
              ) *
                reservation.taxPercentage) /
                100
            ),
            roomId: reservation.roomId,
          });
          gt.totalTax += -rbtax.balance;
          RoomBalanceEntries.push(rbtax);
        });

        gt.totalCost = gt.totalPrice + gt.totalTax;
        gt.totalBalance = -gt.totalCost;
        await RoomBalance.deleteMany(
          { reservationId: oldReservation._id },
          { session }
        );
        try {
          await Promise.all([
            GroupReservation.updateOne(
              { _id: groupData.groupId },
              {
                $inc: gt,
              }
            ),
            Reservation.updateOne({ _id: oldReservation._id }, reservation),
            ReservationDetail.updateOne(
              { reservationId: oldReservation._id },
              reservation
            ),
            RoomBalance.insertMany(RoomBalanceEntries, { session }),
          ]);
        } catch (error) {
          console.log(error);
        }
      } else {
        try {
          await Promise.all([
            Reservation.updateOne({ _id: oldReservation._id }, reservation),
          ]);
        } catch (error) {
          console.log(error);
        }
      }

      data = {};
    });
    console.log("Transaction committed successfully");
    return res
      .status(201)
      .json(new ApiResponse(201, data, "Room change successfully"));
  } catch (error) {
    const DeallocatedRoomLocks = await deallocateMultipleRooms(
      AllInsertedRoomLockIds
    );
    console.log("Error in transaction:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "An error occurred while creating the reservation"
        )
      );
  } finally {
    if (session) {
      console.log("Ending session");
      session.endSession();
    }
  }
});

const addReservationCharge = asyncHandler(async (req, res) => {
  let data = {};
  let { propertyUnitId, groupId, charges } = req.body;

  groupId = new ObjectId(groupId);
  let reservationId = new ObjectId(charges.reservationId);
  propertyUnitId = new ObjectId(propertyUnitId);

  // Create a new RoomBalance entry
  let roomBalance = new RoomBalance(charges);
  roomBalance.balance = -charges.charge; // Negative charge for balance
  roomBalance.balanceDate = Date.now();
  roomBalance.balanceName = BalanceNameEnum.ROOMSERVICES; // Set balance name

  // Use Promise.all to perform multiple asynchronous operations
  await Promise.all([
    GroupReservation.updateOne(
      { _id: groupId },
      {
        $inc: {
          totalBalance: roomBalance.balance,
          totalExtraCharge: charges.charge,
          // totalPrice: charges.charge,
        },
      }
    ),
    roomBalance.save(), // Save the room balance entry
    ReservationDetail.updateOne(
      { reservationId: reservationId },
      {
        $inc: {
          roomExtraCharge: charges.charge,
        },
      }
    ),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, data, "Payment made successfully!"));
});

const unassignRoom = asyncHandler(async (req, res) => {
  let data = {};
  let { propertyUnitId, reservation } = req.body;

  propertyUnitId = new ObjectId(propertyUnitId);
  let reservationId = new ObjectId(reservation._id);

  // Check if there's a room lock to deallocate
  if (reservation.roomLockId) {
    const DeallocatedRoomLock = await deallocateRoom(
      new ObjectId(reservation.roomLockId)
    );
    if (!DeallocatedRoomLock) {
      throw prepareInternalError("Error while deallocating room!");
    }
  }

  // Update the reservation to unassign the room
  await Reservation.updateOne(
    { _id: reservationId },
    {
      $unset: {
        roomLockId: "",
        roomId: "",
      },
      $set: {
        tentative: true, // Set reservation as tentative
      },
    }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, data, "Unassigned room successfully!"));
});

const roundNumber = (n) => {
  return Math.round(n * 100) / 100;
};

export default {
  getAllReservations,
  createReservation,
  readReservationRate,
  guestFolio,
  stayUpdate,
  addRoomReservation,
  changeRoomReservation,
  addReservationCharge,
  unassignRoom,
};
