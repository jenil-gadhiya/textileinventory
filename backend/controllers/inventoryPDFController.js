import PDFDocument from "pdfkit";
import { Inventory } from "../models/Inventory.js";

export const generateInventoryPDF = async (req, res, next) => {
    try {
        const { factory, quality, design, type, fromDate, toDate } = req.query;

        const filter = {};
        if (factory) filter.factoryId = factory;
        if (quality) {
            if (Array.isArray(quality)) {
                filter.qualityId = { $in: quality };
            } else if (quality.includes(',')) {
                filter.qualityId = { $in: quality.split(',') };
            } else {
                filter.qualityId = quality;
            }
        }
        if (design) filter.designId = design;
        if (type) filter.type = type;

        // Apply date filter if provided
        if (fromDate || toDate) {
            filter.updatedAt = {};
            if (fromDate) filter.updatedAt.$gte = new Date(fromDate);
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.updatedAt.$lte = endOfDay;
            }
        }

        const items = await Inventory.find(filter)
            .populate("qualityId", "fabricName")
            .populate("designId", "designNumber")
            .populate("factoryId", "factoryName")
            .populate("matchingId", "matchingName")
            .sort({ factoryId: 1, qualityId: 1, designId: 1 });

        // Correction Logic & Processing
        const processedItems = items.map((item) => {
            const json = item.toJSON();

            // Fix: If Meters Ordered is 0, ensure Pieces Ordered is 0 (Fix consistency issues)
            if (json.type === "Taka" && (json.totalMetersOrdered === 0 || !json.totalMetersOrdered)) {
                json.totalTakaOrdered = 0;
                json.availableTaka = json.totalTakaProduced || 0;
            }

            // Sanity check: If Ordered Taka Count matches Ordered Meters (corruption) and is unrealistically high
            if (json.type === "Taka" && json.totalTakaOrdered > 20 && Math.abs(json.totalTakaOrdered - json.totalMetersOrdered) < 5) {
                const avgLen = (json.totalMetersProduced && json.totalTakaProduced)
                    ? (json.totalMetersProduced / json.totalTakaProduced)
                    : 100;
                const estimatedOrdered = Math.round(json.totalMetersOrdered / avgLen);
                json.totalTakaOrdered = estimatedOrdered;
                json.availableTaka = Math.max(0, (json.totalTakaProduced || 0) - estimatedOrdered);
            }
            return json;
        });

        // Calculate Totals
        let takaStats = { producedM: 0, producedC: 0, orderedM: 0, orderedC: 0, availableM: 0, availableC: 0 };
        let sareeStats = { produced: 0, ordered: 0, available: 0 };
        let hasTaka = false;
        let hasSaree = false;

        processedItems.forEach(item => {
            if (item.type === "Taka") {
                hasTaka = true;
                takaStats.producedM += (item.totalMetersProduced || 0);
                takaStats.producedC += (item.totalTakaProduced || 0);
                takaStats.orderedM += (item.totalMetersOrdered || 0);
                takaStats.orderedC += (item.totalTakaOrdered || 0);
                takaStats.availableM += (item.availableMeters || 0);
                takaStats.availableC += (item.availableTaka || 0);
            } else if (item.type === "Saree") {
                hasSaree = true;
                sareeStats.produced += (item.totalSareeProduced || 0);
                sareeStats.ordered += (item.totalSareeOrdered || 0);
                sareeStats.available += (item.availableSaree || 0);
            }
        });

        // Group by Factory
        const groupedItems = processedItems.reduce((acc, item) => {
            const factoryName = item.factoryId?.factoryName || "Unknown Factory";
            if (!acc[factoryName]) acc[factoryName] = [];
            acc[factoryName].push(item);
            return acc;
        }, {});

        // Generate PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' }); // Portrait Mode

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=stock-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Header
        const dateText = (fromDate && toDate)
            ? `Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`
            : `Date: ${formatDate(new Date())}`;

        // Title Left, Date Right
        doc.font("Helvetica-Bold").fontSize(18).text("Stock Report", 30, 40);
        doc.font("Helvetica").fontSize(10).text(dateText, 30, 48, { align: "right" });

        let y = 80;

        // Table Constants - Portrait Compact Columns (Total ~530)
        const startX = 30;
        // Cols: Design (120), Matching (110), Produced (100), Ordered (100), Available (100)
        const colWidths = [120, 110, 100, 100, 100];
        const headers = ["Design", "Matching", "Produced", "Ordered", "Available"];
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);

        // Group items by Factory -> Quality
        // We really want to iterate: Factory A -> Quality 1 -> Items, Quality 2 -> Items...
        const groupedByFactory = processedItems.reduce((acc, item) => {
            const fName = item.factoryId?.factoryName || "Unknown Factory";
            if (!acc[fName]) acc[fName] = {};

            const qName = item.qualityId?.fabricName || "Unknown Quality";
            if (!acc[fName][qName]) acc[fName][qName] = [];

            acc[fName][qName].push(item);
            return acc;
        }, {});

        // Sort items by Factory -> Quality
        const sortedFactories = Object.keys(groupedByFactory).sort();

        sortedFactories.forEach(factoryName => {
            const factoryQualities = groupedByFactory[factoryName];

            // Factory Header
            if (y + 40 > doc.page.height - 30) {
                doc.addPage({ margin: 30 });
                y = 50;
            }

            doc.font("Helvetica-Bold").fontSize(14).fillColor("#1e293b");
            doc.text(`FACTORY: ${factoryName.toUpperCase()}`, startX, y);
            y += 25;

            // Sort Qualities explicitly
            const sortedQualityNames = Object.keys(factoryQualities).sort((a, b) => a.localeCompare(b));

            sortedQualityNames.forEach(qualityName => {
                const items = factoryQualities[qualityName];
                // Sort Items using alphanumeric natural sort
                items.sort(sortInventoryItemsHelper);

                // Check page break for Quality Header + Table Header + 1 Row (approx 80px)
                if (y + 80 > doc.page.height - 30) {
                    doc.addPage({ margin: 30 });
                    y = 50;
                    // Repeat Factory Header maybe?
                    doc.font("Helvetica-Bold").fontSize(10).fillColor("#94a3b8");
                    doc.text(`(Cont.) Factory: ${factoryName}`, startX, y);
                    y += 20;
                }

                // Quality Header (Underlined style as per request/image implication)
                doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
                doc.text(qualityName, startX, y, { underline: true });
                y += 20;

                // Table Header
                drawTableHeader(doc, headers, startX, y, colWidths);
                y += 20;

                // Items
                doc.font("Helvetica").fontSize(10);

                // Track Quality Totals
                let qTotalProduced = 0;
                let qTotalProducedCount = 0;
                let qTotalOrdered = 0;
                let qTotalOrderedCount = 0;
                let qTotalAvailable = 0;
                let qTotalAvailableCount = 0;

                const isTakaQuality = items.some(i => i.type === "Taka");
                const unit = isTakaQuality ? "m" : "pcs";
                let previousDesign = "";

                items.forEach((item, index) => {
                    // Check for page break
                    if (y > 750) { // Portrait height approx limit
                        doc.addPage({ margin: 30 });
                        y = 50;
                        drawTableHeader(doc, headers, startX, y, colWidths);
                        y += 20;
                        doc.font("Helvetica").fontSize(10);
                    }

                    const design = item.designId?.designNumber || "-";
                    const matching = item.matchingId?.matchingName || "-";

                    // Separator line if design changes
                    if (index > 0 && design !== previousDesign) {
                        doc.strokeColor("#e2e8f0") // Light gray
                            .moveTo(startX, y - 2)
                            .lineTo(startX + tableWidth, y - 2)
                            .stroke()
                            .strokeColor("#000000"); // Reset
                        y += 5; // Add a bit of space
                    }

                    previousDesign = design;

                    let prodDisplay, ordDisplay, availDisplay;

                    if (item.type === "Taka") {
                        const prodM = item.totalMetersProduced || 0;
                        const prodC = item.totalTakaProduced || 0;
                        const ordM = item.totalMetersOrdered || 0;
                        const ordC = item.totalTakaOrdered || 0;
                        const availM = item.availableMeters || 0;
                        const availC = item.availableTaka || 0;

                        qTotalProduced += prodM;
                        qTotalProducedCount += prodC;
                        qTotalOrdered += ordM;
                        qTotalOrderedCount += ordC;
                        qTotalAvailable += availM;
                        qTotalAvailableCount += availC;

                        prodDisplay = `${prodM.toFixed(2)}m (${prodC})`;
                        ordDisplay = `${ordM.toFixed(2)}m (${ordC})`;
                        availDisplay = `${availM.toFixed(2)}m (${availC})`;
                    } else {
                        const prod = item.totalSareeProduced || 0;
                        const ord = item.totalSareeOrdered || 0;
                        const avail = item.availableSaree || 0;

                        qTotalProduced += prod;
                        qTotalOrdered += ord;
                        qTotalAvailable += avail;

                        prodDisplay = `${prod} pcs`;
                        ordDisplay = `${ord} pcs`;
                        availDisplay = `${avail} pcs`;
                    }

                    // Row
                    let x = startX;

                    doc.text(design, x, y, { width: colWidths[0] });
                    x += colWidths[0];
                    doc.text(matching, x, y, { width: colWidths[1] });
                    x += colWidths[1];
                    doc.text(prodDisplay, x, y, { width: colWidths[2], align: 'right' });
                    x += colWidths[2];
                    doc.text(ordDisplay, x, y, { width: colWidths[3], align: 'right' });
                    x += colWidths[3];
                    doc.text(availDisplay, x, y, { width: colWidths[4], align: 'right' });

                    y += 18;
                });

                // Item Wise Total for Quality
                doc.font("Helvetica-Bold").fontSize(10);
                // Draw dotted line
                doc.strokeColor("#000000").dash(1, { space: 2 }).moveTo(startX, y).lineTo(startX + tableWidth, y).stroke().undash();
                y += 5;

                let tx = startX;
                doc.text("Item Wise Total", tx, y, { width: colWidths[0] + colWidths[1] });
                tx += colWidths[0] + colWidths[1];

                let totalProdDisplay, totalOrdDisplay, totalAvailDisplay;
                if (isTakaQuality) {
                    totalProdDisplay = `${qTotalProduced.toFixed(2)}m (${qTotalProducedCount})`;
                    totalOrdDisplay = `${qTotalOrdered.toFixed(2)}m (${qTotalOrderedCount})`;
                    totalAvailDisplay = `${qTotalAvailable.toFixed(2)}m (${qTotalAvailableCount})`;
                } else {
                    totalProdDisplay = `${qTotalProduced} pcs`;
                    totalOrdDisplay = `${qTotalOrdered} pcs`;
                    totalAvailDisplay = `${qTotalAvailable} pcs`;
                }

                doc.text(totalProdDisplay, tx, y, { width: colWidths[2], align: 'right' });
                tx += colWidths[2];
                doc.text(totalOrdDisplay, tx, y, { width: colWidths[3], align: 'right' });
                tx += colWidths[3];
                doc.text(totalAvailDisplay, tx, y, { width: colWidths[4], align: 'right' });

                y += 25; // Gap before next quality
            });

            // Gap before next factory
            y += 10;
        });

        // Grand Total Logic (Only if multiple qualities exist)
        const uniqueQualitiesCount = new Set(processedItems.map(i => i.qualityId?.fabricName)).size;

        if (uniqueQualitiesCount > 1) {
            if (y + 100 > doc.page.height - 30) {
                doc.addPage();
                y = 50;
            }

            y += 20;
            doc.font("Helvetica-Bold").fontSize(14).text("Grand Total", 30, y);
            y += 25;

            const boxWidth = 350;
            const boxHeight = 60;

            if (hasTaka) {
                drawTotalsBox(doc, 30, y, boxWidth, boxHeight, "Taka Grand Total", takaStats, "Taka");
                y += boxHeight + 20;
            }
            if (hasSaree) {
                // Check page break again
                if (y + boxHeight > doc.page.height - 30) {
                    doc.addPage();
                    y = 50;
                }
                drawTotalsBox(doc, 30, y, boxWidth, boxHeight, "Saree Grand Total", sareeStats, "Saree");
            }
        }

        doc.end();

    } catch (error) {
        next(error);
    }
};

