import { asyncHandler } from "../middleware/asyncHandler.js";

export const createController = (Model) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.create(req.body);
    res.status(201).json(doc);
  });

export const listController = (Model, populate = [], sort = {}, collation = null) =>
  asyncHandler(async (req, res) => {
    let query = Model.find().populate(populate).sort(sort);
    if (collation) {
      query = query.collation(collation);
    }
    const docs = await query;
    res.json(docs);
  });

export const getController = (Model, populate = []) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id).populate(populate);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

export const updateController = (Model) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

export const deleteController = (Model) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  });



