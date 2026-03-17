import reservationController from "./reservation.controller.js";
import noshowCancelController from "./noshow-cancel.controller.js";
import reservationInhouseController from "./reservation-inhouse.controller.js";
import paymentController from "./payment.controller.js";
import documentController from "./documents.controller.js";
import guestsController from "./guests.controller.js";
import checkoutController from "./checkout.controller.js";

export default {
  ...reservationController,
  ...noshowCancelController,
  ...reservationInhouseController,
  ...paymentController,
  ...documentController,
  ...guestsController,
  ...checkoutController,
};
