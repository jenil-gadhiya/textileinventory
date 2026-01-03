import { Router } from "express";
import {
  createCatalog,
  listCatalog,
  getCatalog,
  updateCatalog,
  deleteCatalog,
  getCatalogByQuality
} from "../controllers/catalogController.js";

const router = Router();


router.route("/").get(listCatalog).post(createCatalog);
router.route("/quality/:qualityId").get(getCatalogByQuality);
router.route("/:id").get(getCatalog).put(updateCatalog).delete(deleteCatalog);

export default router;



