import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Reservation, User, Address } from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import { UserTypesEnum } from "../../constants.js";
import { deleteFromCloudinary } from "../../utils/cloudinary.js";

// Add a shared guest to a reservation
const addSharedGuestToReservation = asyncHandler(async (req, res) => {
  const { reservationId, userDetails } = req.body;
  delete userDetails._id; // Removing _id to avoid conflicts if it exists
  let guestObj = new User({ ...userDetails, userType: UserTypesEnum.GUEST });
  let guestAddress = new Address(userDetails);
  guestObj.addressId = guestAddress._id;

  await Promise.all([
    guestAddress.save(),
    guestObj.save(),
    Reservation.updateOne(
      { _id: new ObjectId(reservationId) },
      { $push: { secondaryUserIds: guestObj._id } }
    ),
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Guest added to reservation successfully!"));
});

// Update a shared guest's details
const updateGuestToReservation = asyncHandler(async (req, res) => {
  const { userDetails } = req.body;
  const userId = new ObjectId(userDetails._id);
  delete userDetails._id;

  const userData = await User.findById(userId);
  if (!userData) {
    throw new ApiError(404, "User not found.");
  }

  await Promise.all([
    User.updateOne({ _id: userId }, { $set: userDetails }),
    Address.updateOne({ _id: userData.addressId }, { $set: userDetails }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Guest updated successfully!"));
});

// Delete a shared guest from a reservation
const deleteSharedGuest = asyncHandler(async (req, res) => {
  const { reservationId, userDetails } = req.body;
  const userId = new ObjectId(userDetails._id);

  const userData = await User.findById(userId);
  if (!userData) {
    throw new ApiError(404, "User not found.");
  }

  // Delete associated images from Cloudinary
  if (
    Array.isArray(userDetails.documents) &&
    userDetails.documents.length > 0
  ) {
    await Promise.all(
      userDetails.documents.map(async (imageUrl) => {
        const isDelete = await deleteFromCloudinary(imageUrl);
        if (!isDelete) {
          throw new ApiError(400, `Image deletion failed for ${imageUrl}`);
        }
      })
    );
  }

  await Promise.all([
    User.deleteOne({ _id: userId }),
    Address.deleteOne({ _id: userData.addressId }),
  ]);

  if (reservationId) {
    await Reservation.updateOne(
      { _id: new ObjectId(reservationId) },
      { $pull: { secondaryUserIds: userId } }
    );
  }

  return res
    .status(204)
    .json(new ApiResponse(204, {}, "Guest deleted successfully!"));
});

export default {
  addSharedGuestToReservation,
  updateGuestToReservation,
  deleteSharedGuest,
};
