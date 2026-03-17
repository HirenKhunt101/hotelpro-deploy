import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  UserLoginType,
  UserTypesEnum,
  SALT_WORK_FACTOR,
} from "../../constants.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getLocalPath,
  getStaticFilePath,
  removeLocalFile,
} from "../../utils/helpers.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../../utils/mail.js";

import { User } from "../../database/database.schema.js";
import { logger } from "../../logger/winston.logger.js";

// TODO: Add more options to make cookie more secure and reliable
const options = {
  httpOnly: true,
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
  secure: process.env.NODE_ENV === "production",
};

const InvalidContent = {
  contentType: "Invalid URL",
  content: "The requested URL is invalid.",
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
    user.refreshToken = refreshToken;

    await user.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating the access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  let { email, password, userType } = req.body;

  const existedUser = await User.findOne({
    email,
  });

  if (existedUser) {
    throw new ApiError(409, "User with email is already exists", []);
  }
  password = await bcrypt.hash(password, SALT_WORK_FACTOR);

  const user = await User.create({
    email,
    password,
    isEmailVerified: false,
    userType: userType || UserTypesEnum.CLIENT,
  });

  /**
   * unHashedToken: unHashed token is something we will send to the user's mail
   * hashedToken: we will keep record of hashedToken to validate the unHashedToken in verify email controller
   * tokenExpiry: Expiry to be checked before validating the incoming token
   */
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  /**
   * assign hashedToken and tokenExpiry in DB till user clicks on email verification link
   * The email verification is handled by {@link verifyEmail}
   */
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save();

  sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get(
        "host"
      )}/hotelpro/user/verify-email?verificationToken=${unHashedToken}&userid=${user._id.toString()}`
    ),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "Users registered successfully and verification email has been sent on your email."
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ username: email }, { email: email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.loginType !== UserLoginType.EMAIL_PASSWORD) {
    // If user is registered with some other method, we will ask him/her to use the same method as registered.
    // This shows that if user is registered with methods other than email password, he/she will not be able to login with password. Which makes password field redundant for the SSO
    throw new ApiError(
      400,
      "You have previously registered using " +
        user.loginType?.toLowerCase() +
        ". Please use the " +
        user.loginType?.toLowerCase() +
        " login option to access your account."
    );
  }

  // Compare the incoming password with hashed password
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Please enter correct password!");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(
      400,
      "Your account is not verified, please check your mail and verify your account"
    );
  }

  if (!user.isLoginable) {
    throw new ApiError(400, "Your account is not active, please contact admin");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  let loggedInUser;
  if (user.userType == UserTypesEnum.CLIENT) {
    loggedInUser = await User.aggregate([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $lookup: {
          from: "properties",
          localField: "_id",
          foreignField: "ownerId",
          as: "property",
        },
      },
      {
        $unwind: {
          path: "$property",
        },
      },
      {
        $lookup: {
          from: "propertyunits",
          localField: "property._id",
          foreignField: "propertyId",
          as: "propertyUnits",
          pipeline: [
            {
              $match: {
                active: true,
              },
            },
            {
              $project: {
                propertyUnitCode: 1,
                propertyUnitName: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: {
          path: "$propertyUnits",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          firstName: {
            $first: "$firstName",
          },
          lastName: {
            $first: "$lastName",
          },
          email: {
            $first: "$email",
          },
          userType: {
            $first: "$userType",
          },
          avatar: {
            $first: "$avatar",
          },
          isVIP: {
            $first: "$property.isVIP",
          },
          propertyId: {
            $first: "$property._id",
          },
          propertyName: {
            $first: "$property.propertyName",
          },
          propertyUnitId: {
            $first: "$propertyUnitId",
          },
          propertyUnits: {
            $push: "$propertyUnits",
          },
        },
      },
    ]);
    if (loggedInUser[0].propertyUnitId) {
      let hasProperty = loggedInUser[0].propertyUnits.find((p) => {
        return p._id.toString() == loggedInUser[0].propertyUnitId.toString();
      });
      loggedInUser[0].propertyUnitCode = hasProperty.propertyUnitCode;
      loggedInUser[0].propertyUnitName = hasProperty.propertyUnitName;
      loggedInUser[0].propertyUnitId = hasProperty._id;
    } else {
      loggedInUser[0].propertyUnitCode =
        loggedInUser[0].propertyUnits[0]?.propertyUnitCode;
      loggedInUser[0].propertyUnitName =
        loggedInUser[0].propertyUnits[0]?.propertyUnitName;
      loggedInUser[0].propertyUnitId = loggedInUser[0].propertyUnits[0]?._id;
    }
  } else if (user.userType == UserTypesEnum.MANAGER) {
    loggedInUser = await User.aggregate([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $lookup: {
          from: "propertyunits",
          let: { ids: "$accessPropertyUnitIds" }, // Using '$' to reference the field in the outer document
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$ids"], // Use $$ to reference the let variable
                },
              },
            },
          ],
          as: "propertyUnits",
        },
      },
      {
        $unwind: {
          path: "$propertyUnits",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          firstName: {
            $first: "$firstName",
          },
          lastName: {
            $first: "$lastName",
          },
          email: {
            $first: "$email",
          },
          userType: {
            $first: "$userType",
          },
          accessPropertyUnitIds: {
            $first: "$accessPropertyUnitIds",
          },
          avatar: {
            $first: "$avatar",
          },
          propertyUnitId: {
            $first: "$propertyUnitId",
          },
          propertyUnitCode: {
            $first: "$propertyUnits.propertyUnitCode",
          },
          propertyUnitName: {
            $first: "$propertyUnits.propertyUnitName",
          },
          propertyUnits: {
            $push: "$propertyUnits",
          },
        },
      },
    ]);
    if (loggedInUser[0].propertyUnitId) {
      let hasProperty = loggedInUser[0].propertyUnits.find((p) => {
        return p._id.toString() == loggedInUser[0].propertyUnitId.toString();
      });
      loggedInUser[0].propertyUnitCode = hasProperty.propertyUnitCode;
      loggedInUser[0].propertyUnitName = hasProperty.propertyUnitName;
      loggedInUser[0].propertyUnitId = hasProperty._id;
    } else {
      loggedInUser[0].propertyUnitCode =
        loggedInUser[0].propertyUnits[0].propertyUnitCode;
      loggedInUser[0].propertyUnitName =
        loggedInUser[0].propertyUnits[0].propertyUnitName;
      loggedInUser[0].propertyUnitId = loggedInUser[0].propertyUnits[0]._id;
    }
  } else if (user.userType == UserTypesEnum.FRONTDESK) {
    loggedInUser = await User.aggregate([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $lookup: {
          from: "propertyunits",
          localField: "propertyUnitId",
          foreignField: "_id",
          as: "propertyUnits",
          pipeline: [
            {
              $project: {
                propertyUnitCode: 1,
                propertyUnitName: 1,
                active: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$propertyUnits",
        },
      },
      {
        $group: {
          _id: "$_id",
          firstName: {
            $first: "$firstName",
          },
          lastName: {
            $first: "$lastName",
          },
          email: {
            $first: "$email",
          },
          userType: {
            $first: "$userType",
          },
          avatar: {
            $first: "$avatar",
          },
          propertyUnitId: {
            $first: "$propertyUnits._id",
          },
          propertyUnitCode: {
            $first: "$propertyUnits.propertyUnitCode",
          },
          propertyUnitName: {
            $first: "$propertyUnits.propertyUnitName",
          },
          active: {
            $first: "$propertyUnits.active",
          },
        },
      },
    ]);

    if (!loggedInUser?.[0]?.active) {
      throw new ApiError(
        400,
        "Property unit is inactive. You can't login to this hotel"
      );
    }
  } else if (user.userType == UserTypesEnum.SUPERADMIN) {
    loggedInUser = await User.aggregate([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $project: {
          email: 1,
          userType: 1,
        },
      },
    ]);
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) // set the access token in the cookie
    .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser[0], accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
        "User logged in successfully"
      )
    );
});

const clientLoginBySuperadmin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  let loggedInUser = await User.aggregate([
    {
      $match: {
        email,
      },
    },
    {
      $lookup: {
        from: "properties",
        localField: "_id",
        foreignField: "ownerId",
        as: "property",
      },
    },
    {
      $unwind: {
        path: "$property",
      },
    },
    {
      $lookup: {
        from: "propertyunits",
        localField: "property._id",
        foreignField: "propertyId",
        as: "propertyUnits",
        pipeline: [
          {
            $project: {
              propertyUnitCode: 1,
              propertyUnitName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$propertyUnits",
      },
    },
    {
      $group: {
        _id: "$_id",
        firstName: {
          $first: "$firstName",
        },
        lastName: {
          $first: "$lastName",
        },
        email: {
          $first: "$email",
        },
        userType: {
          $first: "$userType",
        },
        avatar: {
          $first: "$avatar",
        },
        isVIP: {
          $first: "$property.isVIP",
        },
        propertyId: {
          $first: "$property._id",
        },
        propertyName: {
          $first: "$property.propertyName",
        },
        propertyUnitId: {
          $first: "$propertyUnits._id",
        },
        propertyUnitCode: {
          $first: "$propertyUnits.propertyUnitCode",
        },
        propertyUnitName: {
          $first: "$propertyUnits.propertyUnitName",
        },
        propertyUnits: {
          $push: "$propertyUnits",
        },
      },
    },
  ]);

  if (loggedInUser.length == 0) {
    throw new ApiError(400, "User not found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    loggedInUser[0]._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) // set the access token in the cookie
    .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser[0], accessToken, refreshToken }, // send access and refresh token in response if client decides to save them by themselves
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: "",
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const verifyEmail = async (req, res) => {
  try {
    const { verificationToken, userid: UserId } = req.query;

    if (!verificationToken || !UserId) {
      return res.render("pages/url_validation", InvalidContent);
    }

    // Generate a hash from the token that we are receiving for comparison with the existing token in DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const user = await User.findById(UserId);

    if (!user) {
      return res.render("pages/url_validation", InvalidContent);
    }

    if (user.isEmailVerified) {
      return res.render("pages/url_validation", {
        contentType: "Already Verified",
        content: "Your account is already verified.",
      });
    }

    if (
      new Date().toISOString() > user.emailVerificationExpiry.toISOString() ||
      hashedToken !== user.emailVerificationToken
    ) {
      return res.render("pages/link_expired", {
        contentType: "Link Expired",
        content:
          "Your verification link is expired, Click below button to regenerate new link",
        link: `${req.protocol}://${req.get(
          "host"
        )}/hotelpro/user/resend-email-verification?userid=${user._id.toString()}`,
      });
    }

    // Scenario: Successful Email Verification
    // If we found the user and the token is valid, update the user's verification status
    // Remove the associated email token and expiry date as they are no longer needed
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    user.isEmailVerified = true;
    await user.save();

    // Return a success response indicating that the email is verified
    return res.render("pages/email_verification");
  } catch (error) {
    // Handle any unexpected errors
    logger.error(`${error.message}`);
    return res.render("pages/url_validation", InvalidContent);
  }
};

// This controller is called when user is logged in and he has snackbar that your email is not verified
// In case he did not get the email or the email verification token is expired
// he will be able to resend the token while he is logged in
const resendEmailVerification = async (req, res) => {
  try {
    const { userid: UserId } = req.query;
    const user = await User.findById(UserId);

    if (!user) {
      throw new ApiError(404, "User does not exists", []);
    }

    // if email is already verified throw an error
    if (user.isEmailVerified) {
      throw new ApiError(409, "Email is already verified!");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken(); // generate email verification creds

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save();

    sendEmail({
      email: user?.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get(
          "host"
        )}/hotelpro/user/verify-email?verificationToken=${unHashedToken}&userid=${user._id.toString()}`
      ),
    });
    return res.render("pages/url_validation", {
      contentType: "Regenerate",
      content: "We have resend you a link. Please check your email.",
    });
  } catch (error) {
    // Handle any unexpected errors
    logger.error(`${error.message}`);
    return res.render("pages/url_validation", InvalidContent);
  }
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // check if incoming refresh token is same as the refresh token attached in the user document
    // This shows that the refresh token is used or not
    // Once it is used, we are replacing it with new refresh token below
    if (incomingRefreshToken !== user?.refreshToken) {
      // If token is valid but is used already
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Get email from the client and check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exists", []);
  }

  // Generate a temporary token
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken(); // generate password reset creds

  // save the hashed version a of the token and expiry in the DB
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save();

  // Send mail with the password reset link. It should be the link of the frontend url with token
  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      "", // write username here
      // ! NOTE: Following link should be the link of the frontend page responsible to request password reset
      // ! Frontend will send the below token with the new password in the request body to the backend reset password endpoint
      // * Ideally take the url from the .env file which should be teh url of the frontend
      `${process.env.FRONTEND_URL}/resetpassword/${unHashedToken}`
    ),
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent on your mail id"
      )
    );
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  // Create a hash of the incoming reset token

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // See if user with hash similar to resetToken exists
  // If yes then check if token expiry is greater than current date

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  // If either of the one is false that means the token is invalid or expired
  if (!user) {
    throw new ApiError(489, "Token is invalid or expired");
  }

  // if everything is ok and token id valid
  // reset the forgot password token and expiry
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  // Set the provided password as the new password
  user.password = await bcrypt.hash(newPassword, SALT_WORK_FACTOR);
  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  // check the old password
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  // assign new password in hash formate
  user.password = await bcrypt.hash(newPassword, SALT_WORK_FACTOR);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

export default {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  clientLoginBySuperadmin,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerification,
  resetForgottenPassword,
  verifyEmail,
};
