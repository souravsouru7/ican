const twilio = require('twilio');
const User = require('../models/User');
const transporter = require('./mailer');
const shortid = require('shortid');
const generateReferralCode = () => shortid.generate();
// Render the signup page
exports.signuppage = (req, res) => {
    res.render('signup', { title: 'Signup Page' });
};

// Handle form submission and OTP verification
exports.signup = async (req, res) => {
    const { name, email, mobile, password, repassword } = req.body;

    if (password !== repassword) {
        return res.status(400).send('Passwords do not match!');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email is already registered!');
        }
        const referralCode = generateReferralCode();

        // Code to save user information to the database
        const newUser = new User({
            name,
            email,
            mobile,
            password,
            verified: false,
            referralCode,
        });

        await newUser.save();

        // Send verification email
        const verificationLink = `http://localhost:3000/verify/${email}`;
        const mailOptions = {
            from: 'soutavr5@gmail.com',
            to: email,
            subject: 'Email Verification',
            text: `Click the following link to verify your email: ${verificationLink}`,
        };

        await transporter.sendMail(mailOptions);

        res.redirect('/login?verificationMessage=Verification email sent! Check your email to complete the signup process.');
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyValue) {
            console.error('Duplicate key error:', error);
            res.status(400).send('Email already exists.');
        } else {
            console.error('Error saving user:', error);
            res.status(500).send('Error saving user.');
        }
    }
};

// Verify user's email
exports.verify = async (req, res) => {
    const { email } = req.params;

    try {
        // Code to update user's verification status in the database
        await User.updateOne({ email }, { verified: true });
        res.send('Email verified successfully! You can now log in.');
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).send('Error verifying email.');
    }
};
