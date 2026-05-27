import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  users,
  createToken,
  createRefreshToken,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  authenticateToken,
  AuthRequest,
} from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rate-limit';
import { validateEmail, validateStringLength, MAX_NAME_LENGTH } from '../middleware/validate';

export const usersRouter = Router();

usersRouter.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'username, email, and password are required' });
      return;
    }

    const usernameErr = validateStringLength(username, 'username', MAX_NAME_LENGTH, 3);
    if (usernameErr) { res.status(400).json({ error: usernameErr }); return; }

    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const passwordErr = validatePasswordStrength(password);
    if (passwordErr) { res.status(400).json({ error: passwordErr }); return; }

    const existing = Array.from(users.values()).find((u) => u.username === username || u.email === email);
    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const { hash, salt } = await hashPassword(password);
    const user = { id: crypto.randomUUID(), username, email, passwordHash: hash, salt, role: 'user' };
    users.set(user.id, user);

    const token = createToken({ id: user.id, username, email, role: user.role });
    const refreshToken = createRefreshToken({ id: user.id, username, email, role: user.role });

    res.status(201).json({
      user: { id: user.id, username, email, role: user.role },
      token,
      refreshToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    console.error('Registration error:', message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

usersRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }

    const user = Array.from(users.values()).find((u) => u.username === username);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = createToken({ id: user.id, username: user.username, email: user.email, role: user.role });
    const refreshToken = createRefreshToken({ id: user.id, username: user.username, email: user.email, role: user.role });

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token,
      refreshToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    console.error('Login error:', message);
    res.status(500).json({ error: 'Login failed' });
  }
});

usersRouter.post('/refresh', authenticateToken, (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  const token = createToken({ id: user.id, username: user.username, email: user.email, role: user.role });
  res.json({ token });
});

usersRouter.get('/profile', authenticateToken, (req: Request, res: Response) => {
  const authUser = (req as AuthRequest).user;
  if (!authUser) { res.status(401).json({ error: 'Authentication required' }); return; }
  const user = users.get(authUser.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
});
