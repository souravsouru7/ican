const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGO_URL);


connect.then(() => {
    console.log("Successfully connected to MongoDB");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB", error);
});



const categorySchema = new mongoose.Schema({
    name: { type: String, required: true,unique: true},
    description: { type: String },
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;