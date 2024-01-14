const User = require('../models/User');
const Wallet = require('../models/Wallet');

exports.wallet = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        // Fetch the user along with the wallet information, populating the transactions array
        const user = await User.findById(userId).populate({
            path: 'wallet',
            populate: {
                path: 'transactions',
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Extract wallet details
        const walletBalance = user.wallet ? user.wallet.balance : 0;
        const referralBonus = user.wallet ? user.wallet.transactions.reduce((acc, transaction) => {
            if (transaction.type === 'referral_bonus') {
                return acc + transaction.amount;
            }
            return acc;
        }, 0) : 0;

        // Calculate total wallet balance
        const totalWalletBalance = walletBalance + referralBonus;

        // Extract wallet history
        const walletHistory = user.wallet ? user.wallet.transactions : [];

        // Render the wallet page with the necessary data
        res.render('wallet', {
            walletBalance: totalWalletBalance,
            totalWalletBalance: totalWalletBalance,
            walletHistory: walletHistory, // Add walletHistory to the data
            // You can include more data if needed
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

exports.addfund = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate('wallet');

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!user.wallet) {
            user.wallet = new Wallet({ balance: 0, transactions: [] });
        }

        const amountToAdd = parseFloat(req.body.amount);
        const referralCode = req.body.referralCode;

        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            return res.status(400).json({ error: 'Invalid amount to add.' });
        }

        // Check if the referral code is valid
        if (referralCode) {
            const referredUser = await User.findOne({ referralCode });

            if (referredUser) {
                // Add referral bonus to the referred user's wallet
                const referralBonus = 500; // Adjust the bonus amount as needed
                referredUser.wallet.transactions.push({
                    amount: referralBonus,
                    type: 'referral_bonus',
                    timestamp: Date.now(),
                });
                referredUser.wallet.balance += referralBonus;
                await referredUser.wallet.save();
            }
        }

        // Add a transaction to the user's wallet's transaction history
        user.wallet.transactions.push({
            amount: amountToAdd,
            type: 'add',
            timestamp: Date.now(),
        });

        // Update the user's wallet balance
        user.wallet.balance += amountToAdd;

        // Save changes to the user's wallet and the user
        await user.wallet.save();
        await user.save();

        res.json({ message: 'Funds added successfully.', newBalance: user.wallet.balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
// controllers/walletController.js
exports.addReferralBonus = async (req, res) => {
    try {
        // Check if the user is authenticated
        const userId = req.session.user ? req.session.user._id : null;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        // Find the user by ID and populate the wallet information
        const user = await User.findById(userId).populate('wallet');

        // If the user is not found, return an error response
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Extract the referral code from the request body
        const referralCode = req.body.referralCode;

        if (user.usedReferralCodes.includes(referralCode)) {
            return res.status(400).json({ error: 'Referral code already used.' });
        }

        // Check if the referral code is valid and corresponds to a referred user
        if (referralCode) {
            const referredUser = await User.findOne({ referralCode });

            // If the referred user is found, add referral bonus to their wallet
            if (referredUser) {
                // Ensure that referredUser has a wallet
                if (!referredUser.wallet) {
                    referredUser.wallet = new Wallet({ balance: 0, transactions: [] });
                }

                const referralBonus = 500; // Adjust the bonus amount as needed

                referredUser.wallet.balance += referralBonus;

                // Save changes to the referred user's wallet
                await referredUser.wallet.save();

                // If the current user doesn't have a wallet, create one
                if (!user.wallet) {
                    user.wallet = new Wallet({ balance: 0, transactions: [] });
                }

                // Update the user's total wallet balance
                user.wallet.balance += referralBonus;

                // Save changes to the user's wallet
                await user.wallet.save();
            }
        }

        // Add the used referral code to the user's list of used referral codes
        user.usedReferralCodes.push(referralCode);

        // Save changes to the user
        await user.save();

        // Return a success response
        res.json({ message: 'Referral bonus added successfully.' });
    } catch (error) {
        // Handle unexpected errors and return an error response
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
