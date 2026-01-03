import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import machineRoutes from "./routes/machineRoutes.js";
import partyRoutes from "./routes/partyRoutes.js";
import designRoutes from "./routes/designRoutes.js";
import qualityRoutes from "./routes/qualityRoutes.js";
import matchingRoutes from "./routes/matchingRoutes.js";
import factoryRoutes from "./routes/factoryRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import productionRoutes from "./routes/productionRoutes.js";
import brokerRoutes from "./routes/brokerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import challanRoutes from "./routes/challanRoutes.js";
import stockPieceRoutes from "./routes/stockPieceRoutes.js";
import salesmanRoutes from "./routes/salesmanRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

connectDB().catch((err) => {
  console.error("DB connection failed", err);
  process.exit(1);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/machines", machineRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/qualities", qualityRoutes);
app.use("/api/matchings", matchingRoutes);
app.use("/api/factories", factoryRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/productions", productionRoutes);
app.use("/api/brokers", brokerRoutes);
// Register new routes
app.use("/api/salesmen", salesmanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ... other routes ...
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/challans", challanRoutes);
app.use("/api/stock-pieces", stockPieceRoutes);


app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

