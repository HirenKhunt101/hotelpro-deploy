import express from "express";
import { upload } from "../middleware/multer.middleware.js";
import propertyUnitController from "../controllers/propertyunit/propertyunit.controller.js";
import taxController from "../controllers/propertyunit/tax.controller.js";
const router = express.Router();

router.post("/create-propertyunit", propertyUnitController.createPropertyUnit);
router.post(
  "/update-propertyunit/:propertyUnitId",
  propertyUnitController.updatePropertyUnitById
);
router.post(
  "/update-propertyunit-status/:propertyUnitId",
  propertyUnitController.updatePropertyUnitStatus
);
router.post(
  "/read-propertyunit/:propertyUnitId",
  propertyUnitController.getPropertyUnitById
);
router.post("/switch-property", propertyUnitController.switchProperty);
router.post(
  "/get-frontdesk-dashboard",
  propertyUnitController.getFrontDeskDashboard
);
router.post("/create-tax", taxController.createTax);
router.post("/update-tax/:taxId", taxController.updateTaxById);
router.post("/get-tax-by-id/:taxId", taxController.getTaxById);
router.post("/delete-tax/:taxId", taxController.deleteTaxById);
router.post("/get-all-taxes/:propertyUnitId", taxController.getAllTaxes);

export default router;
