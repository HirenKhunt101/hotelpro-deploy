import reportController from "./report.controller.js";
import superadminController from "./superadmin.controller.js";

export default {
  ...superadminController,
  ...reportController,
};
