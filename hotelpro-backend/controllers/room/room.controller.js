import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Room } from "../../database/database.schema.js";

// GET all rooms
const getAllRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find();
  return res
    .status(200)
    .json(new ApiResponse(200, rooms, "All rooms retrieved successfully"));
});

// GET a single room by ID
const getRoomById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const room = await Room.findById(id);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room retrieved successfully"));
});

// POST create a new room
const createRoom = asyncHandler(async (req, res) => {
  const { roomName, roomNumber, roomTypeId, roomStatus, roomCondition, dnd } =
    req.body;
  const room = new Room({
    roomName,
    roomNumber,
    roomTypeId,
    roomStatus,
    roomCondition,
    dnd,
  });
  await room.save();
  return res
    .status(201)
    .json(new ApiResponse(201, room, "Room created successfully"));
});

// PUT update a room by ID
const updateRoomById = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { roomName, roomNumber, roomTypeId, roomStatus, roomCondition, dnd } =
    req.body;
  const roomExist = await Room.findOne({
    roomName,
    roomNumber,
    roomTypeId,
    _id: { $ne: roomId },
  });
  if (roomExist) {
    throw new ApiError(404, "Same Room Already exists !");
  }
  const room = await Room.findByIdAndUpdate(
    roomId,
    {
      roomName,
      roomNumber,
      roomTypeId,
      roomStatus,
      roomCondition,
      dnd,
    },
    { new: true }
  );
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room updated successfully"));
});

// DELETE a room by ID
const deleteRoomById = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const room = await Room.findByIdAndDelete(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { roomId }, "Room deleted successfully"));
});

export default {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoomById,
  deleteRoomById,
};
