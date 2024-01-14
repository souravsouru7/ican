const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);


connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
    
});

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, default: 1 }
        }
    ],
    totalAmount: { type: Number, default: 0 }, 
    appliedCoupon: {
        code: String,
        discountPercentage: Number,
        discountAmount: { type: Number, default: 0 }, 
      },
   
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;