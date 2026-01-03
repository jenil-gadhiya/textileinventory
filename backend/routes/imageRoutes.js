import { Router } from "express";
import multer from "multer";
import path from "path";
import { ImageModel } from "../models/Image.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createController,
  listController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "backend/uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.get("/", listController(ImageModel, ["qualityId", "designId"]));

router.post(
  "/",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const payload = {
      imageUrl: `/uploads/${req.file.filename}`,
      qualityId: req.body.qualityId,
      designId: req.body.designId
    };
    const doc = await ImageModel.create(payload);
    res.status(201).json(doc);
  })
);

router.delete("/:id", deleteController(ImageModel));

export default router;



