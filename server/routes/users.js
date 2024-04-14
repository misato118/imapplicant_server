import express from "express"; // Back-end web application framework of Node.js

import { signin, signup, sendResetPasswordEmail, resetPassword } from '../controllers/user.js';

// Create a new router to handle requests
const router = express.Router();

router.post('/signin', signin);
router.post('/signup', signup);
router.post('/send_reset_password', sendResetPasswordEmail);

router.post('/reset_password', resetPassword);

export default router;