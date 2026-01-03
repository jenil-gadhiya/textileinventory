import { Router } from "express";
import { Party } from "../models/Party.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Party)).post(createController(Party));
router
  .route("/:id")
  .get(getController(Party))
  .put(updateController(Party))
  .delete(deleteController(Party));

export default router;



