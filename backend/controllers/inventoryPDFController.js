import PDFDocument from "pdfkit";
import { Inventory } from "../models/Inventory.js";

export const generateInventoryPDF = async (req, res, next) => {
    try {
        const { factory, quality, design, type, fromDate, toDate } = req.query;

        const filter = {};
        if (factory) filter.factoryId = factory;
        if (quality) filter.qualityId = quality;
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
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=stock-report-${Date.now()}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text("Stock Report", { align: "center" });
        doc.moveDown(0.5);

        const dateText = (fromDate && toDate)
            ? `Filter Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`
            : `Generated on: ${new Date().toLocaleDateString()}`;
        doc.fontSize(10).text(dateText, { align: "center" });
        doc.moveDown();

        // Totals Section (Keep existing totals logic)
        let y = doc.y;
        const boxWidth = 350;
        const boxHeight = 60;

        if (hasTaka || hasSaree) {
            doc.fontSize(10);
            if (hasTaka && !hasSaree) {
                drawTotalsBox(doc, (doc.page.width - boxWidth) / 2, y, boxWidth, boxHeight, "Taka Totals", takaStats, "Taka");
                y += boxHeight + 20;
            } else if (!hasTaka && hasSaree) {
                drawTotalsBox(doc, (doc.page.width - boxWidth) / 2, y, boxWidth, boxHeight, "Saree Totals", sareeStats, "Saree");
                y += boxHeight + 20;
            } else {
                const gap = 20;
                const startX = (doc.page.width - (boxWidth * 2 + gap)) / 2;
                drawTotalsBox(doc, startX, y, boxWidth, boxHeight, "Taka Totals", takaStats, "Taka");
                drawTotalsBox(doc, startX + boxWidth + gap, y, boxWidth, boxHeight, "Saree Totals", sareeStats, "Saree");
                y += boxHeight + 20;
            }
        }

        // Table Constants - Updated columns (Removed Quality, Removed Type)
        const startX = 30;
        // Cols: Design (150), Matching (150), Produced (120), Ordered (120), Available (120)
        const colWidths = [150, 150, 120, 120, 120];
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

        // Iterate
        Object.entries(groupedByFactory).forEach(([factoryName, qualities]) => {

            // Factory Header
            if (y + 40 > doc.page.height - 30) {
                doc.addPage({ layout: 'landscape', margin: 30 });
                y = 50;
            }

            doc.font("Helvetica-Bold").fontSize(14).fillColor("#1e293b");
            doc.text(`FACTORY: ${factoryName.toUpperCase()}`, startX, y);
            y += 25;

            // Iterate Qualities
            Object.entries(qualities).forEach(([qualityName, items]) => {

                // Check page break for Quality Header + Table Header + 1 Row (approx 80px)
                if (y + 80 > doc.page.height - 30) {
                    doc.addPage({ layout: 'landscape', margin: 30 });
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
                let qTotalOrdered = 0;
                let qTotalAvailable = 0; // Note: Mixing units (meters/pcs) is tricky for total. 
                // Usually totals are separated by unit. 
                // For simplicity, we'll try to sum numbers but if mixed types exist, it might be weird.
                // Assuming a Quality is usually one Type (either Saree or Taka).

                const isTakaQuality = items.some(i => i.type === "Taka");
                const unit = isTakaQuality ? "m" : "pcs";

                items.forEach(item => {
                    if (y > 520) {
                        doc.addPage({ layout: 'landscape', margin: 30 });
                        y = 50;
                        drawTableHeader(doc, headers, startX, y, colWidths);
                        y += 20;
                        doc.font("Helvetica").fontSize(10);
                    }

                    const design = item.designId?.designNumber || "-";
                    const matching = item.matchingId?.matchingName || "-";

                    const prodVal = item.type === "Taka" ? item.totalMetersProduced : item.totalSareeProduced;
                    const ordVal = item.type === "Taka" ? item.totalMetersOrdered : item.totalSareeOrdered;
                    const availVal = item.type === "Taka" ? item.availableMeters : item.availableSaree;

                    qTotalProduced += (prodVal || 0);
                    qTotalOrdered += (ordVal || 0);
                    qTotalAvailable += (availVal || 0);

                    // Row
                    let x = startX;

                    doc.text(design, x, y, { width: colWidths[0] });
                    x += colWidths[0];
                    doc.text(matching, x, y, { width: colWidths[1] });
                    x += colWidths[1];
                    doc.text(`${prodVal?.toFixed(2) || 0} ${unit}`, x, y, { width: colWidths[2], align: 'right' });
                    x += colWidths[2];
                    doc.text(`${ordVal?.toFixed(2) || 0} ${unit}`, x, y, { width: colWidths[3], align: 'right' });
                    x += colWidths[3];
                    doc.text(`${availVal?.toFixed(2) || 0} ${unit}`, x, y, { width: colWidths[4], align: 'right' });

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

                doc.text(`${qTotalProduced.toFixed(2)} ${unit}`, tx, y, { width: colWidths[2], align: 'right' });
                tx += colWidths[2];
                doc.text(`${qTotalOrdered.toFixed(2)} ${unit}`, tx, y, { width: colWidths[3], align: 'right' });
                tx += colWidths[3];
                doc.text(`${qTotalAvailable.toFixed(2)} ${unit}`, tx, y, { width: colWidths[4], align: 'right' });

                y += 25; // Gap before next quality
            });

            // Gap before next factory
            y += 10;
        });

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
