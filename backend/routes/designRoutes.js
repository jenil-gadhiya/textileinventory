import { Router } from "express";
import { Design } from "../models/Design.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Design, [], { designNumber: 1 }, { locale: "en_US", numericOrdering: true })).post(createController(Design));
router
  .route("/:id")
  .get(getController(Design))
  .put(updateController(Design))
  .delete(deleteController(Design));

export default router;



