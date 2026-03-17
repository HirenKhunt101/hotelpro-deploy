import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { logger } from "../logger/winston.logger.js";
import { configDotenv } from "dotenv";
configDotenv();

mongoose.set("returnOriginal", false);

class HotelProDatabase {
  constructor() {
    this.apiStartTime = new Date().getTime();
    this.db_con;
    this.timer;
    this.db_url = process.env.MONGODB_URI;
    this.database_name = DB_NAME;
    setImmediate(async () => {
      this.db_con = await this._createConnection();
    });
  }

  check_connection = () => {
    if (this.db_con !== undefined) {
      clearInterval(this.timer);
      return true;
    }
    return false;
  };

  _createConnection = async () => {
    try {
      mongoose
        .connect(this.db_url + this.database_name, {
          // useNewUrlParser: true,
          // useCreateIndex: true,
          // useUnifiedTopology: true,
          // useFindAndModify: false,
        })
        .then(() => {
          logger.info("mongo connection success");
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (error) {
      console.log(`error while creating connection : ${error}`);
      throw error;
    }
  };

  insertIntoCollection = (model_name, session) => {
    return new Promise((resolve, reject) => {
      if (typeof model_name == "object") {
        let documentToSave = model_name;

        if (session != null) {
          documentToSave = {
            ...model_name,
            session: session,
          };
        }

        documentToSave
          .save()
          .then((result) => {
            resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        reject({
          status: 104,
          message: "Invalid insert",
        });
      }
    });
  };

  updateCollection = async (
    model_name,
    update_condition_obj,
    new_values,
    session
  ) => {
    // eslint-disable-next-line no-useless-catch
    try {
      if (
        typeof update_condition_obj !== "string" &&
        typeof new_values !== "string"
      ) {
        const updateOptions = {
          runValidators: true,
          ...(session ? { session: session } : {}),
        };

        const result = await model_name.findOneAndUpdate(
          update_condition_obj,
          new_values,
          updateOptions
        );
        return result;
      } else {
        throw {
          status: 104,
          message: "Invalid parameters for update",
        };
      }
    } catch (e) {
      throw e;
    }
  };

  updateMultiple = (model_name, update_condition_obj, new_values, session) => {
    return new Promise((resolve, reject) => {
      if (
        typeof update_condition_obj !== "string" &&
        typeof new_values !== "string"
      ) {
        const updateOptions = {
          runValidators: true,
          ...(session ? { session: session } : {}),
        };

        model_name.updateMany(
          update_condition_obj,
          new_values,
          updateOptions,
          (e, result) => {
            if (!e) {
              resolve(result);
            } else {
              const err_obj = {};
              for (const i in e.errors) {
                err_obj[i] =
                  e.errors[i].properties?.message || e.errors[i].stringValue;
              }
              reject(err_obj);
            }
          }
        );
      } else {
        reject({
          status: 104,
          message: "Invalid parameters for update",
        });
      }
    });
  };

  findFromCollection = (model_name, query_obj = {}) => {
    return new Promise((resolve, reject) => {
      if (model_name !== undefined && model_name !== "") {
        model_name.find(query_obj, (e, result) => {
          if (!e) {
            resolve(result);
          } else {
            reject(e);
          }
        });
      } else {
        reject({
          status: 104,
          message: "Invalid search",
        });
      }
    });
  };

  deleteFromCollection = (model_name, query_obj, session) => {
    return new Promise((resolve, reject) => {
      if (model_name !== undefined && model_name !== "") {
        const deleteOptions = session ? { session: session } : {};

        model_name.deleteOne(query_obj, deleteOptions, (e, result) => {
          if (!e) {
            resolve(result);
          } else {
            reject(e);
          }
        });
      } else {
        reject({
          status: 104,
          message: "Invalid search",
        });
      }
    });
  };

  bulkwriteupdateone = (filter_query, update_obj, options = {}) => {
    return {
      updateOne: {
        filter: filter_query,
        update: update_obj,
        upsert: options.upsert || false,
      },
    };
  };

  bulkwriteupdatemany = (filter_query, update_obj) => {
    return {
      updateMany: {
        filter: filter_query,
        update: update_obj,
      },
    };
  };
}

const database = new HotelProDatabase();
export default database;
