import express from "express";
import ratemanagementIndex from "../controllers/ratemanagement/ratemanagement.index.js";

const router = express.Router();

router.post("/create-noshow-policy", ratemanagementIndex.createNoShowPolicy);
router.post(
  "/update-noshow-policy/:policyId",
  ratemanagementIndex.updateNoShowPolicyById
);
router.post(
  "/get-noshow-policy-by-id/:policyId",
  ratemanagementIndex.getNoShowPolicyById
);
router.post(
  "/delete-noshow-policy/:policyId",
  ratemanagementIndex.deleteNoShowPolicyById
);
router.post(
  "/get-all-noshow-policies/:propertyUnitId",
  ratemanagementIndex.getAllNoShowPolicies
);

// CancellationPolicy Routes
router.post(
  "/create-cancellation-policy",
  ratemanagementIndex.createCancellationPolicy
);
router.post(
  "/update-cancellation-policy/:policyId",
  ratemanagementIndex.updateCancellationPolicyById
);
router.post(
  "/get-cancellation-policy-by-id/:policyId",
  ratemanagementIndex.getCancellationPolicyById
);
router.post(
  "/delete-cancellation-policy/:policyId",
  ratemanagementIndex.deleteCancellationPolicyById
);
router.post(
  "/get-all-cancellation-policies/:propertyUnitId",
  ratemanagementIndex.getAllCancellationPolicies
);

router.post("/read-rateplan", ratemanagementIndex.readRatePlan);
router.post("/create-rateplan", ratemanagementIndex.createRatePlan);
router.post("/update-rateplan", ratemanagementIndex.updateRatePlan);

router.post(
  "/read-future-availability",
  ratemanagementIndex.readFutureAvailability
);

router.post("/get-tapechart", ratemanagementIndex.getTapechart);
router.post("/get-future-rates", ratemanagementIndex.getFutureRates);
router.post("/update-future-rates", ratemanagementIndex.updateFutureRates);

router.post("/get-yield", ratemanagementIndex.readYield);
router.post("/create-yield", ratemanagementIndex.createYield);
router.post("/update-yield", ratemanagementIndex.updateYield);
export default router;
