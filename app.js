require('dotenv').config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const signup = require("./controllers/signup");
const home = require("./controllers/mainCotroller");
const login = require("./controllers/login");
const bodyParser = require("body-parser");
const admin = require("./controllers/admin");
const session = require('express-session');
const logout = require('./controllers/login');
const cart = require("./controllers/cart");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const deladres=require("./controllers/adress");
const user=require("./controllers/user");
const order =require("./controllers/order");
const wallet=require("./controllers/wallet");


app.set('view engine', 'ejs');

app.use(express.static('public', { 'Content-Type': 'text/css' }));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// JWT Secret Key
const jwtSecret = 'your-secret-jwt-key';

// Move the jwtSecret definition above the middleware
const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization;

    if (!token) {
        // Redirect to login page if no token is provided
        return res.redirect('/login');
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            // Redirect to login page if token is invalid
            return res.redirect('/login');
        }

        req.user = decoded;
        next();
    });
};


// Add the new routes with the verifyToken middleware
app.use('/admin/dashboard/sales/report', admin);
app.get("/", verifyToken, home.homePage);
app.get("/shop", verifyToken, home.shopPage);
app.get("/product/:productId", verifyToken, home.single);
app.get('/signup', signup.signuppage);
app.post('/signup', signup.signup);
app.get("/contact",home.contact);
app.get('/verify/:email', signup.verify);
app.get("/about",home.aboutus);
// Add the verifyToken middleware to routes that require authentication
app.post('/add-to-cart/:productId', verifyToken, cart.addToCart);
app.get("/cart", cart.viewCart);
app.delete('/remove-from-cart/:productId', cart.removeFromCart);
app.get('/cart-details',cart.cartdetails);
app.put('/update-cart-details',cart.updateqnt);
app.delete('/remove-coupon', cart.removeCoupon);
// coupon

app.get('/profile', home.profilePage);
app.get('/profile/details', home.userDetailsPage);
app.get('/profile/update', home.updateDetailsPage);
app.post('/profile/update', home.updateDetails);
app.get('/profile/address', user.addressPage);
// Update the route handler in your app.js
app.post('/profile/change-password', verifyToken, user.changePassword);
app.get('/profile/change-password', verifyToken, user.changePasswordPage);
app.get("/profile/address/new-address", verifyToken, user.newAddressPage);
app.get('/profile/address/delete/:id', user.deleteAddress);
app.get('/profile/address/edit/:id', user.editAddressPage);
app.post("/submit-new-address", verifyToken,user.createNewAddress)
app.post('/profile/address/edit/:id', verifyToken, user.updateAddress);
app.post('/generate-razorpay-order', verifyToken, deladres.generateRazorpayOrder);

// Login routes
app.get('/login', login.loginPage);
app.post('/loginUser', login.loginUser);
app.get('/logout', logout.logoutUser);
app.get("/delivery-address",verifyToken, deladres.delivery);
// Delivery and cart-related routes
app.get('/delivery', verifyToken, deladres.delivery);
app.post('/generate-cod-order/:selectedAddress',deladres.cod);
app.get("/payment",deladres.payment);
app.get("/successpage", deladres.payment);
app.post('/store-order-details/:orderId', verifyToken,deladres.storedata);

//orders

app.get('/order-history', verifyToken, order.getOrderHistory);
app.get('/order/:orderId', verifyToken, order.getOrderDetails);
app.post('/cancel-order/:orderId', order.cancelOrder);
app.post('/return-order/:orderId', order.returnOrder);
app.post('/:productId/add-review', order.addOrEditReview);
app.delete('/delete-review/:reviewId',order.delrivew);
app.get('/download-invoice/:orderId',order.invoice);

//wallet
app.get("/wallet",verifyToken,wallet.wallet);
app.post("/add-fund",verifyToken,wallet.addfund);
app.post('/apply-coupon', cart.applyCoupon);
app.post('/wallet/add-referral-bonus', wallet.addReferralBonus);
// Add the verifyToken middleware to routes that require authentication
app.get('/wishlist', verifyToken, home.wishlist);
app.post('/api/wishlist/:productId', verifyToken, home.addToWishlist);
app.delete('/api/wishlist/:productId', verifyToken, home.removeFromWishlist);
// Admin routes (catch-all route)
app.use('/', admin);
app.use((req, res, next) => {
    res.status(404).render('404'); // Render the 404.ejs template
});

// Handle other errors (500 Internal Server Error)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