// Helper to draw Total Box
function drawTotalsBox(doc, x, y, w, h, title, stats, type) {
    // Background
    doc.fillColor("#f1f5f9").roundedRect(x, y, w, h, 5).fill().fillColor("#000000");

    // Title
    doc.font("Helvetica-Bold").fontSize(10).text(title, x + 10, y + 10);

    doc.font("Helvetica").fontSize(9);
    const colW = w / 3;
    const labelY = y + 25;
    const valY = y + 38;
    const countY = y + 50; // extra line for counts

    // Columns: Produced, Ordered, Available
    const labels = ["Produced", "Ordered", "Available"];
    labels.forEach((l, i) => {
        doc.fillColor("#64748b").text(l, x + (i * colW) + 10, labelY).fillColor("#000000");
    });

    // Values
    doc.font("Helvetica-Bold");

    if (type === "Taka") {
        doc.text(`${stats.producedM.toFixed(2)}m`, x + 10, valY);
        doc.text(`${stats.orderedM.toFixed(2)}m`, x + colW + 10, valY);
        doc.fillColor("#22c55e").text(`${stats.availableM.toFixed(2)}m`, x + (2 * colW) + 10, valY).fillColor("#000000");

        // Counts
        doc.font("Helvetica").fontSize(8).fillColor("#64748b");
        doc.text(`(${stats.producedC} Taka)`, x + 10, countY);
        doc.text(`(${stats.orderedC} Taka)`, x + colW + 10, countY);
        doc.text(`(${stats.availableC} Taka)`, x + (2 * colW) + 10, countY);
        doc.fillColor("#000000");
    } else {
        doc.text(`${stats.produced} pcs`, x + 10, valY);
        doc.text(`${stats.ordered} pcs`, x + colW + 10, valY);
        doc.fillColor("#22c55e").text(`${stats.available} pcs`, x + (2 * colW) + 10, valY).fillColor("#000000");
    }
}

