import { Router } from "express";
import { Quality } from "../models/Quality.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Quality, [], { fabricName: 1 })).post(createController(Quality));
router
  .route("/:id")
  .get(getController(Quality))
  .put(updateController(Quality))
  .delete(deleteController(Quality));

export default router;



