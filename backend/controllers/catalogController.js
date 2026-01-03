import { asyncHandler } from "../middleware/asyncHandler.js";
import { Catalog } from "../models/Catalog.js";

export const createCatalog = asyncHandler(async (req, res) => {
  const { stockType, qualityId, designId, matchingIds, designIds, cut } = req.body;

  let candidates = [];

  if (stockType === "Saree") {
    if (!cut || cut <= 0) {
      return res.status(400).json({ message: "Cut is required for Saree" });
    }

    // Case 1: Multiple Designs (e.g. Grey Saree - behaves like Taka for selection)
    if (designIds && Array.isArray(designIds) && designIds.length > 0) {
      candidates = designIds.map((dId) => ({
        stockType,
        qualityId,
        designId: dId,
        matchingId: null,
        cut
      }));
    }
    // Case 2: Standard Saree (Single Design, Multiple Matchings)
    else {
      if (!designId) {
        return res.status(400).json({ message: "Design is required for standard Saree" });
      }
      if (!matchingIds || !Array.isArray(matchingIds) || matchingIds.length === 0) {
        return res.status(400).json({ message: "At least one matching is required for Saree" });
      }

      candidates = matchingIds.map((mId) => ({
        stockType,
        qualityId,
        designId,
        matchingId: mId,
        cut
      }));
    }
  } else if (stockType === "Taka") {
    // Create one entry per selected design
    if (!designIds || !Array.isArray(designIds) || designIds.length === 0) {
      return res.status(400).json({ message: "At least one design is required for Taka" });
    }

    candidates = designIds.map((designId) => ({
      stockType,
      qualityId,
      designId,
      matchingId: null,
      cut: null
    }));
  } else {
    return res.status(400).json({ message: "Invalid stockType. Must be 'Saree' or 'Taka'" });
  }

  // Deduplication Logic
  // 1. Build query conditions
  const conditions = candidates.map(c => ({
    stockType: c.stockType,
    qualityId: c.qualityId,
    designId: c.designId,
    matchingId: c.matchingId || null,
    cut: c.cut || null
  }));

  // 2. Find existing
  const existingDocs = await Catalog.find({ $or: conditions });

  // 3. Check for duplicates (STRICT)
  if (existingDocs.length > 0) {
    return res.status(409).json({ message: "Catalog entry already exists" });
  }

  // 4. Create entries (all new)
  const created = await Catalog.insertMany(candidates);
  const populated = await Catalog.find({ _id: { $in: created.map((c) => c._id) } })
    .populate("qualityId", "fabricName loomType fabricType")
    .populate("designId", "designNumber designName")
    .populate("matchingId", "matchingName");
  return res.status(201).json(populated);
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
