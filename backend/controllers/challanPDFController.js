import PDFDocument from "pdfkit";
import { Challan } from "../models/Challan.js";
import { Factory } from "../models/Factory.js";

// Helper for drawing tables
const drawTable = (doc, startY, columns, data, rowCallback) => {
    let currentY = startY;
    const pageWidth = doc.page.width;
    const margin = 40;
    const tableWidth = pageWidth - (margin * 2);

    // Header Background
    doc.rect(margin, currentY, tableWidth, 20).fill("#e5e7eb"); // Light Grey (Print Safe)

    // Header Text
    doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold"); // Black Text
    columns.forEach(col => {
        doc.text(col.header, col.x, currentY + 6, { width: col.width, align: col.align || 'left' });
    });

    currentY += 20;
    doc.fillColor("#000000").font("Helvetica");

    // Rows
    data.forEach((item, index) => {
        // Check Page Break
        if (currentY > doc.page.height - 50) {
            doc.addPage();
            currentY = 50;
            // Redraw Header on new page
            doc.rect(margin, currentY, tableWidth, 20).fill("#e5e7eb");
            doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold");
            columns.forEach(col => {
                doc.text(col.header, col.x, currentY + 6, { width: col.width, align: col.align || 'left' });
            });
            currentY += 20;
            doc.fillColor("#000000").font("Helvetica");
        }

        // Zebra Striping
        if (index % 2 === 0) {
            doc.rect(margin, currentY, tableWidth, 18).fill("#f9fafb"); // Very Light Grey
        } else {
            doc.rect(margin, currentY, tableWidth, 18).fill("#ffffff");
        }

        doc.fillColor("#000000");

        // Row Content (Callback allows custom rendering per row logic)
        rowCallback(doc, item, currentY, columns);

        currentY += 18;
    });

    return currentY;
};

