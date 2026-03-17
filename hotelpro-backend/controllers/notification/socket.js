/* eslint-disable no-constant-condition */
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  Reservation,
  User,
  Notification,
  PropertyUnit,
} from "../../database/database.schema.js";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import { IsValidObjectId } from "../../utils/helpers.js";
import { UserTypesEnum } from "../../constants.js";

import { Server } from "socket.io";

let io;

const initializeSocketConnection = async (server) => {
  try {
    io = new Server(server, {
      cors: {
        origin:
          process.env.CORS_ORIGIN === "*"
            ? "*" // This might give CORS error for some origins due to credentials set to true
            : process.env.CORS_ORIGIN?.split(","), // For multiple cors origin for production.
        credentials: true,
      },
    });
    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("connect", () => {
        console.log("Socket connection successfully");
      });
      socket.on("joinUserRoom", (userId) => {
        console.log(`User joined room : ${userId}`);

        // Join a room based on the propertyUnitId
        socket.join(userId);
      });
      socket.on("connect_error", (err) => {
        console.log(`connect_error due to ${err.message}`);
      });
      socket.on("message", (data) => {
        console.log("Received message:", data);
        io.emit("message", data); // Broadcasting the message
      });
      socket.on("markNotificationAsRead", async function (data) {
        console.log(data);
        try {
          await Notification.updateMany(
            { _id: { $in: data.ids } },
            { $push: { readBy: data._id } }
          );
        } catch (err) {
          console.error("Error updating notification:", err);
        }
      });

      socket.on("my", (data) => {
        console.log(data);
        io.emit("check", "Hello from server");
      });
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
      io.emit("debug", "Socket Connected Successfully!");
    });
    return true;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const emitNotificationToUsers = async (userIds, notificationArray) => {
  try {
    if (io) {
      for (let userId of userIds) {
        for (let notification of notificationArray) {
          io.to(String(userId)).emit("new-notification", notification);
        }
      }
    } else {
      console.log("Socket.io is not initialized");
    }
    return true;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getSocketIOInstance = async () => {
  try {
    if (io) {
      return io;
    } else {
      throw new Error("Socket.io is not initialized");
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export default {
  initializeSocketConnection,
  emitNotificationToUsers,
  getSocketIOInstance,
};
