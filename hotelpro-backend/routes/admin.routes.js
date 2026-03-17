import express from "express";
import { upload } from "../middleware/multer.middleware.js";
import adminIndex from "../controllers/admin/admin.index.js";

const router = express.Router();

router.post("/get-superadmin-dashboard", adminIndex.readSuperAdminDashboard);

router.post("/get-monthly-report", adminIndex.readMonthlyReport);

export default router;
