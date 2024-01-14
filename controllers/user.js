
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Address = require('../models/address');
const jwtSecret = 'your-secret-jwt-key';

// ... (rest of your code)

// ... (your existing code)

// Render the address page
// Render the address page
exports.addressPage = async (req, res) => {
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
                // Fetch user's addresses
                const addresses = await Address.find({ user: user._id });

                res.render('address', { title: 'Address', addresses });
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error fetching user addresses:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.newAddressPage = (req, res) => {
    res.render('newAddress', { title: 'New Address' });
};

exports.createNewAddress = async (req, res) => {
    try {
        const { street, city, state, zipCode, country } = req.body;

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
                // Create a new address
                const newAddress = new Address({
                    user: user._id,
                    street,
                    city,
                    state,
                    zipCode,
                    country,
                });

                await newAddress.save();

                return res.redirect('/profile/address');
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error creating new address:', error);
        res.status(500).send('Internal Server Error');
    }
};



// In your mainController.js or a new controller file
// In your mainController.js or a new controller file

// Assuming you have something like this in your controller
// In your user controller
// Rename the rendering route to changePasswordPage
exports.changePasswordPage = (req, res) => {
    // Pass the title and error (if any) to the view
    res.render('changePassword', { title: 'Change Password', error: req.query.error });
};

// Keep the existing route handler for changing password as it is
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.render('changePassword', {
                title: 'Change Password',
                error: 'Confirm password does not match new password.',
            });
        }

        // Verify token
        const token = req.cookies.token || req.headers.authorization;
        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, jwtSecret, async (err, decoded) => {
            if (err) {
                return res.redirect('/login');
            }

            // Fetch user
            const user = await User.findOne({ email: decoded.email });

            if (user && user.verified && user.status !== 'blocked') {
                // Check current password
                if (currentPassword !== user.password) {
                    return res.render('changePassword', {
                        title: 'Change Password',
                        error: 'Invalid current password.',
                    });
                }

                // Update password and redirect to profile
                user.password = newPassword;
                await user.save();
                return res.redirect('/profile');
            } else {
                return res.redirect(`/login?verificationMessage=Your account is blocked or not verified. Please contact support for assistance.`);
            }
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).send('Internal Server Error');
    }
};
// ... (other imports and code)

// Edit address page
exports.editAddressPage = async (req, res) => {
    try {
        const addressId = req.params.id;
        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        res.render('editAddress', { title: 'Edit Address', address });
    } catch (error) {
        console.error('Error fetching address for editing:', error);
        res.status(500).send('Internal Server Error');
    }
}
// Update address
exports.updateAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const { street, city, state, zipCode, country } = req.body;

        // Find and update the address
        await Address.findByIdAndUpdate(addressId, {
            street,
            city,
            state,
            zipCode,
            country,
        });

        res.redirect('/profile/address');
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).send('Internal Server Error');
    }
};



exports.deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        // Find and remove the address
        await Address.findByIdAndDelete(addressId);
        res.redirect('/profile/address');
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
};
