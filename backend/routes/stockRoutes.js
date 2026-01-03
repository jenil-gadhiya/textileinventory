import { Router } from "express";
import { Stock } from "../models/Stock.js";
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController
} from "../controllers/crudFactory.js";

const router = Router();

router.route("/").get(listController(Stock)).post(createController(Stock));
router
  .route("/:id")
  .get(getController(Stock))
  .put(updateController(Stock))
  .delete(deleteController(Stock));

export default router;



