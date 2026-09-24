const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
    className: { type: String, required: true, unique: true }, // Jaise: Nursery, LKG, UKG, 1st, 2nd, etc.
    pdfPath: { type: String, required: true } // PDF file ka path ya filename
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);