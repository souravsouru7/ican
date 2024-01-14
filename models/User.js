const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);

const bcrypt = require('bcrypt');
connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
});

const userSchema = new mongoose.Schema({
    // Your other fields
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    verified: Boolean,
    lastName: { type: String },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Wishlist',
        },
    ],
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    referralCode: { type: String, unique: true }, 
    usedReferralCodes: [{ type: String }],  
   
});







userSchema.methods.blockUser = async function () {
    this.status = 'blocked';
    await this.save();
};

userSchema.methods.unblockUser = async function () {
    this.status = 'active';
    await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;






