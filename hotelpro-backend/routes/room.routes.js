import express from "express";
import { upload } from "../middleware/multer.middleware.js";
import roomIndex from "../controllers/room/room.index.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router = express.Router();

router.post("/read-roomtypes/:propertyUnitId", roomIndex.getAllRoomTypes);
router.post("/read-roomtypebyid/:roomTypeId", roomIndex.getRoomTypeById);
router.post("/add-roomtype/:propertyUnitId", roomIndex.createRoomType);
router.post("/update-roomtype/:roomTypeId", roomIndex.updateRoomTypeById);
router.post(
  "/create-roomtype-and-rooms/:propertyUnitId",
  roomIndex.createRoomTypeWithRooms
);

router.post(
  "/read-roomtype-and-rooms/:propertyUnitId",
  roomIndex.getRoomTypeAndRooms
);

router.post("/create-room", roomIndex.createRoom);
router.post("/update-room/:roomId", roomIndex.updateRoomById);
router.post("/delete-room/:roomId", roomIndex.deleteRoomById);

router.post("/read-room-maintenance", roomIndex.getRoomMaintenance);
router.post("/create-room-maintenance", roomIndex.createRoomMaintenance);
router.post("/update-room-maintenance", roomIndex.updateRoomMaintenance);
router.post("/delete-room-maintenance", roomIndex.deleteRoomMaintenance);
router.post(
  "/update-room-maintenance-range",
  roomIndex.updateRoomMaintenanceRange
);
router.post(
  "/read-available-room-for-daterange",
  roomIndex.getAvailableRoomForDateRange
);

router.post("/create-house-keeper", roomIndex.createHouseKeeper);
router.post("/update-house-keeper", roomIndex.updateHouseKeeper);
router.post("/read-house-keeper", roomIndex.getHouseKeeper);
router.post("/delete-house-keeper", roomIndex.deleteHouseKeeper);
router.post(
  "/read-rooms-with-house-keeping",
  roomIndex.getRoomsWithHouseKeeping
);
router.post(
  "/update-rooms-with-house-keeping",
  roomIndex.updateRoomsWithHouseKeeping
);
router.post("/create-house-keeping-task", roomIndex.createHouseKeepingTask);
router.post("/complete-task-by-id", roomIndex.completeTaskById);

router.post(
  "/upload-room-type-images",
  (req, res, next) => {
    // Call the multer middleware
    upload.array("uploadedImages", 5)(req, res, (err) => {
      if (err) {
        if (
          err.code === "LIMIT_FILE_COUNT" ||
          err.code === "LIMIT_UNEXPECTED_FILE"
        ) {
          // File count limit error

          return res
            .status(400)
            .json(
              new ApiResponse(400, null, "You can upload up to 5 images only.")
            );
        } else if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json(new ApiResponse(400, null, "file must be less than 2MB."));
        }
        // Other multer errors
        return res.status(400).json(new ApiResponse(400, null, err.message));
      }
      // No error, proceed to the next middleware
      next();
    });
  },
  roomIndex.uploadRoomTypeImages
);

router.post("/delete-room-type-images", roomIndex.deleteRoomTypeImages);

router.post("/read-room-type-images", roomIndex.readRoomTypeImages);

export default router;
