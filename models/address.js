require('dotenv').config();
const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);

connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
});
const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;