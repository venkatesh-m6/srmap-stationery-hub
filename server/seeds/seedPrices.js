/**
 * Seeds the Price collection with default values if it's empty.
 * Run: node seeds/seedPrices.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Price = require('../models/Price');

async function seedPrices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        const existing = await Price.findOne();
        if (existing) {
            console.log('Price document already exists:', existing.toObject());
            console.log('Skipping seed.');
        } else {
            const prices = await Price.create({});
            console.log('Default price document created:', prices.toObject());
        }

        await mongoose.disconnect();
        console.log('Seeding complete. Disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seedPrices();
