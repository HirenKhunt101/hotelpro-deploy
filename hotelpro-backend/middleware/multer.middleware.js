import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure the path is correctly resolved
const uploadPath = path.join("/tmp", "temp");
// Ensure the directory exists
fs.mkdirSync(uploadPath, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit per file
    files: 5, // Limit to 5 files
  },
});

//http lec
// user-agent give us details about from where request is come like : safari,chrome,mobile , some this use case in some website popup comes like you should use are app instead web
