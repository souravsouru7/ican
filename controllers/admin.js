const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const fs = require('fs');
const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/product');
const User = require('../models/User');
const Category = require('../models/category');
const Coupon=require("../models/coupon");
const mongoose = require('mongoose');
const Order = require('../models/order');
const Chart = require('chart.js');
const ejs = require('ejs');
const pdf = require('html-pdf');
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
// Handle admin sign-in page

function requireAdminAuth(req, res, next) {
    // Check if the user is authenticated based on your logic
    // For simplicity, let's assume there's a variable in the session indicating authentication
    if (req.session.isAdminAuthenticated) {
       
        return next();
    } else {
        // If not authenticated, redirect to the admin login page
        return res.redirect('/admin'); // Redirect to the login page instead of the same route
    }
}
router.get('/admin', (req, res) => {
    res.render('admin'); 
});

router.post('/adminLogin', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin123') {
        req.session.isAdminAuthenticated = true;
        res.redirect('/admin/dashboard');
    } else {
        // Admin authentication failed, redirect back to the admin sign-in page with an error message
        res.render('admin', { error: 'Invalid username or password' });
    }
});


router.get('/admin/dashboard',requireAdminAuth, (req, res) => {
    res.render('dashboard'); // Assuming you have a dashboard.ejs file in your views folder
});

