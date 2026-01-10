import { Router } from "express";
import { Matching } from "../models/Matching.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Matching, [], { matchingName: 1 })).post(createController(Matching));
router
  .route("/:id")
  .get(getController(Matching))
  .put(updateController(Matching))
  .delete(deleteController(Matching));

export default router;



