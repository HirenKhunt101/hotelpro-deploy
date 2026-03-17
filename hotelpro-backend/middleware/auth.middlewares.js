import jwt from "jsonwebtoken";
import { User } from "../database/database.schema.js"; // Adjust path based on your structure
import { ApiError } from "../utils/ApiError.js"; // Adjust path based on your structure
import { asyncHandler } from "../utils/asyncHandler.js"; // Adjust path based on your structure
import { AvailableUserTypes } from "../constants.js"; // Adjust path based on your structure

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(403, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    );
    if (!user) {
      // Client should make a request to /api/v1/users/refresh-token if they have refreshToken present in their cookie
      // Then they will get a new access token which will allow them to refresh the access token without logging out the user
      throw new ApiError(403, "Invalid access token");
    }
    req.user = user;
    next();
  } catch (error) {
    // Client should make a request to /api/v1/users/refresh-token if they have refreshToken present in their cookie
    // Then they will get a new access token which will allow them to refresh the access token without logging out the user
    throw new ApiError(403, error?.message || "Invalid access token");
  }
});

/**
 * @param {AvailableUserTypes[]} userTypes
 * @description
 * This middleware is responsible for validating multiple user userType permissions at a time.
 * So, in future if we have a route which can be accessible by multiple userTypes, we can achieve that with this middleware
 */
export const verifyPermission = (userTypes = []) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }
    if (userTypes.includes(req.user?.userType)) {
      next();
    } else {
      throw new ApiError(403, "You are not allowed to perform this action");
    }
  });

export const avoidInProduction = asyncHandler(async (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    next();
  } else {
    throw new ApiError(
      403,
      "This service is only available in the local environment."
    );
  }
});
