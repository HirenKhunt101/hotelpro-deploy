import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  Reservation,
  ReservationDetail,
  RoomBalance,
  GroupReservation,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import {
  UserTypesEnum,
  ReservationStatusEnum,
  ChangeValueEnum,
  BalanceNameEnum,
} from "../../constants.js";
import {
  checkAndAllocateRoom,
  deallocateMultipleRooms,
  deallocateRoom,
} from "./room-reservation-concurrency.js";
import { prepareInternalError } from "../../utils/helpers.js";

// Read no-show charge details
const readNoshowCharge = asyncHandler(async (req, res) => {
  const { reservationId } = req.body;
  const noShowReservationDetails = await Reservation.aggregate([
    {
      $match: { _id: new ObjectId(reservationId) },
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
        pipeline: [
          {
            $lookup: {
              from: "noshowpolicies",
              localField: "noShowPolicyId",
              foreignField: "_id",
              as: "noshowPolicyDetails",
            },
          },
          {
            $unwind: {
              path: "$noshowPolicyDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: "$rateDetails", preserveNullAndEmptyArrays: true },
    },
  ]);

  const penalty = calculatePenalty(noShowReservationDetails[0]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...noShowReservationDetails[0].rateDetails.noshowPolicyDetails,
        penalty,
      },
      "No-show charge details retrieved successfully!"
    )
  );
});

// Calculate penalty based on the no-show policy
const calculatePenalty = (details) => {
  const { reservationDetails, rateDetails } = details;
  let penalty = 0;

  if (
    rateDetails.noshowPolicyDetails.chargeType === ChangeValueEnum.PERCENTAGE
  ) {
    penalty =
      (reservationDetails.roomCost *
        rateDetails.noshowPolicyDetails.chargeValue) /
      100;
  } else {
    penalty = rateDetails.noshowPolicyDetails.chargeValue;
  }

  return penalty;
};

// Mark reservation as no-show
const noShowReservation = asyncHandler(async (req, res) => {
  const { reservation, groupId, noshowDetails } = req.body;
  const reservationId = new ObjectId(reservation._id);

  if (reservation.roomId && reservation.roomLockId) {
    const deallocatedRoomLock = await deallocateRoom(
      new ObjectId(reservation.roomLockId)
    );
    if (!deallocatedRoomLock) {
      throw prepareInternalError("Error while deallocating room!");
    }
  }
  if (noshowDetails.penalty > 0) {
    let roomBalance = new RoomBalance();
    roomBalance.balance = -noshowDetails.penalty; // Negative charge for balance
    roomBalance.balanceDate = Date.now();
    roomBalance.balanceName = BalanceNameEnum.ROOMSERVICES; // Set balance name

    await Promise.all([
      GroupReservation.updateOne(
        { _id: groupId },
        {
          $inc: {
            totalBalance: roomBalance.balance,
            totalExtraCharge: noshowDetails.penalty,
          },
        }
      ),
      roomBalance.save(),
      Reservation.updateOne(
        {
          _id: reservationId,
        },
        {
          $set: {
            reservationStatus: ReservationStatusEnum.NOSHOW,
          },
        }
      ),
      ReservationDetail.updateOne(
        { reservationId: reservationId },
        {
          $set: {
            noShowDate: Date.now(),
            roomExtraCharge: noshowDetails.penalty,
          },
        }
      ),
    ]);
  } else {
    await Promise.all([
      Reservation.updateOne(
        {
          _id: reservationId,
        },
        {
          $set: {
            reservationStatus: ReservationStatusEnum.NOSHOW,
          },
        }
      ),
      ReservationDetail.updateOne(
        { reservationId: reservationId },
        {
          $set: {
            noShowDate: Date.now(),
          },
        }
      ),
    ]);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Reservation marked as no-show successfully!")
    );
});

// Read cancellation charge details
const readCancelReservationCharge = asyncHandler(async (req, res) => {
  const { reservationId } = req.body;
  const cancelReservationDetails = await Reservation.aggregate([
    {
      $match: { _id: new ObjectId(reservationId) },
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
        pipeline: [
          {
            $lookup: {
              from: "cancellationpolicies",
              localField: "cancellationPolicyId",
              foreignField: "_id",
              as: "cancelPolicyDetails",
            },
          },
          {
            $unwind: {
              path: "$cancelPolicyDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: "$rateDetails", preserveNullAndEmptyArrays: true },
    },
  ]);

  const penaltyDetails = calculateCancellationPenalty(
    cancelReservationDetails[0]
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...cancelReservationDetails[0].rateDetails.cancelPolicyDetails,
        ...penaltyDetails,
      },
      "Cancellation charge details retrieved successfully!"
    )
  );
});

// Calculate cancellation penalty
const calculateCancellationPenalty = (details) => {
  const { reservationDetails, rateDetails } = details;
  const hours = Number(
    rateDetails.cancelPolicyDetails.windowRange.split("h")[0]
  );
  const currDate = new Date();
  currDate.setUTCHours(currDate.getUTCHours() + hours);
  const isInsideRange = currDate >= new Date(details.arrival);

  let penalty = 0;
  if (
    rateDetails.cancelPolicyDetails.windowType === ChangeValueEnum.PERCENTAGE
  ) {
    penalty = isInsideRange
      ? (reservationDetails.roomCost *
          rateDetails.cancelPolicyDetails.insideWindowCharge) /
        100
      : (reservationDetails.roomCost *
          rateDetails.cancelPolicyDetails.outsideWindowCharge) /
        100;
  } else {
    penalty = isInsideRange
      ? rateDetails.cancelPolicyDetails.insideWindowCharge
      : rateDetails.cancelPolicyDetails.outsideWindowCharge;
  }

  return { penalty, isInsideRange };
};

// Cancel a reservation
const cancelReservation = asyncHandler(async (req, res) => {
  const { reservation, cancelDetails } = req.body;
  const reservationId = new ObjectId(reservation._id);
  const groupId = new ObjectId(reservation.groupId);

  if (reservation.roomId && reservation.roomLockId) {
    const deallocatedRoomLock = await deallocateRoom(
      new ObjectId(reservation.roomLockId)
    );
    if (!deallocatedRoomLock) {
      throw prepareInternalError("Error while deallocating room!");
    }
  }

  if (cancelDetails.penalty > 0) {
    let roomBalance = new RoomBalance();
    roomBalance.balance = -cancelDetails.penalty; // Negative charge for balance
    roomBalance.balanceDate = Date.now();
    roomBalance.balanceName = BalanceNameEnum.ROOMSERVICES; // Set balance name

    await Promise.all([
      GroupReservation.updateOne(
        { _id: groupId },
        {
          $inc: {
            totalBalance: roomBalance.balance,
            totalExtraCharge: cancelDetails.penalty,
          },
        }
      ),
      roomBalance.save(),
      Reservation.updateOne(
        {
          _id: reservationId,
        },
        {
          $set: {
            reservationStatus: ReservationStatusEnum.CANCELLED,
          },
        }
      ),
      ReservationDetail.updateOne(
        { reservationId: reservationId },
        {
          $set: {
            cancellationDate: Date.now(),
            roomExtraCharge: cancelDetails.penalty,
          },
        }
      ),
    ]);
  } else {
    await Promise.all([
      Reservation.updateOne(
        {
          _id: reservationId,
        },
        {
          $set: {
            reservationStatus: ReservationStatusEnum.CANCELLED,
          },
        }
      ),
      ReservationDetail.updateOne(
        { reservationId: reservationId },
        {
          $set: {
            cancellationDate: Date.now(),
          },
        }
      ),
    ]);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Reservation cancelled successfully!"));
});

export default {
  readNoshowCharge,
  noShowReservation,
  readCancelReservationCharge,
  cancelReservation,
};
