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
  // Fetch potentially conflicting entries (same stock type and quality)
  // This avoids issues with floating point exact matching in DB queries or null matchingIds
  const existingDocs = await Catalog.find({
    stockType,
    qualityId
  });

  // Check strict duplication
  const hasDuplicate = candidates.some(cand => {
    return existingDocs.some(ext => {
      const sameDesign = String(ext.designId) === String(cand.designId);

      const extMatch = ext.matchingId ? String(ext.matchingId) : "null";
      const candMatch = cand.matchingId ? String(cand.matchingId) : "null";
      const sameMatching = extMatch === candMatch;

      const extCut = ext.cut || 0;
      const candCut = cand.cut || 0;
      // Handle floating point equality for cut
      const sameCut = Math.abs(extCut - candCut) < 0.01;

      return sameDesign && sameMatching && sameCut;
    });
  });

  if (hasDuplicate) {
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

// Helper for sorting
const sortCatalogsHelper = (docA, docB) => {
  const dnA = String(docA.designId?.designNumber || "").trim();
  const dnB = String(docB.designId?.designNumber || "").trim();

  const regex = /^([^\d]*)(\d*)/; // Match non-digits (prefix) then digits
  const matchA = dnA.match(regex);
  const matchB = dnB.match(regex);

  const prefixA = matchA ? matchA[1].trim().toLowerCase() : "";
  const numA = matchA && matchA[2] ? parseInt(matchA[2], 10) : -1; // -1 if no number to put 'RI' before 'RI 1'

  const prefixB = matchB ? matchB[1].trim().toLowerCase() : "";
  const numB = matchB && matchB[2] ? parseInt(matchB[2], 10) : -1;

  // Alphabets first logic: if A has alphabet prefix and B is purely numeric (empty prefix), A wins
  if (prefixA && !prefixB) return -1;
  if (!prefixA && prefixB) return 1;

  if (prefixA < prefixB) return -1;
  if (prefixA > prefixB) return 1;

  return numA - numB;
};

export const listCatalog = asyncHandler(async (req, res) => {
  const docs = await Catalog.find()
    .populate("qualityId", "fabricName loomType fabricType")
    .populate("designId", "designNumber designName")
    .populate("matchingId", "matchingName");

  docs.sort(sortCatalogsHelper);
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
    .populate("matchingId", "matchingName");

  docs.sort(sortCatalogsHelper);
  res.json(docs);
});
