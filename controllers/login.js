const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwtSecret = 'your-secret-jwt-key';
const Coupon=require("../models/coupon");
const shortid = require('shortid');
const transporter = require('./mailer');
exports.loginPage = (req, res) => {
   
    if (req.session.user || req.cookies.token) {
        return res.redirect("/");
    }

    // Render the login page for users who are not authenticated
    res.render("login");
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

exports.renderForgotPasswordPage = (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password', error: null });
};


// Handle forgot password form submission
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // If user is not found, render the forgot-password page with an error message
            return res.render('forgot-password', { error: 'User not found' });
        }

        // Generate a unique token and set its expiration time
        const resetToken = shortid.generate();
        const resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

        // Update user with reset token and expiration
        await User.updateOne(
            { email },
            {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetTokenExpiration,
            }
        );

        // Send password reset email
        const resetLink = `http://localhost:3000/reset/${resetToken}`;
        const mailOptions = {
            from: 'soutavr5@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: `Click the following link to reset your password: ${resetLink}`,
        };

        await transporter.sendMail(mailOptions);

        res.redirect('/login?resetMessage=Password reset email sent! Check your email to reset your password.');
    } catch (error) {
        console.error('Error processing forgot password:', error);
        res.status(500).send('Error processing forgot password.');
    }
};
exports.renderResetPasswordPage = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).send('Invalid or expired reset token');
        }

        res.render('reset-password', { title: 'Reset Password', token, error: null });
    } catch (error) {
        console.error('Error rendering reset password page:', error);
        res.status(500).send('Error rendering reset password page.');
    }
};

// Handle password reset form submission
exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password, repassword } = req.body;

    // Password validation: check if passwords match
    if (password !== repassword) {
        return res.render('reset-password', {
            title: 'Reset Password',
            token,
            error: 'Passwords do not match!',
        });
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).send('Invalid or expired reset token');
        }

        // Update user's password and clear reset token fields
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.redirect('/login?resetMessage=Password reset successful. You can now login with your new password.');
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send('Error resetting password.');
    }
};










