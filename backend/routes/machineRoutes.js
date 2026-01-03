import { Router } from "express";
import { Machine } from "../models/Machine.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Machine)).post(createController(Machine));
router
  .route("/:id")
  .get(getController(Machine))
  .put(updateController(Machine))
  .delete(deleteController(Machine));

export default router;



