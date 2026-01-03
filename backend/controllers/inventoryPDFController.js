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
            .sort({ qualityId: 1, designId: 1 });

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
                takaStats.orderedC += (item.totalTakaOrdered || 0); // Corrected
                takaStats.availableM += (item.availableMeters || 0);
                takaStats.availableC += (item.availableTaka || 0);
            } else if (item.type === "Saree") {
                hasSaree = true;
                sareeStats.produced += (item.totalSareeProduced || 0);
                sareeStats.ordered += (item.totalSareeOrdered || 0);
                sareeStats.available += (item.availableSaree || 0);
            }
        });

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

        // Totals Section
        let y = doc.y;
        const boxWidth = 350;
        const boxHeight = 60;

        if (hasTaka || hasSaree) {
            doc.fontSize(10);
            if (hasTaka && !hasSaree) {
                // Centered Taka Box
                drawTotalsBox(doc, (doc.page.width - boxWidth) / 2, y, boxWidth, boxHeight, "Taka Totals", takaStats, "Taka");
                y += boxHeight + 20;
            } else if (!hasTaka && hasSaree) {
                // Centered Saree Box
                drawTotalsBox(doc, (doc.page.width - boxWidth) / 2, y, boxWidth, boxHeight, "Saree Totals", sareeStats, "Saree");
                y += boxHeight + 20;
            } else {
                // Both
                const gap = 20;
                const startX = (doc.page.width - (boxWidth * 2 + gap)) / 2;
                drawTotalsBox(doc, startX, y, boxWidth, boxHeight, "Taka Totals", takaStats, "Taka");
                drawTotalsBox(doc, startX + boxWidth + gap, y, boxWidth, boxHeight, "Saree Totals", sareeStats, "Saree");
                y += boxHeight + 20;
            }
        }

        // Table Constants
        const startX = 30;
        const colWidths = [180, 80, 100, 60, 100, 100, 100];
        const headers = ["Quality", "Design", "Factory", "Type", "Produced", "Ordered", "Available"];

        // Ensure space for table header
        if (y + 40 > doc.page.height - 30) {
            doc.addPage({ layout: 'landscape', margin: 30 });
            y = 50;
        }

        // Header Row
        drawTableHeader(doc, headers, startX, y, colWidths);
        y += 25;

        // Data Rows
        doc.font("Helvetica").fontSize(9);

        processedItems.forEach((item, index) => {
            if (y > 510) { // Page Break
                doc.addPage({ layout: 'landscape', margin: 30 });
                y = 50;
                // Header on new page
                drawTableHeader(doc, headers, startX, y, colWidths);
                y += 25;
                doc.font("Helvetica").fontSize(9);
            }

            const quality = item.qualityId?.fabricName || "-";
            const design = item.designId?.designNumber || "-";
            const factory = item.factoryId?.factoryName || "-";
            const typeVal = item.type;

            const produced = item.type === "Taka"
                ? `${item.totalMetersProduced.toFixed(2)}m`
                : `${item.totalSareeProduced} pcs`;

            const ordered = item.type === "Taka"
                ? `${item.totalMetersOrdered.toFixed(2)}m`
                : `${item.totalSareeOrdered} pcs`;

            const available = item.type === "Taka"
                ? `${(item.availableMeters || 0).toFixed(2)}m`
                : `${item.availableSaree || 0} pcs`;

            // Row rendering
            let x = startX;
            const values = [quality, design, factory, typeVal, produced, ordered, available];

            values.forEach((v, i) => {
                doc.text(v, x, y, { width: colWidths[i], align: "left" });
                x += colWidths[i];
            });

            // Line separator
            doc.strokeColor("#eeeeee")
                .moveTo(startX, y + 15)
                .lineTo(startX + 750, y + 15)
                .stroke()
                .strokeColor("#000000"); // Reset

            y += 20;
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
        doc.text(h, x, y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
    });
    doc.moveTo(startX, y + 15).lineTo(startX + 750, y + 15).stroke();
}
