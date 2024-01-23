
const Product = require('../models/product');
const Cart = require('../models/cart');
const Coupon=require("../models/coupon");
const Order = require('../models/order');

const updateCartProductQuantity = async (cart, productId, quantityChange) => {
    // Find the product in the cart
    const cartProduct = cart.products.find(p => p.product.equals(productId));

    if (cartProduct) {
        // Check if the new quantity exceeds the available stock
        const product = await Product.findById(productId);
        if (cartProduct.quantity + quantityChange > product.quantity) {
            throw new Error('Insufficient stock');
        }

        // Adjust the quantity
        cartProduct.quantity += quantityChange;

        // Adjust the total amount
        cart.totalAmount += quantityChange * product.regularPrice;

        // Save the updated cart
        await cart.save();
    }
};

exports.addToCart = async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user ? req.session.user._id : null;

    try {
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const quantity = req.body.quantity || 1; // Default to 1 if not provided

        const cart = await Cart.findOne({ user: userId });

        if (cart) {
            const existingProductIndex = cart.products.findIndex(p => p.product.equals(productId));

            if (existingProductIndex !== -1) {
                // Product already exists in the cart, update the quantity
                try {
                    await updateCartProductQuantity(cart, productId, quantity);
                } catch (error) {
                    // Handle insufficient stock or other errors
                    return res.status(400).json({ success: false, message: error.message });
                }
            } else {
                // Product is not in the cart, add it
                cart.products.push({ product: productId, quantity });
                cart.totalAmount += quantity * product.regularPrice;
                await cart.save();
            }
        } else {
            // If the user doesn't have a cart, create a new one
            const newCart = new Cart({
                user: userId,
                products: [{ product: productId, quantity }],
                totalAmount: quantity * product.regularPrice,
            });
            await newCart.save();
        }
    
       
        return res.status(200).json({ success: true, message: 'Product added to cart successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};






exports.viewCart = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.redirect('/login');
        }

        // Fetch the user's cart from the database, populating the 'products' field
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.render('cart', { products: [] });
        }

        // Fetch the products based on the product IDs in the cart
        const productIds = cart.products.map(p => p.product);
        const productsInCart = await Product.find({ _id: { $in: productIds } });

        // Check if any product in the cart has a quantity greater than available stock
        const invalidProducts = [];

        for (const product of productsInCart) {
            const cartProduct = cart.products.find(p => p.product.equals(product._id));

            if (cartProduct.quantity > product.quantity) {
                invalidProducts.push(product.productName);
            }
        }

        if (invalidProducts.length > 0) {
            // Render an error message or redirect to the cart page with a message
            return res.render('cart', { products: productsInCart, error: `Invalid quantity for ${invalidProducts.join(', ')}` });
        }

        // Populate the quantity property for each product
        for (const product of productsInCart) {
            const cartProduct = cart.products.find(p => p.product.equals(product._id));
            product.quantity = cartProduct.quantity;
        }

        return res.render('cart', { products: productsInCart });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
const updateTotalInDatabase = async (userId) => {
    try {
        const cart = await Cart.findOne({ user: userId });

        if (cart) {
            // Calculate the total amount based on the remaining products in the cart
            const updatedTotal = await cart.products.reduce(async (totalPromise, cartProduct) => {
                const total = await totalPromise;

                const product = await Product.findById(cartProduct.product);
                return total + cartProduct.quantity * product.regularPrice;
            }, Promise.resolve(0));

            console.log('Updating total in the database. User:', userId, 'New Total:', updatedTotal);

            cart.totalAmount = updatedTotal;
            await cart.save();
            return updatedTotal;
        } else {
            console.error('Cart not found for the user:', userId);
            return 0; // Return 0 if the cart is not found
        }
    } catch (error) {
        console.error('Error updating total in the database:', error);
        return 0; // Return 0 in case of an error
    }
};

exports.removeFromCart = async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user ? req.session.user._id : null;

    try {
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Find the product in the cart
        const cartProductIndex = cart.products.findIndex(cartItem => cartItem.product.equals(productId));

        if (cartProductIndex !== -1) {
            const cartProduct = cart.products[cartProductIndex];

            // Remove the product from the cart
            await Cart.updateOne(
                { _id: cart._id },
                { $pull: { products: { product: productId } } }
            );

            // Wait for the updateOne operation to complete
            await Cart.findOne({ user: userId });

            // If there are no more products in the cart, delete the entire cart
           

            // Update the total in the database
            const updatedTotal = await updateTotalInDatabase(userId, cart.totalAmount - (cartProduct.quantity * cartProduct.product.regularPrice));

            return res.status(200).json({
                message: 'Product removed from cart successfully',
                updatedTotal,
            });
        } else {
            return res.status(404).json({ message: 'Product not found in the cart' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};







exports.cartdetails = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.json({ subtotal: 0, total: 0, products: [], appliedCoupon: null });
        }

        // Fetch all products in the cart
        const productIds = cart.products.map(cartProduct => cartProduct.product);
        const productsWithQuantity = await Product.find({ _id: { $in: productIds } })
            .select('regularPrice _id productName')
            .lean();

        // Calculate subtotal based on the product prices
        const subtotal = productsWithQuantity.reduce((acc, product) => {
            const cartProduct = cart.products.find(cartItem => cartItem.product.equals(product._id));
            return acc + cartProduct.quantity * product.regularPrice;
        }, 0);

        // Set total to subtotal (excluding shipping)
        let total = subtotal;

        // Update the total in the database only if a coupon is not applied
        if (!cart.appliedCoupon) {
            const updatedTotal = await updateTotalInDatabase(userId, total);
            total = updatedTotal;
        }

        return res.json({ subtotal, total, products: cart.products, appliedCoupon: cart.appliedCoupon });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};





  
const updateTotalInDatabases = async (userId, amountChange) => {
    try {
        const cart = await Cart.findOne({ user: userId });

        if (cart) {
            // Subtract the amountChange from the total amount
            cart.totalAmount -= amountChange;

            // Save the updated cart
            await cart.save();

            console.log('Updated total in the database. User:', userId, 'New Total:', cart.totalAmount);
            
            return cart.totalAmount;
        } else {
            console.error('Cart not found for the user:', userId);
            return 0; // Return 0 if the cart is not found
        }
    } catch (error) {
        console.error('Error updating total in the database:', error);
        return 0; // Return 0 in case of an error
    }
};

exports.updateqnt = async (req, res) => {
    const productId = req.body.productId;
    const quantity = req.body.quantity;

    try {
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Find the product in the cart
        const cartProduct = cart.products.find(cartItem => cartItem.product.equals(productId));

        if (cartProduct) {
            // Store the old quantity for calculating the difference
            const oldQuantity = cartProduct.quantity;

            // Update the quantity of the product in the cart
            cartProduct.quantity = quantity;

            // Deduct the difference in quantity from the product's available quantity
            const product = await Product.findById(productId);
            product.quantity += oldQuantity - quantity;

            // Recalculate the total amount in the cart
            const amountChange = (oldQuantity - quantity) * product.regularPrice;

            // Update the cart total in the database
            await updateTotalInDatabases(userId, amountChange);

            // Save the updated cart and product
            await cart.save();
            await product.save();

            // Send a success response
            return res.status(200).json({ message: 'Cart details updated successfully' });
        } else {
            return res.status(404).json({ message: 'Product not found in the cart' });
        }
    } catch (error) {
        console.error('Error updating cart details:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



exports.applyCoupon = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const couponCode = req.body.couponCode;
        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon || !coupon.isValid()) {
            return res.status(400).json({ message: 'Invalid coupon code' });
        }

        // Calculate the discount amount
        const discountAmount = (cart.totalAmount * (coupon.discountPercentage / 100));

        // Calculate the discounted total
        const discountedTotal = cart.totalAmount - discountAmount;

        // Apply the coupon discount to the cart total
        cart.totalAmount = discountedTotal;

        // Save the applied coupon in the cart
        cart.appliedCoupon = {
            code: coupon.code,
            discountPercentage: coupon.discountPercentage,
            discountAmount, 
        };


        await cart.save();

        return res.status(200).json({
            message: 'Coupon applied successfully',
            discountedTotal,
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// In your server-side code (e.g., controllers/cartController.js)
exports.removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Check if a coupon was applied
        if (cart.appliedCoupon) {
            // Add the discount amount back to the total amount
            cart.totalAmount += cart.appliedCoupon.discountAmount;
            
            // Clear the applied coupon from the cart
            cart.appliedCoupon = null;

            // Update the cart total without the coupon discount
            const updatedTotal = await updateTotalInDatabase(userId, cart.totalAmount);

            // Save the updated cart
            await cart.save();

            return res.status(200).json({
                message: 'Coupon removed successfully',
                updatedTotal,
            });
        } else {
            return res.status(400).json({ message: 'No coupon applied to remove' });
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
