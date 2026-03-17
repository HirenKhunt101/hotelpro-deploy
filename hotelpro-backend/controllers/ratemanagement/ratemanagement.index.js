import policyController from "./policy.controller.js";
import rateplanController from "./rateplan.controller.js";
import yieldController from "./yield.controller.js";
import availabilityController from "./availability.controller.js";
import tapechartController from "./tapechart.controller.js";
import futureRatesController from "./future-rates.controller.js";

export default {
  ...policyController,
  ...rateplanController,
  ...yieldController,
  ...availabilityController,
  ...tapechartController,
  ...futureRatesController,
};
