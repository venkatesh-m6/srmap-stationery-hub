/**
 * Auth controller — login and logout using session-based authentication.
 */

const login = (req, res) => {
    const { username, password } = req.body;

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;

    console.log('--- LOGIN ATTEMPT ---');
    console.log('Received:', JSON.stringify({ username, password }));
    console.log('Expected:', JSON.stringify({ username: expectedUser, password: expectedPass }));
    console.log('Body type:', typeof req.body, '| Body:', JSON.stringify(req.body));

    if (
        username === expectedUser &&
        password === expectedPass
    ) {
        req.session.isAuthenticated = true;
        console.log('✅ Login successful');
        res.json({ success: true, message: 'Login successful' });
    } else {
        console.log('❌ Login failed - credentials mismatch');
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
};

module.exports = { login, logout };
