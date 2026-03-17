import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  Reservation,
  ReservationDetail,
  RatePlanSetup,
  RatePlanRoomType,
  RatePlanRoomRate,
  RoomType,
  RoomBalance,
  GroupReservation,
  User,
  Address,
  BillingAccount,
  TransactionCode,
  GuestTransaction,
  BookingControl,
  RoomMaintenance,
  BillingCard,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import {
  UserTypesEnum,
  ReservationStatusEnum,
  BalanceNameEnum,
} from "../../constants.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../../utils/cloudinary.js";
import {
  deleteLocalImage,
  prepareInternalError,
  generateConfirmationNumber,
  generateGroupNumber,
} from "../../utils/helpers.js";
import {
  CLOUD_AVATAR_FOLDER_NAME,
  CLOUD_COVERPIC_FOLDER_NAME,
  CLOUD_USER_DOC_FOLDER_NAME,
} from "../../constants.js";

import {
  checkAndAllocateRoom,
  deallocateMultipleRooms,
  deallocateRoom,
} from "./room-reservation-concurrency.js";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";
import razorPayController from "../payment/razorpay-demo.controller.js";

// Function to process reservation payment
const postReservationPayment = asyncHandler(async (req, res) => {
  let {
    propertyUnitId,
    groupId,
    userId,
    payment,
    razorpay_signature,
    original_order_id,
    razorpay_payment_id,
  } = req.body;

  groupId = new ObjectId(groupId);
  userId = new ObjectId(userId);
  propertyUnitId = new ObjectId(propertyUnitId);

  let [billing_account, userDetails] = await Promise.all([
    BillingAccount.findOne({ groupId }),
    User.findById(userId),
  ]);

  if (!billing_account) {
    billing_account = new BillingAccount({
      billingAccountName: `${userDetails.firstName} ${userDetails.lastName}`,
      propertyUnitId,
      userId,
      groupId,
    });
    await billing_account.save();
  }

  const promiseArray = [];
  if (payment.paymentType != "cloud") {
    const transactionCode = new TransactionCode({
      transactionCode: String(new ObjectId()),
      transactionType: "Reservation",
      paymentType: payment.paymentType,
      transactionRate: payment.amount,
      transactionDetail: payment.remark,
      receipt: Math.floor(100000 + Math.random() * 900000),
      date: Date.now(),
    });
    promiseArray.push(transactionCode.save());

    const guestTransaction = new GuestTransaction({
      transactionCodeId: transactionCode._id,
      isDeposit: payment.deposit,
      transactionDate: Date.now(),
      userId,
      groupId,
      billingAccountId: billing_account._id,
    });
    promiseArray.push(guestTransaction.save());
  } else {
    const isPaymentVerified = await razorPayController.isPaymentVerifiedFunc(
      original_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!isPaymentVerified) {
      throw prepareInternalError("Payment is not verified!");
    }

    const razorPaymentDetails = await razorPayController.fetchPaymentByIdFunc(
      razorpay_payment_id
    );
    if (!razorPaymentDetails) {
      throw prepareInternalError("Error while getting payment details");
    }

    const billing_card = new BillingCard({
      paymentId: razorpay_payment_id,
      orderId: original_order_id,
      extraDetails: razorPaymentDetails,
      billingAccountId: billing_account._id,
    });
    promiseArray.push(billing_card.save());

    const transactionCode = new TransactionCode({
      transactionCode: String(new ObjectId()),
      transactionType: "Reservation",
      paymentType: payment.paymentType,
      transactionRate: payment.amount,
      transactionDetail: payment.remark,
      receipt: Math.floor(100000 + Math.random() * 900000),
      date: Date.now(),
      paymentId: razorpay_payment_id,
    });
    promiseArray.push(transactionCode.save());

    const guestTransaction = new GuestTransaction({
      transactionCodeId: transactionCode._id,
      transactionDate: Date.now(),
      userId,
      groupId,
      billingAccountId: billing_account._id,
      billingCardId: billing_card._id,
    });
    promiseArray.push(guestTransaction.save());
  }

  promiseArray.push(
    GroupReservation.updateOne(
      { _id: groupId },
      {
        $inc: {
          totalBalance: payment.deposit ? 0 : payment.amount,
          totalPayment: payment.deposit ? 0 : payment.amount,
          totalDeposit: payment.deposit ? payment.amount : 0,
        },
      }
    )
  );

  await Promise.all(promiseArray);
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Payment made successfully!"));
});

