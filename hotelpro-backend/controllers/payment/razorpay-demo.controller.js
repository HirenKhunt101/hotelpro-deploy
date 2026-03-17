import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Razorpay from "razorpay";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZOR_KEY_ID,
  key_secret: process.env.RAZOR_KEY_SECRET,
});

// Function to create a payment order
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { payment, userId, groupId, propertyUnitId } = req.body;
  const amount = payment.amount * 100; // Convert to paise
  const options = {
    amount: amount,
    currency: "INR",
    receipt: `order_rcp_${Date.now()}`,
    notes: {
      propertyUnitId,
      groupId,
      userId,
      remark: payment.remark,
    },
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    res.status(200).send({ status: 200, data: order });
  } catch (err) {
    res.status(500).send({ status: 500, data: err });
  }
});

// Function to validate the payment
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_signature, original_order_id, razorpay_payment_id } =
    req.body;
  const secret = razorpayInstance.key_secret;

  const isPaymentVerified = validatePaymentVerification(
    { order_id: original_order_id, payment_id: razorpay_payment_id },
    razorpay_signature,
    secret
  );

  res
    .status(isPaymentVerified ? 200 : 500)
    .send({ data: { isPaymentVerified } });
});

// Function to validate Razorpay payment signature
const isPaymentVerifiedFunc = async (orderId, paymentId, signature) => {
  try {
    return validatePaymentVerification(
      { order_id: orderId, payment_id: paymentId },
      signature,
      process.env.RAZOR_KEY_SECRET
    );
  } catch (err) {
    console.error(err);
    return false;
  }
};

// Function to fetch payment details by ID
const fetchPaymentByIdFunc = async (paymentId) => {
  try {
    return await razorpayInstance.payments.fetch(paymentId);
  } catch (err) {
    console.error(err);
    return false;
  }
};

// Function to create a refund
const initiateRefundFunc = async (body) => {
  const { propertyUnitId, groupId, userId, payment } = body;
  try {
    const refundDetails = await razorpayInstance.payments.refund(
      payment.payId,
      {
        amount: payment.amount * 100, // Convert to paise
        notes: {
          propertyUnitId,
          groupId,
          userId,
          remark: payment.remark,
        },
        receipt: `ref_rcp_${Date.now()}`,
      }
    );
    return refundDetails;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export default {
  createPaymentOrder,
  verifyPayment,
  isPaymentVerifiedFunc,
  fetchPaymentByIdFunc,
  initiateRefundFunc,
};
