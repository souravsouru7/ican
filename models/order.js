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
      productName: { type: String, required: true },
      productImage: [
        {
            type: String,
        },
    ],
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
      regularPrice: { type: Number, required: true },
      quantity: { type: Number, required: true },
      offerPrice: { type: Number },
      shirtSize: { type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'] },
      reviews: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          text: String,
          rating: { type: Number, min: 1, max: 5 },
        },
      ],
    },
  ],
  Product: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, default: 1 },
      
    },
  ],
  selectedAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  totalAmount: { type: Number, default: 0 },
  razorpayOrderId: { type: String,  },
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
