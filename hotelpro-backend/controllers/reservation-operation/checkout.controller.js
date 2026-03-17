import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  Reservation,
  ReservationDetail,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import { ReservationStatusEnum } from "../../constants.js";
import { prepareInternalError } from "../../utils/helpers.js";
import { deallocateRoom } from "./room-reservation-concurrency.js";

// Function to process the checkout of a reservation
const checkoutReservation = asyncHandler(async (req, res) => {
  let { propertyUnitId, reservation } = req.body;
  propertyUnitId = new ObjectId(propertyUnitId);
  const reservationId = new ObjectId(reservation._id);

  // Deallocate the room lock if it exists
  if (reservation.roomLockId) {
    const deallocatedRoomLock = await deallocateRoom(
      new ObjectId(reservation.roomLockId)
    );
    if (!deallocatedRoomLock) {
      throw prepareInternalError("Error while deallocating room!");
    }
  }

  // Update reservation and reservation details
  const [reservationUpdate, reservationDetailUpdate] = await Promise.all([
    Reservation.updateOne(
      { _id: reservationId },
      { $set: { reservationStatus: ReservationStatusEnum.CHECKEDOUT } }
    ),
    ReservationDetail.updateOne(
      { reservationId: reservationId },
      { $set: { checkOutDate: new Date(), checkOutTime: new Date() } }
    ),
  ]);

  if (
    reservationUpdate.nModified === 0 ||
    reservationDetailUpdate.nModified === 0
  ) {
    throw new ApiError(400, "Error updating reservation details.");
  }

  // Return the success response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Checked out successfully!"));
});

export default {
  checkoutReservation,
};
