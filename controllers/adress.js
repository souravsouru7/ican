
const Cart = require('../models/cart');
const Product = require('../models/product');
const Address = require('../models/address');
const razorpay = require('razorpay');
const Order = require('../models/order');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
const instance = new razorpay({
  key_id: 'rzp_test_6wHpOwRUL1Hux2',
  key_secret: 'OFEnQfU6ANO5ITNCPxInZ7WZ',
});
exports.getCartDetails = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return { products: [] };
    }

    const productIds = cart.products.map(cartProduct => cartProduct.product);
    const productsWithQuantity = await Product.find({ _id: { $in: productIds } })
      .select('productName regularPrice _id')
      .lean();

    for (const product of productsWithQuantity) {
      const cartProduct = cart.products.find(p => p.product.equals(product._id));
      product.quantity = cartProduct.quantity;
    }

    return { products: productsWithQuantity };
  } catch (error) {
    console.error(error);
    throw new Error('Error fetching cart details');
  }
};

// controllers/adress.js
// controllers/address.js

exports.delivery = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      return res.redirect('/login');
    }

    // Ensure that getCartDetails is defined before calling it
    const getCartDetails = require('./adress').getCartDetails;
    const cartDetails = await getCartDetails(userId);

    // Fetch the user's cart from the database, populating the 'products' field
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.render('delivery', { products: [], totalAmount: 0, addresses: [] });
    }

    // Consider the applied coupon while displaying the total
    let totalAmount = cart.totalAmount;
    if (cart.appliedCoupon && cart.appliedCoupon.discountAmount) {
      totalAmount -= cart.appliedCoupon.discountAmount;
    }

    const addresses = await Address.find({ user: userId });

    // Pass the 'cart' variable to the template
    return res.render('delivery', { products: cartDetails.products, totalAmount, addresses, cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.payment = (req, res) => {
  res.render("sucess");
};

exports.generateRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    if (!userId) {
      return res.redirect('/login');
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid cart or total amount' });
    }

    const selectedAddressId = req.body.selectedAddress;
    const selectedPaymentMethod = req.body.selectedPaymentMethod;

    let order;

    if (selectedPaymentMethod === 'wallet') {
      const user = await User.findById(userId).populate('wallet');

      if (!user || !user.wallet) {
        return res.status(400).json({ message: 'User or wallet not found' });
      }

      if (user.wallet.balance < cart.totalAmount) {
        return res.status(400).json({ message: 'Insufficient funds in the wallet' });
      }

      // Deduct the amount from the wallet balance
      user.wallet.balance -= cart.totalAmount;
      await user.wallet.save();
      await user.save();
      const appliedCoupon = cart.appliedCoupon;
    
      order = new Order({
        user: userId,
        products: cart.products,
        totalAmount: cart.totalAmount,
        selectedAddress: selectedAddressId,
        walletPayment: true, 
        paymentMethod: 'wallet',
        couponApplied: appliedCoupon ? true : false,
        couponDetails: appliedCoupon ? appliedCoupon._id : null,
        ordered:true,
      });
    } else {
      // For online payments using Razorpay
      const razorpayOrder = await instance.orders.create({
        amount: cart.totalAmount * 100,
        currency: 'INR',
        receipt: 'order_rcpt_1',
        payment_capture: 1,
      });

      const appliedCoupon = cart.appliedCoupon;
      order = new Order({
        user: userId,
        products: cart.products,
        totalAmount: cart.totalAmount,
        razorpayOrderId: razorpayOrder.id,
        selectedAddress: selectedAddressId,
        couponApplied: appliedCoupon ? true : false,
        couponDetails: appliedCoupon ? appliedCoupon._id : null,
        paymentMethod: 'online',
        ordered:true,
      });
    }

    // Save the order to the database
    await order.save();

    // Clear the user's cart after a successful payment
    await Cart.findOneAndDelete({ user: userId });

    if (selectedPaymentMethod !== 'wallet') {
      res.json({
        orderId: order.razorpayOrderId,
        amount: order.totalAmount,
        currency: 'INR',
        keyId: 'rzp_test_6wHpOwRUL1Hux2',
      });
    } else {
      res.json({
        orderId: order._id, // Send the order ID instead for wallet payments
        amount: order.totalAmount,
        currency: 'INR',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating order' });
  }
};
exports.cod= async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    if (!userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const selectedAddressId = req.params.selectedAddress;

    // Fetch the user's cart from the database, populating the 'products' field
    const cart = await Cart.findOne({ user: userId });

    if (!cart || cart.totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid cart or total amount' });
    }
    const appliedCoupon = cart.appliedCoupon;
    // Create an order without involving Razorpay for COD
    const order = new Order({
      user: userId,
      products: cart.products,
      totalAmount: cart.totalAmount,
      selectedAddress: selectedAddressId,
      walletPayment: false,
      status: 'Ordered',
      paymentMethod: 'cod',
      couponApplied: appliedCoupon ? true : false,
      couponDetails: appliedCoupon ? appliedCoupon._id : null, 
      ordered:true,
    });

    // Save the order to the database
    await order.save();

    // Clear the user's cart after a successful order placement
    await Cart.findOneAndDelete({ user: userId });

    res.json({
      orderId: order._id,
      amount: order.totalAmount,
      currency: 'INR', // You may adjust this based on your currency
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating Cash on Delivery order' });
  }
};
// Add a new route to handle storing order details
exports.storedata = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    if (!userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Retrieve the order details from the database using orderId
    const orderId = req.params.orderId;

    // Validate orderId to prevent CastError
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid orderId format' });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Perform any additional logic to store the order details as needed

    res.json({ message: 'Order details stored successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
