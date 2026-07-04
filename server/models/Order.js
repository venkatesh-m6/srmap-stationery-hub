const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        unique: true,
        sparse: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    details: {
        type: String
    },
    phone: {
        type: String
    },
    filePath: {
        type: String
    },
    fileName: {
        type: String
    },
    status: {
        type: String,
        enum: ['new', 'processing', 'ready'],
        default: 'new'
    },
    price: {
        type: Number
    },
    options: {
        type: mongoose.Schema.Types.Mixed
    }
});

module.exports = mongoose.model('Order', orderSchema);