export const generateChallanPDF = async (req, res, next) => {
    try {
        const challan = await Challan.findById(req.params.id)
            .populate("orderId", "orderNo orderDate")
            .populate("partyId")
            .populate("items.qualityId", "fabricName")
            .populate("items.designId", "designNumber")
            .populate("items.matchingQuantities.matchingId", "matchingName");

        if (!challan) {
            return res.status(404).json({ message: "Challan not found" });
        }

        // Fetch Factory Name
        let factoryName = "NIV KHATA";
        try {
            const factory = await Factory.findOne();
            if (factory && factory.factoryName) {
                factoryName = factory.factoryName;
            }
        } catch (e) { }

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=challan-${challan.challanNo}.pdf`);
        doc.pipe(res);

        // ================= HEADER =================
        // Religious Text
        doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text("!! SHREE GANESHAI NAMAH !!", { align: "center" });
        doc.moveDown(0.5);

        // Title (Center)
        doc.font("Helvetica-Bold").fontSize(14).fillColor("#374151").text("DELIVERY CHALLAN", { align: "center" });
        doc.moveDown(0.2);

        // Factory Name (Center, Big)
        doc.font("Helvetica-Bold").fontSize(24).fillColor("#000000").text(factoryName, { align: "center" });

        doc.moveDown(0.5);
        const yAfterHeader = doc.y + 10;

        // ================= INFO STRIP =================
        doc.rect(40, yAfterHeader, doc.page.width - 80, 25).fill("#f3f4f6");

        const infoY = yAfterHeader + 8;
        doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold");

        doc.text(`Challan No: ${challan.challanNo}`, 50, infoY);

        const dateText = `Date: ${new Date(challan.challanDate).toLocaleDateString()}`;
        const dateWidth = doc.widthOfString(dateText);
        doc.text(dateText, (doc.page.width - dateWidth) / 2, infoY);

        const orderText = `Order No: ${challan.orderId?.orderNo || "N/A"}`;
        const orderWidth = doc.widthOfString(orderText);
        doc.text(orderText, doc.page.width - 50 - orderWidth, infoY);

        // ================= PARTY DETAILS =================
        const partyY = yAfterHeader + 40;
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text("Billed To:", 40, partyY);

        doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text(challan.partyId?.partyName || "N/A", 40, partyY + 15);

        doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
        let addressY = partyY + 30;
        if (challan.partyId?.address) {
            doc.text(challan.partyId.address, 40, addressY, { width: 250 });
            addressY += doc.heightOfString(challan.partyId.address, { width: 250 }) + 2;
        }
        if (challan.partyId?.phone) {
            doc.text(`Ph: ${challan.partyId.phone}`, 40, addressY);
        }

        // ================= ITEM SUMMARY =================
        let summaryStartY = Math.max(addressY + 30, partyY + 80);

        doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text("Item Summary", 40, summaryStartY);

        const summaryCols = [
            { header: "Quality", x: 50, width: 150 },
            { header: "Design", x: 200, width: 150 },
            { header: "Total Quantity", x: 400, width: 100, align: 'right' }
        ];

        const summaryData = challan.items.map(item => {
            const qualityName = item.qualityId?.fabricName || "N/A";
            const designName = item.designId?.designNumber || "-";
            let totalQty = 0;
            let unit = "Pcs";
            if (item.quantityType === "Meter") unit = "Mtrs";

            if (item.type === "Taka") {
                totalQty = item.challanQuantity;
            } else {
                totalQty = item.matchingQuantities?.reduce((sum, mq) => sum + (mq.challanQuantity || 0), 0) || 0;
                unit = "Pcs";
            }
            return { qualityName, designName, totalQty: `${totalQty} ${unit}` };
        });

        const summaryEndY = drawTable(doc, summaryStartY + 15, summaryCols, summaryData, (doc, item, y, columns) => {
            doc.fontSize(9);
            doc.text(item.qualityName, columns[0].x, y + 5);
            doc.text(item.designName, columns[1].x, y + 5);
            doc.text(item.totalQty, columns[2].x, y + 5, { width: columns[2].width, align: 'right' });
        });

        // ================= SAREE DETAILS =================
        let currentY = summaryEndY + 30;

        const sareeItems = challan.items.filter(i => i.type === "Saree");
        if (sareeItems.length > 0) {
            if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 50; }

            doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text("Saree Detail Breakdown", 40, currentY);

            const sareeCols = [
                { header: "Quality", x: 50, width: 120 },
                { header: "Design", x: 170, width: 80 },
                { header: "Color/Matching", x: 250, width: 120 },
                { header: "Quantity", x: 380, width: 70, align: 'right' },
                { header: "Batch/Potla", x: 470, width: 80, align: 'right' }
            ];

            const sareeRows = [];
            sareeItems.forEach(item => {
                const qualityName = item.qualityId?.fabricName || "N/A";
                const designName = item.designId?.designNumber || "-";
                const batchNo = item.batchNo || "-";

                item.matchingQuantities?.forEach(mq => {
                    if (mq.challanQuantity > 0) {
                        sareeRows.push({
                            col1: qualityName,
                            col2: designName,
                            col3: mq.matchingId?.matchingName || "-",
                            col4: `${mq.challanQuantity} Pcs`,
                            col5: batchNo
                        });
                    }
                });
            });

            currentY = drawTable(doc, currentY + 15, sareeCols, sareeRows, (doc, row, y, columns) => {
                doc.fontSize(9);
                doc.text(row.col1, columns[0].x, y + 5, { width: columns[0].width });
                doc.text(row.col2, columns[1].x, y + 5, { width: columns[1].width });
                doc.text(row.col3, columns[2].x, y + 5, { width: columns[2].width });
                doc.text(row.col4, columns[3].x, y + 5, { width: columns[3].width, align: 'right' });
                doc.text(row.col5, columns[4].x, y + 5, { width: columns[4].width, align: 'right' });
            });
            currentY += 30; // Spacing after Saree table
        }

        // ================= TAKA DETAILS (2-Column Layout) =================
        const takaItems = challan.items.filter(i => i.type === "Taka");
        // Only show if there are selectedPieces to list
        const hasTakaPieces = takaItems.some(item => item.selectedPieces && item.selectedPieces.length > 0);

        if (hasTakaPieces) {
            if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 50; }

            doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text("Taka Piece Details", 40, currentY);
            currentY += 20;

            // Prepare Data
            let srNo = 1;
            const takaRows = [];
            takaItems.forEach(item => {
                const designName = item.designId?.designNumber || "-";
                if (item.selectedPieces) {
                    item.selectedPieces.forEach(piece => {
                        takaRows.push({
                            srNo: srNo++,
                            takaNo: piece.takaNo || "-",
                            meters: piece.meter ? piece.meter.toFixed(2) : "0.00",
                            design: designName
                        });
                    });
                }
            });

            // Column Config
            const colWidth = 250;
            const gap = 15;
            const leftX = 40;
            const rightX = leftX + colWidth + gap;

            const offSr = 0; const wSr = 30;
            const offTaka = 30; const wTaka = 70;
            const offMeter = 100; const wMeter = 55;
            const offDesign = 165; const wDesign = 85;

            const drawTakaHeader = (x, y) => {
                doc.rect(x, y, colWidth, 20).fill("#e5e7eb"); // Light Grey
                doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold");
                doc.text("Sr.", x + offSr + 5, y + 6, { width: wSr, align: 'center' });
                doc.text("Taka No", x + offTaka + 5, y + 6, { width: wTaka });
                doc.text("Meters", x + offMeter + 5, y + 6, { width: wMeter, align: 'right' });
                doc.text("Design", x + offDesign + 5, y + 6, { width: wDesign });
                doc.fillColor("#000000").font("Helvetica");
            };

            // Initial Header Draw
            let startY = currentY;
            drawTakaHeader(leftX, startY);
            drawTakaHeader(rightX, startY);
            currentY += 20;

            let colIndex = 0; // 0 = Left, 1 = Right
            let leftColBottomY = currentY;

            takaRows.forEach((row, index) => {
                // Check Bounds
                if (currentY > doc.page.height - 50) {
                    if (colIndex === 0) {
                        // Switch to Right Column
                        leftColBottomY = currentY; // Save bottom of left
                        colIndex = 1;
                        currentY = startY + 20; // +20 to skip header (header drawn once per block)
                    } else {
                        // Right is Full -> New Page
                        doc.addPage();
                        colIndex = 0;
                        currentY = 50;
                        doc.font("Helvetica-Bold").fontSize(11).text("Taka Piece Details (Contd.)", 40, currentY);
                        currentY += 20;
                        startY = currentY;
                        drawTakaHeader(leftX, startY);
                        drawTakaHeader(rightX, startY);
                        currentY += 20;
                        leftColBottomY = currentY;
                    }
                }

                const currentX = (colIndex === 0) ? leftX : rightX;

                // Alternate Row Color
                // We base it on 'index' but strictly it should be relative to column visual? 
                // index%2 is fine for simplicity.
                if (index % 2 === 0) doc.rect(currentX, currentY, colWidth, 16).fill("#f9fafb");

                doc.fillColor("#000000").fontSize(9);
                doc.text(row.srNo.toString(), currentX + offSr + 5, currentY + 4, { width: wSr, align: 'center' });
                doc.text(row.takaNo, currentX + offTaka + 5, currentY + 4, { width: wTaka });
                doc.text(row.meters, currentX + offMeter + 5, currentY + 4, { width: wMeter, align: 'right' });
                doc.text(row.design, currentX + offDesign + 5, currentY + 4, { width: wDesign });

                currentY += 16;
            });

            // Adjust Y for Footer
            // If ended in Col 1, it means Left was full. So we must push footer to next page or bottom.
            if (colIndex === 1) {
                // Force next page if we want clean separation, OR max(leftColBottomY, currentY)
                // But Footer is full width.
                // Left col extends to bottom. So footer cannot go there.
                currentY = doc.page.height; // This ensures footer check triggers addPage
            } else {
                // Ended in Col 0. Bottom is currentY.
            }
        }

        // ================= FOOTER =================
        let footerY = currentY + 30;
        if (footerY > doc.page.height - 80) {
            doc.addPage();
            footerY = 50;
        }

        if (challan.remarks) {
            doc.rect(40, footerY, doc.page.width - 80, 50).fill("#f9fafb");
            doc.strokeColor("#e5e7eb").rect(40, footerY, doc.page.width - 80, 50).stroke();

            doc.fillColor("#000000").fontSize(9);
            let currentFooterY = footerY + 10;
            const leftX = 50;

            if (challan.remarks) {
                doc.font("Helvetica-Bold").text("Remarks:", leftX, currentFooterY);
                doc.font("Helvetica").text(challan.remarks, leftX + 60, currentFooterY);
            }
        }

        doc.end();

    } catch (error) {
        next(error);
    }
};
