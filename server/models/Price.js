const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    bw: { type: Number, default: 2 },
    color: { type: Number, default: 10 },
    firstPageColor: { type: Number, default: 8 },
    singleSided: { type: Number, default: 0 },
    doubleSided: { type: Number, default: -0.5 },
    spiral: { type: Number, default: 30 },
    photo_4x6: { type: Number, default: 15 },
    passport: { type: Number, default: 50 },
    rush: { type: Number, default: 20 }
});

/**
 * Singleton pattern: finds the existing price document or creates one with defaults.
 */
priceSchema.statics.getOrCreate = async function () {
    let prices = await this.findOne();
    if (!prices) {
        prices = await this.create({});
    }
    return prices;
};

module.exports = mongoose.model('Price', priceSchema);
