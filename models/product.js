// models/Product.js

const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);


connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
});

const productSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: { type: String },
    productImage: [
        {
            type: String,
        },
    ],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    regularPrice: { type: Number, required: true },
    salesPrice: { type: Number },
    stockStatus: { type: String, enum: ['In Stock', 'Out of Stock'], required: true },
    quantity: { type: Number, required: true },
    offerPrice: { type: Number },
    shirtSize: { type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'] },
    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            text: String,
            rating: { type: Number, min: 1, max: 5 },
        }
    ],
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
