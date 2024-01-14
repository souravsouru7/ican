const Product = require('../models/product');
const User = require('../models/User');
const Category = require('../models/category');
const jwt = require('jsonwebtoken');
const jwtSecret = 'your-secret-jwt-key';
const Coupon = require('../models/coupon'); // Make sure to use the same secret as in your login route
exports.homePage = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization;

        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, jwtSecret, async (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }

            const user = await User.findOne({ email: decoded.email });

            if (user && user.verified && user.status !== 'blocked') {
                // Fetch products and categories
                const products = await Product.find();
                const categories = await Category.find();

                // Pass 'user' to the res.render method
                return res.render('index', { products, categories, title: 'Home', user });
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error fetching products and categories:', error);
        return res.status(500).send('Internal Server Error');
    }
};



exports.shopPage = async (req, res) => {
    try {
        // Fetch categories for sidebar
        const categories = await Category.find();

        const pageSize = 8; // Number of products to display per page
        const currentPage = req.query.page || 1; // Current page from query parameters

        let products;

        if (req.query.search) {
            // Filter by search query
            products = await Product.find({
                $or: [
                    { productName: { $regex: new RegExp(req.query.search, 'i') } },
                    { 'category.name': { $regex: new RegExp(req.query.search, 'i') } },
                ],
            }).populate('category');
        } else if (req.query.category) {
            // Filter by category
            const selectedCategory = await Category.findOne({ name: req.query.category });
            if (selectedCategory) {
                products = await Product.find({
                    category: selectedCategory._id,
                }).populate('category');
            } else {
                products = [];
            }
        } else if (req.query.priceRange || req.query.size) {
            // Parse the price range values from the frontend
            const [minPrice, maxPrice] = req.query.priceRange ? req.query.priceRange.split('-') : [0, Infinity];

            // Filter by price range and size
            products = await Product.find({
                $and: [
                    { regularPrice: { $gte: minPrice, $lte: maxPrice } },
                    { shirtSize: req.query.size },
                ],
            }).populate('category');
        } else {
            // Fetch all products if no filters are applied
            products = await Product.find().populate('category');
        }

        // Sort products based on user's preference
        if (req.query.sort === 'low-to-high') {
            products.sort((a, b) => a.regularPrice - b.regularPrice);
        } else if (req.query.sort === 'high-to-low') {
            products.sort((a, b) => b.regularPrice - a.regularPrice);
        }

        // Pagination logic
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / pageSize);

        // Slice the products array to get only the products for the current page
        products = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        res.render('shop', { products: products || [], categories, title: 'Shop', totalPages, currentPage });
    } catch (error) {
        console.error('Error fetching products and categories:', error);
        res.status(500).send('Internal Server Error');
    }
};

  
// mainController.js

// mainController.js
exports.single = async (req, res) => {
    try {
        const productId = req.params.productId;

        // Fetch the product and populate the 'reviews' field
        const product = await Product.findById(productId).populate({
            path: 'reviews.user',
            select: 'name', // Select only the 'name' field of the user
        });

        const products = await Product.find();

        const user = req.session.user;

        
        const editMode = true; 

        if (!user || !user._id) {
        
            return res.status(401).render("error", { title: "Unauthorized", message: "User not authorized" });
        }

        res.render("singlepro", { product, products, title: product.productName, user, editMode });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).render("error", { title: "Internal Server Error", message: "Internal server error" });
    }
};





exports.profilePage = async (req, res) => {
    try {
        // Logic to get the user, for example, if using session
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

      

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.render('profile');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// mainController.js
 // Assuming you have a Coupon model

exports.userDetailsPage = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization;

        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, jwtSecret, async (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }

            const user = await User.findOne({ email: decoded.email });

            if (user && user.verified && user.status !== 'blocked') {
                // Fetch available and not expired coupons
                const validCoupons = await Coupon.find({ expiryDate: { $gt: new Date() } });

                res.render('userdata', { title: 'User Data', user, validCoupons });
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
};
// mainController.js
exports.updateDetailsPage = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization;

        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, jwtSecret, async (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }

            const user = await User.findOne({ email: decoded.email });

            if (user && user.verified && user.status !== 'blocked') {
                res.render('updateDetails', { title: 'Update Details', user });
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.updateDetails = async (req, res) => {
    try {
        const { lastName, age, gender } = req.body;

        const token = req.cookies.token || req.headers.authorization;

        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, jwtSecret, async (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }

            const user = await User.findOneAndUpdate(
                { email: decoded.email },
                { $set: { lastName, age, gender } },
                { new: true }
            );

            if (user && user.verified && user.status !== 'blocked') {
                return res.redirect('/profile');
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).send('Internal Server Error');
    }
};
const Wishlist = require('../models/wishlist'); // Add this line to import the Wishlist model
const { render } = require('ejs');

// ... (other imports)
exports.addToWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.redirect('/login');
        }

        // Check if the product is already in the wishlist
        const isInWishlist = await Wishlist.findOne({
            user: userId,
            product: productId,
        });

        if (isInWishlist) {
            // Product is already in the wishlist
            return res.json({ success: false, message: 'Product is already in the wishlist' });
        }

        // Add the product to the wishlist
        await Wishlist.create({
            user: userId,
            product: productId,
        });

        res.json({ success: true, message: 'Product added to the wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.wishlist = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.redirect('/login');
        }

        const wishlistItems = await Wishlist.find({ user: userId }).populate('product');

        res.render('wishlist', { wishlist: wishlistItems });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
exports.removeFromWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Find and remove the product from the wishlist
        const removedProduct = await Wishlist.findOneAndDelete({
            user: userId,
            product: productId,
        });

        if (!removedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found in the wishlist' });
        }

        res.json({ success: true, message: 'Product removed from the wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.contact=async(req,res)=>{
    res.render("contact-us");
}
exports.aboutus=async(req,res)=>{
    res.render("aboutus")
}