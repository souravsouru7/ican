const nodemailer = require('nodemailer');

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'soutavr5@gmail.com', // Your Gmail email address
        pass: 'jetc biux sugs tvjg', // Your Gmail app password or email password
    },
});

module.exports = transporter;