function drawTableHeader(doc, headers, startX, y, colWidths) {
    doc.fontSize(10).font("Helvetica-Bold");
    let x = startX;
    headers.forEach((h, i) => {
        // Produced, Ordered, Available are right aligned
        const align = i >= 2 ? "right" : "left";
        doc.text(h, x, y, { width: colWidths[i], align: align });
        x += colWidths[i];
    });
    doc.moveTo(startX, y + 15).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y + 15).stroke();
}

// Helper for sorting items naturally by design number
function sortInventoryItemsHelper(a, b) {
    const dnA = String(a.designId?.designNumber || "").trim();
    const dnB = String(b.designId?.designNumber || "").trim();

    const regex = /^([^\d]*)(\d*)/;
    const matchA = dnA.match(regex);
    const matchB = dnB.match(regex);

    const prefixA = matchA ? matchA[1].trim().toLowerCase() : "";
    const numA = matchA && matchA[2] ? parseInt(matchA[2], 10) : -1;

    const prefixB = matchB ? matchB[1].trim().toLowerCase() : "";
    const numB = matchB && matchB[2] ? parseInt(matchB[2], 10) : -1;

    if (prefixA && !prefixB) return -1;
    if (!prefixA && prefixB) return 1;

    if (prefixA < prefixB) return -1;
    if (prefixA > prefixB) return 1;

    return numA - numB;
}

function formatDate(d) {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}
