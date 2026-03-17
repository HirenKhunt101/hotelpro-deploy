import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import excel from "excel4node";
import {
  GroupReservation,
  PropertyUnit,
} from "../../database/database.schema.js";
const ObjectId = mongoose.Types.ObjectId;

let fetchReservationData = async function (startDate, endDate, propertyUnit) {
  try {
    let reservations = await GroupReservation.aggregate([
      {
        $match: {
          propertyUnitId: propertyUnit._id,
          arrival: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                fullName: {
                  $concat: ["$firstName", " ", "$lastName"],
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $lookup: {
          from: "reservations",
          localField: "_id",
          foreignField: "groupId",
          as: "reservation",
          pipeline: [
            {
              $lookup: {
                from: "rooms",
                localField: "roomId",
                foreignField: "_id",
                as: "room",
                pipeline: [
                  {
                    $lookup: {
                      from: "roomtypes",
                      localField: "roomTypeId",
                      foreignField: "_id",
                      as: "roomType",
                    },
                  },
                  {
                    $unwind: {
                      path: "$roomType",
                    },
                  },
                  {
                    $project: {
                      roomTypeName: "$roomType.roomTypeName",
                      roomName: 1,
                      roomNumber: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$room",
              },
            },
            {
              $project: {
                roomName: "$room.roomName",
                roomNumber: "$room.roomNumber",
                roomTypeName: "$room.roomTypeName",
                fullRoomName: {
                  $concat: ["$room.roomTypeName", "-", "$room.roomName"],
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$reservation",
        },
      },
      {
        $group: {
          _id: "$_id",
          groupNumber: {
            $first: "$groupNumber",
          },
          fullName: {
            $first: "$user.fullName",
          },
          adults: {
            $first: "$adults",
          },
          childs: {
            $first: "$childs",
          },
          fullRoomName: {
            $push: "$reservation.fullRoomName",
          },
          arrival: {
            $first: "$arrival",
          },
          departure: {
            $first: "$departure",
          },
          totalPrice: {
            $first: "$totalPrice",
          },
          totalTax: {
            $first: "$totalTax",
          },
          totalExtraCharge: {
            $first: "$totalExtraCharge",
          },
          totalDeposit: {
            $first: "$totalDeposit",
          },
          totalPayment: {
            $first: "$totalPayment",
          },
          totalBalance: {
            $first: "$totalBalance",
          },
        },
      },
    ]);
    return reservations || [];
  } catch (error) {
    console.log("Error in fetch reservation", error);
  }
};

let generateReportByPropertyUnit = async function (
  startDate,
  endDate,
  propertyUnit
) {
  try {
    let workbook = new excel.Workbook();
    let ws = workbook.addWorksheet("Sheet 1");
    let GlobalRowIndex = 2;

    let reservationData = await fetchReservationData(
      startDate,
      endDate,
      propertyUnit
    );

    // Style
    ws.column(1).setWidth(18);
    ws.column(2).setWidth(25);
    ws.column(5).setWidth(25);
    let header1 = {
      font: {
        bold: true,
      },
      alignment: {
        horizontal: "center",
      },
      fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: "#C0C0C0",
      },
    };
    let title = {
      font: {
        bold: true,
      },
    };

    //----------------------------------Section - 1--------------------------------------------------------------------
    ws.cell(GlobalRowIndex, 1, GlobalRowIndex, 2, true)
      .style(header1)
      .string("Property Unit Details");

    ws.cell(++GlobalRowIndex, 1).string("Property Unit Name").style(title);
    ws.cell(GlobalRowIndex, 2).string(propertyUnit.propertyUnitName);

    ws.cell(++GlobalRowIndex, 1).string("Property Unit Code").style(title);
    ws.cell(GlobalRowIndex, 2).string(propertyUnit.propertyUnitCode);

    // ----------------------------------Section - 2--------------------------------------------------------------------
    GlobalRowIndex += 2;
    ws.cell(GlobalRowIndex, 1, GlobalRowIndex, 2, true)
      .style(header1)
      .string("Date Range");

    ws.cell(++GlobalRowIndex, 1).string("From Date").style(title);
    ws.cell(GlobalRowIndex, 2)
      .date(new Date(startDate))
      .style({ numberFormat: "dd-mm-yyyy", alignment: { horizontal: "left" } });

    ws.cell(++GlobalRowIndex, 1).string("To Date").style(title);
    ws.cell(GlobalRowIndex, 2)
      .date(new Date(endDate))
      .style({ numberFormat: "dd-mm-yyyy", alignment: { horizontal: "left" } });

    //----------------------------------Section - 3--------------------------------------------------------------------
    GlobalRowIndex += 3;
    let totalRowData = {
      price: 0,
      tax: 0,
      extraCharge: 0,
      deposit: 0,
      payment: 0,
      balance: 0,
    };
    // Style
    const headerStyle = {
      font: {
        bold: true,
      },
      fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: "#C0C0C0",
      },
    };
    const headers = [
      "Group Folio No.",
      "Guest Name",
      "Adults",
      "Childs",
      "Room",
      "Arrival",
      "Departure",
      "Total Price",
      "Total Tax",
      "Extra Charge",
      "Deposit",
      "Payment",
      "Balance",
    ];
    headers.forEach((header, index) => {
      ws.cell(GlobalRowIndex, index + 1)
        .string(header)
        .style(headerStyle);
    });

    const dataStyle = workbook.createStyle({
      alignment: {
        horizontal: "left",
      },
    });

    reservationData.forEach((reservation) => {
      const row = ++GlobalRowIndex;

      ws.cell(row, 1).string(reservation?.groupNumber);
      ws.cell(row, 2).string(reservation?.fullName);
      ws.cell(row, 3).number(reservation?.adults).style(dataStyle);
      ws.cell(row, 4).number(reservation?.childs).style(dataStyle);
      ws.cell(row, 5).string(reservation?.fullRoomName.join(", "));
      ws.cell(row, 6).string(
        new Date(reservation?.arrival).toLocaleDateString()
      );
      ws.cell(row, 7).string(
        new Date(reservation?.departure).toLocaleDateString()
      );
      ws.cell(row, 8).number(reservation?.totalPrice).style(dataStyle);
      ws.cell(row, 9).number(reservation?.totalTax).style(dataStyle);
      ws.cell(row, 10).number(reservation?.totalExtraCharge).style(dataStyle);
      ws.cell(row, 11).number(reservation?.totalDeposit).style(dataStyle);
      ws.cell(row, 12).number(reservation?.totalPayment).style(dataStyle);
      ws.cell(row, 13).number(reservation?.totalBalance).style(dataStyle);

      totalRowData.price += reservation?.totalPrice || 0;
      totalRowData.tax += reservation?.totalTax || 0;
      totalRowData.extraCharge += reservation?.totalExtraCharge || 0;
      totalRowData.deposit += reservation?.totalDeposit || 0;
      totalRowData.payment += reservation?.totalPayment || 0;
      totalRowData.balance += reservation?.totalBalance || 0;
    });

    ws.cell(++GlobalRowIndex, 1, GlobalRowIndex, 13).style(headerStyle);

    ws.cell(GlobalRowIndex, 1).string("Totals").style(headerStyle);
    ws.cell(GlobalRowIndex, 8).number(totalRowData.price).style(dataStyle);
    ws.cell(GlobalRowIndex, 9).number(totalRowData.tax).style(dataStyle);
    ws.cell(GlobalRowIndex, 10)
      .number(totalRowData.extraCharge)
      .style(dataStyle);
    ws.cell(GlobalRowIndex, 11).number(totalRowData.deposit).style(dataStyle);
    ws.cell(GlobalRowIndex, 12).number(totalRowData.payment).style(dataStyle);
    ws.cell(GlobalRowIndex, 13).number(totalRowData.balance).style(dataStyle);

    workbook.write(`${propertyUnit.propertyUnitName}.xlsx`);
  } catch (error) {
    console.log("Error in generate report", error);
  }
};

const readMonthlyReport = asyncHandler(async (req, res) => {
  let { propertyId, month, year } = req.body;
  let propertyUnits = await PropertyUnit.find({
    propertyId,
    active: true,
  });

  let startDate = new Date(year, month, 1);
  let endDate = new Date(year, month + 1, 0);

  for (let p of propertyUnits) {
    await generateReportByPropertyUnit(startDate, endDate, p);
  }

  return res.status(200).json(new ApiResponse(200, {}, "Report successfully"));
});

export default {
  readMonthlyReport,
};
