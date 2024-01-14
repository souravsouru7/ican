const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);


connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
});

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
});
couponSchema.methods.isValid = function () {
    try {
        // Check if the current date is before the expiryDate
        return this.expiryDate > new Date();
    } catch (error) {
        console.error("Error checking coupon validity:", error);
        return false;
    }
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;