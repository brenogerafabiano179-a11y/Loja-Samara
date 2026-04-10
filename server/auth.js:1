const jwt = require('jsonwebtoken');

function createToken(adminEmail) {
    return jwt.sign(
        { sub: adminEmail, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function requireAdmin(request, response, next) {
    const authorization = request.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return response.status(401).json({ message: 'Sessão inválida.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        request.admin = payload;
        return next();
    } catch {
        return response.status(401).json({ message: 'Sessão expirada ou inválida.' });
    }
}

module.exports = {
    createToken,
    requireAdmin
};
