import express from "express";
import { verifyJWT } from "../middleware/auth.middlewares.js";
import adminRouter from "./admin.routes.js";
import userRouter from "./auth.routes.js";
import propertyRouter from "./property.routes.js";
import propertyUnitRouter from "./propertyunit.routes.js";
import roomRouter from "./room.routes.js";
import ratemanagementRouter from "./ratemanagement.routes.js";
import reservationOperationRouter from "./reservation-operation.routes.js";
import paymentRouter from "./payment.routes.js";
import notificationRouter from "./notification.routes.js";
const router = express.Router();

router.use("/user", userRouter);
router.use("/property", propertyRouter);
router.use(verifyJWT); // apply middleware on subsequent routes
router.use("/admin", adminRouter);
router.use("/propertyunit", propertyUnitRouter);
router.use("/room", roomRouter);
router.use("/ratemanagement", ratemanagementRouter);
router.use("/reservation", reservationOperationRouter);
router.use("/razor", paymentRouter);
router.use("/notification", notificationRouter);
export default router;
