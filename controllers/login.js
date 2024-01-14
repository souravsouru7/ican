const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwtSecret = 'your-secret-jwt-key';
const Coupon=require("../models/coupon");
// ...

exports.loginPage = (req, res) => {
    const verificationMessage = req.session.verificationMessage || '';
    req.session.verificationMessage = '';
    res.render('login', { verificationMessage });
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });

        if (user) {
            if (user.verified) {
                // Set user information in the session, including the user's ID
                req.session.user = {
                    _id: user._id,
                    email: user.email,
                    password: user.password,
                    verified: user.verified,
                };


                const token = jwt.sign(
                    { _id: user._id, email: user.email, verified: user.verified },
                    jwtSecret,
                    { expiresIn: '1h' }
                );
                res.cookie('token', token);

                res.redirect('/');
            } else {
                req.session.verificationMessage = 'Your email is not verified. Please verify your email.';
                res.redirect('/login');
            }
        } else {
            req.session.verificationMessage = 'Invalid email or password.';
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.logoutUser = (req, res) => {
    // Clear the token cookie on the client side
    res.cookie('token', '', { expires: new Date(0) });

    // Destroy the session on the server side
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
        }
       
        res.redirect('/login');
    });
};

