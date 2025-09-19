
// import express from "express";
// import multer from "multer";
// import { exec } from "child_process";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";
// import cors from "cors";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import conversionRoutes from "./routes/conversionRoutes.js";
// import conversion from "./model/conversion.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();
// const upload = multer({ dest: path.join(__dirname, "uploads/") });

// app.use(
//   cors({
//     origin: "http://localhost:8080", // frontend ka origin
//     methods: ["GET", "POST"],
//   })
// );
// app.use(express.json());

// if (!fs.existsSync(path.join(__dirname, "uploads")))
//   fs.mkdirSync(path.join(__dirname, "uploads"));
// if (!fs.existsSync(path.join(__dirname, "converted")))
//   fs.mkdirSync(path.join(__dirname, "converted"));

// // ✅ Python path fix
// const PYTHON_PATH = `"C:/Users/~Akash~/AppData/Local/Programs/Python/Python313/python.exe"`;
// // ✅ convert.py ka absolute path
// const CONVERT_SCRIPT = path.join(__dirname, "convert.py");

// // MongoDB connect
// mongoose
//   .connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// // Routes
// app.use("/api/history", conversionRoutes);

// // ✅ File convert API
// app.post("/convert", upload.single("file"), (req, res) => {
//   const { toType } = req.body;
//   const inputPath = req.file.path;

//   let outputExt = toType === "pdf" ? "pdf" : "docx";
//   let outputPath = path.join(
//     __dirname,
//     "converted",
//     `${Date.now()}.${outputExt}`
//   );

//   let cmd = "";

//   if (toType === "docx") {
//     // PDF → DOCX (Python script)
//     cmd = `${PYTHON_PATH} "${CONVERT_SCRIPT}" "${inputPath}" "${outputPath}"`;
//   } else if (toType === "pdf") {
//     // DOCX → PDF (LibreOffice)
//     cmd = `soffice --headless --convert-to pdf --outdir "${path.join(
//       __dirname,
//       "converted"
//     )}" "${inputPath}"`;
//   } else {
//     return res.status(400).json({ error: "Invalid conversion type" });
//   }

//   // ✅ Run conversion
//   exec(cmd, async (error, stdout, stderr) => {
//     if (error) {
//       console.error("Error:", error.message);
//       return res.status(500).json({ error: "Conversion failed" });
//     }

//     console.log("Conversion Output:", stdout || stderr);

//     let outputPathFinal = outputPath;

//     if (toType === "pdf") {
//       const baseName = path.basename(inputPath);
//       outputPathFinal = path.join(__dirname, "converted", baseName + ".pdf");
//     }

//     if (!fs.existsSync(outputPathFinal)) {
//       console.error("Output file not found:", outputPathFinal);
//       return res.status(500).json({ error: "Converted file not found" });
//     }

//     // ✅ MongoDB me save karo
//     try {
//       const newRecord = new conversion({
//         originalName: req.file.originalname,
//         convertedName: path.basename(outputPathFinal),
//         fromType: req.file.mimetype,
//         toType,
//         downloadUrl: `http://localhost:5000/${path.basename(outputPathFinal)}`,
//       });

//       await newRecord.save();
//       console.log("✅ Conversion record saved in MongoDB");
//     } catch (dbError) {
//       console.error("❌ Failed to save record in MongoDB:", dbError);
//     }

//     // ✅ File download karwao
//     res.download(outputPathFinal, (err) => {
//       if (err) console.error("Download error:", err);

//       if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

//       setTimeout(() => {
//         if (fs.existsSync(outputPathFinal)) fs.unlinkSync(outputPathFinal);
//       }, 60000);
//     });
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });



import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import conversionRoutes from "./routes/conversionRoutes.js";
import conversion from "./model/conversion.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Dual-compatible folders (Windows + Linux)
let UPLOAD_DIR;
let CONVERT_DIR;

if (process.platform === "win32") {
  // Windows local dev
  UPLOAD_DIR = path.join(__dirname, "uploads");
  CONVERT_DIR = path.join(__dirname, "converted");
} else {
  // Linux / Render
  UPLOAD_DIR = path.join("/tmp", "uploads");
  CONVERT_DIR = path.join("/tmp", "converted");
}

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CONVERT_DIR)) fs.mkdirSync(CONVERT_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

// ✅ CORS – local dev + production frontend
const allowedOrigins = [
  "http://localhost:8080",
  "https://pdftodocxconverter.netlify.app"
];
app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"] }));
app.use(express.json());

// ✅ Python & LibreOffice
const PYTHON_PATH = process.platform === "win32"
  ? "python"        // Windows Python
  : "python3";      // Linux / Render
const CONVERT_SCRIPT = path.join(__dirname, "convert.py");

// ✅ MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/conversionDB";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/history", conversionRoutes);

// File convert API
app.post("/convert", upload.single("file"), (req, res) => {
  const { toType } = req.body;
  const inputPath = req.file.path;

  const outputExt = toType === "pdf" ? "pdf" : "docx";
  let outputPath = path.join(CONVERT_DIR, `${Date.now()}.${outputExt}`);

  let cmd = "";
  if (toType === "docx") {
    cmd = `${PYTHON_PATH} "${CONVERT_SCRIPT}" "${inputPath}" "${outputPath}"`;
  } else if (toType === "pdf") {
    cmd = `soffice --headless --convert-to pdf --outdir "${CONVERT_DIR}" "${inputPath}"`;
  } else return res.status(400).json({ error: "Invalid conversion type" });

  exec(cmd, async (error, stdout, stderr) => {
    if (error) {
      console.error("Error:", error.message);
      return res.status(500).json({ error: "Conversion failed" });
    }

    console.log("Conversion Output:", stdout || stderr);

    let outputPathFinal = toType === "pdf"
      ? path.join(CONVERT_DIR, path.basename(inputPath) + ".pdf")
      : outputPath;

    if (!fs.existsSync(outputPathFinal)) {
      console.error("Output file not found:", outputPathFinal);
      return res.status(500).json({ error: "Converted file not found" });
    }

    try {
      const newRecord = new conversion({
        originalName: req.file.originalname,
        convertedName: path.basename(outputPathFinal),
        fromType: req.file.mimetype,
        toType,
        downloadUrl: `/downloads/${path.basename(outputPathFinal)}`
      });
      await newRecord.save();
      console.log("✅ Conversion record saved in MongoDB");
    } catch (dbError) {
      console.error("❌ Failed to save record in MongoDB:", dbError);
    }

    // File download
    res.download(outputPathFinal, (err) => {
      if (err) console.error("Download error:", err);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      setTimeout(() => {
        if (fs.existsSync(outputPathFinal)) fs.unlinkSync(outputPathFinal);
      }, 60000);
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
