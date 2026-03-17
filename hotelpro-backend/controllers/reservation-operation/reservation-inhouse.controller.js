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

const checkInReservation = asyncHandler(async (req, res) => {
  let { reservationId } = req.body;
  reservationId = new ObjectId(reservationId);

  // Check if reservation exists
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, "Reservation not found.");
  }

  await Promise.all([
    Reservation.updateOne(
      { _id: reservationId },
      {
        $set: {
          reservationStatus: ReservationStatusEnum.INHOUSE,
        },
      }
    ),
    ReservationDetail.updateOne(
      { reservationId: reservationId },
      {
        $set: {
          checkInDate: new Date(),
          checkInTime: new Date(),
        },
      }
    ),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Checked in reservation ${reservationId} successfully!`
      )
    );
});

export default {
  checkInReservation,
};
