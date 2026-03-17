import roomController from "./room.controller.js";
import housekeepingController from "./housekeeping.controller.js";
import amenityController from "./amenity.controller.js";
import roomtypeController from "./roomtype.controller.js";
import maintenanceController from "./maintenance.controller.js";

export default {
  ...roomController,
  ...housekeepingController,
  ...amenityController,
  ...roomtypeController,
  ...maintenanceController,
};
