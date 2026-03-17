import express from "express";
import { upload } from "../middleware/multer.middleware.js";
import propertyController from "../controllers/property/property.controller.js";
import dashboardController from "../controllers/property/dashboard.controller.js";
const router = express.Router();
import { verifyJWT } from "../middleware/auth.middlewares.js";

router.post("/create-property", propertyController.createProperty);
router.post(
  "/upload-profile-photo",
  upload.single("file"),
  verifyJWT,
  propertyController.uploadProfilePhoto
);
router.post(
  "/upload-rooms-photos",
  upload.array("file", 10),
  verifyJWT,
  propertyController.uploadRoomsPhotos
);
router.post(
  "/read-client-dashboard",
  verifyJWT,
  propertyController.getClientDashboard
);
router.post(
  "/read-user-by-propertyunit",
  verifyJWT,
  dashboardController.readUserByPropertyUnit
);
router.post("/update-user", verifyJWT, dashboardController.updateUser);
router.post("/create-user", verifyJWT, dashboardController.createUser);

export default router;
