import { asyncHandler } from "../middleware/asyncHandler.js";
import { Catalog } from "../models/Catalog.js";

export const createCatalog = asyncHandler(async (req, res) => {
  const { stockType, qualityId, designId, matchingIds, designIds, cut } = req.body;

  if (stockType === "Saree") {
    // Create one entry per selected matching
    if (!matchingIds || !Array.isArray(matchingIds) || matchingIds.length === 0) {
      return res.status(400).json({ message: "At least one matching is required for Saree" });
    }
    if (!cut || cut <= 0) {
      return res.status(400).json({ message: "Cut is required for Saree" });
    }

    const entries = matchingIds.map((matchingId) => ({
      stockType,
      qualityId,
      designId,
      matchingId,
      cut
    }));

    const created = await Catalog.insertMany(entries);
    const populated = await Catalog.find({ _id: { $in: created.map((c) => c._id) } })
      .populate("qualityId", "fabricName loomType fabricType")
      .populate("designId", "designNumber designName")
      .populate("matchingId", "matchingName");
    res.status(201).json(populated);
  } else if (stockType === "Taka") {
    // Create one entry per selected design
    if (!designIds || !Array.isArray(designIds) || designIds.length === 0) {
      return res.status(400).json({ message: "At least one design is required for Taka" });
    }

    const entries = designIds.map((designId) => ({
      stockType,
      qualityId,
      designId,
      matchingId: null,
      cut: null
    }));

    const created = await Catalog.insertMany(entries);
    const populated = await Catalog.find({ _id: { $in: created.map((c) => c._id) } })
      .populate("qualityId", "fabricName loomType fabricType")
      .populate("designId", "designNumber designName")
      .populate("matchingId", "matchingName");
    res.status(201).json(populated);
  } else {
    res.status(400).json({ message: "Invalid stockType. Must be 'Saree' or 'Taka'" });
  }
});

export const listCatalog = asyncHandler(async (req, res) => {
  const docs = await Catalog.find()
    .populate("qualityId", "fabricName loomType fabricType")
    .populate("designId", "designNumber designName")
    .populate("matchingId", "matchingName")
    .sort({ createdAt: -1 });
  res.json(docs);
});

export const getCatalog = asyncHandler(async (req, res) => {
  const doc = await Catalog.findById(req.params.id)
    .populate("qualityId", "fabricName loomType fabricType")
    .populate("designId", "designNumber designName")
    .populate("matchingId", "matchingName");
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

export const updateCatalog = asyncHandler(async (req, res) => {
  const doc = await Catalog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate("qualityId", "fabricName loomType fabricType")
    .populate("designId", "designNumber designName")
    .populate("matchingId", "matchingName");
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

export const deleteCatalog = asyncHandler(async (req, res) => {
  const doc = await Catalog.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

export const getCatalogByQuality = asyncHandler(async (req, res) => {
  const { qualityId } = req.params;
  const docs = await Catalog.find({ qualityId })
    .populate("qualityId", "fabricName loomType fabricType")
    .populate("designId", "designNumber designName")
    .populate("matchingId", "matchingName")
    .sort({ createdAt: -1 });
  res.json(docs);
});
