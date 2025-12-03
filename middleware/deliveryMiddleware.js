const delivery = (req, res, next) => {
    if (req.user && req.user.role === 'delivery') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as delivery user' });
    }
};

module.exports = { delivery };
