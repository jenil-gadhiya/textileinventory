import { Router } from "express";
import { Factory } from "../models/Factory.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Factory)).post(createController(Factory));
router
  .route("/:id")
  .get(getController(Factory))
  .put(updateController(Factory))
  .delete(deleteController(Factory));

export default router;



