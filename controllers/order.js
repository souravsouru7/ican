const Cart = require('../models/cart');
const Product = require('../models/product');
const User = require('../models/User');
const Order = require('../models/order');
const Wallet = require('../models/Wallet');
const puppeteer = require('puppeteer');
const Coupon = require('../models/coupon');
const fs = require('fs');

const ITEMS_PER_PAGE = 4; // Adjust the number of items per page as needed


exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    if (!userId) {
      return res.redirect('/login');
    }

    const page = parseInt(req.query.page) || 1;

    const totalOrders = await Order.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .populate('products.product');

    return res.render('order-history', { orders, currentPage: page, totalPages }); // Include totalPages in the data
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




exports.getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    if (!userId) {
      return res.redirect('/login');
    }

    const order = await Order.findOne({ _id: req.params.orderId, user: userId })
      .populate({
        path: 'products.product',
        select: 'productName productImage regularPrice reviews',
      })
      .populate({
        path: 'selectedAddress',
        select: 'street city state pincode country',
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Fetch coupon details if available
    let couponDetails = null;
    if (order.couponCode) {
      couponDetails = await Coupon.findOne({ code: order.couponCode });
    }

    // Extract product from the first item in products array
    const product = order.products.length > 0 ? order.products[0].product : null;

    // Include order status, coupon details, and product in the data
    const orderStatus = order.status;

    return res.render('order-details', { order, product, userId, orderStatus, couponDetails });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};






exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;

    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const orderId = req.params.orderId;

    // Fetch the order by ID and populate the selectedAddress field
    const order = await Order.findById(orderId).populate('selectedAddress');

    
    if (!order || order.user.toString() !== userId.toString() || order.isCancelled) {
      return res.status(404).json({ error: 'Order not found or already cancelled.' });
    }

    // Set isCancelled and update status to "Cancelled"
    order.isCancelled = true;
    order.status = 'Cancelled';

    // Save the changes to the order
    await order.save();
    if (order.paymentMethod === 'cod') {
      // If it's Cash on Delivery, no need to add the amount to the wallet
      return res.redirect('/wallet'); // Redirect to the wallet page without adding the amount
    }
    // Fetch the user and wallet details
    const user = await User.findById(userId).populate('wallet');

    // If the user is not found, return an error
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // If the user doesn't have a wallet, create a new one
    if (!user.wallet) {
      user.wallet = new Wallet({ balance: 0, transactions: [] });
    }

    // Log order details and wallet balance before and after the cancellation
    console.log('Order Total Amount:', order.totalAmount);
    console.log('User Wallet Balance (Before):', user.wallet.balance);

    // Add a transaction for the cancelled order to the user's wallet
    user.wallet.transactions.push({
      amount: order.totalAmount,
      type: 'add',
      timestamp: Date.now(),
    });

    // Update the wallet balance
    user.wallet.balance += order.totalAmount;

    // Save the changes to the wallet and user
    await user.wallet.save();
    await user.save();

    // Log the updated wallet balance
    console.log('User Wallet Balance (After):', user.wallet.balance);

    // Redirect to the wallet page with the cancelled order's total amount and new wallet balance
    res.redirect(`/wallet?cancelledOrderAmount=${order.totalAmount}&newWalletBalance=${user.wallet.balance}`);
  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
exports.returnOrder = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;

    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const orderId = req.params.orderId;

    // Fetch the order by ID and populate the selectedAddress field
    const order = await Order.findById(orderId).populate('selectedAddress');

    
    if (!order || order.user.toString() !== userId.toString() || order.isCancelled) {
      return res.status(404).json({ error: 'Order not found or already cancelled.' });
    }

    // Set isCancelled and update status to "Cancelled"
    order.isCancelled = true;
    order.isReturned=true;
    order.status = 'Returned';

    // Save the changes to the order
    await order.save();

    // Fetch the user and wallet details
    const user = await User.findById(userId).populate('wallet');

    // If the user is not found, return an error
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // If the user doesn't have a wallet, create a new one
    if (!user.wallet) {
      user.wallet = new Wallet({ balance: 0, transactions: [] });
    }

    // Log order details and wallet balance before and after the cancellation
    console.log('Order Total Amount:', order.totalAmount);
    console.log('User Wallet Balance (Before):', user.wallet.balance);

    // Add a transaction for the cancelled order to the user's wallet
    user.wallet.transactions.push({
      amount: order.totalAmount,
      type: 'add',
      timestamp: Date.now(),
    });

    // Update the wallet balance
    user.wallet.balance += order.totalAmount;

    // Save the changes to the wallet and user
    await user.wallet.save();
    await user.save();

    // Log the updated wallet balance
    console.log('User Wallet Balance (After):', user.wallet.balance);

    // Redirect to the wallet page with the cancelled order's total amount and new wallet balance
    res.redirect(`/wallet?cancelledOrderAmount=${order.totalAmount}&newWalletBalance=${user.wallet.balance}`);
  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.addOrEditReview = async (req, res) => {
  const productId = req.params.productId;
  const { userId, text, rating, reviewId } = req.body;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Find the review based on user ID
    const existingReview = product.reviews.find((review) => review.user.toString() === userId);

    if (existingReview) {
      // Update existing review
      existingReview.text = text;
      existingReview.rating = rating;
    } else {
      // Add new review
      product.reviews.push({ user: userId, text, rating });
    }

    // Save the product with the updated reviews
    await product.save();

    res.status(200).json({ message: 'Review added/edited successfully' });
  } catch (error) {
    console.error('Error adding/editing review:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



// DELETE request to delete a review
exports.delrivew= async (req, res) => {
  try {
    const reviewId = req.params.reviewId;

    const product = await Product.findOne({ 'reviews._id': reviewId });

    if (!product) {
      return res.status(404).json({ error: 'Product or review not found' });
    }

    product.reviews = product.reviews.filter((review) => review._id.toString() !== reviewId);
   
    await product.save();

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.invoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate('user').populate('selectedAddress').populate('products.product');


    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Generate PDF invoice using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const content = generateInvoiceContent(order);
    await page.setContent(content);
    const pdfBuffer = await page.pdf();
    await browser.close();

    // Send the PDF as a response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

function generateInvoiceContent(order) {
  const companyName = 'Cara';
  const currentDate = new Date().toLocaleDateString();

  let content = `
  <style>
  .invoice-container {
    border: 2px solid #333;
    padding: 20px;
    margin: 20px auto;
    font-family: 'Arial', sans-serif;
    max-width: 800px;
  }

  h1 {
    text-align: center;
    color: #007bff; /* Bold color for header */
    font-size: 24px;
    margin-bottom: 20px;
    border-bottom: 2px solid #ddd;
  }

  .order-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .customer-info {
    width: 50%;
  }

  .order-info p {
    font-weight: bold; /* Bold for key information */
  }

  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ddd;
  }

  th, td {
    padding: 12px;
    text-align: left;
  }

  th {
    background-color: #f2f2f2;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #f8f8f8;
  }

  .footer {
    margin-top: 20px;
    text-align: right;
    border-top: 2px solid #ddd;
  }

  .footer p {
    font-weight: bold; /* Bold for total amount */
    margin-bottom: 0;
  }
</style>

    <div class="invoice-container">
      <h1>${companyName} Invoice</h1>
      <div class="order-info">
        <div class="customer-info">
          <p><strong>Customer:</strong> ${order.user.name}</p>
          <p><strong>Shipping Address:</strong> ${getUserAddress(order.selectedAddress)}</p>
        </div>
        <div>
          <p><strong>Date:</strong> ${currentDate}</p>
          <p><strong>Order #:</strong> ${order._id}</p>
        </div>
      </div>
      <table>
        <tr>
          <th>Product Name</th>
          <th>Quantity</th>
          <th>Amount</th>
        </tr>
  `;

  order.products.forEach(product => {
    content += `
        <tr>
          <td>${product.product.productName}</td>
          <td>${product.quantity}</td>
          <td>${product.product.regularPrice}</td>
        </tr>
      `;
  });

  const totalAmount = order.products.reduce((total, product) => total + product.product.regularPrice * product.quantity, 0);

  content += `
      </table>
      <div class="footer">
        <p><strong>Total Amount:</strong> ${totalAmount}</p>
      </div>
    </div>
  `;

  return content;
}

function getUserAddress(address) {
  if (!address) {
    return 'N/A';
  }

  return `${address.street}, ${address.city}, ${address.state}, ${address.zipCode}, ${address.country}`;
}

