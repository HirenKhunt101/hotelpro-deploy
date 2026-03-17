import mongoose from "mongoose";
import {
  RoomReservationConcurrency,
  RoomLockIdentity,
} from "../../database/database.schema.js";
import { logger } from "../../logger/winston.logger.js";
import { IsValidObjectId } from "../../utils/helpers.js";
const ObjectId = mongoose.Types.ObjectId;

/**
 * @param {ObjectId} propertyUnitId
 * @param {ObjectId} roomId
 * @param {Date} arrival
 * @param {Date} departure
 * @returns {Promise<{ isRoomAvailable: boolean, roomLockId: string }>} - A Promise that resolves with an object containing 'isRoomAvailable' (boolean) and 'roomLockId' (string).
 */

// desc: This function will acquire a lock on the room for each day from arrival to departure, date-wise and roomId-wise, with a unique key: {RoomId, Date}.
//       All dates for this reservation from arrival to departure entries in the RoomReservationConcurrency table have a common roomLockId, which will be stored in the reservation.
const checkAndAllocateRoom = async (
  propertyUnitId,
  roomId,
  arrival,
  departure,
  existingRoomLockId
) => {
  let roomLockId = null;
  try {
    if (IsValidObjectId(existingRoomLockId)) {
      logger.info("Valid existing room lock ID already given");
      roomLockId = new ObjectId(existingRoomLockId);
    } else {
      logger.info("Preparing new room lock");
      const newRoomLock = new RoomLockIdentity({
        propertyUnitId: propertyUnitId,
      });
      await newRoomLock.save();
      roomLockId = newRoomLock._id;
    }

    const roomReservationConcurrencyRecords = [];
    for (let currDate = new Date(arrival); currDate < departure; ) {
      const roomLockDate = new Date(currDate);
      roomReservationConcurrencyRecords.push(
        new RoomReservationConcurrency({
          propertyUnitId: propertyUnitId,
          roomId: roomId,
          roomLockId: roomLockId,
          date: roomLockDate,
        })
      );
      currDate.setDate(currDate.getDate() + 1);
    }

    await RoomReservationConcurrency.insertMany(
      roomReservationConcurrencyRecords
    );

    return {
      isRoomAvailable: true,
      roomLockId: roomLockId,
    };
  } catch (err) {
    try {
      await Promise.all([
        RoomLockIdentity.deleteOne({ _id: roomLockId }),
        RoomReservationConcurrency.deleteMany({ roomLockId: roomLockId }),
      ]);
    } catch (subError) {
      console.log("Error while rolling back RoomLock", subError);
    }

    console.log("Error while checkAndAllocateRoom", err);
    return {
      isRoomAvailable: false,
      roomLockId: roomLockId,
    };
  }
};

/**
 * @param {ObjectId} roomLockId
 * @returns {Promise<boolean>} - A Promise that resolves with a boolean:
 * - true if the room will be available after deallocation,
 * - false if the room will not be available.
 */
const deallocateRoom = async (roomLockId) => {
  try {
    await Promise.all([
      RoomLockIdentity.deleteOne({ _id: roomLockId }),
      RoomReservationConcurrency.deleteMany({ roomLockId: roomLockId }),
    ]);
    return true;
  } catch (err) {
    console.log("Error while deallocating room:", roomLockId);
    return false;
  }
};

/**
 * @param {Array<ObjectId>} roomLockIds - Array of Room Lock IDs to deallocate.
 * @returns {Promise<boolean>} - A Promise that resolves with a boolean:
 * - true if the rooms will be available after deallocation,
 * - false if the rooms will not be available.
 */
const deallocateMultipleRooms = async (roomLockIds) => {
  try {
    await Promise.all([
      RoomLockIdentity.deleteMany({ _id: { $in: roomLockIds } }),
      RoomReservationConcurrency.deleteMany({
        roomLockId: { $in: roomLockIds },
      }),
    ]);

    return true;
  } catch (err) {
    console.log("Error while deallocating rooms:", roomLockIds);
    console.log(err);
    return false;
  }
};

export { checkAndAllocateRoom, deallocateRoom, deallocateMultipleRooms };