// Function to process refund
const refundPayment = asyncHandler(async (req, res) => {
  let { propertyUnitId, groupId, userId, payment } = req.body;

  groupId = new ObjectId(groupId);
  userId = new ObjectId(userId);
  propertyUnitId = new ObjectId(propertyUnitId);

  let billing_account = await BillingAccount.findOne({ groupId });
  const promiseArray = [];

  if (payment.paymentType != "cloud") {
    payment.amount = -payment.amount; // Negate amount for refund
    const transactionCode = new TransactionCode({
      transactionCode: String(new ObjectId()),
      transactionType: "Reservation",
      paymentType: payment.paymentType,
      transactionRate: payment.amount,
      transactionDetail: payment.remark,
      receipt: Math.floor(100000 + Math.random() * 900000),
      date: Date.now(),
    });
    promiseArray.push(transactionCode.save());

    const guestTransaction = new GuestTransaction({
      transactionCodeId: transactionCode._id,
      isRefund: true,
      transactionDate: Date.now(),
      userId,
      groupId,
      billingAccountId: billing_account._id,
    });
    promiseArray.push(guestTransaction.save());
  } else {
    const billing_card = await BillingCard.findOne({
      paymentId: payment.payId,
    });
    const razorRefundDetails = await razorPayController.initiateRefundFunc(
      req.body
    );
    if (!razorRefundDetails) {
      throw prepareInternalError("Error while refunding payment");
    }

    const razorPaymentDetails =
      await razorPayController.getRazorPaymentByIdFunc(payment.payId);
    if (!razorPaymentDetails) {
      throw prepareInternalError("Error while getting payment details");
    }

    payment.amount = -payment.amount; // Negate amount for refund
    const transactionCode = new TransactionCode({
      transactionCode: String(new ObjectId()),
      transactionType: "Reservation",
      paymentType: payment.paymentType,
      transactionRate: payment.amount,
      transactionDetail: payment.remark,
      receipt: Math.floor(100000 + Math.random() * 900000),
      date: Date.now(),
      refundId: razorRefundDetails.id,
    });
    promiseArray.push(transactionCode.save());

    const guestTransaction = new GuestTransaction({
      transactionCodeId: transactionCode._id,
      isRefund: true,
      transactionDate: Date.now(),
      userId,
      groupId,
      billingAccountId: billing_account._id,
      billingCardId: billing_card._id,
    });
    promiseArray.push(guestTransaction.save());

    promiseArray.push(
      BillingCard.updateOne(
        { _id: billing_card._id },
        { $set: { extraDetails: razorPaymentDetails } }
      )
    );
  }

  promiseArray.push(
    GroupReservation.updateOne(
      { _id: groupId },
      {
        $inc: {
          totalBalance: payment.amount,
          totalPayment: payment.amount,
        },
      }
    )
  );

  await Promise.all(promiseArray);
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Refund payment successfully!"));
});

// Function to release deposit
const depositRelease = asyncHandler(async (req, res) => {
  let { propertyUnitId, groupId, userId, deposit } = req.body;

  groupId = new ObjectId(groupId);
  userId = new ObjectId(userId);
  propertyUnitId = new ObjectId(propertyUnitId);

  if (deposit.transactionDetails.captureAmount > 0) {
    await Promise.all([
      GroupReservation.updateOne(
        { _id: groupId },
        {
          $inc: {
            totalBalance: deposit.transactionDetails.captureAmount,
            totalPayment: deposit.transactionDetails.captureAmount,
            totalDeposit: -deposit.transactionDetails.transactionRate,
          },
        }
      ),
      TransactionCode.updateOne(
        { _id: new ObjectId(deposit.transactionDetails._id) },
        {
          $set: {
            transactionRate: deposit.transactionDetails.captureAmount,
            date: new Date(),
          },
        }
      ),
      GuestTransaction.updateOne(
        { _id: new ObjectId(deposit._id) },
        {
          $set: {
            isDeposit: false,
            transactionDate: new Date(),
          },
        }
      ),
    ]);
  } else {
    await Promise.all([
      GroupReservation.updateOne(
        { _id: groupId },
        {
          $inc: {
            totalDeposit: -deposit.transactionDetails.transactionRate,
          },
        }
      ),
      TransactionCode.deleteOne({
        _id: new ObjectId(deposit.transactionDetails._id),
      }),
      GuestTransaction.deleteOne({ _id: new ObjectId(deposit._id) }),
    ]);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Deposit released successfully!"));
});

export default {
  postReservationPayment,
  refundPayment,
  depositRelease,
};
