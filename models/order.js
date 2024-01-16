const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);


connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
});
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: { type: Number, default: 1 },
      productName: { type: String, required: true },
      productImage: { type: String, required: true },
      RegularPrice: { type: Number, required: true },
      salesPrice: { type: Number },
      
      offerPrice: { type: Number },
      shirtSize: { type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'] },
    },
  ],
  totalAmount: { type: Number, default: 0 },
  razorpayOrderId: { type: String,  },
  selectedAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  isCancelled: { type: Boolean, default: false }, 
  isReturned: { type: Boolean, default: false }, 
  walletPayment: { type: Boolean, default: false },
  ordered:{type: Boolean, default: false},
  status: {
    type: String,
    enum: ['Ordered', 'Shipped', 'Out for Delivery', 'Delivered',"Cancelled","Returned"],
    default: 'Ordered',
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'wallet', 'online'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now } ,
  couponApplied: { type: Boolean, default: false },
  couponDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
});



const Order = mongoose.model('Orders', orderSchema);

module.exports = Order;
