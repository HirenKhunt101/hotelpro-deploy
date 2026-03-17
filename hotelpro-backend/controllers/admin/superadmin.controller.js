import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  emailVerificationMailgenContent,
  sendEmail,
} from "../../utils/mail.js";

import { Property, PropertyUnit, Reservation, GroupReservation } from "../../database/database.schema.js";
const ObjectId = mongoose.Types.ObjectId;

const readSuperAdminDashboard = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Helper date for last 7 days revenue
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalProperties,
    totalPropertyUnits,
    activePropertyUnits,
    clients,
    todaysReservations,
    upcomingReservations,
    recentActivity,
    revenueChartData
  ] = await Promise.all([
    // 1. Total Properties
    Property.find().count(),

    // 2. Total Units
    PropertyUnit.find().count(),

    // 3. Active Units
    PropertyUnit.find({ active: true }).count(),

    // 4. Clients List (Existing Logic)
    Property.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          propertyName: 1,
          clientName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          phone: "$user.phone",
          email: "$user.email",
          isVIP: 1,
        },
      },
      { $limit: 10 } // Limit to top 10 for dashboard
    ]),

    // 5. Today's Reservations Count
    Reservation.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }),

    // 6. Upcoming Reservations (Next 5 arrivals)
    Reservation.aggregate([
      {
        $match: {
          arrival: { $gte: startOfDay }
        }
      },
      { $sort: { arrival: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "guest"
        }
      },
      { $unwind: { path: "$guest", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "propertyunits",
          localField: "propertyUnitId",
          foreignField: "_id",
          as: "hotel"
        }
      },
      { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          guestName: { $concat: ["$guest.firstName", " ", "$guest.lastName"] },
          arrival: 1,
          departure: 1,
          hotelName: "$hotel.propertyUnitName",
          status: "$reservationStatus"
        }
      }
    ]),

    // 7. Recent Activity (Last 5 Bookings Created)
    Reservation.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "guest"
        }
      },
      { $unwind: { path: "$guest", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "propertyunits",
          localField: "propertyUnitId",
          foreignField: "_id",
          as: "hotel"
        }
      },
      { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          guestName: { $concat: ["$guest.firstName", " ", "$guest.lastName"] },
          createdAt: 1,
          hotelName: "$hotel.propertyUnitName",
          totalPayment: 1 // Note: Schema might vary, checking reservation schema
        }
      }
    ]),

    // 8. Revenue Chart Data (Last 7 Days)
    // NOTE: In a real system, we'd sum up 'Payments' or 'Transactions'. 
    // Since I don't see a centralized transaction log in schema, I'll approximate using GroupReservation 'totalPayment' created in date range
    // Or Reservation 'roomCost'. Let's use GroupReservation as it holds financials often.
    GroupReservation.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$totalPayment" }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  // Calculate generic Today's Revenue (approximation for now based on what we have)
  // Summing up recent activity revenue for display
  let todaysRevenue = 0;
  // If we had a Payment collection, we'd query that. 
  // For now, let's look at GroupReservations created today for a rough estimate
  const todaysGroups = await GroupReservation.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
  todaysRevenue = todaysGroups.reduce((acc, curr) => acc + (curr.totalPayment || 0), 0);


  let response = {
    totalProperties,
    totalPropertyUnits,
    activePropertyUnits,
    clients,
    todaysReservations,
    upcomingReservations,
    recentActivity,
    todaysRevenue,
    revenueChartData
  };

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Dashboard data retrieved successfully"));
});

export default {
  readSuperAdminDashboard,
};
