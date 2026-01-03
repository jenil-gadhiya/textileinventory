import mongoose from "mongoose";
import { config } from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
config({ path: join(__dirname, '..', '.env') });

const cleanupBrokers = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("MONGODB_URI not found in environment variables!");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const brokersCollection = db.collection("brokers");

        // Find all brokers
        const allBrokers = await brokersCollection.find({}).toArray();
        console.log("\nAll brokers:");
        allBrokers.forEach(broker => {
            console.log(`  - ID: ${broker._id}, Name: ${broker.brokerName}`);
        });

        // Delete brokers with invalid ObjectIds (not 24 hex characters)
        const invalidBrokers = allBrokers.filter(broker => {
            const idStr = broker._id.toString();
            return !/^[0-9a-fA-F]{24}$/.test(idStr);
        });

        if (invalidBrokers.length === 0) {
            console.log("\n✅ No invalid brokers found!");
        } else {
            console.log(`\n⚠️  Found ${invalidBrokers.length} invalid brokers:`);
            invalidBrokers.forEach(broker => {
                console.log(`  - ID: ${broker._id}, Name: ${broker.brokerName}`);
            });

            // Delete them
            const idsToDelete = invalidBrokers.map(b => b._id);
            const result = await brokersCollection.deleteMany({
                _id: { $in: idsToDelete }
            });

            console.log(`\n✅ Deleted ${result.deletedCount} invalid brokers!`);
        }

        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

cleanupBrokers();