const upload = multer({ storage: storage });
// In your route handler for rendering the add-product page
router.get('/admin/dashboard/add-product', async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('add-product', { categories, title: 'Add Product' });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Handle product creation form submission with image upload
router.post('/admin/dashboard/add-product', upload.single('productImage'), async (req, res) => {
    try {
        const {
            productName,
            categoryId,
            regularPrice,
            salesPrice,
            stockStatus,
            quantity,
            
            shirtSize, // Add shirtSize field
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).send('Invalid categoryId');
        }

        // Check if the category with the given ID exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }

        const newProduct = {
            productName,
            category: categoryId,
            regularPrice,
            salesPrice,
            stockStatus,
            quantity,
          
            shirtSize, // Add shirtSize field
        };

        // If an image is uploaded, add the productImage field
        if (req.file) {
            newProduct.productImage = req.file.filename;
        }

        await Product.create(newProduct);

        // Redirect to the product list or admin dashboard
        res.redirect('/admin/dashboard/product-list');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Display product creation form
// Display product list

router.get('/admin/dashboard/product-list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 6; // Number of items per page
        const skip = (page - 1) * pageSize;

        const products = await Product.find()
            .skip(skip)
            .limit(pageSize)
            .populate('category') // Populate the category field to get the name
            .exec();

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / pageSize);

        res.render('product-list', { products, totalPages, currentPage: page });
    } catch (error) {
        console.error('Error fetching products for list:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Display edit product form
// Display edit product form
router.get('/admin/dashboard/edit-product/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findById(productId);
        const categories = await Category.find();
        res.render('edit-product', { product, categories });
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle product update form submission
router.post('/admin/dashboard/edit-product/:productId', upload.single('productImage'), async (req, res) => {
    try {
        const productId = req.params.productId;
        const {
            productName,
            categoryId,
            regularPrice,
            salesPrice,
            stockStatus,
            quantity,
            units,
            shirtSize,
            offerPrice , 
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).send('Invalid categoryId');
        }

        // Check if the category with the given ID exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }

        const updatedProduct = {
            productName,
            category: categoryId,
            regularPrice,
            salesPrice,
            stockStatus,
            quantity,
            units,
            shirtSize, 
            offerPrice,
        };

        // If a new image is uploaded, update the productImage field
        if (req.file) {
            updatedProduct.productImage = req.file.filename;
        }

        const result = await Product.findByIdAndUpdate(productId, updatedProduct, { new: true });

        if (!result) {
            console.error('Product not found or not updated.');
            return res.status(404).send('Product not found or not updated.');
        }

        // Redirect to the product list or admin dashboard
        res.redirect('/admin/dashboard/product-list');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Handle product deletion
router.get('/admin/dashboard/delete-product/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        await Product.findByIdAndDelete(productId);
        res.redirect('/admin/dashboard/product-list');
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin/dashboard/user-list', async (req, res) => {
    try {
        const users = await User.find();
        res.render('user-list', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle blocking/unblocking users
router.get('/admin/dashboard/block-user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        if (user.status === 'active') {
            await user.blockUser();
        } else {
            await user.unblockUser();
        }

        res.redirect('/admin/dashboard/user-list');
    } catch (error) {
        console.error('Error blocking/unblocking user:', error);
        res.status(500).send('Internal Server Error');
    }
});
//category

router.get('/admin/dashboard/category-list', async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('category-list', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.post('/admin/dashboard/add-category', async (req, res) => {
    const { name, description } = req.body;

    try {
        const newCategory = new Category({ name, description });
        await newCategory.save();
        res.redirect('/admin/dashboard/category-list');
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/dashboard/add-category', (req, res) => {
    res.render('add-category', { title: 'Add Category' });
});

router.get('/admin/dashboard/coupon-list', async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.render('coupon-list', { coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin/dashboard/add-coupon', (req, res) => {
    res.render('add-coupon', { title: 'Add Coupon' });
});

router.post('/admin/dashboard/add-coupon', async (req, res) => {
    const { code, discountPercentage, expiryDate } = req.body;

    try {
        const newCoupon = new Coupon({ code, discountPercentage, expiryDate });
        await newCoupon.save();
        res.redirect('/admin/dashboard/coupon-list');
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).send('Internal Server Error');
    }
});
// In your route handler for rendering the admin dashboard
// admin.js

// routes/admin.js
// Update the route handling order list
router.get('/admin/dashboard/user', async (req, res) => {
    try {
        const itemsPerPage = 4; // Number of items to display per page
        const page = parseInt(req.query.page) || 1; // Get the page number from the query parameters

        // Extract the search query (order ID) and status from the request
        const searchQuery = req.query.search;
        const statusFilter = req.query.status;

        // Define a filter object based on the order ID and status
        const filter = {};
        if (searchQuery) {
            filter._id = searchQuery;
        }
        if (statusFilter) {
            filter.status = statusFilter;
        }

        // Fetch total number of orders matching the filter
        const totalOrders = await Order.countDocuments(filter);

        // Calculate the number of pages based on total orders and items per page
        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        // Fetch orders with populated products and user based on the filter and pagination
        const orders = await Order.find(filter)
            .populate({
                path: 'user',
                select: 'name email',
            })
            .populate({
                path: 'selectedAddress',
                select: 'country street city state zipCode',
            })
            .populate({
                path: 'products.product',
                select: 'productName category',
                populate: {
                    path: 'category',
                    select: 'name',
                },
            })
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        res.render('order', { orders, searchQuery, statusFilter, totalPages, currentPage: page });
    } catch (error) {
        console.error('Error fetching orders for admin dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add this route to your admin routes
router.post('/return-order/:orderId', async (req, res) => {
    try {
      const orderId = req.params.orderId;
  
      // Fetch the order based on the order ID
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update the order status to "Returned"
      order.status = 'Returned';
  
      // Save the updated order
      await order.save();
  
      // You may choose to perform additional actions or send a response as needed
      return res.json({ updatedOrder: order });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  



// ... (other routes)

router.get('/admin/dashboard/edit-coupon/:couponId', async (req, res) => {
    try {
        const couponId = req.params.couponId;
        const coupon = await Coupon.findById(couponId);
        res.render('edit-coupon', { coupon });
    } catch (error) {
        console.error('Error fetching coupon for edit:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.post('/admin/dashboard/edit-coupon/:couponId', async (req, res) => {
    try {
        const couponId = req.params.couponId;
        const { code, discountPercentage, expiryDate } = req.body;

        const updatedCoupon = {
            code,
            discountPercentage,
            expiryDate,
        };

        const result = await Coupon.findByIdAndUpdate(couponId, updatedCoupon, { new: true });

        if (!result) {
            console.error('Coupon not found or not updated.');
            return res.status(404).send('Coupon not found or not updated.');
        }

        // Redirect to the coupon list or admin dashboard
        res.redirect('/admin/dashboard/coupon-list');
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/dashboard/delete-coupon/:couponId', async (req, res) => {
    try {
        const couponId = req.params.couponId;
        await Coupon.findByIdAndDelete(couponId);
        res.redirect('/admin/dashboard/coupon-list');
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.post('/update-order-status/:orderId', async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const { newStatus } = req.body;
  
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status: newStatus } },
        { new: true }
      );
  
      if (!updatedOrder) {
        console.error('Order not found or not updated.');
        return res.status(404).json({ error: 'Order not found or not updated.' });
      }
  
      // Send updated order back as JSON response
      res.json({ updatedOrder });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });



// Aggregate sales data based on the selected filter (daily, monthly, yearly)
router.get('/api/sales-data', async (req, res) => {
    const filter = req.query.filter;

    try {
        let salesData;

        if (filter === 'yearly') {
            salesData = await aggregateSalesByYear();
        } else if (filter === 'monthly') {
            salesData = await aggregateSalesByMonth();
        } else {
            salesData = await aggregateSalesByDate(); // Default: daily
        }

        res.json({
            labels: salesData.labels,
            sales: salesData.sales,
        });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Aggregate daily sales
async function aggregateSalesByDate() {
    const salesData = await Order.aggregate([
        {
            $match: {
                'status': 'Delivered',
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                totalAmount: { $sum: '$totalAmount' },
            },
        },
        {
            $sort: { '_id': 1 },
        },
    ]);

    const labels = salesData.map(entry => entry._id);
    const sales = salesData.map(entry => entry.totalAmount);

    return {
        labels,
        sales,
    };
}

// Aggregate monthly sales
async function aggregateSalesByMonth() {
    const salesData = await Order.aggregate([
        {
            $match: {
                'status': 'Delivered',
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                },
                totalAmount: { $sum: '$totalAmount' },
            },
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 },
        },
    ]);

    const labels = salesData.map(entry => `${entry._id.year}-${entry._id.month}`);
    const sales = salesData.map(entry => entry.totalAmount);

    return {
        labels,
        sales,
    };
}

// Aggregate yearly sales
async function aggregateSalesByYear() {
    const salesData = await Order.aggregate([
        {
            $group: {
                _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
                totalAmount: { $sum: '$totalAmount' },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);

    const labels = salesData.map(entry => entry._id);
    const sales = salesData.map(entry => entry.totalAmount);

    return {
        labels,
        sales,
    };
}

router.get('/admin/dashboard/productsalesgraph', async (req, res) => {
    try {
        const products = await Product.find();

        const productSalesData = await Promise.all(
            products.map(async (product) => {
                const salesData = await Order.aggregate([
                    {
                        $match: {
                            'products.product': product._id,
                            status: 'Delivered', // Assuming you want to consider only delivered orders
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: '$totalAmount' },
                        },
                    },
                ]);

                return {
                    productName: product.productName,
                    totalSales: salesData.length > 0 ? salesData[0].totalAmount : 0,
                };
            })
        );

        const labels = productSalesData.map((data) => data.productName);
        const sales = productSalesData.map((data) => data.totalSales);

        res.render('product-sales-graph', {
            labels,
            sales,
        });
    } catch (error) {
        console.error('Error fetching product sales data:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin/dashboard/sales-report', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const format = req.query.format || 'excel';

        const orders = await Order.find({
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate({
            path: 'products.product',
            model: 'Product',
        }).populate('user', 'name');
        if (format === 'pdf') {
            // Generate PDF Report
            const pdfFilePath = path.join(__dirname, '..', 'public', 'reports', 'sales_report.pdf');
            const doc = new PDFDocument({ autoFirstPage: false });
            doc.pipe(fs.createWriteStream(pdfFilePath));

            // Set up fonts and styling
            doc.registerFont('Helvetica', 'Helvetica');
            doc.font('Helvetica').fontSize(10);

            doc.addPage();

            // Add headers to the table
            doc.fillColor('#333').text('Order ID', 50, 50);
            doc.text('Product Name', 200, 50);
            doc.text('User Name', 350, 50);
            doc.text('Quantity', 450, 50);
            doc.text('Total Amount', 550, 50);

            // Add data to the table with styling
            let y = 80; // Initial y-coordinate for the table
            orders.forEach(order => {
                order.products.forEach(product => {
                    doc.fillColor('#333').text(order._id.toString(), 50, y);
                    doc.text(product.product.productName, 200, y);
                    doc.text(order.user.name, 350, y);
                    doc.text(product.quantity.toString(), 450, y);
                    doc.text('$' + order.totalAmount.toFixed(2), 550, y);

                    y += 20; // Increment y-coordinate for the next row
                });

                // Draw horizontal line after each order
                doc.moveTo(50, y - 10).lineTo(550, y - 10).lineWidth(1).stroke('#ddd');
            });

            // Add footer with date
            doc.fontSize(10).fillColor('#888').text(`Report generated on ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, { align: 'center' });

            doc.end();

            // Send the PDF file for download
            res.download(pdfFilePath, 'sales_report.pdf', async () => {
                // Remove the file after it's sent to the client
                if (fs.existsSync(pdfFilePath)) {
                    fs.unlinkSync(pdfFilePath);
                }
            });
        } else if (format === 'excel') {
            // Generate Excel Report
            const wb = new Excel.Workbook();
            const ws = wb.addWorksheet('Sales Report');

            // Add headers to the worksheet
            ws.columns = [
                { header: 'Order ID', key: 'orderId', width: 10 },
                { header: 'Product Name', key: 'productName', width: 30 },
                { header: 'User Name', key: 'userName', width: 20 },
                { header: 'Quantity', key: 'quantity', width: 10 },
                { header: 'Total Amount', key: 'totalAmount', width: 15 },
            ];

            // Add data to the worksheet
            orders.forEach(order => {
                order.products.forEach(product => {
                    ws.addRow({
                        orderId: order._id,
                        productName: product.product.productName,
                        userName: order.user.name,
                        quantity: product.quantity,
                        totalAmount: order.totalAmount,
                    });
                });
            });

            // Set the file path
            const excelFilePath = path.join(__dirname, '..', 'public', 'reports', 'sales_report.xlsx');

            // Write Excel file
            await wb.xlsx.writeFile(excelFilePath);

            // Send the file for download
            res.download(excelFilePath, 'sales_report.xlsx', async () => {
                // Remove the file after it's sent to the client
                if (fs.existsSync(excelFilePath)) {
                    fs.unlinkSync(excelFilePath);
                }
            });
        } else {
            // Handle unsupported format
            res.status(400).send('Unsupported format requested');
        }

    } catch (error) {
        console.error('Error generating Sales Report:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/api/category-sales-data', async (req, res) => {
    try {
        const categorySalesData = await aggregateCategorySales();

        res.json({
            labels: categorySalesData.labels,
            sales: categorySalesData.sales,
        });
    } catch (error) {
        console.error('Error fetching category sales data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
async function aggregateCategorySales() {
    const categorySalesData = await Order.aggregate([
        {
            $unwind: '$products',
        },
        {
            $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'productDetails',
            },
        },
        {
            $unwind: '$productDetails',
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'productDetails.category',
                foreignField: '_id',
                as: 'categoryDetails',
            },
        },
        {
            $unwind: '$categoryDetails',
        },
        {
            $group: {
                _id: '$categoryDetails.name',
                totalAmount: { $sum: '$totalAmount' },
            },
        },
        {
            $sort: { totalAmount: -1 },
        },
    ]);

    const labels = categorySalesData.map(entry => entry._id);
    const sales = categorySalesData.map(entry => entry.totalAmount);

    return {
        labels,
        sales,
    };
}
router.get('/api/product-sales-data', async (req, res) => {
    try {
        // Aggregate product sales data based on orders, considering totalAmount
        const productSalesData = await Order.aggregate([
            {
                $unwind: '$products', // Deconstruct the products array
            },
            {
                $group: {
                    _id: '$products.product',
                    totalSales: { $sum: '$products.quantity' },
                    totalAmount: { $sum: '$totalAmount' }, // Consider totalAmount
                },
            },
            {
                $lookup: {
                    from: 'products', // Adjust this based on your actual collection name
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $sort: { '_id': 1 },
            },
        ]);

        const labels = productSalesData.map(entry => entry.productDetails[0].productName);
        const sales = productSalesData.map(entry => entry.totalSales);
        const totalAmounts = productSalesData.map(entry => entry.totalAmount);

        res.json({
            labels,
            sales,
            totalAmounts,
        });
    } catch (error) {
        console.error('Error fetching product sales data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/admin/dashboard/view-product/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findById(productId).populate('category');

        const order = {
            products: [
                {
                    product: product,
                }
            ],
        };

        res.render('product-details', { order });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/excel', async (req, res) => {
    try {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);

        console.log('Fetching delivered orders for date range:', startDate, 'to', endDate);

        const deliveredOrders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'Delivered',
        })
            .populate({
                path: 'user',
                select: 'name email', // Add more fields if needed
            })
            .populate({
                path: 'products.product',
                select: 'productName category', // Add more fields if needed
            })
            .populate('selectedAddress');

        console.log('Fetched delivered orders:', deliveredOrders);

        // Create a new Excel workbook and worksheet
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Delivered Orders Report');

        // Add headers to the worksheet
        worksheet.addRow(['Order ID', 'Date', 'User Name', 'User Email', 'Product Name', 'Product Quantity', 'Total Amount', 'Order Status', 'Product Category', 'Address']);

        // Add data to the worksheet
        deliveredOrders.forEach(order => {
            worksheet.addRow([
                order._id,
                order.createdAt,
                order.user ? order.user.name : 'N/A',
                order.user ? order.user.email : 'N/A',
                order.products.length > 0 ? (order.products[0].product ? order.products[0].product.productName : 'N/A') : 'N/A',
                order.products.length > 0 ? order.products[0].quantity : 'N/A',
                order.totalAmount,
                order.status,
                order.products.length > 0 ? (order.products[0].product.category ? order.products[0].product.category.name : 'N/A') : 'N/A',
                order.selectedAddress ? `${order.selectedAddress?.street || ''}, ${order.selectedAddress?.city || ''}, ${order.selectedAddress?.state || ''}, ${order.selectedAddress?.zipCode || ''} ${order.selectedAddress?.country || ''}` : 'Address not available',
            ]);
        });

        // Calculate and add the total amount in the last row
        const totalAmount = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        worksheet.addRow(['Total Amount', '', '', '', '', '', totalAmount]);

        // Set the content type and headers for the response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=delivered_orders_report.xlsx');

        // Pipe the workbook directly to the response stream
        await workbook.xlsx.write(res);

        // End the response
        res.end();
    } catch (error) {
        console.error('Error exporting delivered orders report in Excel:', error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/dashboard/sales/report/pdf', async (req, res) => {
    try {
        // Fetch orders based on selected date range (req.query.startDate, req.query.endDate)
        const orders = await Order.find({ createdAt: { $gte: req.query.startDate, $lte: req.query.endDate } })
            .populate('user')
            .populate({
                path: 'products.product',
                populate: { path: 'category' }
            })
            .populate('selectedAddress');

        // Log orders to check if data is fetched
        console.log('Orders:', orders);

        // Generate HTML content for the PDF using EJS
        const htmlContent = await ejs.renderFile('templates/sales_report.ejs', { orders });

        // Log generated HTML to check if it's correct
        console.log('Generated HTML:', htmlContent);

        // PDF options for html-pdf
        const pdfOptions = {
            format: 'Letter',
            orientation: 'portrait',
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        // Generate PDF and pipe to response stream
        pdf.create(htmlContent, pdfOptions).toStream((err, stream) => {
            if (err) {
                console.error('Error generating PDF:', err);
                res.status(500).send('Internal Server Error');
            } else {
                stream.pipe(res);
            }
        });
    } catch (error) {
        console.error('Error exporting sales report in PDF:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;