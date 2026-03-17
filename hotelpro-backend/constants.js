/**
 * @type {{ ADMIN: "admin"; CLIENT: "client"; FRONTDESK: "frontdesk"; HOUSEKEEPER: "housekeeper"; GUEST: "guest"; MANAGER: "manager"; SUPERADMIN: "superadmin";} as const}
 */
export const UserTypesEnum = {
  ADMIN: "admin",
  CLIENT: "client",
  FRONTDESK: "frontdesk",
  HOUSEKEEPER: "housekeeper",
  GUEST: "guest",
  MANAGER: "manager",
  SUPERADMIN: "superadmin",
};
export const AvailableUserTypes = Object.values(UserTypesEnum);

/**
 * @type {{ PERCENTAGE: "percentage"; FLAT: "flat"} as const}
 */
export const ChangeValueEnum = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
};
export const AvailableChangeValueEnum = Object.values(ChangeValueEnum);

/**
 * @type {{ UNKNOWN:"UNKNOWN"; RAZORPAY: "RAZORPAY"; PAYPAL: "PAYPAL"; } as const}
 */
export const PaymentProviderEnum = {
  UNKNOWN: "UNKNOWN",
  RAZORPAY: "RAZORPAY",
  PAYPAL: "PAYPAL",
};
export const AvailablePaymentProviders = Object.values(PaymentProviderEnum);

/**
 * @type {{ GOOGLE: "GOOGLE"; GITHUB: "GITHUB"; EMAIL_PASSWORD: "EMAIL_PASSWORD"} as const}
 */
export const UserLoginType = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
};
export const AvailableUserLoginType = Object.values(UserLoginType);

/**
 * @type {{ RESERVED: "reserved"; INHOUSE: "inhouse"; CANCELLED: "cancelled"; NOSHOW: "noshow"; CHECKEDOUT: "checkedout"; WALKIN: "walkin"} as const}
 */
export const ReservationStatusEnum = {
  RESERVED: "reserved",
  INHOUSE: "inhouse",
  CANCELLED: "cancelled",
  NOSHOW: "noshow",
  CHECKEDOUT: "checkedout",
  WALKIN: "walkin",
};
export const AvailableReservationStatusEnum = Object.values(
  ReservationStatusEnum
);

/**
 * @type {{ BIKE: "bike"; CAR: "car"; OTHER: "other" } as const}
 */
export const VehicleTypeEnum = {
  BIKE: "bike",
  CAR: "car",
  OTHER: "other",
};
export const AvailableVehicleTypeEnum = Object.values(VehicleTypeEnum);

/**
 * @type {{ BASERATE: "baseRate"; ADULTRATE: "adultRate"; CHILDRATE: "childRate" } as const}
 */
export const RateTypeEnum = {
  BASERATE: "baseRate",
  ADULTRATE: "adultRate",
  CHILDRATE: "childRate",
};
export const AvailableRateTypeEnum = Object.values(RateTypeEnum);

/**
 * @type {{ MON: "mon"; TUE: "tue"; WED: "wed"; THU: "thu"; FRI: "fri"; SAT: "sat"; SUN: "sun"} as const}
 */
export const WeekDayEnum = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: "sunday",
};

export const AvailableWeekDayEnum = Object.values(WeekDayEnum);

/**
 * @type {{ OCCUPIED: "occupied"; VACANT: "vacant"; MAINTENANCE: "maintenance";} as const}
 */
export const RoomStatusEnum = {
  OCCUPIED: "occupied",
  VACANT: "vacant",
  MAINTENANCE: "maintenance",
};
export const AvailableRoomStatusEnum = Object.values(RoomStatusEnum);

/**
 * @type {{ DIRTY: "dirty"; CLEAN: "clean"; } as const}
 */
export const RoomConditionEnum = {
  DIRTY: "dirty",
  CLEAN: "clean",
};
export const AvailableRoomConditionEnum = Object.values(RoomConditionEnum);

/**
 * @type {{ ROOMCHARGES: "RoomCharges"; ROOMSERVICES: "RoomServices"; HOUSEKEEPING: "HouseKeeping"; TAX: "Tax"; } as const}
 */
export const BalanceNameEnum = {
  ROOMCHARGES: "RoomCharges",
  ROOMSERVICES: "RoomServices",
  HOUSEKEEPING: "HouseKeeping",
  TAX: "Tax",
};
export const AvailableBalanceNameEnum = Object.values(BalanceNameEnum);

export const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes
export const MAXIMUM_SUB_IMAGE_COUNT = 4;
export const MAXIMUM_SOCIAL_POST_IMAGE_COUNT = 6;
export const SALT_WORK_FACTOR = 10;
export const DB_NAME = "hotelpro";
export const paypalBaseUrl = {
  sandbox: "https://api-m.sandbox.paypal.com",
};

export const CLOUD_AVATAR_FOLDER_NAME = "hotelproAvatar";
export const CLOUD_COVERPIC_FOLDER_NAME = "hotelproImage";
export const CLOUD_USER_DOC_FOLDER_NAME = "hotelproUserDoc";
export const CLOUD_ROOM_TYPE_FOLDER_NAME = "hotelproRoomType";
